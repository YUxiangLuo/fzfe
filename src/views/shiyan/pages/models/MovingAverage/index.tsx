import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import ModelStepLayout from '../components/ModelStepLayout';
import Intro from './Intro';
import Formula from './Formula';
import Params, { type ParamsProps } from './Params';
import Results, { type ResultsProps } from './Results';
import { useExperiment } from '../../../contexts/ExperimentContext';
import { apiClient } from '../../../../../utils/apiClient';

const MODEL_NAME = '移动平均法';
const BASE_PATH = '/model/moving-average';

const STEPS = [
  { id: 'intro', name: '方法步骤', path: `${BASE_PATH}/intro`, component: Intro },
  { id: 'formula', name: '计算公式', path: `${BASE_PATH}/formula`, component: Formula },
  { id: 'params', name: '时间窗口选取', path: `${BASE_PATH}/params`, component: Params },
  { id: 'results', name: '计算结果', path: `${BASE_PATH}/results`, component: Results },
];

const MovingAverageStepper: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, updateState, productSalesData, resetMovingAverageModel } = useExperiment();

  const [windowSize, setWindowSize] = useState<number | ''>(state.moving_average_window ?? 3);
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
      const requestBody = {
        selected_industry: state.selected_industry,
        selected_company: state.selected_company,
        selected_product: state.selected_product,
        data_window_train_start_index: state.data_window_train_start_index,
        data_window_train_end_index: state.data_window_train_end_index,
        data_window_evaluate_start_index: state.data_window_evaluate_start_index,
        data_window_evaluate_end_index: state.data_window_evaluate_end_index,
        moving_average_window: windowSize,
      };

      const response = await apiClient.post<any>("/models/ma/training", requestBody);

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
          moving_average_window: windowSize === '' ? null : windowSize,
          moving_average_metrics_rmse: apiResults.metrics.rmse,
          moving_average_metrics_mae: apiResults.metrics.mae,
          moving_average_metrics_r2: apiResults.metrics.r2,
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
    windowSize,
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
    setWindowSize(3);
    setResults(null);
    setError(null);

    // Clear global state
    await resetMovingAverageModel();

    // Navigate to first step
    navigate(`${BASE_PATH}/intro`);
  };

  const handleNext = async () => {
    setError(null);

    if (currentStep?.id === 'params') {
      if (!windowSize || windowSize <= 0) {
        setError('请输入一个有效的时间窗口大小。');
        return;
      }
    }

    const isLastStep = currentStepIndex === STEPS.length - 1;
    if (isLastStep) {
      await updateState({ moving_average_completed: true });
      navigate('/model/model-select');
    } else {
      const nextStep = STEPS[currentStepIndex + 1];
      if (nextStep) {
        navigate(nextStep.path);
      }
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

  const componentProps: { [key: string]: ParamsProps | ResultsProps | {} } = {
    params: { windowSize, setWindowSize, isLoading, error },
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

const MovingAverageModelRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="*" element={<MovingAverageStepper />} />
    </Routes>
  );
};

export default MovingAverageModelRoutes;
