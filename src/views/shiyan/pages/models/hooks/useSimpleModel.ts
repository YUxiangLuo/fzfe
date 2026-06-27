import { useState, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useExperiment } from '../../../contexts/ExperimentContext.zustand';
import { postModelTrainingStream } from '../../../services/modelTrainingStream';
import type { ExperimentState } from '../../../store/experiment/types';
import { useModelJob } from './useModelJob';
import { alignPredictionRows } from '../resultAlignment';

type SimpleModelType = 'exponential_smoothing' | 'moving_average';

interface SimpleModelConfig<T> {
  type: SimpleModelType;
  apiEndpoint: string;
  stateKeys: {
    param: keyof ExperimentState;
    completed: keyof ExperimentState;
    metricsRmse: keyof ExperimentState;
    metricsMae: keyof ExperimentState;
    metricsR2: keyof ExperimentState;
  };
  paramKey: string; // Key for request body (e.g., 'exponential_smoothing_alpha', 'moving_average_window')
  validateParam: (param: T) => boolean;
}

interface SimpleModelResults {
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
}

interface SimpleModelApiResults {
  eval_y_true?: unknown;
  eval_predictions?: unknown;
  evaluate_months?: unknown;
  metrics: {
    rmse: number;
    mae: number;
    r2: number;
  };
}

const MIN_BASE_MODEL_PROGRESS_MS = 6000;

/**
 * Shared hook for simple model logic (Exponential Smoothing and Moving Average)
 * Eliminates 90% code duplication between ES and MA models
 */
export function useSimpleModel<T extends number | ''>(config: SimpleModelConfig<T>) {
  const { state, updateState, productSalesData, setTrainingLock } = useExperiment();
  const location = useLocation();
  const { isLoading, error, setError, retryCount, currentProgress, progressEvents, runJob, handleRetry, resetRetryCount } = useModelJob();

  const [param, setParam] = useState<T>((state[config.stateKeys.param] as T) ?? '' as T);
  const [results, setResults] = useState<SimpleModelResults | null>(null);

  // Validate parameter
  const isValidParam = config.validateParam(param);

  // Any parameter change starts a new training attempt context.
  useEffect(() => {
    setResults(null);
    setError(null);
    resetRetryCount();
  }, [param, resetRetryCount, setError]);

  // Handle model training
  const handleCalculate = useCallback(async () => {
    if (!state.experiment_id) {
      setError('实验状态未初始化，无法训练模型。');
      return;
    }

    const requestBody: Record<string, any> = {
      experiment_id: state.experiment_id,
      selected_industry: state.selected_industry,
      selected_company: state.selected_company,
      selected_product: state.selected_product,
      data_window_train_start_index: state.data_window_train_start_index,
      data_window_train_end_index: state.data_window_train_end_index,
      data_window_evaluate_start_index: state.data_window_evaluate_start_index,
      data_window_evaluate_end_index: state.data_window_evaluate_end_index,
      [config.paramKey]: param,
    };

    await runJob<{
      status: string;
      message?: string;
      results: SimpleModelApiResults;
    }>({
      lockPath: location.pathname,
      setTrainingLock,
      request: (signal, onProgress) => postModelTrainingStream(`${config.apiEndpoint}/stream`, requestBody, { signal, onProgress }),
      minLoadingMs: MIN_BASE_MODEL_PROGRESS_MS,
      onSuccess: async (result) => {
        if (result.status !== "success") {
          throw new Error(result.message || "模型计算返回失败状态");
        }

        const apiResults = result.results;
        const fallbackMonths = productSalesData?.monthlySales
          .slice(state.data_window_evaluate_start_index!, state.data_window_evaluate_end_index! + 1)
          .map(item => item.month) || [];

        const modelResults: SimpleModelResults = {
          predictions: alignPredictionRows({
            actualValues: apiResults.eval_y_true,
            predictedValues: apiResults.eval_predictions,
            backendMonths: apiResults.evaluate_months,
            fallbackMonths,
          }),
          metrics: apiResults.metrics,
        };

        await updateState({
          [config.stateKeys.param]: param === '' ? null : param,
          [config.stateKeys.metricsRmse]: apiResults.metrics.rmse,
          [config.stateKeys.metricsMae]: apiResults.metrics.mae,
          [config.stateKeys.metricsR2]: apiResults.metrics.r2,
        }, { forceSync: true, throwOnSyncError: true });
        setResults(modelResults);
      },
      getErrorMessage: (jobError) =>
        jobError instanceof Error ? jobError.message : '计算失败，请稍后重试。',
    });
  }, [
    param,
    state.experiment_id,
    state.selected_industry,
    state.selected_company,
    state.selected_product,
    state.data_window_train_start_index,
    state.data_window_train_end_index,
    state.data_window_evaluate_start_index,
    state.data_window_evaluate_end_index,
    productSalesData,
    config.apiEndpoint,
    config.paramKey,
    config.stateKeys,
    location.pathname,
    runJob,
    setTrainingLock,
    updateState,
  ]);

  // Mark model as completed
  const markAsCompleted = useCallback(async () => {
    await updateState(
      { [config.stateKeys.completed]: true },
      { forceSync: true, throwOnSyncError: true },
    );
  }, [config.stateKeys.completed, updateState]);

  return {
    param,
    setParam,
    results,
    isLoading,
    error,
    setError,
    isValidParam,
    handleCalculate,
    markAsCompleted,
    handleRetry,
    retryCount,
    currentProgress,
    progressEvents,
  };
}
