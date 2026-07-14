import { apiClient, MODEL_API_TIMEOUTS } from '@/utils/apiClient';
import type { SelectedBestModel } from '../store/experiment/types';
import { BEST_MODEL_TO_BACKEND_MODEL_TYPE } from '../utils/modelCatalog';

export type ProductionRequestStage = 'prepare' | 'predict';
export type ProductionRequestErrorKind =
  | 'invalid'
  | 'invalid-response'
  | 'missing'
  | 'conflict'
  | 'busy'
  | 'timeout'
  | 'unknown';
export type ProductionRecoveryAction = 'retry' | 'retrain';
type ApiRequestError = Error & {
  status?: number;
  payload?: unknown;
  code?: string;
};

export interface ModelPredictionPoint {
  prediction: number;
  std_dev: number;
}

export interface ModelPredictionResponse {
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
  };
}

export class ProductionPredictionError extends Error {
  readonly status?: number;
  readonly stage: ProductionRequestStage;
  readonly kind: ProductionRequestErrorKind;
  readonly code?: string;
  readonly recoveryAction: ProductionRecoveryAction;
  readonly originalError: unknown;

  constructor(
    message: string,
    options: {
      status?: number;
      stage: ProductionRequestStage;
      kind: ProductionRequestErrorKind;
      code?: string;
      recoveryAction: ProductionRecoveryAction;
      originalError: unknown;
    },
  ) {
    super(message);
    this.name = 'ProductionPredictionError';
    this.status = options.status;
    this.stage = options.stage;
    this.kind = options.kind;
    this.code = options.code;
    this.recoveryAction = options.recoveryAction;
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

const extractPayloadCode = (payload: unknown): string | null => {
  if (typeof payload !== 'object' || payload === null) {
    return null;
  }
  const code = (payload as Record<string, unknown>).code;
  return typeof code === 'string' ? code : null;
};

const extractPayloadRequiredAction = (payload: unknown): string | null => {
  if (typeof payload !== 'object' || payload === null) {
    return null;
  }
  const requiredAction = (payload as Record<string, unknown>).required_action;
  return typeof requiredAction === 'string' ? requiredAction : null;
};

const getProductionRecoveryAction = (
  error: ApiRequestError,
  code: string | undefined,
): ProductionRecoveryAction => {
  if (code === 'MODEL_ARTIFACT_INVALID' || extractPayloadRequiredAction(error.payload) === 'retrain') {
    return 'retrain';
  }
  return 'retry';
};

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
    case 409: {
      const code = error.code ?? extractPayloadCode(error.payload);
      if (code === 'PRODUCTION_PREPARATION_STALE') {
        return '生产模型版本已更新，请再次点击“重试”重新生成需求预测。';
      }
      if (code === 'PRODUCTION_PREPARATION_REQUIRED') {
        return '生产预测模型尚未准备好，请再次点击“重试”重新生成需求预测。';
      }
      if (code === 'MODEL_ARTIFACT_INVALID') {
        return appendErrorDetail(
          '已训练模型的产物已损坏或与当前环境不兼容。请返回对应模型的训练页面重新训练，再生成生产计划。',
          detail,
        );
      }
      return '当前模型已有训练或预测任务在执行，请稍后再次点击“重试”。';
    }
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
  const code = requestError.code ?? extractPayloadCode(requestError.payload) ?? undefined;

  return new ProductionPredictionError(
    buildProductionErrorMessage(requestError),
    {
      status: requestError.status,
      stage,
      kind: getProductionErrorKind(requestError),
      code,
      recoveryAction: getProductionRecoveryAction(requestError, code),
      originalError: error,
    },
  );
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const invalidProductionResponse = (
  stage: ProductionRequestStage,
  message: string,
  response: unknown,
): ProductionPredictionError => new ProductionPredictionError(message, {
  stage,
  kind: 'invalid-response',
  code: 'PRODUCTION_RESPONSE_INVALID',
  recoveryAction: 'retry',
  originalError: response,
});

const parseProductionPreparationResponse = (
  response: unknown,
  forecastSteps: number,
): ProductionPreparationResponse => {
  if (!isRecord(response) || response.status !== 'success' || !isRecord(response.results)) {
    throw invalidProductionResponse('prepare', '生产模型准备结果格式无效，请重试。', response);
  }

  const token = response.results.preparation_token;
  const preparedForecastSteps = response.results.prepared_forecast_steps;
  if (
    typeof token !== 'string'
    || token.trim().length === 0
    || !Number.isInteger(preparedForecastSteps)
    || (preparedForecastSteps as number) < forecastSteps
  ) {
    throw invalidProductionResponse('prepare', '生产模型准备结果不完整或预测期数不足，请重试。', response);
  }

  return {
    status: 'success',
    results: {
      preparation_token: token,
      prepared_forecast_steps: preparedForecastSteps as number,
    },
  };
};

const parseModelPredictionResponse = (
  response: unknown,
  forecastSteps: number,
): ModelPredictionResponse => {
  if (!isRecord(response) || response.status !== 'success' || !isRecord(response.results)) {
    throw invalidProductionResponse('predict', '需求预测结果格式无效，请重试。', response);
  }

  const rawPredictions = response.results.predictions;
  if (!Array.isArray(rawPredictions) || rawPredictions.length < forecastSteps) {
    throw invalidProductionResponse(
      'predict',
      `需求预测结果期数不足：期望至少 ${forecastSteps} 期。`,
      response,
    );
  }

  const predictions = rawPredictions.map((point, index) => {
    if (!isRecord(point) || !isFiniteNumber(point.prediction) || !isFiniteNumber(point.std_dev) || point.std_dev < 0) {
      throw invalidProductionResponse(
        'predict',
        `需求预测第 ${index + 1} 期数据无效，请重试。`,
        response,
      );
    }
    return {
      prediction: point.prediction,
      std_dev: point.std_dev,
    };
  });

  const methodName = response.results.method_name;
  const forecastStrategy = response.results.forecast_strategy;
  const implementationNotes = response.results.implementation_notes;
  if (
    (methodName !== undefined && typeof methodName !== 'string')
    || (forecastStrategy !== undefined && typeof forecastStrategy !== 'string')
    || (
      implementationNotes !== undefined
      && (!Array.isArray(implementationNotes) || !implementationNotes.every((note) => typeof note === 'string'))
    )
  ) {
    throw invalidProductionResponse('predict', '需求预测结果元数据格式无效，请重试。', response);
  }

  return {
    status: 'success',
    results: {
      predictions,
      ...(methodName !== undefined ? { method_name: methodName } : {}),
      ...(forecastStrategy !== undefined ? { forecast_strategy: forecastStrategy } : {}),
      ...(implementationNotes !== undefined ? { implementation_notes: implementationNotes } : {}),
    },
  };
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
  const rawPreparation = await runProductionRequest('prepare', async () =>
    await apiClient.post<unknown>(`/models/${modelType}/prepare-production`, {
      experiment_id: experimentId,
      forecast_steps: forecastSteps,
    }, {
      timeoutMs: MODEL_API_TIMEOUTS.EXECUTION,
    })
  );
  const preparation = parseProductionPreparationResponse(rawPreparation, forecastSteps);
  const rawPrediction = await runProductionRequest('predict', async () =>
    await apiClient.post<unknown>(`/models/${modelType}/predict`, {
      experiment_id: experimentId,
      forecast_steps: forecastSteps,
      preparation_token: preparation.results.preparation_token,
    }, {
      timeoutMs: MODEL_API_TIMEOUTS.PREDICTION,
    })
  );
  return parseModelPredictionResponse(rawPrediction, forecastSteps);
};
