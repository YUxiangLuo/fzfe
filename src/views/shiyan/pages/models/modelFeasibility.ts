export const MIN_ENSEMBLE_TRAINING_POINTS = 8;
export const MIN_LSTM_LOOK_BACK = 3;
export const MAX_LSTM_LOOK_BACK = 6;

export interface ModelWindowConfig {
  trainStart: number | null;
  trainEnd: number | null;
  evaluateStart: number | null;
  evaluateEnd: number | null;
}

export interface ModelFeasibility {
  feasible: boolean;
  reason?: string;
}

export const resolveAutomaticLstmLookBack = (trainingSize: number): number => (
  Math.max(MIN_LSTM_LOOK_BACK, Math.min(MAX_LSTM_LOOK_BACK, Math.floor(trainingSize / 4)))
);

const resolveWindowSizes = (window: ModelWindowConfig) => {
  if (
    window.trainStart === null
    || window.trainEnd === null
    || window.evaluateStart === null
    || window.evaluateEnd === null
  ) {
    return null;
  }
  return {
    trainingSize: window.trainEnd - window.trainStart + 1,
    forecastHorizon: window.evaluateEnd - window.trainEnd,
  };
};

export const getLstmFeasibility = (window: ModelWindowConfig): ModelFeasibility => {
  const sizes = resolveWindowSizes(window);
  if (!sizes) return { feasible: false, reason: '请先完成训练和评估数据窗口配置。' };
  const lookBack = resolveAutomaticLstmLookBack(sizes.trainingSize);
  const minimumTrainingSize = lookBack + sizes.forecastHorizon;
  if (sizes.trainingSize < minimumTrainingSize) {
    return {
      feasible: false,
      reason: `当前 LSTM 自动回看窗口为 ${lookBack}，预测跨度为 ${sizes.forecastHorizon}，训练区间至少需要 ${minimumTrainingSize} 个点（当前 ${sizes.trainingSize} 个）。`,
    };
  }
  return { feasible: true };
};

export const getEnsembleFeasibility = (window: ModelWindowConfig): ModelFeasibility => {
  const sizes = resolveWindowSizes(window);
  if (!sizes) return { feasible: false, reason: '请先完成训练和评估数据窗口配置。' };
  if (sizes.trainingSize < MIN_ENSEMBLE_TRAINING_POINTS) {
    return {
      feasible: false,
      reason: `融合模型内部需要时间顺序留出验证段，训练区间至少需要 ${MIN_ENSEMBLE_TRAINING_POINTS} 个点（当前 ${sizes.trainingSize} 个，推荐至少 12 个）。`,
    };
  }
  return { feasible: true };
};

export const getBaseModelFeasibility = (
  modelId: string,
  window: ModelWindowConfig,
): ModelFeasibility => modelId === 'lstm' ? getLstmFeasibility(window) : { feasible: true };
