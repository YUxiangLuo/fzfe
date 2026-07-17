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
  upper_error_p99: number;
  upper_error_p99_kind?: string;
  coverage_guarantee?: boolean;
  calibration_origins?: number;
  uncertainty_source: 'model' | 'empirical' | 'fallback';
  uncertainty_reason?: string;
  calibration_mean_error: number | null;
  calibration_count: number | null;
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

type ProductionPreparationStatus = 'ready' | 'running' | 'failed' | 'completed' | 'superseded';

interface ProductionPreparationResponse {
  status: string;
  results: {
    session_id: string;
    session_status: ProductionPreparationStatus;
    completed_step_ids: string[];
    total_steps: number;
    next_step: { id: string; label: string } | null;
    error_message: string | null;
    preparation_token?: string;
    prepared_forecast_steps?: number;
  };
}

export interface ProductionPreparationProgress {
  completedSteps: number;
  totalSteps: number;
  nextStepLabel: string | null;
  status: ProductionPreparationStatus;
}

export interface PredictWithBestModelOptions {
  onPreparationProgress?: (progress: ProductionPreparationProgress) => void;
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

  const sessionId = response.results.session_id;
  const sessionStatus = response.results.session_status;
  const completedStepIds = response.results.completed_step_ids;
  const totalSteps = response.results.total_steps;
  const nextStep = response.results.next_step;
  if (
    typeof sessionId !== 'string'
    || sessionId.trim().length === 0
    || !['ready', 'running', 'failed', 'completed', 'superseded'].includes(String(sessionStatus))
    || !Array.isArray(completedStepIds)
    || !completedStepIds.every((stepId) => typeof stepId === 'string' && stepId.length > 0)
    || new Set(completedStepIds).size !== completedStepIds.length
    || !Number.isInteger(totalSteps)
    || (totalSteps as number) < completedStepIds.length
    || (nextStep !== null && (
      !isRecord(nextStep)
      || typeof nextStep.id !== 'string'
      || nextStep.id.length === 0
      || typeof nextStep.label !== 'string'
      || nextStep.label.length === 0
    ))
    || (response.results.error_message !== null && typeof response.results.error_message !== 'string')
  ) {
    throw invalidProductionResponse('prepare', '生产模型准备会话结果不完整，请重试。', response);
  }

  const token = response.results.preparation_token;
  const preparedForecastSteps = response.results.prepared_forecast_steps;
  if (sessionStatus === 'completed' && (
    typeof token !== 'string'
    || token.trim().length === 0
    || !Number.isInteger(preparedForecastSteps)
    || (preparedForecastSteps as number) < forecastSteps
  )) {
    throw invalidProductionResponse('prepare', '生产模型准备结果缺少有效凭证或预测期数不足，请重试。', response);
  }
  if (sessionStatus !== 'completed' && nextStep === null) {
    throw invalidProductionResponse('prepare', '生产模型准备会话缺少下一步骤，请重试。', response);
  }

  return {
    status: 'success',
    results: {
      session_id: sessionId,
      session_status: sessionStatus as ProductionPreparationStatus,
      completed_step_ids: [...completedStepIds] as string[],
      total_steps: totalSteps as number,
      next_step: nextStep === null
        ? null
        : { id: nextStep.id as string, label: nextStep.label as string },
      error_message: response.results.error_message as string | null,
      ...(typeof token === 'string' ? { preparation_token: token } : {}),
      ...(Number.isInteger(preparedForecastSteps)
        ? { prepared_forecast_steps: preparedForecastSteps as number }
        : {}),
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
    if (
      !isRecord(point)
      || !isFiniteNumber(point.prediction)
      || !isFiniteNumber(point.std_dev)
      || point.std_dev < 0
      || !isFiniteNumber(point.upper_error_p99)
      || point.upper_error_p99 < 0
    ) {
      throw invalidProductionResponse(
        'predict',
        `需求预测第 ${index + 1} 期数据无效，请重试。`,
        response,
      );
    }
    if (!['model', 'empirical', 'fallback'].includes(String(point.uncertainty_source))) {
      throw invalidProductionResponse(
        'predict',
        `需求预测第 ${index + 1} 期缺少有效的不确定性来源，请重试。`,
        response,
      );
    }
    if (point.uncertainty_reason !== undefined && typeof point.uncertainty_reason !== 'string') {
      throw invalidProductionResponse(
        'predict',
        `需求预测第 ${index + 1} 期不确定性说明无效，请重试。`,
        response,
      );
    }
    if (
      point.coverage_guarantee !== undefined
      && typeof point.coverage_guarantee !== 'boolean'
    ) {
      throw invalidProductionResponse(
        'predict',
        `需求预测第 ${index + 1} 期覆盖率保证标记无效，请重试。`,
        response,
      );
    }
    if (
      point.upper_error_p99_kind !== undefined
      && (
        typeof point.upper_error_p99_kind !== 'string'
        || point.upper_error_p99_kind.length === 0
      )
    ) {
      throw invalidProductionResponse(
        'predict',
        `需求预测第 ${index + 1} 期99%上侧误差类型无效，请重试。`,
        response,
      );
    }
    const calibrationOrigins = point.calibration_origins;
    if (
      calibrationOrigins !== undefined
      && (
        typeof calibrationOrigins !== 'number'
        || !Number.isInteger(calibrationOrigins)
        || calibrationOrigins <= 0
      )
    ) {
      throw invalidProductionResponse(
        'predict',
        `需求预测第 ${index + 1} 期历史预测原点数无效，请重试。`,
        response,
      );
    }
    const hasValidCalibrationDiagnostics = (
      point.calibration_mean_error === null
      && point.calibration_count === null
    ) || (
      isFiniteNumber(point.calibration_mean_error)
      && Number.isInteger(point.calibration_count)
      && (point.calibration_count as number) > 0
    );
    if (!hasValidCalibrationDiagnostics) {
      throw invalidProductionResponse(
        'predict',
        `需求预测第 ${index + 1} 期偏差诊断无效，请重试。`,
        response,
      );
    }
    return {
      prediction: point.prediction,
      std_dev: point.std_dev,
      upper_error_p99: point.upper_error_p99,
      uncertainty_source: point.uncertainty_source as ModelPredictionPoint['uncertainty_source'],
      calibration_mean_error: point.calibration_mean_error as number | null,
      calibration_count: point.calibration_count as number | null,
      ...(typeof point.uncertainty_reason === 'string'
        ? { uncertainty_reason: point.uncertainty_reason }
        : {}),
      ...(typeof point.coverage_guarantee === 'boolean'
        ? { coverage_guarantee: point.coverage_guarantee }
        : {}),
      ...(typeof point.upper_error_p99_kind === 'string'
        ? { upper_error_p99_kind: point.upper_error_p99_kind }
        : {}),
      ...(typeof calibrationOrigins === 'number'
        ? { calibration_origins: calibrationOrigins }
        : {}),
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
  options: PredictWithBestModelOptions = {},
): Promise<ModelPredictionResponse> => {
  const modelType = getBackendModelType(selectedBestModel);
  const rawPreparation = await runProductionRequest('prepare', async () =>
    await apiClient.post<unknown>(`/models/${modelType}/production-preparation/sessions`, {
      experiment_id: experimentId,
      forecast_steps: forecastSteps,
    }, {
      timeoutMs: MODEL_API_TIMEOUTS.EXECUTION,
    })
  );
  let preparation = parseProductionPreparationResponse(rawPreparation, forecastSteps);
  const preparationSessionId = preparation.results.session_id;
  const reportProgress = () => options.onPreparationProgress?.({
    completedSteps: preparation.results.completed_step_ids.length,
    totalSteps: preparation.results.total_steps,
    nextStepLabel: preparation.results.next_step?.label ?? null,
    status: preparation.results.session_status,
  });
  reportProgress();

  for (let attempt = 0; preparation.results.session_status !== 'completed'; attempt += 1) {
    if (attempt >= 32 || preparation.results.session_status === 'superseded') {
      throw invalidProductionResponse('prepare', '生产模型准备会话无法继续，请重新开始。', preparation);
    }
    const nextStep = preparation.results.next_step;
    if (!nextStep) {
      throw invalidProductionResponse('prepare', '生产模型准备会话缺少下一步骤，请重试。', preparation);
    }
    const completedBefore = preparation.results.completed_step_ids.length;
    const rawStep = await runProductionRequest('prepare', async () =>
      await apiClient.post<unknown>(
        `/models/${modelType}/production-preparation/sessions/${preparation.results.session_id}/steps/${nextStep.id}/run`,
        undefined,
        { timeoutMs: MODEL_API_TIMEOUTS.EXECUTION },
      )
    );
    preparation = parseProductionPreparationResponse(rawStep, forecastSteps);
    if (preparation.results.session_id !== preparationSessionId) {
      throw invalidProductionResponse('prepare', '生产模型准备会话标识发生变化，请重试。', rawStep);
    }
    if (
      preparation.results.session_status !== 'completed'
      && preparation.results.completed_step_ids.length <= completedBefore
    ) {
      throw invalidProductionResponse('prepare', '生产模型准备步骤未产生进度，请重试。', rawStep);
    }
    reportProgress();
  }

  const preparationToken = preparation.results.preparation_token;
  if (!preparationToken) {
    throw invalidProductionResponse('prepare', '生产模型准备结果缺少有效凭证，请重试。', preparation);
  }
  const rawPrediction = await runProductionRequest('predict', async () =>
    await apiClient.post<unknown>(`/models/${modelType}/predict`, {
      experiment_id: experimentId,
      forecast_steps: forecastSteps,
      preparation_token: preparationToken,
    }, {
      timeoutMs: MODEL_API_TIMEOUTS.PREDICTION,
    })
  );
  return parseModelPredictionResponse(rawPrediction, forecastSteps);
};
