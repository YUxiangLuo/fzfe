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
import { useSimpleModel } from '../hooks/useSimpleModel';
import { MOVING_AVERAGE_CONSTANTS } from '../constants';

const MODEL_NAME = '移动平均法';
const BASE_PATH = '/model/moving-average';

const STEPS = [
  { id: 'intro', name: '方法步骤', path: `${BASE_PATH}/intro`, component: Intro },
  { id: 'formula', name: '计算公式', path: `${BASE_PATH}/formula`, component: Formula },
  { id: 'params', name: '时间窗口选取', path: `${BASE_PATH}/params`, component: Params },
  { id: 'results', name: '计算结果', path: `${BASE_PATH}/results`, component: Results },
];

// Hidden pages - not part of the main steps
const VALIDATION_PATH = `${BASE_PATH}/validation`;
const COMPARISON_PATH = `${BASE_PATH}/comparison`;

// Step indices for navigation
const PARAMS_STEP_INDEX = 2;
const RESULTS_STEP_INDEX = 3;

const MovingAverageStepper: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, resetMovingAverageModel } = useExperiment();

  const [isResetting, setIsResetting] = useState(false);

  // Calculate training data length for validation
  const trainDataLength = useMemo(() => {
    if (state.data_window_train_start_index === null || state.data_window_train_end_index === null) {
      return 0;
    }
    return state.data_window_train_end_index - state.data_window_train_start_index + 1;
  }, [state.data_window_train_start_index, state.data_window_train_end_index]);

  // Use shared simple model hook
  const {
    param: windowSize,
    setParam: setWindowSize,
    results,
    isLoading,
    error,
    setError,
    isValidParam: isValidWindowSize,
    handleCalculate,
    markAsCompleted,
  } = useSimpleModel<number | ''>({
    type: 'moving_average',
    apiEndpoint: '/models/ma/training',
    stateKeys: {
      param: 'moving_average_window',
      completed: 'moving_average_completed',
      metricsRmse: 'moving_average_metrics_rmse',
      metricsMae: 'moving_average_metrics_mae',
      metricsR2: 'moving_average_metrics_r2',
    },
    paramKey: 'moving_average_window',
    validateParam: (window) => {
      if (window === '' || window <= 0) return false;
      if (window < MOVING_AVERAGE_CONSTANTS.MIN_WINDOW_SIZE) return false;
      if (trainDataLength > 0 && window > trainDataLength) return false;
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

  // Auto-calculate when entering results page, ONLY if parameters are valid
  useEffect(() => {
    if (currentStep?.id === 'results' && !results && !isLoading && isValidWindowSize) {
      handleCalculate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep?.id, results, isLoading, isValidWindowSize, handleCalculate]);

  const handleReset = async () => {
    setIsResetting(true);
    try {
      setWindowSize('');
      setError(null);
      await resetMovingAverageModel();
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
      // Check if windowSize is valid using the same validation logic
      if (!isValidWindowSize) {
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
    params: { windowSize, setWindowSize, isLoading, error },
    validation: { windowSize, isValid: isValidWindowSize, trainDataLength },
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
      isNextDisabled={isLoading || (isValidationPage && !isValidWindowSize)}
      nextButtonText={getNextButtonText()}
    >
      <CurrentComponent key={currentStep.id} {...propsForCurrentStep} />
    </ModelStepLayout>
  );
};

const MovingAverageModelRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="*" element={<MovingAverageStepper />} />
    </Routes>
  );
};

export default MovingAverageModelRoutes;
