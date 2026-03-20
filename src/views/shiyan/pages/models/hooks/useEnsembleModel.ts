import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useExperiment } from '../../../contexts/ExperimentContext.zustand';
import { apiClient } from '../../../../../utils/apiClient';
import { MODEL_ID_MAP, ENSEMBLE_CONSTANTS } from '../constants';
import { alignPredictionRows } from '../resultAlignment';
import { useModelJob } from './useModelJob';
import type { ExperimentState } from '../../../store/experiment/types';
import { normalizeBaseModelSelection } from '../../../utils/modelCatalog';

type EnsembleType = 'weighted' | 'boosting' | 'stacking';

interface EnsembleModelConfig {
  type: EnsembleType;
  apiEndpoint: string;
  stateKey: {
    baseModels: keyof ExperimentState;
    completed: keyof ExperimentState;
    metricsRmse: keyof ExperimentState;
    metricsMae: keyof ExperimentState;
    metricsR2: keyof ExperimentState;
  };
}

interface EnsembleResults {
  predictions: Array<{
    date: string;
    actual: number;
    predicted: number;
  }>;
  metrics: {
    rmse: number;
    mae: number;
    r2: number;
  };
  weights?: number[];
  model_names?: string[];
  meta_model?: string;
}

/**
 * Shared hook for ensemble model logic (Weighted, Boosting, Stacking)
 * Eliminates 85% code duplication across ensemble models
 */
export function useEnsembleModel(config: EnsembleModelConfig) {
  const { state, updateState, productSalesData, setTrainingLock } = useExperiment();
  const location = useLocation();
  const { isLoading, error, setError, retryCount, runJob, handleRetry, resetRetryCount } = useModelJob();
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
    normalizedPersistedSelectedModels
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

  // Calculate evaluate months
  const evaluateMonths = useMemo(() => {
    if (!productSalesData ||
        state.data_window_evaluate_start_index === null ||
        state.data_window_evaluate_end_index === null) {
      return [];
    }
    const start = state.data_window_evaluate_start_index;
    const end = state.data_window_evaluate_end_index;
    return productSalesData.monthlySales.slice(start, end + 1).map(item => item.month);
  }, [productSalesData, state.data_window_evaluate_start_index, state.data_window_evaluate_end_index]);

  // Validate selected models
  const isValidSelection = useMemo(() => {
    return selectedModels.length >= ENSEMBLE_CONSTANTS.MIN_BASE_MODELS;
  }, [selectedModels]);

  // Any base-model change starts a new training attempt context.
  useEffect(() => {
    if (lastSelectionSignatureRef.current === selectedSelectionSignature) {
      return;
    }

    lastSelectionSignatureRef.current = selectedSelectionSignature;
    setResults(null);
    setError(null);
    resetRetryCount();
  }, [selectedSelectionSignature, resetRetryCount, setError]);

  // Handle model training
  const handleCalculate = useCallback(async () => {
    if (!state.experiment_id) {
      setError('实验状态未初始化，无法训练模型。');
      return;
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
      [`models`]: backendModels.join(","),
    };

    if (backendModels.includes('arima')) requestBody.arimaD = state.arima_d;
    if (backendModels.includes('es')) requestBody.exponential_smoothing_alpha = state.exponential_smoothing_alpha;
    if (backendModels.includes('ma')) requestBody.moving_average_window = state.moving_average_window;
    if (backendModels.includes('lstm')) {
      requestBody.lstmFeatures = state.lstm_features.join(",");
      requestBody.lstmTargetFeature = state.lstm_target_field;
      requestBody.lstmNormalization = state.lstm_normalization;
    }

    await runJob<any>({
      lockPath: location.pathname,
      setTrainingLock,
      request: (signal) => apiClient.post<any>(config.apiEndpoint, requestBody, { signal }),
      onSuccess: async (result) => {
        if (result.status !== "success") {
          throw new Error(result.message || "模型训练失败。");
        }

        const apiResults = result.results;
        const ensembleResults: EnsembleResults = {
          predictions: alignPredictionRows({
            actualValues: apiResults.eval_y_true,
            predictedValues: apiResults.eval_predictions,
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
        }

        await updateState({
          [config.stateKey.baseModels]: normalizedSelectedModels,
          [config.stateKey.metricsRmse]: apiResults.metrics.rmse,
          [config.stateKey.metricsMae]: apiResults.metrics.mae,
          [config.stateKey.metricsR2]: apiResults.metrics.r2,
        }, { forceSync: true, throwOnSyncError: true });
        setResults(ensembleResults);
      },
      getErrorMessage: (jobError) =>
        jobError instanceof Error ? jobError.message : '模型训练时发生错误。',
    });
  }, [
    selectedModels,
    state.experiment_id,
    state.selected_industry,
    state.selected_company,
    state.selected_product,
    state.data_window_train_start_index,
    state.data_window_train_end_index,
    state.data_window_evaluate_start_index,
    state.data_window_evaluate_end_index,
    state.arima_d,
    state.exponential_smoothing_alpha,
    state.moving_average_window,
    state.lstm_features,
    state.lstm_target_field,
    state.lstm_normalization,
    evaluateMonths,
    config.apiEndpoint,
    config.type,
    config.stateKey,
    location.pathname,
    runJob,
    setTrainingLock,
    updateState,
  ]);

  // Mark model as completed
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
    isLoading,
    error,
    setError,
    isValidSelection,
    handleCalculate,
    markAsCompleted,
    handleRetry,
    retryCount,
  };
}
