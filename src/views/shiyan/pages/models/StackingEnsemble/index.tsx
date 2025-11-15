import React, { useState, useMemo, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import ModelStepLayout from '../components/ModelStepLayout';
import Intro from './Intro';
import SelectModels, { type SelectModelsProps } from './SelectModels';
import Results, { type ResultsProps } from './Results';
import ModelMetricsComparison, { type ModelMetricsComparisonProps } from './ModelMetricsComparison';
import { useExperiment } from '../../../contexts/ExperimentContext.zustand';
import { useAutoCalculation } from '../hooks/useAutoCalculation';
import { useEnsembleModel } from '../hooks/useEnsembleModel';
import RetryExceededFallback from '../components/RetryExceededFallback';

const MODEL_NAME = 'Stacking 融合';
const BASE_PATH = '/model/stacking-ensemble';

const STEPS = [
  { id: 'intro', name: '方法步骤', path: `${BASE_PATH}/intro`, component: Intro },
  { id: 'select-models', name: '模型选择', path: `${BASE_PATH}/select-models`, component: SelectModels },
  { id: 'results', name: '计算结果', path: `${BASE_PATH}/results`, component: Results },
];

// Hidden pages - not part of the main steps
const MODEL_METRICS_COMPARISON_PATH = `${BASE_PATH}/model-metrics-comparison`;

// Step indices for navigation
const RESULTS_STEP_INDEX = 2;

const StackingEnsembleStepper: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { resetStackingEnsembleModel } = useExperiment();

  // Use shared ensemble model hook
  const {
    selectedModels,
    setSelectedModels,
    results,
    setResults,
    isLoading,
    error,
    setError,
    isValidSelection,
    handleCalculate,
    markAsCompleted,
    handleRetry,
    retryCount,
  } = useEnsembleModel({
    type: 'stacking',
    apiEndpoint: '/models/stacking/training',
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
    handleCalculate,
    canCalculate: isValidSelection,
    results,
    isLoading,
    error,
  });

  // non-calculation step, ensuring the UI is always in a valid state.
  useEffect(() => {
    if (currentStep?.id === 'select-models') {
      setError(null);
    }
  }, [currentStep?.id, setError]);

  // When returning to the intro page (e.g., after a reset),
  // ensure all calculation-related state is cleared.
  useEffect(() => {
    if (currentStep?.id === 'intro') {
      setSelectedModels([]);
      setResults(null);
      setError(null);
    }
  }, [currentStep?.id, setSelectedModels, setResults, setError]);

  // Clear validation error as soon as the user corrects the input
  useEffect(() => {
    if (selectedModels.length >= 2 && error === "请至少选择两个基础模型。") {
      setError(null);
    }
  }, [selectedModels, error, setError]);

  const handleNext = async () => {
    setError(null);
    const nextStepIndex = currentStepIndex + 1;

    if (currentStep?.id === 'select-models') {
      if (!isValidSelection) {
        setError("请至少选择两个基础模型进行融合。");
        return;
      }
      const nextStep = STEPS[nextStepIndex];
      if (nextStep) navigate(nextStep.path);
      return;
    }

    if (currentStep?.id === 'results') {
      // Navigate to model metrics comparison page
      await markAsCompleted();
      navigate(MODEL_METRICS_COMPARISON_PATH);
      return;
    }

    if (currentStep?.id === 'model-metrics-comparison') {
      // Mark as completed and return to ensemble model select
      
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
      // From model metrics comparison, go back to results
      setError(null); // Clear error when leaving
      const prevStep = STEPS[RESULTS_STEP_INDEX];
      if (prevStep) navigate(prevStep.path);
      return;
    }

    if (currentStep?.id === 'results') {
      setError(null); // Clear error when leaving
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

  const componentProps: { [key: string]: SelectModelsProps | ResultsProps | ModelMetricsComparisonProps | {} } = {
    'select-models': { selectedModels, setSelectedModels, error },
    results: { data: results, isLoading, error, onRetry: handleRetry },
    'model-metrics-comparison': {
      data: results ? { metrics: results.metrics } : null,
      baseModelIds: selectedModels
    },
  };

  const propsForCurrentStep = componentProps[currentStep.id] ?? {};

  const getCurrentStepId = () => {
    if (isModelMetricsComparisonPage) return 'results';
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
      isNextDisabled={isLoading || !!error}
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
