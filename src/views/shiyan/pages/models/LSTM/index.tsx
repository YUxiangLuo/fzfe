import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import ModelStepLayout from '../components/ModelStepLayout';
import Intro from './Intro';
import Preprocessing, { type PreprocessingProps } from './Preprocessing';
import NormalizationInfo from './NormalizationInfo';
import Build, { type BuildProps } from './Build';
import LSTMMethodInfo from './LSTMMethodInfo';
import Results, { type ResultsProps } from './Results';
import { useExperiment } from '../../../contexts/ExperimentContext';
import { apiClient } from '../../../../../utils/apiClient';

const MODEL_NAME = 'LSTM 神经网络';
const BASE_PATH = '/model/lstm';

const STEPS = [
  { id: 'intro', name: '方法步骤', path: `${BASE_PATH}/intro`, component: Intro },
  { id: 'preprocessing', name: '数据预处理', path: `${BASE_PATH}/preprocessing`, component: Preprocessing },
  { id: 'build', name: '构建LSTM模型', path: `${BASE_PATH}/build`, component: Build },
  { id: 'results', name: '计算结果', path: `${BASE_PATH}/results`, component: Results },
];

// Hidden pages - not part of the main steps
const NORMALIZATION_INFO_PATH = `${BASE_PATH}/normalization-info`;
const LSTM_METHOD_INFO_PATH = `${BASE_PATH}/lstm-method-info`;

// Step indices for navigation
const PREPROCESSING_STEP_INDEX = 1;
const BUILD_STEP_INDEX = 2;

const LSTMStepper: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, updateState, productSalesData, productFieldOptions, resetLSTMModel } = useExperiment();

  const [normalization, setNormalization] = useState<'minmax' | 'zscore' | null>(state.lstm_normalization);
  const [features, setFeatures] = useState<string[]>(state.lstm_features ?? []);
  const [target, setTarget] = useState<string | null>(state.lstm_target_field);
  const [results, setResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const isNormalizationInfoPage = useMemo(() => location.pathname === NORMALIZATION_INFO_PATH, [location.pathname]);
  const isLSTMMethodInfoPage = useMemo(() => location.pathname === LSTM_METHOD_INFO_PATH, [location.pathname]);

  const evaluateMonths = useMemo(() => {
    if (!productSalesData || state.data_window_evaluate_start_index === null || state.data_window_evaluate_end_index === null) {
      return [];
    }
    const start = state.data_window_evaluate_start_index;
    const end = state.data_window_evaluate_end_index;
    return productSalesData.monthlySales.slice(start, end + 1).map(item => item.month);
  }, [productSalesData, state.data_window_evaluate_start_index, state.data_window_evaluate_end_index]);

  useEffect(() => {
    if (target && features.includes(target)) {
      setFeatures(features.filter(f => f !== target));
    }
  }, [target, features]);

  const currentStepIndex = useMemo(() => {
    if (isNormalizationInfoPage) {
      // Normalization info is part of preprocessing in the step navigation
      return PREPROCESSING_STEP_INDEX;
    }
    if (isLSTMMethodInfoPage) {
      // LSTM method info is part of build in the step navigation
      return BUILD_STEP_INDEX;
    }
    const currentPath = location.pathname;
    const index = STEPS.findIndex(step => step.path === currentPath);
    return index === -1 ? 0 : index;
  }, [location.pathname, isNormalizationInfoPage, isLSTMMethodInfoPage]);

  const currentStep = useMemo(() => {
    if (isNormalizationInfoPage) {
      return { id: 'normalization-info', name: '标准化介绍', path: NORMALIZATION_INFO_PATH, component: NormalizationInfo };
    }
    if (isLSTMMethodInfoPage) {
      return { id: 'lstm-method-info', name: '构建LSTM方法', path: LSTM_METHOD_INFO_PATH, component: LSTMMethodInfo };
    }
    return STEPS[currentStepIndex];
  }, [currentStepIndex, isNormalizationInfoPage, isLSTMMethodInfoPage]);

  // Auto-set target to "销售数量" when entering build page
  useEffect(() => {
    if (currentStep?.id === 'build' && !target && productFieldOptions) {
      const salesQuantityField = productFieldOptions.find(field =>
        field === '销售数量' || field.includes('销售数量')
      );
      if (salesQuantityField) {
        setTarget(salesQuantityField);
      }
    }
  }, [currentStep?.id, target, productFieldOptions]);

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
        lstm_normalization: normalization,
        lstm_target_field: target ?? '',
        lstm_features: features,
      };

      const response = await apiClient.post<any>("/models/lstm/training", requestBody);

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
          lstm_features: features,
          lstm_target_field: target,
          lstm_metrics_rmse: apiResults.metrics.rmse,
          lstm_metrics_mae: apiResults.metrics.mae,
          lstm_metrics_r2: apiResults.metrics.r2,
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
    normalization,
    target,
    features,
    evaluateMonths,
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
      setNormalization(null);
      setFeatures([]);
      setTarget(null);
      setResults(null);
      setError(null);

      // Clear global state
      await resetLSTMModel();

      // Navigate to first step
      navigate(`${BASE_PATH}/intro`);
    } finally {
      setIsResetting(false);
    }
  };

  const handleNext = async () => {
    setError(null);
    const nextStepIndex = currentStepIndex + 1;

    if (currentStep?.id === 'preprocessing') {
      if (!normalization) {
        setError("请选择一种数据预处理方法。");
        return;
      }
      await updateState({ lstm_normalization: normalization });
      if (STEPS[nextStepIndex]) navigate(STEPS[nextStepIndex].path);
      return;
    }

    if (currentStep?.id === 'build') {
      if (!target || features.length === 0) {
        setError("请选择目标字段和至少一个特征字段。");
        return;
      }
      if (STEPS[nextStepIndex]) navigate(STEPS[nextStepIndex].path);
      return;
    }

    if (currentStepIndex === STEPS.length - 1) {
      await updateState({ lstm_completed: true });
      navigate('/model/model-select');
      return;
    }

    if (nextStepIndex < STEPS.length && STEPS[nextStepIndex]) {
      navigate(STEPS[nextStepIndex].path);
    }
  };

  const handlePrevious = () => {
    if (isNormalizationInfoPage) {
      // From normalization info, go back to preprocessing
      navigate(STEPS[PREPROCESSING_STEP_INDEX].path);
      return;
    }

    if (isLSTMMethodInfoPage) {
      // From LSTM method info, go back to build
      navigate(STEPS[BUILD_STEP_INDEX].path);
      return;
    }

    const prevStep = STEPS[currentStepIndex - 1];
    if (prevStep) {
      navigate(prevStep.path);
    } else {
      navigate('/model/model-select');
    }
  };

  const handleShowNormalizationInfo = () => {
    navigate(NORMALIZATION_INFO_PATH);
  };

  const handleShowLSTMMethodInfo = () => {
    navigate(LSTM_METHOD_INFO_PATH);
  };

  if (!currentStep) {
    return null;
  }

  const CurrentComponent = currentStep.component as React.FC<any>;

  const componentProps: { [key: string]: PreprocessingProps | BuildProps | ResultsProps | {} } = {
    preprocessing: { normalization, setNormalization, error, onShowNormalizationInfo: handleShowNormalizationInfo },
    build: {
      features,
      setFeatures,
      target,
      error,
      isLoading,
      fieldOptions: productFieldOptions ?? [],
      onShowLSTMMethodInfo: handleShowLSTMMethodInfo
    },
    results: { data: results, isLoading, error },
  };

  const propsForCurrentStep = componentProps[currentStep.id] ?? {};

  const getCurrentStepId = () => {
    if (isNormalizationInfoPage) return 'preprocessing'; // Normalization info is part of preprocessing
    if (isLSTMMethodInfoPage) return 'build'; // LSTM method info is part of build
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
      isNextDisabled={isLoading || isNormalizationInfoPage || isLSTMMethodInfoPage}
      nextButtonText={currentStepIndex === STEPS.length - 1 ? '完成' : '下一步'}
    >
      <CurrentComponent key={currentStep.id} {...propsForCurrentStep} />
    </ModelStepLayout>
  );
};

const LSTMModelRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="*" element={<LSTMStepper />} />
    </Routes>
  );
};

export default LSTMModelRoutes;
