import React, { useState, useMemo, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import ModelStepLayout from '../components/ModelStepLayout';
import Intro from './Intro';
import SelectModels, { type SelectModelsProps } from './SelectModels';
import Results, { type ResultsProps } from './Results';
import PredictionComparison, { type PredictionComparisonProps } from './PredictionComparison';
import ModelMetricsComparison, { type ModelMetricsComparisonProps } from './ModelMetricsComparison';
import { useExperiment } from '../../../contexts/ExperimentContext';
import { useEnsembleModel } from '../hooks/useEnsembleModel';

const MODEL_NAME = '加权平均融合';
const BASE_PATH = '/model/weighted-ensemble';

const STEPS = [
  { id: 'intro', name: '方法步骤', path: `${BASE_PATH}/intro`, component: Intro },
  { id: 'select-models', name: '模型选择', path: `${BASE_PATH}/select-models`, component: SelectModels },
  { id: 'results', name: '计算结果', path: `${BASE_PATH}/results`, component: Results },
];

// Hidden pages - not part of the main steps
const PREDICTION_COMPARISON_PATH = `${BASE_PATH}/prediction-comparison`;
const MODEL_METRICS_COMPARISON_PATH = `${BASE_PATH}/model-metrics-comparison`;

// Step indices for navigation
const RESULTS_STEP_INDEX = 2;

const WeightedEnsembleStepper: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { resetWeightedEnsembleModel } = useExperiment();

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
    type: 'weighted',
    apiEndpoint: '/models/weighted-average/training',
    stateKey: {
      baseModels: 'ensemble_weighted_base_models',
      completed: 'ensemble_weighted_completed',
      metricsRmse: 'ensemble_weighted_metrics_rmse',
      metricsMae: 'ensemble_weighted_metrics_mae',
      metricsR2: 'ensemble_weighted_metrics_r2',
    },
  });

  const isPredictionComparisonPage = location.pathname === PREDICTION_COMPARISON_PATH;
  const isModelMetricsComparisonPage = location.pathname === MODEL_METRICS_COMPARISON_PATH;

  const currentStepIndex = useMemo(() => {
    if (isPredictionComparisonPage || isModelMetricsComparisonPage) {
      // Hidden pages are part of results in the step navigation
      return RESULTS_STEP_INDEX;
    }
    const currentPath = location.pathname;
    const index = STEPS.findIndex(step => step.path === currentPath);
    return index === -1 ? 0 : index;
  }, [location.pathname, isPredictionComparisonPage, isModelMetricsComparisonPage]);

  const currentStep = useMemo(() => {
    if (isPredictionComparisonPage) {
      return { id: 'prediction-comparison', name: '真实值预测值对比', path: PREDICTION_COMPARISON_PATH, component: PredictionComparison };
    }
    if (isModelMetricsComparisonPage) {
      return { id: 'model-metrics-comparison', name: '模型指标对比', path: MODEL_METRICS_COMPARISON_PATH, component: ModelMetricsComparison };
    }
    return STEPS[currentStepIndex];
  }, [currentStepIndex, isPredictionComparisonPage, isModelMetricsComparisonPage]);

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
      setResults(null);
      setError(null);

      // Clear global state
      await resetWeightedEnsembleModel();

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
      if (STEPS[nextStepIndex]) navigate(STEPS[nextStepIndex].path);
      return;
    }

    if (currentStep?.id === 'results') {
      // Navigate to prediction comparison page
      navigate(PREDICTION_COMPARISON_PATH);
      return;
    }

    if (currentStep?.id === 'prediction-comparison') {
      // Navigate to model metrics comparison page
      navigate(MODEL_METRICS_COMPARISON_PATH);
      return;
    }

    if (currentStep?.id === 'model-metrics-comparison') {
      // Mark as completed and return to model select
      await markAsCompleted();
      navigate('/model/model-select');
      return;
    }

    if (nextStepIndex < STEPS.length && STEPS[nextStepIndex]) {
      navigate(STEPS[nextStepIndex].path);
    }
  };

  const handlePrevious = () => {
    if (isPredictionComparisonPage) {
      // From prediction comparison, go back to results
      navigate(STEPS[RESULTS_STEP_INDEX].path);
      return;
    }

    if (isModelMetricsComparisonPage) {
      // From model metrics comparison, go back to prediction comparison
      navigate(PREDICTION_COMPARISON_PATH);
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

  const componentProps: { [key: string]: SelectModelsProps | ResultsProps | PredictionComparisonProps | ModelMetricsComparisonProps | {} } = {
    'select-models': { selectedModels, setSelectedModels, error },
    results: {
      data: results ? { weights: results.weights, model_names: results.model_names } : null,
      isLoading,
      error
    },
    'prediction-comparison': {
      data: results ? { predictions: results.predictions } : null
    },
    'model-metrics-comparison': {
      data: results ? { metrics: results.metrics } : null,
      baseModelIds: selectedModels
    },
  };

  const propsForCurrentStep = componentProps[currentStep.id] ?? {};

  const getCurrentStepId = () => {
    if (isPredictionComparisonPage || isModelMetricsComparisonPage) return 'results';
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

const WeightedEnsembleModelRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="*" element={<WeightedEnsembleStepper />} />
    </Routes>
  );
};

export default WeightedEnsembleModelRoutes;
