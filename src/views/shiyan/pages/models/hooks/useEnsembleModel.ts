import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useExperiment } from '../../../contexts/ExperimentContext.zustand';
import { MODEL_ID_MAP, ENSEMBLE_CONSTANTS } from '../constants';
import { alignPredictionRows } from '../resultAlignment';
import { useGuidedModelTraining } from './useGuidedModelTraining';
import type { GuidedModelType } from '../../../services/guidedTraining';
import type { ExperimentState } from '../../../store/experiment/types';
import { normalizeBaseModelSelection } from '../../../utils/modelCatalog';
import type { ModelApiResultBase, ModelResultData } from '../modelResultTypes';
import { getEnsembleFeasibility } from '../modelFeasibility';
import {
  buildResetBoostingEnsemblePatch,
  buildResetStackingEnsemblePatch,
  buildResetWeightedEnsemblePatch,
} from '../../../store/experiment/resetPatches';

type EnsembleType = 'weighted' | 'boosting' | 'stacking';

interface EnsembleModelConfig {
  type: EnsembleType;
  apiEndpoint: string;
  stateKey: {
    baseModels: keyof ExperimentState;
    completed: keyof ExperimentState;
    metricsRmse: keyof ExperimentState;
    metricsMae: keyof ExperimentState;
    metricsMape: keyof ExperimentState;
    metricsR2: keyof ExperimentState;
  };
}

interface EnsembleResults extends ModelResultData {
  weights?: number[];
  model_names?: string[];
  meta_model?: {
    kind?: string;
    strategy?: string;
    model_names?: string[];
    weights?: number[];
    raw_coefficients?: number[];
    fallback_reason?: string;
    condition_number?: number | null;
    level1_mae?: number[];
  };
}

interface EnsembleGuidedResult {
  status: string;
  message?: string;
  results: {
    eval_y_true?: ModelApiResultBase['eval_y_true'];
    eval_predictions?: ModelApiResultBase['eval_predictions'];
    eval_std_devs?: ModelApiResultBase['eval_std_devs'];
    evaluate_months?: ModelApiResultBase['evaluate_months'];
    metrics: ModelApiResultBase['metrics'];
    method_name?: ModelApiResultBase['method_name'];
    forecast_strategy?: ModelApiResultBase['forecast_strategy'];
    implementation_notes?: ModelApiResultBase['implementation_notes'];
    weights?: number[];
    model_names?: string[];
    meta_model?: EnsembleResults['meta_model'];
  };
}

const guidedModelTypeFor = (type: EnsembleType): GuidedModelType => {
  if (type === 'weighted') {
    return 'weighted_avg';
  }
  return type;
};

const buildEnsembleResetPatch = (type: EnsembleType): Partial<ExperimentState> => {
  if (type === 'weighted') return buildResetWeightedEnsemblePatch();
  if (type === 'boosting') return buildResetBoostingEnsemblePatch();
  return buildResetStackingEnsemblePatch();
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

  const ensembleFeasibility = useMemo(() => getEnsembleFeasibility({
    trainStart: state.data_window_train_start_index,
    trainEnd: state.data_window_train_end_index,
    evaluateStart: state.data_window_evaluate_start_index,
    evaluateEnd: state.data_window_evaluate_end_index,
  }), [
    state.data_window_evaluate_end_index,
    state.data_window_evaluate_start_index,
    state.data_window_train_end_index,
    state.data_window_train_start_index,
  ]);

  const isValidSelection = useMemo(() => (
    selectedModels.length >= ENSEMBLE_CONSTANTS.MIN_BASE_MODELS && ensembleFeasibility.feasible
  ), [ensembleFeasibility.feasible, selectedModels]);

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

  const handleFinalResult = useCallback(async (
    result: EnsembleGuidedResult,
    { invalidateDownstream }: { invalidateDownstream: boolean },
  ) => {
    if (result.status !== 'success') {
      throw new Error(result.message || '模型训练失败。');
    }

    const apiResults = result.results;
    const normalizedSelectedModels = normalizeBaseModelSelection(selectedModels);
    const ensembleResults: EnsembleResults = {
      predictions: alignPredictionRows({
        actualValues: apiResults.eval_y_true,
        predictedValues: apiResults.eval_predictions,
        standardDeviations: apiResults.eval_std_devs,
        backendMonths: apiResults.evaluate_months,
        fallbackMonths: evaluateMonths,
      }),
      metrics: apiResults.metrics,
      methodName: apiResults.method_name,
      forecastStrategy: apiResults.forecast_strategy,
      implementationNotes: apiResults.implementation_notes,
    };

    if (config.type === 'weighted') {
      ensembleResults.weights = apiResults.weights;
      ensembleResults.model_names = apiResults.model_names;
    } else if (config.type === 'stacking') {
      ensembleResults.meta_model = apiResults.meta_model;
    }

    const shouldInvalidatePersistedState = invalidateDownstream
      || state[config.stateKey.completed] !== true
      || persistedSelectionSignature !== normalizedSelectedModels.join('|');
    await updateState({
      ...(shouldInvalidatePersistedState ? buildEnsembleResetPatch(config.type) : {}),
      [config.stateKey.baseModels]: normalizedSelectedModels,
      [config.stateKey.metricsRmse]: apiResults.metrics.rmse,
      [config.stateKey.metricsMae]: apiResults.metrics.mae,
      [config.stateKey.metricsMape]: apiResults.metrics.mape,
      [config.stateKey.metricsR2]: apiResults.metrics.r2,
    }, { forceSync: true, throwOnSyncError: true });
    setResults(ensembleResults);
  }, [
    config.stateKey,
    config.type,
    evaluateMonths,
    persistedSelectionSignature,
    selectedModels,
    state,
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
    resetGuidedTraining,
  } = useGuidedModelTraining<EnsembleGuidedResult>({
    modelType: guidedModelTypeFor(config.type),
    buildRequestBody,
    onFinalResult: handleFinalResult,
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
      { forceSync: true, throwOnSyncError: true },
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
    feasibilityError: ensembleFeasibility.reason ?? null,
    handleCalculate,
    initializeGuidedSession,
    runNextGuidedStep,
    markAsCompleted,
    handleRetry,
    retryCount,
    currentProgress: null,
    progressEvents: [],
  };
}
