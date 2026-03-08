import { useState, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useExperiment } from '../../../contexts/ExperimentContext.zustand';
import { apiClient } from '../../../../../utils/apiClient';
import type { ExperimentState } from '../../../store/experiment/types';
import { useModelJob } from './useModelJob';

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

/**
 * Shared hook for simple model logic (Exponential Smoothing and Moving Average)
 * Eliminates 90% code duplication between ES and MA models
 */
export function useSimpleModel<T extends number | ''>(config: SimpleModelConfig<T>) {
  const { state, updateState, productSalesData, setTrainingLock } = useExperiment();
  const location = useLocation();
  const { isLoading, error, setError, retryCount, runJob, handleRetry, resetRetryCount } = useModelJob();

  const [param, setParam] = useState<T>((state[config.stateKeys.param] as T) ?? '' as T);
  const [results, setResults] = useState<SimpleModelResults | null>(null);

  // Validate parameter
  const isValidParam = config.validateParam(param);

  // Clear results when param changes to trigger recalculation
  useEffect(() => {
    setResults(null);
  }, [param]);

  // Reset retry count when parameters are reset
  useEffect(() => {
    if (param === '') {
      resetRetryCount();
    }
  }, [param, resetRetryCount]);

  // Handle model training
  const handleCalculate = useCallback(async () => {
    const requestBody: Record<string, any> = {
      selected_industry: state.selected_industry,
      selected_company: state.selected_company,
      selected_product: state.selected_product,
      data_window_train_start_index: state.data_window_train_start_index,
      data_window_train_end_index: state.data_window_train_end_index,
      data_window_evaluate_start_index: state.data_window_evaluate_start_index,
      data_window_evaluate_end_index: state.data_window_evaluate_end_index,
      [config.paramKey]: param,
    };

    await runJob<any>({
      lockPath: location.pathname,
      setTrainingLock,
      request: (signal) => apiClient.post<any>(config.apiEndpoint, requestBody, { signal }),
      onSuccess: async (result) => {
        if (result.status !== "success") {
          throw new Error(result.message || "模型计算返回失败状态");
        }

        const apiResults = result.results;
        const months = productSalesData?.monthlySales
          .slice(state.data_window_evaluate_start_index!, state.data_window_evaluate_end_index! + 1)
          .map(item => item.month) || [];

        const modelResults: SimpleModelResults = {
          predictions: months.map((month: string, index: number) => ({
            date: month,
            actual: apiResults.eval_y_true[index],
            predicted: apiResults.eval_predictions[index],
          })),
          metrics: apiResults.metrics,
        };

        setResults(modelResults);

        await updateState({
          [config.stateKeys.param]: param === '' ? null : param,
          [config.stateKeys.metricsRmse]: apiResults.metrics.rmse,
          [config.stateKeys.metricsMae]: apiResults.metrics.mae,
          [config.stateKeys.metricsR2]: apiResults.metrics.r2,
        }, { forceSync: true });
      },
      getErrorMessage: (jobError) =>
        jobError instanceof Error ? jobError.message : '计算失败，请稍后重试。',
    });
  }, [
    param,
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
    await updateState({ [config.stateKeys.completed]: true }, { forceSync: true });
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
  };
}
