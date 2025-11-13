import React, { useState, useMemo, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import ModelStepLayout from '../components/ModelStepLayout';
import Intro from './Intro';
import Formula from './Formula';
import Params, { type ParamsProps } from './Params';
import Validation, { type ValidationProps } from './Validation';
import Results, { type ResultsProps } from './Results';
import ModelComparison from './ModelComparison';
import { useExperiment } from '../../../contexts/ExperimentContext.zustand';
import { useAutoCalculation } from '../hooks/useAutoCalculation';
import { useSimpleModel } from '../hooks/useSimpleModel';
import { EXPONENTIAL_SMOOTHING_CONSTANTS } from '../constants';

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
  const { resetExponentialSmoothingModel } = useExperiment();

  const [isResetting, setIsResetting] = useState(false);

  // Use shared simple model hook
  const {
    param: alpha,
    setParam: setAlpha,
    results,
    isLoading,
    error,
    setError,
    isValidParam: isValidAlpha,
    handleCalculate,
    markAsCompleted,
    handleRetry,
  } = useSimpleModel<number | ''>({
    type: 'exponential_smoothing',
    apiEndpoint: '/models/es/training',
    stateKeys: {
      param: 'exponential_smoothing_alpha',
      completed: 'exponential_smoothing_completed',
      metricsRmse: 'exponential_smoothing_metrics_rmse',
      metricsMae: 'exponential_smoothing_metrics_mae',
      metricsR2: 'exponential_smoothing_metrics_r2',
    },
    paramKey: 'exponential_smoothing_alpha',
    validateParam: (alpha) => {
      if (alpha === '' || alpha <= EXPONENTIAL_SMOOTHING_CONSTANTS.MIN_ALPHA) return false;
      if (alpha > EXPONENTIAL_SMOOTHING_CONSTANTS.MAX_ALPHA) return false;
      return true;
    },
  });

  const isValidationPage = location.pathname === VALIDATION_PATH;
  const isComparisonPage = location.pathname === COMPARISON_PATH;

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

  useAutoCalculation({
    calculationStepId: 'results',
    currentStepId: currentStep?.id,
    handleCalculate,
    canCalculate: isValidAlpha,
    results,
    isLoading,
    error,
  });

  // When navigating back from a failed calculation, the error state can persist
  // and incorrectly disable the "Next" button on parameter pages.
  // This effect declaratively clears any lingering errors when the user is on a
  // non-calculation step, ensuring the UI is always in a valid state.
  useEffect(() => {
    if (currentStep?.id === 'params' || currentStep?.id === 'validation') {
      setError(null);
    }
  }, [currentStep?.id, setError]);

  // When returning to the intro page (e.g., after a reset),
  // ensure all calculation-related state is cleared.
  useEffect(() => {
    if (currentStep?.id === 'intro') {
      setAlpha('');
      setError(null);
    }
  }, [currentStep?.id]);

  const handleReset = async () => {
    setIsResetting(true);
    try {
      // Clear global state - local state is cleared by the useEffect above
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
      // Check if params are valid
      if (!isValidAlpha) {
        // Stay on validation page, error message will be shown
        return;
      }
      // If valid, proceed to results
      const nextStep = STEPS[RESULTS_STEP_INDEX];
      if (nextStep) navigate(nextStep.path);
      return;
    }

    if (currentStep?.id === 'results') {
      // Mark model as completed and navigate to comparison page
      await markAsCompleted();
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
      const prevStep = STEPS[PARAMS_STEP_INDEX];
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

  if (!currentStep) {
    return null;
  }

  const CurrentComponent = currentStep.component as React.FC<any>;

  const componentProps: { [key: string]: ParamsProps | ValidationProps | ResultsProps | {} } = {
    params: { alpha, setAlpha, isLoading },
    validation: { alpha, isValid: isValidAlpha },
    results: { data: results, isLoading, error, onRetry: handleRetry },
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
      isNextDisabled={isLoading || !!error || (isValidationPage && !isValidAlpha)}
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
