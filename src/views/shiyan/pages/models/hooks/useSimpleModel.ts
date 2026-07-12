import { useState, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useExperiment } from '../../../contexts/ExperimentContext.zustand';
import type { ExperimentState } from '../../../store/experiment/types';
import { alignPredictionRows } from '../resultAlignment';
import { useGuidedModelTraining } from './useGuidedModelTraining';
import type { GuidedModelType } from '../../../services/guidedTraining';
import type { ModelApiResultBase, ModelResultData } from '../modelResultTypes';
import {
  buildResetExponentialSmoothingPatch,
  buildResetMovingAveragePatch,
} from '../../../store/experiment/resetPatches';

type SimpleModelType = 'exponential_smoothing' | 'moving_average';

interface SimpleModelConfig<T> {
  type: SimpleModelType;
  apiEndpoint: string;
  guidedModelType?: GuidedModelType;
  stateKeys: {
    param: keyof ExperimentState;
    completed: keyof ExperimentState;
    metricsRmse: keyof ExperimentState;
    metricsMae: keyof ExperimentState;
    metricsMape: keyof ExperimentState;
    metricsR2: keyof ExperimentState;
  };
  paramKey: string;
  validateParam: (param: T) => boolean;
}

interface SimpleModelResults extends ModelResultData {}

interface SimpleModelApiResults extends ModelApiResultBase {}

interface SimpleModelGuidedResult {
  status: string;
  message?: string;
  results: SimpleModelApiResults;
}

export function useSimpleModel<T extends number | ''>(config: SimpleModelConfig<T>) {
  const { state, updateState, productSalesData, setTrainingLock } = useExperiment();
  const location = useLocation();

  const [param, setParam] = useState<T>((state[config.stateKeys.param] as T) ?? '' as T);
  const [results, setResults] = useState<SimpleModelResults | null>(null);
  const guidedModelType: GuidedModelType = config.guidedModelType
    ?? (config.type === 'moving_average' ? 'ma' : 'es');

  const isValidParam = config.validateParam(param);

  const buildRequestBody = useCallback(() => {
    if (!state.experiment_id) {
      return null;
    }

    return {
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
  }, [
    config.paramKey,
    param,
    state.data_window_evaluate_end_index,
    state.data_window_evaluate_start_index,
    state.data_window_train_end_index,
    state.data_window_train_start_index,
    state.experiment_id,
    state.selected_company,
    state.selected_industry,
    state.selected_product,
  ]);

  const handleFinalResult = useCallback(async (
    result: SimpleModelGuidedResult,
    { invalidateDownstream }: { invalidateDownstream: boolean },
  ) => {
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
        standardDeviations: apiResults.eval_std_devs,
        backendMonths: apiResults.evaluate_months,
        fallbackMonths,
      }),
      metrics: apiResults.metrics,
      methodName: apiResults.method_name,
      forecastStrategy: apiResults.forecast_strategy,
      implementationNotes: apiResults.implementation_notes,
    };

    const persistedParam = state[config.stateKeys.param];
    const normalizedParam = param === '' ? null : param;
    const shouldInvalidatePersistedState = invalidateDownstream
      || state[config.stateKeys.completed] !== true
      || persistedParam !== normalizedParam;
    const resetPatch = shouldInvalidatePersistedState
      ? (config.type === 'moving_average'
          ? buildResetMovingAveragePatch()
          : buildResetExponentialSmoothingPatch())
      : {};
    await updateState({
      ...resetPatch,
      [config.stateKeys.param]: normalizedParam,
      [config.stateKeys.metricsRmse]: apiResults.metrics.rmse,
      [config.stateKeys.metricsMae]: apiResults.metrics.mae,
      [config.stateKeys.metricsMape]: apiResults.metrics.mape,
      [config.stateKeys.metricsR2]: apiResults.metrics.r2,
    }, { forceSync: true, throwOnSyncError: true });
    setResults(modelResults);
  }, [
    config.stateKeys,
    config.type,
    param,
    productSalesData,
    state.data_window_evaluate_end_index,
    state.data_window_evaluate_start_index,
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
  } = useGuidedModelTraining<SimpleModelGuidedResult>({
    modelType: guidedModelType,
    buildRequestBody,
    onFinalResult: handleFinalResult,
    lockPath: location.pathname,
    setTrainingLock,
    getErrorMessage: (jobError) =>
      jobError instanceof Error ? jobError.message : '计算失败，请稍后重试。',
  });

  useEffect(() => {
    setResults(null);
    setError(null);
    resetGuidedTraining();
  }, [param, resetGuidedTraining, setError]);

  const handleCalculate = useCallback(async () => {
    if (!state.experiment_id) {
      setError('实验状态未初始化，无法训练模型。');
      return;
    }

    await runNextGuidedStep();
  }, [runNextGuidedStep, setError, state.experiment_id]);

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
    guidedSession,
    isLoading,
    error,
    setError,
    isValidParam,
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
