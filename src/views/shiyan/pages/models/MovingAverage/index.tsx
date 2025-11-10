import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import ModelStepLayout from '../components/ModelStepLayout';
import Intro from './Intro';
import Formula from './Formula';
import Params, { type ParamsProps } from './Params';
import Validation, { type ValidationProps } from './Validation';
import Results, { type ResultsProps } from './Results';
import { useExperiment } from '../../../contexts/ExperimentContext';
import { apiClient } from '../../../../../utils/apiClient';

const MODEL_NAME = '移动平均法';
const BASE_PATH = '/model/moving-average';

const STEPS = [
  { id: 'intro', name: '方法步骤', path: `${BASE_PATH}/intro`, component: Intro },
  { id: 'formula', name: '计算公式', path: `${BASE_PATH}/formula`, component: Formula },
  { id: 'params', name: '时间窗口选取', path: `${BASE_PATH}/params`, component: Params },
  { id: 'validation', name: '验证', path: `${BASE_PATH}/validation`, component: Validation },
  { id: 'results', name: '计算结果', path: `${BASE_PATH}/results`, component: Results },
];

const MovingAverageStepper: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, updateState, productSalesData, resetMovingAverageModel } = useExperiment();

  const [windowSize, setWindowSize] = useState<number | ''>(state.moving_average_window ?? '');
  const [results, setResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);


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
    productSalesData,
    updateState
  ]);

  useEffect(() => {
    if (currentStep?.id === 'results' && !results && !isLoading) {
      handleCalculate();
    }
  }, [currentStep?.id, results, isLoading, handleCalculate]);

  const handleReset = async () => {
    setIsResetting(true);
    try {
      // Clear local state
      setWindowSize('');
      setResults(null);
      setError(null);

      // Clear global state
      await resetMovingAverageModel();

      // Navigate to first step
      navigate(`${BASE_PATH}/intro`);
    } finally {
      setIsResetting(false);
    }
  };

  const handleNext = async () => {
    setError(null);

    if (currentStep?.id === 'params') {
      // Navigate to validation step without validation
      const nextStep = STEPS[currentStepIndex + 1];
      if (nextStep) {
        navigate(nextStep.path);
      }
      return;
    }

    if (currentStep?.id === 'validation') {
      // Check if windowSize is valid
      if (!windowSize || windowSize <= 0) {
        // Stay on validation page, error message will be shown
        return;
      }
      // If valid, proceed to results
      const nextStep = STEPS[currentStepIndex + 1];
      if (nextStep) {
        navigate(nextStep.path);
      }
      return;
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

  // Calculate training data length for validation
  const trainDataLength = useMemo(() => {
    if (state.data_window_train_start_index === null || state.data_window_train_end_index === null) {
      return 0;
    }
    return state.data_window_train_end_index - state.data_window_train_start_index + 1;
  }, [state.data_window_train_start_index, state.data_window_train_end_index]);

  const isValidWindowSize = useMemo(() => {
    if (windowSize === '' || windowSize <= 0) return false;
    if (windowSize < 2) return false; // 窗口大小至少为2
    if (trainDataLength > 0 && windowSize > trainDataLength) return false; // 不能超过训练数据长度
    return true;
  }, [windowSize, trainDataLength]);

  const componentProps: { [key: string]: ParamsProps | ValidationProps | ResultsProps | {} } = {
    params: { windowSize, setWindowSize, isLoading, error },
    validation: { windowSize, isValid: isValidWindowSize, trainDataLength },
    results: { data: results, isLoading, error },
  };

  const propsForCurrentStep = componentProps[currentStep.id] ?? {};

  return (
    <ModelStepLayout
      title={MODEL_NAME}
      steps={STEPS.filter(step => step.id !== 'validation')}
      currentStepId={currentStep.id === 'validation' ? 'params' : currentStep.id}
      onNext={handleNext}
      onPrevious={handlePrevious}
      onReset={handleReset}
      isResetting={isResetting}
      isNextDisabled={isLoading || (currentStep?.id === 'validation' && !isValidWindowSize)}
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
