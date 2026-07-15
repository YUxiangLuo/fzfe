import React, { useMemo } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import ModelStepLayout from '../components/ModelStepLayout';
import Intro from './Intro';
import SelectModels, { type SelectModelsProps } from './SelectModels';
import Results, { type ResultsProps } from './Results';
import ModelMetricsComparison from './ModelMetricsComparison';
import { MODEL_RETRY_LIMITS } from '../constants';
import { useAutoCalculation } from '../hooks/useAutoCalculation';
import { useEnsembleModel } from '../hooks/useEnsembleModel';
import RetryExceededFallback from '../components/RetryExceededFallback';

const MODEL_NAME = 'Stacking 融合';
const BASE_PATH = '/model/stacking-ensemble';

const STEPS = [
  { id: 'intro', name: '方法步骤', path: `${BASE_PATH}/intro`, component: Intro },
  { id: 'select-models', name: '模型选择', path: `${BASE_PATH}/select-models`, component: SelectModels },
  { id: 'results', name: '分阶段训练与结果', path: `${BASE_PATH}/results`, component: Results },
];

// Hidden pages - not part of the main steps
const MODEL_METRICS_COMPARISON_PATH = `${BASE_PATH}/model-metrics-comparison`;

// Step indices for navigation
const RESULTS_STEP_INDEX = 2;

const StackingEnsembleStepper: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Use shared ensemble model hook
  const {
    selectedModels,
    setSelectedModels,
    results,
    isLoading,
    error,
    setError,
    isValidSelection,
    initializeGuidedSession,
    runNextGuidedStep,
    markAsCompleted,
    handleRetry,
    discardAndRestart,
    retryCount,
    guidedSession,
    currentProgress,
    progressEvents,
  } = useEnsembleModel({
    type: 'stacking',
    stateKey: {
      baseModels: 'ensemble_stacking_base_models',
      completed: 'ensemble_stacking_completed',
      metricsRmse: 'ensemble_stacking_metrics_rmse',
      metricsMae: 'ensemble_stacking_metrics_mae',
      metricsR2: 'ensemble_stacking_metrics_r2',
    },
  });

  const isModelMetricsComparisonPage = location.pathname === MODEL_METRICS_COMPARISON_PATH;

  const currentStepIndex = useMemo(() => {
    if (isModelMetricsComparisonPage) {
      // Hidden pages are part of results in the step navigation
      return RESULTS_STEP_INDEX;
    }
    const currentPath = location.pathname;
    const index = STEPS.findIndex(step => step.path === currentPath);
    return index === -1 ? 0 : index;
  }, [location.pathname, isModelMetricsComparisonPage]);

  const currentStep = useMemo(() => {
    if (isModelMetricsComparisonPage) {
      return { id: 'model-metrics-comparison', name: '模型指标对比', path: MODEL_METRICS_COMPARISON_PATH, component: ModelMetricsComparison };
    }
    return STEPS[currentStepIndex];
  }, [currentStepIndex, isModelMetricsComparisonPage]);

  useAutoCalculation({
    calculationStepId: 'results',
    currentStepId: currentStep?.id,
    handleCalculate: initializeGuidedSession,
    canCalculate: isValidSelection,
    results,
    isLoading,
    error,
  });

  const handleNext = async () => {
    const nextStepIndex = currentStepIndex + 1;

    if (currentStep?.id === 'select-models') {
      const nextStep = STEPS[nextStepIndex];
      if (nextStep) navigate(nextStep.path);
      return;
    }

    if (currentStep?.id === 'results') {
      if (!results) {
        setError('请先完成分阶段训练，生成融合结果后再进入下一步。');
        return;
      }
      try {
        await markAsCompleted();
      } catch {
        return;
      }
      navigate(MODEL_METRICS_COMPARISON_PATH);
      return;
    }

    if (currentStep?.id === 'model-metrics-comparison') {
      navigate('/model/ensemble-select');
      return;
    }

    if (nextStepIndex < STEPS.length) {
      const nextStep = STEPS[nextStepIndex];
      if (nextStep) navigate(nextStep.path);
    }
  };

  const handlePrevious = () => {
    if (isModelMetricsComparisonPage) {
      const prevStep = STEPS[RESULTS_STEP_INDEX];
      if (prevStep) navigate(prevStep.path);
      return;
    }
    const prevStep = STEPS[currentStepIndex - 1];
    if (prevStep) {
      navigate(prevStep.path);
    } else {
      navigate('/model/ensemble-select');
    }
  };

  if (!currentStep) {
    return null;
  }

  const CurrentComponent = currentStep.component as React.FC<any>;

  const componentProps: { [key: string]: SelectModelsProps | ResultsProps | {} } = {
    'select-models': { selectedModels, setSelectedModels, error },
    results: {
      data: results,
      isLoading,
      error,
      onRetry: handleRetry,
      guidedSession,
      onInitialize: initializeGuidedSession,
      onRunNextStep: runNextGuidedStep,
      currentProgress,
      progressEvents,
    },
    'model-metrics-comparison': {},
  };

  const propsForCurrentStep = componentProps[currentStep.id] ?? {};

  const getCurrentStepId = () => {
    if (isModelMetricsComparisonPage) return 'results';
    return currentStep.id;
  };

  const renderContent = () => {
    if (currentStep.id === 'results' && error && retryCount >= MODEL_RETRY_LIMITS.maxFailures) {
      return <RetryExceededFallback navigate={navigate} onRestart={discardAndRestart} />;
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
      isPreviousDisabled={isLoading || retryCount >= MODEL_RETRY_LIMITS.maxFailures}
      isNextDisabled={isLoading || !!error || (currentStep.id==="select-models"&&!(selectedModels.length>1)) || (currentStep.id === 'results' && !results)}
      nextButtonText={
        currentStep?.id === 'model-metrics-comparison' ? '完成' : '下一步'
      }
    >
      {renderContent()}
    </ModelStepLayout>
  );
};

const StackingEnsembleModelRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="*" element={<StackingEnsembleStepper />} />
    </Routes>
  );
};

export default StackingEnsembleModelRoutes;
