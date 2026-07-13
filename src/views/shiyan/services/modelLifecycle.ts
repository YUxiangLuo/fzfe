import { apiClient, MODEL_API_TIMEOUTS } from '@/utils/apiClient';
import type { SelectedBestModel } from '../store/experiment/types';
import { BEST_MODEL_TO_BACKEND_MODEL_TYPE } from '../utils/modelCatalog';

type ProductionRequestStage = 'prepare' | 'predict';
type ProductionRequestErrorKind = 'invalid' | 'missing' | 'conflict' | 'busy' | 'timeout' | 'unknown';
type ApiRequestError = Error & {
  status?: number;
  payload?: unknown;
  code?: string;
};

export interface ModelPredictionPoint {
  prediction: number;
  std_dev: number;
}

interface ModelPredictionResponse {
  status: string;
  results: {
    predictions: ModelPredictionPoint[];
    method_name?: string;
    forecast_strategy?: string;
    implementation_notes?: string[];
  };
}

interface ProductionPreparationResponse {
  status: string;
  results: {
    preparation_token: string;
    prepared_forecast_steps: number;
    reused_existing: boolean;
  };
}

export class ProductionPredictionError extends Error {
  readonly status?: number;
  readonly stage: ProductionRequestStage;
  readonly kind: ProductionRequestErrorKind;
  readonly originalError: unknown;

  constructor(
    message: string,
    options: {
      status?: number;
      stage: ProductionRequestStage;
      kind: ProductionRequestErrorKind;
      originalError: unknown;
    },
  ) {
    super(message);
    this.name = 'ProductionPredictionError';
    this.status = options.status;
    this.stage = options.stage;
    this.kind = options.kind;
    this.originalError = options.originalError;
  }
}

const getBackendModelType = (selectedBestModel: SelectedBestModel): string => {
  const modelType = BEST_MODEL_TO_BACKEND_MODEL_TYPE[selectedBestModel];
  if (!modelType) {
    throw new Error(`无效的模型类型: ${selectedBestModel}`);
  }
  return modelType;
};

const extractPayloadErrorMessage = (payload: unknown): string | null => {
  if (typeof payload !== 'object' || payload === null) {
    return null;
  }

  const maybePayload = payload as Record<string, unknown>;
  if (typeof maybePayload.error === 'string' && maybePayload.error.trim().length > 0) {
    return maybePayload.error.trim();
  }
  if (typeof maybePayload.message === 'string' && maybePayload.message.trim().length > 0) {
    return maybePayload.message.trim();
  }
  return null;
};

const stripHttpPrefix = (message: string): string | null => {
  const trimmed = message.trim();
  if (!trimmed) {
    return null;
  }

  if (!trimmed.startsWith('HTTP ')) {
    return trimmed;
  }

  const detailSeparatorIndex = trimmed.indexOf(' - ');
  if (detailSeparatorIndex === -1) {
    return trimmed;
  }

  const detail = trimmed.slice(detailSeparatorIndex + 3).trim();
  return detail.length > 0 ? detail : null;
};

const extractErrorDetail = (error: ApiRequestError): string | null =>
  extractPayloadErrorMessage(error.payload) ?? stripHttpPrefix(error.message);

const getProductionErrorKind = (error: ApiRequestError): ProductionRequestErrorKind => {
  if (error.code === 'CLIENT_TIMEOUT') {
    return 'timeout';
  }

  switch (error.status) {
    case 400:
      return 'invalid';
    case 404:
      return 'missing';
    case 409:
      return 'conflict';
    case 429:
      return 'busy';
    case 504:
      return 'timeout';
    default:
      return 'unknown';
  }
};

const appendErrorDetail = (baseMessage: string, detail: string | null): string => {
  if (!detail || baseMessage.includes(detail)) {
    return baseMessage;
  }
  return `${baseMessage} 具体原因：${detail}`;
};

const buildProductionErrorMessage = (error: ApiRequestError): string => {
  const detail = extractErrorDetail(error);

  if (error.code === 'CLIENT_TIMEOUT') {
    return appendErrorDetail('生成需求预测超时，请稍后重试。', detail);
  }

  switch (error.status) {
    case 400:
      return appendErrorDetail(
        '生产预测请求无效，当前实验状态可能已过期。请刷新页面后重试；如仍失败，请重新进入生产计划。',
        detail,
      );
    case 404:
      return appendErrorDetail(
        '找不到可用于生产预测的模型。请先重新尝试生产预测；如仍失败，请返回结果评估页重新确认最优模型。',
        detail,
      );
    case 409:
      return '当前模型已有训练或预测任务在执行，请稍后再次点击“重试”。';
    case 429:
      return '模型服务当前繁忙，请稍后再次点击“重试”。';
    case 504:
      return appendErrorDetail('生成需求预测超时，请稍后重试。', detail);
    default:
      return detail
        ?? '生成需求预测失败，请稍后重试。';
  }
};

const normalizeProductionRequestError = (
  stage: ProductionRequestStage,
  error: unknown,
): ProductionPredictionError => {
  const requestError = error instanceof Error
    ? (error as ApiRequestError)
    : (new Error('未知错误') as ApiRequestError);

  return new ProductionPredictionError(
    buildProductionErrorMessage(requestError),
    {
      status: requestError.status,
      stage,
      kind: getProductionErrorKind(requestError),
      originalError: error,
    },
  );
};

const runProductionRequest = async <T>(
  stage: ProductionRequestStage,
  requestFactory: () => Promise<T>,
): Promise<T> => {
  try {
    return await requestFactory();
  } catch (error) {
    throw normalizeProductionRequestError(stage, error);
  }
};

export const predictWithBestModel = async (
  selectedBestModel: SelectedBestModel,
  experimentId: number,
  forecastSteps: number,
): Promise<ModelPredictionResponse> => {
  const modelType = getBackendModelType(selectedBestModel);
  const preparation = await runProductionRequest('prepare', async () =>
    await apiClient.post<ProductionPreparationResponse>(`/models/${modelType}/prepare-production`, {
      experiment_id: experimentId,
      forecast_steps: forecastSteps,
    }, {
      timeoutMs: MODEL_API_TIMEOUTS.EXECUTION,
    })
  );
  if (
    preparation.status !== 'success'
    || !preparation.results?.preparation_token
    || preparation.results.prepared_forecast_steps < forecastSteps
  ) {
    throw new ProductionPredictionError('生产模型准备结果无效，请重试。', {
      stage: 'prepare',
      kind: 'unknown',
      originalError: preparation,
    });
  }
  return await runProductionRequest('predict', async () =>
    await apiClient.post<ModelPredictionResponse>(`/models/${modelType}/predict`, {
      experiment_id: experimentId,
      forecast_steps: forecastSteps,
      preparation_token: preparation.results.preparation_token,
    }, {
      timeoutMs: MODEL_API_TIMEOUTS.PREDICTION,
    })
  );
};
