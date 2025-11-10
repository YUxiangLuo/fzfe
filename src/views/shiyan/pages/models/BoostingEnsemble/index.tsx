import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import ModelStepLayout from '../components/ModelStepLayout';
import Intro from './Intro';
import SelectModels, { type SelectModelsProps } from './SelectModels';
import Results, { type ResultsProps } from './Results';
import { useExperiment } from '../../../contexts/ExperimentContext';
import { apiClient } from '../../../../../utils/apiClient';

const MODEL_NAME = 'Boosting 融合';
const BASE_PATH = '/model/boosting-ensemble';

const STEPS = [
  { id: 'intro', name: '方法步骤', path: `${BASE_PATH}/intro`, component: Intro },
  { id: 'select-models', name: '模型选择', path: `${BASE_PATH}/select-models`, component: SelectModels },
  { id: 'results', name: '计算结果', path: `${BASE_PATH}/results`, component: Results },
];

const BoostingEnsembleStepper: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, updateState, productSalesData, resetBoostingEnsembleModel } = useExperiment();

  const [selectedModels, setSelectedModels] = useState<string[]>(state.ensemble_boosting_base_models ?? []);
  const [results, setResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const evaluateMonths = useMemo(() => {
    if (!productSalesData || state.data_window_evaluate_start_index === null || state.data_window_evaluate_end_index === null) {
      return [];
    }
    const start = state.data_window_evaluate_start_index;
    const end = state.data_window_evaluate_end_index;
    return productSalesData.monthlySales.slice(start, end + 1).map(item => item.month);
  }, [productSalesData, state.data_window_evaluate_start_index, state.data_window_evaluate_end_index]);

  const currentStepIndex = useMemo(() => {
    const currentPath = location.pathname;
    const index = STEPS.findIndex(step => step.path === currentPath);
    return index === -1 ? 0 : index;
  }, [location.pathname]);

  const currentStep = useMemo(() => STEPS[currentStepIndex], [currentStepIndex]);

  const handleCalculate = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const modelIdMap: Record<string, string> = {
        'moving_average': 'ma', 'exponential_smoothing': 'es', 'arima': 'arima', 'lstm': 'lstm'
      };
      const backendModels = selectedModels.map(id => modelIdMap[id] || id);

      const requestBody: Record<string, any> = {
        selected_industry: state.selected_industry,
        selected_company: state.selected_company,
        selected_product: state.selected_product,
        data_window_train_start_index: state.data_window_train_start_index,
        data_window_train_end_index: state.data_window_train_end_index,
        data_window_evaluate_start_index: state.data_window_evaluate_start_index,
        data_window_evaluate_end_index: state.data_window_evaluate_end_index,
        ensemble_boosting_base_models: backendModels,
      };

      if (backendModels.includes('arima')) requestBody.arima_d = state.arima_d;
      if (backendModels.includes('es')) requestBody.exponential_smoothing_alpha = state.exponential_smoothing_alpha;
      if (backendModels.includes('ma')) requestBody.moving_average_window = state.moving_average_window;
      if (backendModels.includes('lstm')) {
        requestBody.lstm_features = state.lstm_features;
        requestBody.lstm_target_field = state.lstm_target_field;
        requestBody.lstm_normalization = state.lstm_normalization;
      }

      const response = await apiClient.post<any>("/models/boosting/training", requestBody);

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

        await updateState({
          ensemble_boosting_base_models: selectedModels,
          ensemble_boosting_metrics_rmse: apiResults.metrics.rmse,
          ensemble_boosting_metrics_mae: apiResults.metrics.mae,
          ensemble_boosting_metrics_r2: apiResults.metrics.r2,
        });
      } else {
        throw new Error(response.message || "模型训练失败。");
      }
    } catch (e: any) {
      setError(e.message || "模型训练时发生错误。");
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
    state.arima_d,
    state.exponential_smoothing_alpha,
    state.moving_average_window,
    state.lstm_features,
    state.lstm_target_field,
    state.lstm_normalization,
    selectedModels,
    evaluateMonths,
    updateState
  ]);

  useEffect(() => {
    if (currentStep?.id === 'results' && !results && !isLoading) {
      handleCalculate();
    }
  }, [currentStep?.id, results, isLoading, handleCalculate]);

  const handleReset = async () => {
    // Clear local state
    setSelectedModels([]);
    setResults(null);
    setError(null);

    // Clear global state
    await resetBoostingEnsembleModel();

    // Navigate to first step
    navigate(`${BASE_PATH}/intro`);
  };

  const handleNext = async () => {
    setError(null);
    const nextStepIndex = currentStepIndex + 1;

    if (currentStep?.id === 'select-models') {
      if (selectedModels.length < 2) {
        setError("请至少选择两个基础模型进行融合。");
        return;
      }
      if (STEPS[nextStepIndex]) navigate(STEPS[nextStepIndex].path);
      return;
    }

    if (currentStepIndex === STEPS.length - 1) {
      await updateState({ ensemble_boosting_completed: true });
      navigate('/model/model-select');
      return;
    }

    if (nextStepIndex < STEPS.length && STEPS[nextStepIndex]) {
      navigate(STEPS[nextStepIndex].path);
    }
  };

  const handlePrevious = () => {
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

  const componentProps: { [key: string]: SelectModelsProps | ResultsProps | {} } = {
    'select-models': { selectedModels, setSelectedModels, error },
    results: { data: results, isLoading, error },
  };

  const propsForCurrentStep = componentProps[currentStep.id] ?? {};

  return (
    <ModelStepLayout
      title={MODEL_NAME}
      steps={STEPS}
      currentStepId={currentStep.id}
      onNext={handleNext}
      onPrevious={handlePrevious}
      onReset={handleReset}
      isNextDisabled={isLoading}
      nextButtonText={currentStepIndex === STEPS.length - 1 ? '完成' : '下一步'}
    >
      <CurrentComponent key={currentStep.id} {...propsForCurrentStep} />
    </ModelStepLayout>
  );
};

const BoostingEnsembleModelRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="*" element={<BoostingEnsembleStepper />} />
    </Routes>
  );
};

export default BoostingEnsembleModelRoutes;
