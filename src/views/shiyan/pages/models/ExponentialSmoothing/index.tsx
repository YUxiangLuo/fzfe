import React, { useMemo, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import ModelStepLayout from '../components/ModelStepLayout';
import Intro from './Intro';
import Formula from './Formula';
import Params, { type ParamsProps } from './Params';
import Validation, { type ValidationProps } from './Validation';
import Results, { type ResultsProps } from './Results';
import ModelComparison from './ModelComparison';
import { useSimpleModel } from '../hooks/useSimpleModel';
import { EXPONENTIAL_SMOOTHING_CONSTANTS, MODEL_RETRY_LIMITS } from '../constants';
import RetryExceededFallback from '../components/RetryExceededFallback';

const MODEL_NAME = '指数平滑法';
const BASE_PATH = '/model/exponential-smoothing';

const STEPS = [
  { id: 'intro', name: '方法步骤', path: `${BASE_PATH}/intro`, component: Intro },
  { id: 'formula', name: '计算公式', path: `${BASE_PATH}/formula`, component: Formula },
  { id: 'params', name: '平滑系数选择', path: `${BASE_PATH}/params`, component: Params },
  { id: 'results', name: '计算结果', path: `${BASE_PATH}/results`, component: Results },
];

const VALIDATION_PATH = `${BASE_PATH}/validation`;
const COMPARISON_PATH = `${BASE_PATH}/comparison`;

const PARAMS_STEP_INDEX = 2;
const RESULTS_STEP_INDEX = 3;

const ExponentialSmoothingStepper: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    param: alpha,
    setParam: setAlpha,
    results,
    isLoading,
    error,
    setError,
    isValidParam: isValidAlpha,
    initializeGuidedSession,
    runNextGuidedStep,
    markAsCompleted,
    handleRetry,
    retryCount,
    guidedSession,
    currentProgress,
    progressEvents,
  } = useSimpleModel<number | ''>({
    type: 'exponential_smoothing',
    apiEndpoint: '/models/es/training',
    guidedModelType: 'es',
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
      return PARAMS_STEP_INDEX;
    }
    if (isComparisonPage) {
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

  useEffect(() => {
    if (currentStep?.id === 'results' && isValidAlpha && !results && !error) {
      void initializeGuidedSession();
    }
  }, [currentStep?.id, error, initializeGuidedSession, isValidAlpha, results]);

  const handleNext = async () => {
    if (currentStep?.id === 'params') {
      navigate(VALIDATION_PATH);
      return;
    }

    if (currentStep?.id === 'validation') {
      if (!isValidAlpha) {
        return;
      }
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
        await markAsCompleted();
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
    if (isValidationPage) {
      const prevStep = STEPS[PARAMS_STEP_INDEX];
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

  if (!currentStep) {
    return null;
  }

  const CurrentComponent = currentStep.component as React.FC<any>;

  const componentProps: { [key: string]: ParamsProps | ValidationProps | ResultsProps | {} } = {
    params: { alpha, setAlpha },
    validation: { alpha, isValid: isValidAlpha },
    results: {
      data: results,
      guidedSession,
      isLoading,
      error,
      onRetry: handleRetry,
      onInitialize: initializeGuidedSession,
      onRunNextStep: runNextGuidedStep,
      currentProgress,
      progressEvents,
    },
  };

  const propsForCurrentStep = componentProps[currentStep.id] ?? {};

  const getNextButtonText = () => {
    if (isComparisonPage) return '完成';
    if (currentStepIndex === STEPS.length - 1) return '下一步';
    return '下一步';
  };

  const getCurrentStepId = () => {
    if (isValidationPage) return 'params';
    if (isComparisonPage) return 'results';
    return currentStep.id;
  };

  const renderContent = () => {
    if (currentStep.id === 'results' && error && retryCount >= MODEL_RETRY_LIMITS.maxFailures) {
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
      isPreviousDisabled={retryCount >= MODEL_RETRY_LIMITS.maxFailures || isLoading}
      isNextDisabled={isLoading || !!error || (isValidationPage && !isValidAlpha) || (currentStep.id === 'results' && !results)}
      nextButtonText={getNextButtonText()}
    >
      {renderContent()}
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
