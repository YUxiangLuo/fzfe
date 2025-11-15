import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
import { apiClient } from '../../../../../utils/apiClient';
import { useAutoCalculation } from '../hooks/useAutoCalculation';
import RetryExceededFallback from '../components/RetryExceededFallback';

const MODEL_NAME = 'LSTM 神经网络';
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
  const { state, updateState, productSalesData, productFieldOptions, resetLSTMModel } = useExperiment();

  const [normalization, setNormalization] = useState<'minmax' | 'zscore' | null>(state.lstm_normalization);
  const [features, setFeatures] = useState<string[]>(state.lstm_features ?? []);
  const [target, setTarget] = useState<string | null>(state.lstm_target_field);
  const [results, setResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  // AbortController ref for cancelling requests
  const abortControllerRef = useRef<AbortController | null>(null);

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

  useEffect(() => {
    if (target && features.includes(target)) {
      setFeatures(features.filter(f => f !== target));
    }
  }, [target, features]);

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

  // Auto-set target to "销售数量" when entering build page
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

  const handleCalculate = useCallback(async () => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setIsLoading(true);
    try {
      const requestBody = {
        selected_industry: state.selected_industry,
        selected_company: state.selected_company,
        selected_product: state.selected_product,
        data_window_train_start_index: state.data_window_train_start_index,
        data_window_train_end_index: state.data_window_train_end_index,
        data_window_evaluate_start_index: state.data_window_evaluate_start_index,
        data_window_evaluate_end_index: state.data_window_evaluate_end_index,
        lstm_normalization: normalization,
        lstm_target_field: target ?? '',
        lstm_features: features,
      };

      const response = await apiClient.post<any>(
        "/models/lstm/training",
        requestBody,
        { signal: abortController.signal }
      );

      if (response.status === "success") {
        const apiResults = response.results;
        setResults({
          predictions: evaluateMonths.map((month: string, index: number) => ({
            date: month,
            actual: apiResults.eval_y_true[index],
            predicted: apiResults.eval_predictions[index],
          })),
          metrics: apiResults.metrics,
        });
        setError(null); // Clear error on success

        await updateState({
          lstm_features: features,
          lstm_target_field: target,
          lstm_metrics_rmse: apiResults.metrics.rmse,
          lstm_metrics_mae: apiResults.metrics.mae,
          lstm_metrics_r2: apiResults.metrics.r2,
        });
      } else {
        throw new Error(response.message || "模型训练失败。");
      }
    } catch (e: any) {
      // Ignore abort errors
      if (e.name === 'AbortError') {
        return;
      }
      setError(e.message || "模型训练时发生错误。");
      setRetryCount(prev => prev + 1);
    } finally {
      if (abortControllerRef.current === abortController) {
        setIsLoading(false);
      }
    }
  }, [
    state.selected_industry,
    state.selected_company,
    state.selected_product,
    state.data_window_train_start_index,
    state.data_window_train_end_index,
    state.data_window_evaluate_start_index,
    state.data_window_evaluate_end_index,
    normalization,
    target,
    features,
    evaluateMonths,
    updateState
  ]);

  const areParamsValid = useMemo(() => {
    return !!normalization && !!target && features.length > 0;
  }, [normalization, target, features]);

  useAutoCalculation({
    calculationStepId: 'results',
    currentStepId: currentStep?.id,
    handleCalculate,
    canCalculate: areParamsValid,
    results,
    isLoading,
    error,
  });

  // When navigating back from a failed calculation, the error state can persist
  // and incorrectly disable the "Next" button on parameter pages.
  // This effect declaratively clears any lingering errors when the user is on a
  // non-calculation step, ensuring the UI is always in a valid state.
  useEffect(() => {
    if (currentStep?.id === 'preprocessing' || currentStep?.id === 'build') {
      setError(null);
    }
  }, [currentStep?.id, setError]);

  // When returning to the intro page (e.g., after a reset),
  // ensure all calculation-related state is cleared.
  useEffect(() => {
    if (currentStep?.id === 'intro') {
      setNormalization(null);
      setFeatures([]);
      setTarget(null);
      setResults(null);
      setError(null);
      setRetryCount(0);
    }
  }, [currentStep?.id]);

  // Clear validation errors as soon as the user corrects the input
  useEffect(() => {
    if (normalization && error === "请选择一种数据预处理方法。") {
      setError(null);
    }
    if (target && features.length > 0 && error === "请选择目标字段和至少一个特征字段。") {
      setError(null);
    }
  }, [normalization, target, features, error, setError]);

  // Cleanup: cancel all pending requests on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleReset = async () => {
    setIsResetting(true);
    try {
      // Clear global state - local state is cleared by the useEffect above
      await resetLSTMModel();
      setRetryCount(0);
      // Navigate to first step
      navigate(`${BASE_PATH}/intro`);
    } finally {
      setIsResetting(false);
    }
  };

  const handleNext = async () => {
    setError(null);

    if (currentStep?.id === 'preprocessing') {
      if (!normalization) {
        setError("请选择一种数据预处理方法。");
        return;
      }
      await updateState({ lstm_normalization: normalization });
      const nextStep = STEPS[BUILD_STEP_INDEX];
      if (nextStep) navigate(nextStep.path);
      return;
    }

    if (currentStep?.id === 'build') {
      if (!target || features.length === 0) {
        setError("请选择目标字段和至少一个特征字段。");
        return;
      }
      const nextStep = STEPS[RESULTS_STEP_INDEX];
      if (nextStep) navigate(nextStep.path);
      return;
    }

    if (currentStep?.id === 'results') {
      // Mark as completed and navigate to comparison
      await updateState({ lstm_completed: true });
      navigate(COMPARISON_PATH);
      return;
    }

    if (currentStep?.id === 'comparison') {
      
      // From comparison page, return to model select
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
      // From normalization info, go back to preprocessing
      const prevStep = STEPS[PREPROCESSING_STEP_INDEX];
      if (prevStep) navigate(prevStep.path);
      return;
    }

    if (isLSTMMethodInfoPage) {
      // From LSTM method info, go back to build
      const prevStep = STEPS[BUILD_STEP_INDEX];
      if (prevStep) navigate(prevStep.path);
      return;
    }

    if (isComparisonPage) {
      // From comparison, go back to results
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

  const handleRetry = useCallback(() => {
    if (retryCount < 3) {
      setError(null);
    }
  }, [retryCount]);

  const componentProps: { [key: string]: PreprocessingProps | BuildProps | ResultsProps | {} } = {
    preprocessing: { normalization, setNormalization, error, onShowNormalizationInfo: handleShowNormalizationInfo },
    build: {
      features,
      setFeatures,
      target,
      error,
      isLoading,
      fieldOptions: productFieldOptions ?? [],
      onShowLSTMMethodInfo: handleShowLSTMMethodInfo
    },
    results: { data: results, isLoading, error, onRetry: handleRetry },
  };

  const propsForCurrentStep = componentProps[currentStep.id] ?? {};

  const getCurrentStepId = () => {
    if (isNormalizationInfoPage) return 'preprocessing'; // Normalization info is part of preprocessing
    if (isLSTMMethodInfoPage) return 'build'; // LSTM method info is part of build
    if (isComparisonPage) return 'results'; // Comparison is part of results
    return currentStep.id;
  };

  const renderContent = () => {
    if (currentStep.id === 'results' && error && retryCount >= 3) {
      return <RetryExceededFallback navigate={navigate} />;
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
      onReset={handleReset}
      isResetting={isResetting}
      isNextDisabled={isLoading || !!error || isNormalizationInfoPage || isLSTMMethodInfoPage}
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
