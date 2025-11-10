import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import ModelStepLayout from '../components/ModelStepLayout';
import Intro from './Intro';
import Stationarity, { type StationarityProps } from './Stationarity';
import AutoregressionInfo from './AutoregressionInfo';
import StationarityTable, { type StationarityTableProps } from './StationarityTable';
import Differencing, { type DifferencingProps } from './Differencing';
import AutoParams from './AutoParams';
import Results, { type ResultsProps } from './Results';
import { useExperiment, type AdfStationarityRow } from '../../../contexts/ExperimentContext';
import { apiClient } from '../../../../../utils/apiClient';

const MODEL_NAME = 'ARIMA 模型';
const BASE_PATH = '/model/arima';

const STEPS = [
  { id: 'intro', name: '方法步骤', path: `${BASE_PATH}/intro`, component: Intro },
  { id: 'stationarity', name: '平稳性检验', path: `${BASE_PATH}/stationarity`, component: Stationarity },
  { id: 'differencing', name: '差分阶数选择', path: `${BASE_PATH}/differencing`, component: Differencing },
  { id: 'autoparams', name: '自动参数寻优', path: `${BASE_PATH}/autoparams`, component: AutoParams },
  { id: 'results', name: '计算结果', path: `${BASE_PATH}/results`, component: Results },
];

// Hidden pages - not part of the main steps
const AUTOREGRESSION_INFO_PATH = `${BASE_PATH}/autoregression-info`;
const STATIONARITY_TABLE_PATH = `${BASE_PATH}/stationarity-table`;

// Step indices for navigation
const STATIONARITY_STEP_INDEX = 1;
const DIFFERENCING_STEP_INDEX = 2;

const ARIMAStepper: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, updateState, productSalesData, resetARIMAModel } = useExperiment();

  const [adfResults, setAdfResults] = useState<AdfStationarityRow[]>(state.arima_adf_stationarity ?? []);
  const [selectedD, setSelectedD] = useState<number | ''>(state.arima_d ?? '');
  const [results, setResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const isAutoregressionInfoPage = useMemo(() => location.pathname === AUTOREGRESSION_INFO_PATH, [location.pathname]);
  const isStationarityTablePage = useMemo(() => location.pathname === STATIONARITY_TABLE_PATH, [location.pathname]);

  const recommendedD = useMemo(() => {
    const firstStationary = adfResults.find((row) => row.stationary);
    return firstStationary?.diff_order ?? 0;
  }, [adfResults]);

  const currentStepIndex = useMemo(() => {
    if (isAutoregressionInfoPage) {
      // Autoregression info is part of stationarity in the step navigation
      return STATIONARITY_STEP_INDEX;
    }
    if (isStationarityTablePage) {
      // Stationarity table is between stationarity and differencing
      return STATIONARITY_STEP_INDEX;
    }
    const currentPath = location.pathname;
    const index = STEPS.findIndex(step => step.path === currentPath);
    return index === -1 ? 0 : index;
  }, [location.pathname, isAutoregressionInfoPage, isStationarityTablePage]);

  const currentStep = useMemo(() => {
    if (isAutoregressionInfoPage) {
      return { id: 'autoregression-info', name: '自回归方程', path: AUTOREGRESSION_INFO_PATH, component: AutoregressionInfo };
    }
    if (isStationarityTablePage) {
      return { id: 'stationarity-table', name: '平稳性检验表', path: STATIONARITY_TABLE_PATH, component: StationarityTable };
    }
    return STEPS[currentStepIndex];
  }, [currentStepIndex, isAutoregressionInfoPage, isStationarityTablePage]);

  const handleRunAdf = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const {
        data_window_train_start_index: startIndex,
        data_window_train_end_index: endIndex,
      } = state;

      if (startIndex === null || endIndex === null || !productSalesData) {
        throw new Error("训练数据窗口未设置。");
      }

      const trainingSeries = productSalesData.monthlySales.slice(startIndex, endIndex + 1);
      const response = await apiClient.post<{ result: AdfStationarityRow[] }>("/tools/adf", {
        series: trainingSeries.map(r => ({ month: r.month, sales: r.sales })),
      });

      if (!response.result || response.result.length === 0) {
        throw new Error("ADF检验未返回有效结果。");
      }
      setAdfResults(response.result);
      await updateState({ arima_adf_stationarity: response.result });
    } catch (e: any) {
      setError(e.message || "ADF检验失败。");
    } finally {
      setIsLoading(false);
    }
  };

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
        arima_d: selectedD,
      };
      const response = await apiClient.post<any>("/models/arima/training", requestBody);
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
          order: apiResults.best_order,
        });
        await updateState({
          arima_p: apiResults.best_order.p,
          arima_q: apiResults.best_order.q,
          arima_metrics_rmse: apiResults.metrics.rmse,
          arima_metrics_mae: apiResults.metrics.mae,
          arima_metrics_r2: apiResults.metrics.r2,
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
    selectedD,
    productSalesData,
    updateState
  ]);

  useEffect(() => {
    if (currentStep?.id === 'results' && !results && !isLoading) {
      handleCalculate();
    }
  }, [currentStep?.id, results, isLoading, handleCalculate]);

  // Auto-run ADF test when entering stationarity-table page
  useEffect(() => {
    if (currentStep?.id === 'stationarity-table' && adfResults.length === 0 && !isLoading) {
      handleRunAdf();
    }
  }, [currentStep?.id, adfResults.length, isLoading]);

  // Clear results when selectedD changes to trigger recalculation
  useEffect(() => {
    setResults(null);
  }, [selectedD]);

  const handleReset = async () => {
    setIsResetting(true);
    try {
      // Clear local state
      setAdfResults([]);
      setSelectedD('');
      setResults(null);
      setError(null);

      // Clear global state
      await resetARIMAModel();

      // Navigate to first step
      navigate(`${BASE_PATH}/intro`);
    } finally {
      setIsResetting(false);
    }
  };

  const handleNext = async () => {
    setError(null);

    if (currentStep?.id === 'stationarity') {
      // Navigate to stationarity table page
      navigate(STATIONARITY_TABLE_PATH);
      return;
    }

    if (currentStep?.id === 'stationarity-table') {
      // Check if ADF test has results
      if (adfResults.length === 0) {
        setError("平稳性检验未完成，请稍候。");
        return;
      }
      // Navigate to differencing step
      navigate(STEPS[DIFFERENCING_STEP_INDEX].path);
      return;
    }

    if (currentStep?.id === 'differencing') {
      if (selectedD === '') {
        setError("请选择一个差分阶数 d。");
        return;
      }
      const isStationary = adfResults.find(r => r.diff_order === selectedD)?.stationary;
      if (!isStationary) {
        setError(`差分阶数 d=${selectedD} 未能使序列平稳，请重新选择。`);
        return;
      }
      await updateState({ arima_d: selectedD });
    }

    const isLastStep = currentStepIndex === STEPS.length - 1;
    if (isLastStep) {
      await updateState({ arima_completed: true });
      navigate('/model/model-select');
    } else {
      const nextStep = STEPS[currentStepIndex + 1];
      if (nextStep) {
        navigate(nextStep.path);
      }
    }
  };

  const handlePrevious = () => {
    if (isAutoregressionInfoPage) {
      // From autoregression info, go back to stationarity
      navigate(STEPS[STATIONARITY_STEP_INDEX].path);
      return;
    }

    if (isStationarityTablePage) {
      // From stationarity table, go back to stationarity
      navigate(STEPS[STATIONARITY_STEP_INDEX].path);
      return;
    }

    const prevStep = STEPS[currentStepIndex - 1];
    if (prevStep) {
      navigate(prevStep.path);
    } else {
      navigate('/model/model-select');
    }
  };

  const handleShowAutoregression = () => {
    navigate(AUTOREGRESSION_INFO_PATH);
  };

  if (!currentStep) {
    return null;
  }

  const CurrentComponent = currentStep.component as React.FC<any>;

  const componentProps: { [key: string]: StationarityProps | StationarityTableProps | DifferencingProps | ResultsProps | {} } = {
    stationarity: { onShowAutoregression: handleShowAutoregression },
    'stationarity-table': { adfResults, isLoading, error },
    differencing: { adfResults, selectedD, setSelectedD, recommendedD, error },
    autoparams: { isLoading, error },
    results: { data: results, isLoading, error },
  };

  const propsForCurrentStep = componentProps[currentStep.id] ?? {};

  const getCurrentStepId = () => {
    if (isAutoregressionInfoPage) return 'stationarity'; // Autoregression info is part of stationarity
    if (isStationarityTablePage) return 'stationarity'; // Stationarity table is part of stationarity
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
      isNextDisabled={isLoading || isAutoregressionInfoPage}
      nextButtonText={currentStepIndex === STEPS.length - 1 ? '完成' : '下一步'}
    >
      <CurrentComponent key={currentStep.id} {...propsForCurrentStep} />
    </ModelStepLayout>
  );
};

const ARIMAModelRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="*" element={<ARIMAStepper />} />
    </Routes>
  );
};

export default ARIMAModelRoutes;
