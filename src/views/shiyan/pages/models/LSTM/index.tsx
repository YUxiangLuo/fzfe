import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import ModelStepLayout from '../components/ModelStepLayout';
import Intro from './Intro';
import Preprocessing, { type PreprocessingProps } from './Preprocessing';
import NormalizationInfo from './NormalizationInfo';
import Build, { type BuildProps } from './Build';
import LSTMMethodInfo from './LSTMMethodInfo';
import Results, { type ResultsProps } from './Results';
import ModelComparison from './ModelComparison';
import { useExperiment } from '../../../contexts/ExperimentContext.zustand';
import { MODEL_RETRY_LIMITS } from '../constants';
import { useGuidedModelTraining } from '../hooks/useGuidedModelTraining';
import RetryExceededFallback from '../components/RetryExceededFallback';
import { alignPredictionRows } from '../resultAlignment';

const MODEL_NAME = 'LSTM模型';
const BASE_PATH = '/model/lstm';

const STEPS = [
  { id: 'intro', name: '方法步骤', path: `${BASE_PATH}/intro`, component: Intro },
  { id: 'preprocessing', name: '数据预处理', path: `${BASE_PATH}/preprocessing`, component: Preprocessing },
  { id: 'build', name: '构建LSTM模型', path: `${BASE_PATH}/build`, component: Build },
  { id: 'results', name: '计算结果', path: `${BASE_PATH}/results`, component: Results },
];

// Hidden pages - not part of the main steps
const NORMALIZATION_INFO_PATH = `${BASE_PATH}/normalization-info`;
const LSTM_METHOD_INFO_PATH = `${BASE_PATH}/lstm-method-info`;
const COMPARISON_PATH = `${BASE_PATH}/comparison`;

// Step indices for navigation
const PREPROCESSING_STEP_INDEX = 1;
const BUILD_STEP_INDEX = 2;
const RESULTS_STEP_INDEX = 3;

const LSTMStepper: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, updateState, productSalesData, productFieldOptions, setTrainingLock } = useExperiment();

  const [normalization, setNormalization] = useState<'minmax' | 'zscore' | null>(state.lstm_normalization);
  const [features, setFeatures] = useState<string[]>(state.lstm_features ?? []);
  const [target, setTarget] = useState<string | null>(state.lstm_target_field);
  const [results, setResults] = useState<any>(null);

  const isNormalizationInfoPage = useMemo(() => location.pathname === NORMALIZATION_INFO_PATH, [location.pathname]);
  const isLSTMMethodInfoPage = useMemo(() => location.pathname === LSTM_METHOD_INFO_PATH, [location.pathname]);
  const isComparisonPage = useMemo(() => location.pathname === COMPARISON_PATH, [location.pathname]);

  const evaluateMonths = useMemo(() => {
    if (!productSalesData || state.data_window_evaluate_start_index === null || state.data_window_evaluate_end_index === null) {
      return [];
    }
    const start = state.data_window_evaluate_start_index;
    const end = state.data_window_evaluate_end_index;
    return productSalesData.monthlySales.slice(start, end + 1).map(item => item.month);
  }, [productSalesData, state.data_window_evaluate_start_index, state.data_window_evaluate_end_index]);

  const buildTrainingRequestBody = useCallback(() => {
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
      lstmNormalization: normalization,
      lstmTargetFeature: target ?? '销售数量',
      lstmFeatures: JSON.stringify(features),
    };
  }, [
    features,
    normalization,
    state.data_window_evaluate_end_index,
    state.data_window_evaluate_start_index,
    state.data_window_train_end_index,
    state.data_window_train_start_index,
    state.experiment_id,
    state.selected_company,
    state.selected_industry,
    state.selected_product,
    target,
  ]);

  const handleTrainingFinalResult = useCallback(async (response: any) => {
    if (response.status !== "success") {
      throw new Error(response.message || "计算失败，请重试...");
    }

    const apiResults = response.results;
    const nextResults = {
      predictions: alignPredictionRows({
        actualValues: apiResults.eval_y_true,
        predictedValues: apiResults.eval_predictions,
        backendMonths: apiResults.evaluate_months,
        fallbackMonths: evaluateMonths,
      }),
      metrics: apiResults.metrics,
    };

    const recoveredModelState = {
      lstm_completed: true,
      lstm_normalization: normalization,
      lstm_features: features,
      lstm_target_field: target,
      lstm_metrics_rmse: apiResults.metrics.rmse,
      lstm_metrics_mae: apiResults.metrics.mae,
      lstm_metrics_r2: apiResults.metrics.r2,
      ...(response.experiment_state_patch ?? {}),
    };
    await updateState(recoveredModelState as any, { skipSync: true });
    setResults(nextResults);
  }, [evaluateMonths, features, normalization, target, updateState]);

  const {
    session: guidedTrainingSession,
    isLoading,
    error,
    setError,
    retryCount,
    initializeSession: initializeGuidedTrainingSession,
    runNextStep: runNextGuidedTrainingStep,
    handleRetry,
    discardAndRestart: discardAndRestartTraining,
    resetGuidedTraining,
  } = useGuidedModelTraining<any>({
    modelType: 'lstm',
    buildRequestBody: buildTrainingRequestBody,
    onFinalResult: handleTrainingFinalResult,
    persistDraft: async () => {
      const persistedFeatures = state.lstm_features ?? [];
      const sameFeatures = JSON.stringify(persistedFeatures) === JSON.stringify(features);
      if (
        sameFeatures
        && state.lstm_target_field === target
        && state.lstm_normalization === normalization
      ) return;
      await updateState(
        {
          lstm_normalization: normalization,
          lstm_features: features,
          lstm_target_field: target,
        },
        { forceSync: true, throwOnSyncError: true },
      );
    },
    lockPath: location.pathname,
    setTrainingLock,
    getErrorMessage: (jobError) =>
      jobError instanceof Error ? jobError.message : '遇到错误，请重试...',
  });

  useEffect(() => {
    if (target) {
      setFeatures(prev => prev.includes(target) ? prev.filter(f => f !== target) : prev);
    }
  }, [target]);

  useEffect(() => {
    setResults(null);
    setError(null);
    resetGuidedTraining();
  }, [features, normalization, resetGuidedTraining, setError, target]);

  const currentStepIndex = useMemo(() => {
    if (isNormalizationInfoPage) {
      // Normalization info is part of preprocessing in the step navigation
      return PREPROCESSING_STEP_INDEX;
    }
    if (isLSTMMethodInfoPage) {
      // LSTM method info is part of build in the step navigation
      return BUILD_STEP_INDEX;
    }
    if (isComparisonPage) {
      // Comparison is after results
      return RESULTS_STEP_INDEX;
    }
    const currentPath = location.pathname;
    const index = STEPS.findIndex(step => step.path === currentPath);
    return index === -1 ? 0 : index;
  }, [location.pathname, isNormalizationInfoPage, isLSTMMethodInfoPage, isComparisonPage]);

  const currentStep = useMemo(() => {
    if (isNormalizationInfoPage) {
      return { id: 'normalization-info', name: '标准化介绍', path: NORMALIZATION_INFO_PATH, component: NormalizationInfo };
    }
    if (isLSTMMethodInfoPage) {
      return { id: 'lstm-method-info', name: '构建LSTM方法', path: LSTM_METHOD_INFO_PATH, component: LSTMMethodInfo };
    }
    if (isComparisonPage) {
      return { id: 'comparison', name: '模型对比', path: COMPARISON_PATH, component: ModelComparison };
    }
    return STEPS[currentStepIndex];
  }, [currentStepIndex, isNormalizationInfoPage, isLSTMMethodInfoPage, isComparisonPage]);

  // Auto-set target to "销售数量"
  useEffect(() => {
    if (currentStep?.id === 'build' && !target && productFieldOptions) {
      const salesQuantityField = productFieldOptions.find(field =>
        field === '销售数量' || field.includes('销售数量')
      );
      if (salesQuantityField) {
        setTarget(salesQuantityField);
      }
    }
  }, [currentStep?.id, target, productFieldOptions]);

  const areParamsValid = useMemo(() => {
    return !!normalization && !!target;
  }, [normalization, target]);

  const normSelected = useMemo(() => {
    return !!normalization;
  }, [normalization])

  useEffect(() => {
    if (currentStep?.id === 'results' && areParamsValid && !results && !error) {
      void initializeGuidedTrainingSession();
    }
  }, [areParamsValid, currentStep?.id, error, initializeGuidedTrainingSession, results]);

  const handleNext = async () => {
    if (currentStep?.id === 'preprocessing') {
      try {
        await updateState(
          { lstm_normalization: normalization },
          { forceSync: true, throwOnSyncError: true },
        );
      } catch {
        return;
      }
      const nextStep = STEPS[BUILD_STEP_INDEX];
      if (nextStep) navigate(nextStep.path);
      return;
    }

    if (currentStep?.id === 'build') {
      const nextStep = STEPS[RESULTS_STEP_INDEX];
      if (nextStep) navigate(nextStep.path);
      return;
    }

    if (currentStep?.id === 'results') {
      if (!results) {
        setError('请先完成分阶段训练，生成计算结果后再进入下一步。');
        return;
      }
      try {
        await updateState(
          { lstm_completed: true },
          { skipSync: true },
        );
      } catch {
        return;
      }
      navigate(COMPARISON_PATH);
      return;
    }

    if (currentStep?.id === 'comparison') {
      navigate('/model/model-select');
      return;
    }

    const nextStep = STEPS[currentStepIndex + 1];
    if (nextStep) {
      navigate(nextStep.path);
    }
  };

  const handlePrevious = () => {
    if (isNormalizationInfoPage) {
      const prevStep = STEPS[PREPROCESSING_STEP_INDEX];
      if (prevStep) navigate(prevStep.path);
      return;
    }

    if (isLSTMMethodInfoPage) {
      const prevStep = STEPS[BUILD_STEP_INDEX];
      if (prevStep) navigate(prevStep.path);
      return;
    }

    if (isComparisonPage) {
      const prevStep = STEPS[RESULTS_STEP_INDEX];
      if (prevStep) navigate(prevStep.path);
      return;
    }

    const prevStep = STEPS[currentStepIndex - 1];
    if (prevStep) {
      navigate(prevStep.path);
    } else {
      navigate('/model/model-select');
    }
  };

  const handleShowNormalizationInfo = () => {
    navigate(NORMALIZATION_INFO_PATH);
  };

  const handleShowLSTMMethodInfo = () => {
    navigate(LSTM_METHOD_INFO_PATH);
  };

  if (!currentStep) {
    return null;
  }

  const CurrentComponent = currentStep.component as React.FC<any>;

  const componentProps: { [key: string]: PreprocessingProps | BuildProps | ResultsProps | {} } = {
    preprocessing: { normalization, setNormalization, error, onShowNormalizationInfo: handleShowNormalizationInfo },
    build: {
      features,
      setFeatures,
      target,
      error,
      isLoading,
      fieldOptions: productFieldOptions ?? [],
      csvData: productSalesData?.csvData,
      onShowLSTMMethodInfo: handleShowLSTMMethodInfo
    },
    results: {
      data: results,
      guidedSession: guidedTrainingSession,
      isLoading,
      error,
      onRetry: handleRetry,
      onInitialize: initializeGuidedTrainingSession,
      onRunNextStep: runNextGuidedTrainingStep,
    },
  };

  const propsForCurrentStep = componentProps[currentStep.id] ?? {};

  const getCurrentStepId = () => {
    if (isNormalizationInfoPage) return 'preprocessing'; // Normalization info is part of preprocessing
    if (isLSTMMethodInfoPage) return 'build'; // LSTM method info is part of build
    if (isComparisonPage) return 'results'; // Comparison is part of results
    return currentStep.id;
  };

  const renderContent = () => {
    if (currentStep.id === 'results' && error && retryCount >= MODEL_RETRY_LIMITS.maxFailures) {
      return <RetryExceededFallback navigate={navigate} onRestart={discardAndRestartTraining} />;
    }
    return <CurrentComponent key={currentStep.id} {...propsForCurrentStep} />;
  };

  return (
    <ModelStepLayout
      title={MODEL_NAME}
      steps={STEPS}
      currentStepId={getCurrentStepId()}
      onNext={handleNext}
      onPrevious={handlePrevious}
      isPreviousDisabled={retryCount >= MODEL_RETRY_LIMITS.maxFailures || isLoading}
      isNextDisabled={isLoading || !!error || isNormalizationInfoPage || isLSTMMethodInfoPage || (currentStep?.id === 'preprocessing'&&!normSelected) || (currentStep?.id === 'build'&&!areParamsValid) || (currentStep?.id === 'results' && !results)}
      nextButtonText={isComparisonPage ? '完成' : '下一步'}
    >
      {renderContent()}
    </ModelStepLayout>
  );
};

const LSTMModelRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="*" element={<LSTMStepper />} />
    </Routes>
  );
};

export default LSTMModelRoutes;
