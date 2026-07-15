import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useExperiment } from '../../../contexts/ExperimentContext.zustand';
import { MODEL_ID_MAP, ENSEMBLE_CONSTANTS } from '../constants';
import { alignPredictionRows, type PredictionRow } from '../resultAlignment';
import { useGuidedModelTraining } from './useGuidedModelTraining';
import type { GuidedModelType } from '../../../services/guidedTraining';
import type { ExperimentState } from '../../../store/experiment/types';
import { normalizeBaseModelSelection } from '../../../utils/modelCatalog';

type EnsembleType = 'weighted' | 'boosting' | 'stacking';

interface EnsembleModelConfig {
  type: EnsembleType;
  stateKey: {
    baseModels: keyof ExperimentState;
    completed: keyof ExperimentState;
    metricsRmse: keyof ExperimentState;
    metricsMae: keyof ExperimentState;
    metricsR2: keyof ExperimentState;
  };
}

interface EnsembleResults {
  predictions: PredictionRow[];
  metrics: {
    rmse: number;
    mae: number;
    r2: number;
  };
  weights?: number[];
  model_names?: string[];
  meta_model?: {
    kind?: string;
    strategy?: string;
    model_names?: string[];
    coefficients?: number[];
    residual_norm?: number;
  };
  model_chain?: string[];
  stage_coefficients?: number[];
}

interface EnsembleGuidedResult {
  status: string;
  message?: string;
  experiment_state_patch?: Record<string, unknown>;
  results: {
    eval_y_true?: unknown;
    eval_predictions?: unknown;
    prediction_points?: unknown;
    evaluate_months?: unknown;
    metrics: {
      rmse: number;
      mae: number;
      r2: number;
    };
    weights?: number[];
    model_names?: string[];
    meta_model?: EnsembleResults['meta_model'];
    stage_coefficients?: number[];
  };
}

const guidedModelTypeFor = (type: EnsembleType): GuidedModelType => {
  if (type === 'weighted') {
    return 'weighted_avg';
  }
  return type;
};

export function useEnsembleModel(config: EnsembleModelConfig) {
  const { state, updateState, productSalesData, setTrainingLock } = useExperiment();
  const location = useLocation();
  const persistedSelectedModels = (state[config.stateKey.baseModels] as string[]) ?? [];
  const normalizedPersistedSelectedModels = useMemo(
    () => normalizeBaseModelSelection(persistedSelectedModels),
    [persistedSelectedModels],
  );
  const persistedSelectionSignature = useMemo(
    () => normalizedPersistedSelectedModels.join('|'),
    [normalizedPersistedSelectedModels],
  );

  const [selectedModels, setSelectedModels] = useState<string[]>(
    normalizedPersistedSelectedModels,
  );
  const [results, setResults] = useState<EnsembleResults | null>(null);
  const lastSelectionSignatureRef = useRef(
    normalizeBaseModelSelection(selectedModels).join('|'),
  );

  const selectedSelectionSignature = useMemo(
    () => normalizeBaseModelSelection(selectedModels).join('|'),
    [selectedModels],
  );

  useEffect(() => {
    setSelectedModels((previousSelectedModels) => {
      const previousSignature = normalizeBaseModelSelection(previousSelectedModels).join('|');
      return previousSignature === persistedSelectionSignature
        ? previousSelectedModels
        : normalizedPersistedSelectedModels;
    });
  }, [normalizedPersistedSelectedModels, persistedSelectionSignature]);

  const evaluateMonths = useMemo(() => {
    if (
      !productSalesData
      || state.data_window_evaluate_start_index === null
      || state.data_window_evaluate_end_index === null
    ) {
      return [];
    }
    const start = state.data_window_evaluate_start_index;
    const end = state.data_window_evaluate_end_index;
    return productSalesData.monthlySales.slice(start, end + 1).map(item => item.month);
  }, [productSalesData, state.data_window_evaluate_start_index, state.data_window_evaluate_end_index]);

  const isValidSelection = useMemo(() => {
    return selectedModels.length >= ENSEMBLE_CONSTANTS.MIN_BASE_MODELS;
  }, [selectedModels]);

  const buildRequestBody = useCallback(() => {
    if (!state.experiment_id) {
      return null;
    }

    const normalizedSelectedModels = normalizeBaseModelSelection(selectedModels);
    const backendModels = normalizedSelectedModels.map(id => MODEL_ID_MAP[id] || id);
    const requestBody: Record<string, any> = {
      experiment_id: state.experiment_id,
      selected_industry: state.selected_industry,
      selected_company: state.selected_company,
      selected_product: state.selected_product,
      data_window_train_start_index: state.data_window_train_start_index,
      data_window_train_end_index: state.data_window_train_end_index,
      data_window_evaluate_start_index: state.data_window_evaluate_start_index,
      data_window_evaluate_end_index: state.data_window_evaluate_end_index,
      models: backendModels.join(','),
    };

    if (backendModels.includes('arima')) requestBody.arimaD = state.arima_d;
    if (backendModels.includes('es')) requestBody.exponential_smoothing_alpha = state.exponential_smoothing_alpha;
    if (backendModels.includes('ma')) requestBody.moving_average_window = state.moving_average_window;
    if (backendModels.includes('lstm')) {
      requestBody.lstmFeatures = JSON.stringify(state.lstm_features);
      requestBody.lstmTargetFeature = state.lstm_target_field;
      requestBody.lstmNormalization = state.lstm_normalization;
    }

    return requestBody;
  }, [
    selectedModels,
    state.arima_d,
    state.data_window_evaluate_end_index,
    state.data_window_evaluate_start_index,
    state.data_window_train_end_index,
    state.data_window_train_start_index,
    state.experiment_id,
    state.exponential_smoothing_alpha,
    state.lstm_features,
    state.lstm_normalization,
    state.lstm_target_field,
    state.moving_average_window,
    state.selected_company,
    state.selected_industry,
    state.selected_product,
  ]);

  const handleFinalResult = useCallback(async (result: EnsembleGuidedResult) => {
    if (result.status !== 'success') {
      throw new Error(result.message || '模型训练失败。');
    }

    const apiResults = result.results;
    const normalizedSelectedModels = normalizeBaseModelSelection(selectedModels);
    const ensembleResults: EnsembleResults = {
      predictions: alignPredictionRows({
        actualValues: apiResults.eval_y_true,
        predictedValues: apiResults.eval_predictions,
        predictionPoints: apiResults.prediction_points,
        backendMonths: apiResults.evaluate_months,
        fallbackMonths: evaluateMonths,
      }),
      metrics: apiResults.metrics,
    };

    if (config.type === 'weighted') {
      ensembleResults.weights = apiResults.weights;
      ensembleResults.model_names = apiResults.model_names;
    } else if (config.type === 'stacking') {
      ensembleResults.meta_model = apiResults.meta_model;
    } else if (config.type === 'boosting') {
      ensembleResults.model_chain = apiResults.model_names;
      ensembleResults.stage_coefficients = apiResults.stage_coefficients;
    }

    const recoveredModelState = {
      [config.stateKey.baseModels]: normalizedSelectedModels,
      [config.stateKey.metricsRmse]: apiResults.metrics.rmse,
      [config.stateKey.metricsMae]: apiResults.metrics.mae,
      [config.stateKey.metricsR2]: apiResults.metrics.r2,
      [config.stateKey.completed]: true,
      ...(result.experiment_state_patch ?? {}),
    } as Partial<ExperimentState>;
    await updateState(recoveredModelState, { skipSync: true });
    setResults(ensembleResults);
  }, [
    config.stateKey,
    config.type,
    evaluateMonths,
    selectedModels,
    updateState,
  ]);

  const {
    session: guidedSession,
    isLoading,
    error,
    setError,
    retryCount,
    initializeSession: initializeGuidedSession,
    runNextStep: runNextGuidedStep,
    handleRetry,
    discardAndRestart,
    resetGuidedTraining,
  } = useGuidedModelTraining<EnsembleGuidedResult>({
    modelType: guidedModelTypeFor(config.type),
    buildRequestBody,
    onFinalResult: handleFinalResult,
    persistDraft: async () => {
      if (persistedSelectionSignature === selectedSelectionSignature) return;
      await updateState(
        { [config.stateKey.baseModels]: normalizeBaseModelSelection(selectedModels) },
        { forceSync: true, throwOnSyncError: true },
      );
    },
    lockPath: location.pathname,
    setTrainingLock,
    getErrorMessage: (jobError) =>
      jobError instanceof Error ? jobError.message : '模型训练时发生错误。',
  });

  useEffect(() => {
    if (lastSelectionSignatureRef.current === selectedSelectionSignature) {
      return;
    }

    lastSelectionSignatureRef.current = selectedSelectionSignature;
    setResults(null);
    setError(null);
    resetGuidedTraining();
  }, [selectedSelectionSignature, resetGuidedTraining, setError]);

  const handleCalculate = useCallback(async () => {
    if (!state.experiment_id) {
      setError('实验状态未初始化，无法训练模型。');
      return;
    }

    await runNextGuidedStep();
  }, [runNextGuidedStep, setError, state.experiment_id]);

  const markAsCompleted = useCallback(async () => {
    await updateState(
      { [config.stateKey.completed]: true },
      { skipSync: true },
    );
  }, [config.stateKey.completed, updateState]);

  return {
    selectedModels,
    setSelectedModels,
    results,
    setResults,
    guidedSession,
    isLoading,
    error,
    setError,
    isValidSelection,
    handleCalculate,
    initializeGuidedSession,
    runNextGuidedStep,
    markAsCompleted,
    handleRetry,
    discardAndRestart,
    retryCount,
    currentProgress: null,
    progressEvents: [],
  };
}
