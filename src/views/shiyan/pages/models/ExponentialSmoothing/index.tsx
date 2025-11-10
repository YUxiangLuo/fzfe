import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import ModelStepLayout from '../components/ModelStepLayout';
import Intro from './Intro';
import Formula from './Formula';
import Params, { type ParamsProps } from './Params';
import Validation, { type ValidationProps } from './Validation';
import Results, { type ResultsProps } from './Results';
import ModelComparison from './ModelComparison';
import { useExperiment } from '../../../contexts/ExperimentContext';
import { apiClient } from '../../../../../utils/apiClient';

const MODEL_NAME = '指数平滑法';
const BASE_PATH = '/model/exponential-smoothing';

const STEPS = [
  { id: 'intro', name: '方法步骤', path: `${BASE_PATH}/intro`, component: Intro },
  { id: 'formula', name: '计算公式', path: `${BASE_PATH}/formula`, component: Formula },
  { id: 'params', name: '平滑系数选择', path: `${BASE_PATH}/params`, component: Params },
  { id: 'results', name: '计算结果', path: `${BASE_PATH}/results`, component: Results },
];

// Hidden pages - not part of the main steps
const VALIDATION_PATH = `${BASE_PATH}/validation`;
const COMPARISON_PATH = `${BASE_PATH}/comparison`;

// Step indices for navigation
const PARAMS_STEP_INDEX = 2;
const RESULTS_STEP_INDEX = 3;

const ExponentialSmoothingStepper: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, updateState, productSalesData, resetExponentialSmoothingModel } = useExperiment();

  const [alpha, setAlpha] = useState<number | ''>(state.exponential_smoothing_alpha ?? '');
  const [results, setResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const isValidationPage = useMemo(() => location.pathname === VALIDATION_PATH, [location.pathname]);
  const isComparisonPage = useMemo(() => location.pathname === COMPARISON_PATH, [location.pathname]);

  const currentStepIndex = useMemo(() => {
    if (isValidationPage) {
      // Validation is between params and results
      // We treat it as if we're still on params for step navigation purposes
      return PARAMS_STEP_INDEX;
    }
    if (isComparisonPage) {
      // Comparison is after results
      // We treat it as if we're still on results for step navigation purposes
      return RESULTS_STEP_INDEX;
    }
    const currentPath = location.pathname;
    const index = STEPS.findIndex(step => step.path === currentPath);
    return index === -1 ? 0 : index;
  }, [location.pathname, isValidationPage, isComparisonPage]);

  const currentStep = useMemo(() => {
    if (isValidationPage) {
      return { id: 'validation', name: '验证', path: VALIDATION_PATH, component: Validation };
    }
    if (isComparisonPage) {
      return { id: 'comparison', name: '模型对比', path: COMPARISON_PATH, component: ModelComparison };
    }
    return STEPS[currentStepIndex];
  }, [currentStepIndex, isValidationPage, isComparisonPage]);

  const isValidAlpha = useMemo(() => {
    if (alpha === '' || alpha <= 0) return false;
    if (alpha > 1) return false;
    return true;
  }, [alpha]);

  const handleCalculate = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const requestBody = {
        selected_industry: state.selected_industry,
        selected_company: state.selected_company,
        selected_product: state.selected_product,
        data_window_train_start_index: state.data_window_train_start_index,
        data_window_train_end_index: state.data_window_train_end_index,
        data_window_evaluate_start_index: state.data_window_evaluate_start_index,
        data_window_evaluate_end_index: state.data_window_evaluate_end_index,
        exponential_smoothing_alpha: alpha,
      };

      const response = await apiClient.post<any>("/models/es/training", requestBody);

      if (response.status === "success") {
        const apiResults = response.results;
        const months = productSalesData?.monthlySales
          .slice(state.data_window_evaluate_start_index!, state.data_window_evaluate_end_index! + 1)
          .map(item => item.month) || [];

        setResults({
          predictions: months.map((month: string, index: number) => ({
            date: month,
            actual: apiResults.eval_y_true[index],
            predicted: apiResults.eval_predictions[index],
          })),
          metrics: apiResults.metrics,
        });

        await updateState({
          exponential_smoothing_alpha: alpha === '' ? null : alpha,
          exponential_smoothing_metrics_rmse: apiResults.metrics.rmse,
          exponential_smoothing_metrics_mae: apiResults.metrics.mae,
          exponential_smoothing_metrics_r2: apiResults.metrics.r2,
        });
      } else {
        throw new Error(response.message || "模型计算返回失败状态");
      }
    } catch (e: any) {
      setError(e.message || '计算失败，请稍后重试。');
    } finally {
      setIsLoading(false);
    }
  }, [
    state.selected_industry,
    state.selected_company,
    state.selected_product,
    state.data_window_train_start_index,
    state.data_window_train_end_index,
    state.data_window_evaluate_start_index,
    state.data_window_evaluate_end_index,
    alpha,
    productSalesData,
    updateState
  ]);

  useEffect(() => {
    if (currentStep?.id === 'results' && !results && !isLoading) {
      handleCalculate();
    }
  }, [currentStep?.id, results, isLoading, handleCalculate]);

  // Clear results when alpha changes to trigger recalculation
  useEffect(() => {
    setResults(null);
  }, [alpha]);

  const handleReset = async () => {
    setIsResetting(true);
    try {
      // Clear local state
      setAlpha('');
      setResults(null);
      setError(null);

      // Clear global state
      await resetExponentialSmoothingModel();

      // Navigate to first step
      navigate(`${BASE_PATH}/intro`);
    } finally {
      setIsResetting(false);
    }
  };

  const handleNext = async () => {
    setError(null);

    if (currentStep?.id === 'params') {
      // Navigate to validation page
      navigate(VALIDATION_PATH);
      return;
    }

    if (currentStep?.id === 'validation') {
      // Check if alpha is valid using the same validation logic
      if (!isValidAlpha) {
        // Stay on validation page, error message will be shown
        return;
      }
      // If valid, proceed to results
      navigate(STEPS[RESULTS_STEP_INDEX].path);
      return;
    }

    if (currentStep?.id === 'results') {
      // Mark model as completed and navigate to comparison page
      await updateState({ exponential_smoothing_completed: true });
      navigate(COMPARISON_PATH);
      return;
    }

    if (currentStep?.id === 'comparison') {
      // Go back to model select (model already marked as completed)
      navigate('/model/model-select');
      return;
    }

    const nextStep = STEPS[currentStepIndex + 1];
    if (nextStep) {
      navigate(nextStep.path);
    }
  };

  const handlePrevious = () => {
    if (isValidationPage) {
      // From validation, go back to params
      navigate(STEPS[PARAMS_STEP_INDEX].path);
      return;
    }

    if (isComparisonPage) {
      // From comparison, go back to results
      navigate(STEPS[RESULTS_STEP_INDEX].path);
      return;
    }

    const prevStep = STEPS[currentStepIndex - 1];
    if (prevStep) {
      navigate(prevStep.path);
    } else {
      navigate('/model/model-select');
    }
  };

  if (!currentStep) {
    return null;
  }

  const CurrentComponent = currentStep.component as React.FC<any>;

  const componentProps: { [key: string]: ParamsProps | ValidationProps | ResultsProps | {} } = {
    params: { alpha, setAlpha, isLoading, error },
    validation: { alpha, isValid: isValidAlpha },
    results: { data: results, isLoading, error },
  };

  const propsForCurrentStep = componentProps[currentStep.id] ?? {};

  const getNextButtonText = () => {
    if (isComparisonPage) return '完成';
    if (currentStepIndex === STEPS.length - 1) return '下一步'; // Results page now goes to comparison
    return '下一步';
  };

  const getCurrentStepId = () => {
    if (isValidationPage) return 'params'; // Validation is part of params in the step navigation
    if (isComparisonPage) return 'results'; // Comparison is part of results in the step navigation
    return currentStep.id;
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
      isNextDisabled={isLoading || (isValidationPage && !isValidAlpha)}
      nextButtonText={getNextButtonText()}
    >
      <CurrentComponent key={currentStep.id} {...propsForCurrentStep} />
    </ModelStepLayout>
  );
};

const ExponentialSmoothingModelRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="*" element={<ExponentialSmoothingStepper />} />
    </Routes>
  );
};

export default ExponentialSmoothingModelRoutes;
