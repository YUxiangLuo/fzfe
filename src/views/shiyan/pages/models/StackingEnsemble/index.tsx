import React, { useState, useMemo, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import ModelStepLayout from '../components/ModelStepLayout';
import Intro from './Intro';
import SelectModels, { type SelectModelsProps } from './SelectModels';
import Results, { type ResultsProps } from './Results';
import ModelMetricsComparison, { type ModelMetricsComparisonProps } from './ModelMetricsComparison';
import { useExperiment } from '../../../contexts/ExperimentContext.zustand';
import { useEnsembleModel } from '../hooks/useEnsembleModel';

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

  const [isResetting, setIsResetting] = useState(false);

  // Use shared ensemble model hook
  const {
    selectedModels,
    setSelectedModels,
    results,
    isLoading,
    error,
    setError,
    isValidSelection,
    handleCalculate,
    markAsCompleted,
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

  // Auto-calculate when entering results page
  useEffect(() => {
    if (currentStep?.id === 'results' && !results && !isLoading) {
      handleCalculate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep?.id, results, isLoading]);

  const handleReset = async () => {
    setIsResetting(true);
    try {
      // Clear local state
      setSelectedModels([]);
      setError(null);

      // Clear global state
      await resetStackingEnsembleModel();

      // Navigate to first step
      navigate(`${BASE_PATH}/intro`);
    } finally {
      setIsResetting(false);
    }
  };

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

  const componentProps: { [key: string]: SelectModelsProps | ResultsProps | ModelMetricsComparisonProps | {} } = {
    'select-models': { selectedModels, setSelectedModels, error },
    results: { data: results, isLoading, error },
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

  return (
    <ModelStepLayout
      title={MODEL_NAME}
      steps={STEPS}
      currentStepId={getCurrentStepId()}
      onNext={handleNext}
      onPrevious={handlePrevious}
      onReset={handleReset}
      isResetting={isResetting}
      isNextDisabled={isLoading}
      nextButtonText={
        currentStep?.id === 'model-metrics-comparison' ? '完成' : '下一步'
      }
    >
      <CurrentComponent key={currentStep.id} {...propsForCurrentStep} />
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
