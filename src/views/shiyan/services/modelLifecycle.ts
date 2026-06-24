import { apiClient } from '@/utils/apiClient';
import type { SelectedBestModel } from '../store/experiment/types';
import { BEST_MODEL_TO_BACKEND_MODEL_TYPE } from '../utils/modelCatalog';

type ProductionRequestStage = 'prepare' | 'predict';
type ProductionRequestErrorKind = 'invalid' | 'missing' | 'conflict' | 'busy' | 'timeout' | 'unknown';
type ApiRequestError = Error & {
  status?: number;
  payload?: unknown;
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

const getProductionErrorKind = (status?: number): ProductionRequestErrorKind => {
  switch (status) {
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

const buildProductionErrorMessage = (
  stage: ProductionRequestStage,
  error: ApiRequestError,
): string => {
  const detail = extractErrorDetail(error);

  switch (error.status) {
    case 400:
      return stage === 'prepare'
        ? appendErrorDetail(
            '当前最佳模型尚未满足生产预测条件。请返回结果评估页确认最优模型已训练完成，或重新完成模型训练后再试。',
            detail,
          )
        : appendErrorDetail(
            '生产预测请求无效，当前实验状态可能已过期。请刷新页面后重试；如仍失败，请重新进入生产计划。',
            detail,
          );
    case 404:
      return stage === 'prepare'
        ? appendErrorDetail(
            '找不到当前实验对应的回测模型结果。请返回模型构建阶段重新训练并选择最优模型后再试。',
            detail,
          )
        : appendErrorDetail(
            '找不到可用于生产预测的模型。请先重新尝试生产预测；如仍失败，请返回结果评估页重新确认最优模型。',
            detail,
          );
    case 409:
      return '当前模型已有训练或预测任务在执行，请稍后再次点击“重试”。';
    case 429:
      return '模型服务当前繁忙，请稍后再次点击“重试”。';
    case 504:
      return stage === 'prepare'
        ? appendErrorDetail('准备生产预测模型超时，请稍后重试。', detail)
        : appendErrorDetail('生成需求预测超时，请稍后重试。', detail);
    default:
      return detail
        ?? (stage === 'prepare'
          ? '准备生产预测模型失败，请稍后重试。'
          : '生成需求预测失败，请稍后重试。');
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
    buildProductionErrorMessage(stage, requestError),
    {
      status: requestError.status,
      stage,
      kind: getProductionErrorKind(requestError.status),
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

export const prepareBestModelForProduction = async (
  selectedBestModel: SelectedBestModel,
  experimentId: number,
): Promise<void> => {
  const modelType = getBackendModelType(selectedBestModel);
  await runProductionRequest('prepare', async () => {
    await apiClient.post(`/models/${modelType}/prepare-production`, {
      experiment_id: experimentId,
    });
  });
};

export const predictWithBestModel = async (
  selectedBestModel: SelectedBestModel,
  experimentId: number,
  forecastSteps: number,
): Promise<ModelPredictionResponse> => {
  await prepareBestModelForProduction(selectedBestModel, experimentId);

  const modelType = getBackendModelType(selectedBestModel);
  return await runProductionRequest('predict', async () =>
    await apiClient.post<ModelPredictionResponse>(`/models/${modelType}/predict`, {
      experiment_id: experimentId,
      forecast_steps: forecastSteps,
    })
  );
};
