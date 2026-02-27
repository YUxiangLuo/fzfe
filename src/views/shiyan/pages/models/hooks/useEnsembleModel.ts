import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useExperiment } from '../../../contexts/ExperimentContext.zustand';
import { apiClient } from '../../../../../utils/apiClient';
import { MODEL_ID_MAP, ENSEMBLE_CONSTANTS } from '../constants';
import { useAbortableRequest } from './useAbortableRequest';

type EnsembleType = 'weighted' | 'boosting' | 'stacking';

interface EnsembleModelConfig {
  type: EnsembleType;
  apiEndpoint: string;
  stateKey: {
    baseModels: string;
    completed: string;
    metricsRmse: string;
    metricsMae: string;
    metricsR2: string;
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
  const { executeRequest } = useAbortableRequest();

  const [selectedModels, setSelectedModels] = useState<string[]>(
    (state as any)[config.stateKey.baseModels] ?? []
  );
  const [results, setResults] = useState<EnsembleResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Release training lock on unmount if still loading (e.g. component torn down unexpectedly)
  const isLoadingRef = useRef(false);
  isLoadingRef.current = isLoading;
  useEffect(() => {
    return () => {
      if (isLoadingRef.current) {
        setTrainingLock(false, null);
      }
    };
  }, [setTrainingLock]);

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

  // Automatically clear the error when the selection becomes valid
  useEffect(() => {
    if (isValidSelection) {
      setError(null);
    }
  }, [isValidSelection, setError]);

  // Reset retry count when model selection changes
  useEffect(() => {
    setRetryCount(0);
  }, [selectedModels]);

  // Handle model training
  const handleCalculate = useCallback(async () => {
    const currentPath = location.pathname;
    setTrainingLock(true, currentPath);
    setIsLoading(true);

    try {
      const backendModels = selectedModels.map(id => MODEL_ID_MAP[id] || id);

      const requestBody: Record<string, any> = {
        selected_industry: state.selected_industry,
        selected_company: state.selected_company,
        selected_product: state.selected_product,
        data_window_train_start_index: state.data_window_train_start_index,
        data_window_train_end_index: state.data_window_train_end_index,
        data_window_evaluate_start_index: state.data_window_evaluate_start_index,
        data_window_evaluate_end_index: state.data_window_evaluate_end_index,
        [`models`]: backendModels.join(","),
      };

      // Add base model parameters
      if (backendModels.includes('arima')) requestBody.arimaD = state.arima_d;
      if (backendModels.includes('es')) requestBody.exponential_smoothing_alpha = state.exponential_smoothing_alpha;
      if (backendModels.includes('ma')) requestBody.moving_average_window = state.moving_average_window;
      if (backendModels.includes('lstm')) {
        requestBody.lstmFeatures = state.lstm_features.join(",");
        requestBody.lstmTargetFeature = state.lstm_target_field;
        requestBody.lstmNormalization = state.lstm_normalization;
      }

      const result = await executeRequest<any>(async (signal) => {
        return await apiClient.post<any>(
          config.apiEndpoint,
          requestBody,
          { signal }
        );
      });

      if (!result) {
        // Request was aborted
        return;
      }

      if (result.status === "success") {
        const apiResults = result.results;
        const ensembleResults: EnsembleResults = {
          predictions: evaluateMonths.map((month: string, index: number) => ({
            date: month,
            actual: apiResults.eval_y_true[index],
            predicted: apiResults.eval_predictions[index],
          })),
          metrics: apiResults.metrics,
        };

        // Add type-specific data
        if (config.type === 'weighted') {
          ensembleResults.weights = apiResults.weights;
          ensembleResults.model_names = apiResults.model_names;
        } else if (config.type === 'stacking') {
          ensembleResults.meta_model = apiResults.meta_model;
        }

        setResults(ensembleResults);
        setError(null); // Clear error on success

        await updateState({
          [config.stateKey.baseModels]: selectedModels,
          [config.stateKey.metricsRmse]: apiResults.metrics.rmse,
          [config.stateKey.metricsMae]: apiResults.metrics.mae,
          [config.stateKey.metricsR2]: apiResults.metrics.r2,
        });
      } else {
        throw new Error(result.message || "模型训练失败。");
      }
    } catch (e: unknown) {
      const error = e as Error;
      setError(error.message || "模型训练时发生错误。");
      setRetryCount(prev => prev + 1);
    } finally {
      setIsLoading(false);
      setTrainingLock(false, null);
    }
  }, [
    selectedModels,
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
    executeRequest,
    location.pathname,
    setTrainingLock,
    updateState,
  ]);

  // Mark model as completed
  const markAsCompleted = useCallback(async () => {
    await updateState({ [config.stateKey.completed]: true });
  }, [config.stateKey.completed, updateState]);

  const handleRetry = useCallback(() => {
    if (retryCount < 3) {
      setError(null);
    }
  }, [retryCount, setError]);

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
