import { useState, useCallback, useEffect } from 'react';
import { useExperiment } from '../../../contexts/ExperimentContext.zustand';
import { apiClient } from '../../../../../utils/apiClient';
import { useAbortableRequest } from './useAbortableRequest';

type SimpleModelType = 'exponential_smoothing' | 'moving_average';

interface SimpleModelConfig<T> {
  type: SimpleModelType;
  apiEndpoint: string;
  stateKeys: {
    param: string;
    completed: string;
    metricsRmse: string;
    metricsMae: string;
    metricsR2: string;
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
  const { state, updateState, productSalesData } = useExperiment();
  const { executeRequest } = useAbortableRequest();

  const [param, setParam] = useState<T>((state as any)[config.stateKeys.param] ?? '' as T);
  const [results, setResults] = useState<SimpleModelResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Validate parameter
  const isValidParam = config.validateParam(param);

  // Clear results when param changes to trigger recalculation
  useEffect(() => {
    setResults(null);
  }, [param]);

  // Reset retry count when parameters are reset
  useEffect(() => {
    if (param === '') {
      setRetryCount(0);
    }
  }, [param]);

  // Handle model training
  const handleCalculate = useCallback(async () => {
    setIsLoading(true);

    try {
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
        setError(null); // Clear error on success

        await updateState({
          [config.stateKeys.param]: param === '' ? null : param,
          [config.stateKeys.metricsRmse]: apiResults.metrics.rmse,
          [config.stateKeys.metricsMae]: apiResults.metrics.mae,
          [config.stateKeys.metricsR2]: apiResults.metrics.r2,
        }, { forceSync: true });
      } else {
        throw new Error(result.message || "模型计算返回失败状态");
      }
    } catch (e: unknown) {
      const error = e as Error;
      setError(error.message || '计算失败，请稍后重试。');
      setRetryCount(prev => prev + 1);
    } finally {
      setIsLoading(false);
    }
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
    executeRequest,
    updateState,
  ]);

  // Mark model as completed
  const markAsCompleted = useCallback(async () => {
    await updateState({ [config.stateKeys.completed]: true }, { forceSync: true });
  }, [config.stateKeys.completed, updateState]);

  const handleRetry = useCallback(() => {
    if (retryCount < 3) {
      setError(null);
    }
  }, [retryCount, setError]);

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
