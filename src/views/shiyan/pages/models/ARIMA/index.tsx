import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import ModelStepLayout from '../components/ModelStepLayout';
import Intro from './Intro';
import Stationarity, { type StationarityProps } from './Stationarity';
import AutoregressionInfo from './AutoregressionInfo';
import StationarityTable, { type StationarityTableProps } from './StationarityTable';
import Differencing, { type DifferencingProps } from './Differencing';
import DifferencingInfo from './DifferencingInfo';
import DifferencingValidation, { type DifferencingValidationProps } from './DifferencingValidation';
import InformationCriteriaInfo from './InformationCriteriaInfo';
import AutoParams from './AutoParams';
import ModelComparison from './ModelComparison';
import { useExperiment, type AdfStationarityRow } from '../../../contexts/ExperimentContext.zustand';
import { apiClient } from '../../../../../utils/apiClient';
import { ARIMA_CONSTANTS } from '../constants';
import { useAutoCalculation } from '../hooks/useAutoCalculation';
import { useModelJob } from '../hooks/useModelJob';
import RetryExceededFallback from '../components/RetryExceededFallback';

const MODEL_NAME = 'ARIMA 模型';
const BASE_PATH = '/model/arima';

const STEPS = [
  { id: 'intro', name: '方法步骤', path: `${BASE_PATH}/intro`, component: Intro },
  { id: 'stationarity', name: '平稳性检验', path: `${BASE_PATH}/stationarity`, component: Stationarity },
  { id: 'differencing', name: '差分阶数选择', path: `${BASE_PATH}/differencing`, component: Differencing },
  { id: 'autoparams', name: '自动参数寻优计算', path: `${BASE_PATH}/autoparams`, component: AutoParams },
];

// Hidden pages - not part of the main steps
const AUTOREGRESSION_INFO_PATH = `${BASE_PATH}/autoregression-info`;
const STATIONARITY_TABLE_PATH = `${BASE_PATH}/stationarity-table`;
const DIFFERENCING_INFO_PATH = `${BASE_PATH}/differencing-info`;
const DIFFERENCING_VALIDATION_PATH = `${BASE_PATH}/differencing-validation`;
const INFORMATION_CRITERIA_INFO_PATH = `${BASE_PATH}/information-criteria-info`;
const MODEL_COMPARISON_PATH = `${BASE_PATH}/comparison`;

// Step indices for navigation
const STATIONARITY_STEP_INDEX = 1;
const DIFFERENCING_STEP_INDEX = 2;
const AUTOPARAMS_STEP_INDEX = 3;

const ARIMAStepper: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state, updateState, productSalesData, setTrainingLock } = useExperiment();

  const [adfResults, setAdfResults] = useState<AdfStationarityRow[]>([]);
  const [selectedD, setSelectedD] = useState<number | ''>(state.arima_d ?? '');
  const [results, setResults] = useState<any>(null);
  const [autoParamsView, setAutoParamsView] = useState<'params' | 'results'>('params');
  const adfJob = useModelJob();
  const trainingJob = useModelJob();
  const {
    isLoading: isAdfLoading,
    error: adfError,
    retryCount: adfRetryCount,
    runJob: runAdfJob,
    setError: setAdfError,
    recordFailure: recordAdfFailure,
    handleRetry: handleAdfRetry,
  } = adfJob;
  const {
    isLoading: isTrainingLoading,
    error: trainingError,
    retryCount: trainingRetryCount,
    runJob: runTrainingJob,
    setError: setTrainingError,
    recordFailure: recordTrainingFailure,
    handleRetry: handleTrainingRetry,
    resetRetryCount: resetTrainingRetryCount,
  } = trainingJob;

  const isAutoregressionInfoPage = useMemo(() => location.pathname === AUTOREGRESSION_INFO_PATH, [location.pathname]);
  const isStationarityTablePage = useMemo(() => location.pathname === STATIONARITY_TABLE_PATH, [location.pathname]);
  const isDifferencingInfoPage = useMemo(() => location.pathname === DIFFERENCING_INFO_PATH, [location.pathname]);
  const isDifferencingValidationPage = useMemo(() => location.pathname === DIFFERENCING_VALIDATION_PATH, [location.pathname]);
  const isInformationCriteriaInfoPage = useMemo(() => location.pathname === INFORMATION_CRITERIA_INFO_PATH, [location.pathname]);
  const isModelComparisonPage = useMemo(() => location.pathname === MODEL_COMPARISON_PATH, [location.pathname]);

  const isValidDifferencing = useMemo(() => {
    if (selectedD === '' || selectedD < ARIMA_CONSTANTS.MIN_DIFFERENCING_ORDER || selectedD > ARIMA_CONSTANTS.MAX_DIFFERENCING_ORDER) return false;
    const adfRow = adfResults.find(r => r.diff_order === selectedD);
    return adfRow?.stationary ?? false;
  }, [selectedD, adfResults]);

  const currentStepIndex = useMemo(() => {
    if (isAutoregressionInfoPage) {
      return STATIONARITY_STEP_INDEX;
    }
    if (isStationarityTablePage) {
      return STATIONARITY_STEP_INDEX;
    }
    if (isDifferencingInfoPage) {
      return DIFFERENCING_STEP_INDEX;
    }
    if (isDifferencingValidationPage) {
      return DIFFERENCING_STEP_INDEX;
    }
    if (isModelComparisonPage) {
      return AUTOPARAMS_STEP_INDEX;
    }
    if (isInformationCriteriaInfoPage) {
      return AUTOPARAMS_STEP_INDEX;
    }
    const currentPath = location.pathname;
    const index = STEPS.findIndex(step => step.path === currentPath);
    return index === -1 ? 0 : index;
  }, [location.pathname, isAutoregressionInfoPage, isStationarityTablePage, isDifferencingInfoPage, isDifferencingValidationPage, isModelComparisonPage, isInformationCriteriaInfoPage]);

  const currentStep = useMemo(() => {
    if (isAutoregressionInfoPage) {
      return { id: 'autoregression-info', name: '自回归方程', path: AUTOREGRESSION_INFO_PATH, component: AutoregressionInfo };
    }
    if (isStationarityTablePage) {
      return { id: 'stationarity-table', name: '平稳性检验表', path: STATIONARITY_TABLE_PATH, component: StationarityTable };
    }
    if (isDifferencingInfoPage) {
      return { id: 'differencing-info', name: '差分阶数选择的意义', path: DIFFERENCING_INFO_PATH, component: DifferencingInfo };
    }
    if (isDifferencingValidationPage) {
      return { id: 'differencing-validation', name: '差分阶数检验', path: DIFFERENCING_VALIDATION_PATH, component: DifferencingValidation };
    }
    if (isModelComparisonPage) {
      return { id: 'model-comparison', name: '模型指标对比', path: MODEL_COMPARISON_PATH, component: ModelComparison };
    }
    if (isInformationCriteriaInfoPage) {
      return { id: 'information-criteria-info', name: '信息准则函数法', path: INFORMATION_CRITERIA_INFO_PATH, component: InformationCriteriaInfo };
    }
    return STEPS[currentStepIndex];
  }, [currentStepIndex, isAutoregressionInfoPage, isStationarityTablePage, isDifferencingInfoPage, isDifferencingValidationPage, isModelComparisonPage, isInformationCriteriaInfoPage]);

  const handleRunAdf = useCallback(async () => {
    // 重新请求adf之前清除所有错误/清除adf结果
    setAdfError(null);
    setAdfResults([]);
    const {
      data_window_train_start_index: startIndex,
      data_window_train_end_index: endIndex,
    } = state;

    if (startIndex === null || endIndex === null || !productSalesData) {
      setAdfError("训练数据窗口未设置。");
      return;
    }

    const trainingSeries = productSalesData.monthlySales.slice(startIndex, endIndex + 1);
    const response = await runAdfJob<{ result: AdfStationarityRow[] }>({
      request: (signal) => apiClient.post<{ result: AdfStationarityRow[] }>(
        "/tools/adf",
        {
          series: trainingSeries.map(r => ({ month: r.month, sales: r.sales })),
        },
        { signal }
      ),
      getErrorMessage: (jobError) =>
        jobError instanceof Error ? jobError.message : 'ADF检验失败，请重试...',
    });

    if (!response) {
      return;
    }

    if (!response.result || response.result.length === 0) {
      recordAdfFailure("ADF检验未返回有效结果。");
      return;
    }

    const validResults = response.result.filter(r => r.stationary !== null);
    try {
      await updateState({ arima_adf_stationarity: validResults }, { forceSync: true });
      setAdfResults(validResults);
    } catch (jobError) {
      recordAdfFailure(jobError, '实验进度同步失败，请稍后重试。');
    }
  }, [productSalesData, recordAdfFailure, runAdfJob, setAdfError, state, updateState]);

  const handleCalculate = useCallback(async () => {
    // 计算之前清除所有错误和已有结果
    setTrainingError(null);
    setResults(null);
    const requestBody = {
      selected_industry: state.selected_industry,
      selected_company: state.selected_company,
      selected_product: state.selected_product,
      data_window_train_start_index: state.data_window_train_start_index,
      data_window_train_end_index: state.data_window_train_end_index,
      data_window_evaluate_start_index: state.data_window_evaluate_start_index,
      data_window_evaluate_end_index: state.data_window_evaluate_end_index,
      arimaD: selectedD,
    };
    const response = await runTrainingJob<any>({
      lockPath: location.pathname,
      setTrainingLock,
      request: (signal) => apiClient.post<any>(
        "/models/arima/training",
        requestBody,
        { signal }
      ),
      getErrorMessage: (jobError) =>
        jobError instanceof Error ? jobError.message : '遇到错误，请重试...',
    });

    if (!response) {
      return;
    }

    if (response.status === "success") {
      const apiResults = response.results;
      const months = productSalesData?.monthlySales
        .slice(state.data_window_evaluate_start_index!, state.data_window_evaluate_end_index! + 1)
        .map(item => item.month) || [];

      const nextResults = {
        predictions: months.map((month: string, index: number) => ({
          date: month,
          actual: apiResults.eval_y_true[index],
          predicted: apiResults.eval_predictions[index],
        })),
        metrics: apiResults.metrics,
        order: apiResults.best_order,
      };

      try {
        await updateState({
          arima_p: apiResults.best_order.p,
          arima_q: apiResults.best_order.q,
          arima_metrics_rmse: apiResults.metrics.rmse,
          arima_metrics_mae: apiResults.metrics.mae,
          arima_metrics_r2: apiResults.metrics.r2,
        }, { forceSync: true });
        setResults(nextResults);
      } catch (jobError) {
        recordTrainingFailure(jobError, '实验进度同步失败，请稍后重试。');
      }
      return;
    }

    recordTrainingFailure(response.message || "计算失败，请重试...");
  }, [
    location.pathname,
    state.selected_industry,
    state.selected_company,
    state.selected_product,
    state.data_window_train_start_index,
    state.data_window_train_end_index,
    state.data_window_evaluate_start_index,
    state.data_window_evaluate_end_index,
    selectedD,
    productSalesData,
    recordTrainingFailure,
    runTrainingJob,
    setTrainingLock,
    updateState
  ]);

  useAutoCalculation({
    calculationStepId: 'stationarity-table',
    currentStepId: currentStep?.id,
    handleCalculate: handleRunAdf,
    canCalculate: adfResults.length === 0,
    results: adfResults.length > 0 ? adfResults : null,
    isLoading: isAdfLoading,
    error: adfError,
  });
  useAutoCalculation({
    calculationStepId: 'autoparams',
    currentStepId: currentStep?.id,
    handleCalculate: handleCalculate,
    canCalculate: selectedD !== '',
    results,
    isLoading: isTrainingLoading,
    error: trainingError,
  });

  useEffect(() => {
    setResults(null);
    setTrainingError(null);
    resetTrainingRetryCount();
  }, [resetTrainingRetryCount, selectedD, setTrainingError]);

  const handleNext = async () => {
    if (currentStep?.id === 'stationarity') {
      navigate(STATIONARITY_TABLE_PATH);
      return;
    }

    if (currentStep?.id === 'stationarity-table') {
      // 在adf检验结果页面
      const isAnyStationary = adfResults.some(r => r.stationary);
      if (!isAnyStationary) {
        setAdfError("所有差分阶数的检验结果均为非平稳，无法继续进行ARIMA建模。请尝试调整数据窗口或选择其他产品。");
        return;
      }
      const nextStep = STEPS[DIFFERENCING_STEP_INDEX];
      if (nextStep) {
        navigate(nextStep.path);
      }
      return;
    }

    if (currentStep?.id === 'differencing') {
      navigate(DIFFERENCING_VALIDATION_PATH);
      return;
    }

    if (currentStep?.id === 'differencing-validation') {
      if (!isValidDifferencing) {
        setTrainingError("差分阶数检验未通过，请返回上一步重新选择。");
        return;
      }
      await updateState({ arima_d: selectedD === '' ? null : selectedD }, { forceSync: true });
      const nextStep = STEPS[AUTOPARAMS_STEP_INDEX];
      if (nextStep) {
        navigate(nextStep.path);
      }
      return;
    }

    if (currentStep?.id === 'autoparams') {
      if (autoParamsView === 'params') {
        setAutoParamsView('results');
        return;
      } else {
        await updateState({ arima_completed: true }, { forceSync: true });
        navigate(MODEL_COMPARISON_PATH);
        return;
      }
    }

    if (currentStep?.id === 'model-comparison') {
      navigate('/model/model-select');
      return;
    }

    const nextStep = STEPS[currentStepIndex + 1];
    if (nextStep) {
      navigate(nextStep.path);
    }
  };

  const handlePrevious = () => {
    if (isAutoregressionInfoPage) {
      // From autoregression info, go back to stationarity
      const prevStep = STEPS[STATIONARITY_STEP_INDEX];
      if (prevStep) {
        navigate(prevStep.path);
      }
      return;
    }

    if (isStationarityTablePage) {
      // From stationarity table, go back to stationarity
      setAdfError(null);
      const prevStep = STEPS[STATIONARITY_STEP_INDEX];
      if (prevStep) {
        navigate(prevStep.path);
      }
      return;
    }

    if (isDifferencingInfoPage) {
      // From differencing info, go back to differencing
      const prevStep = STEPS[DIFFERENCING_STEP_INDEX];
      if (prevStep) {
        navigate(prevStep.path);
      }
      return;
    }

    if (isDifferencingValidationPage) {
      // From differencing validation, go back to differencing
      const prevStep = STEPS[DIFFERENCING_STEP_INDEX];
      if (prevStep) {
        navigate(prevStep.path);
      }
      return;
    }

    if (isModelComparisonPage) {
      // From model comparison, go back to autoparams (results view)
      setAutoParamsView('results');
      const prevStep = STEPS[AUTOPARAMS_STEP_INDEX];
      if (prevStep) {
        navigate(prevStep.path);
      }
      return;
    }

    if (isInformationCriteriaInfoPage) {
      // From information criteria info, go back to autoparams (params view)
      setAutoParamsView('params');
      const prevStep = STEPS[AUTOPARAMS_STEP_INDEX];
      if (prevStep) {
        navigate(prevStep.path);
      }
      return;
    }

    if (currentStep?.id === 'autoparams' && autoParamsView === 'results') {
      // From results view, go back to params view
      setAutoParamsView('params');
      return;
    }

    const prevStep = STEPS[currentStepIndex - 1];
    if (prevStep) {
      navigate(prevStep.path);
    } else {
      navigate('/model/model-select');
    }
  };


  // 科普性页面
  const handleShowAutoregression = () => {
    navigate(AUTOREGRESSION_INFO_PATH);
  };
  // 科普性页面
  const handleShowDifferencingInfo = () => {
    navigate(DIFFERENCING_INFO_PATH);
  };

  const handleShowInformationCriteriaInfo = () => {
    navigate(INFORMATION_CRITERIA_INFO_PATH);
  };

  if (!currentStep) {
    return null;
  }

  const CurrentComponent = currentStep.component as React.FC<any>;

  const componentProps: { [key: string]: StationarityProps | StationarityTableProps | DifferencingProps | DifferencingValidationProps | {} } = {
    stationarity: { onShowAutoregression: handleShowAutoregression },
    'stationarity-table': { adfResults, isLoading: isAdfLoading, error: adfError, onRetry: handleAdfRetry, navigate },
    differencing: { selectedD, setSelectedD, error: trainingError, onShowDifferencingInfo: handleShowDifferencingInfo },
    'differencing-validation': { selectedD, adfResults },
    autoparams: { view: autoParamsView, data: results, isLoading: isTrainingLoading, error: trainingError, onRetry: handleTrainingRetry, onShowInformationCriteriaInfo: handleShowInformationCriteriaInfo },
  };

  const propsForCurrentStep = componentProps[currentStep.id] ?? {};

  const getCurrentStepId = () => {
    if (isAutoregressionInfoPage) return 'stationarity'; // Autoregression info is part of stationarity
    if (isStationarityTablePage) return 'stationarity'; // Stationarity table is part of stationarity
    if (isDifferencingInfoPage) return 'differencing'; // Differencing info is part of differencing
    if (isDifferencingValidationPage) return 'differencing'; // Differencing validation is part of differencing
    if (isInformationCriteriaInfoPage) return 'autoparams'; // Information criteria info is part of autoparams
    if (isModelComparisonPage) return 'autoparams'; // Model comparison is part of autoparams
    return currentStep.id;
  };

  const renderContent = () => {
    if (currentStep.id === 'stationarity-table' && adfError && adfRetryCount >= 3) {
      return <RetryExceededFallback navigate={navigate} />;
    }
    if (currentStep.id === 'autoparams' && trainingError && trainingRetryCount >= 3) {
      return <RetryExceededFallback navigate={navigate} />;
    }
    return <CurrentComponent key={currentStep.id} {...propsForCurrentStep} />;
  };

  const isLoading = isAdfLoading || isTrainingLoading;
  const currentError = currentStep.id === 'stationarity-table'
    ? adfError
    : trainingError;
  const currentRetryCount = currentStep.id === 'stationarity-table'
    ? adfRetryCount
    : trainingRetryCount;

  return (
    <ModelStepLayout
      title={MODEL_NAME}
      steps={STEPS}
      currentStepId={getCurrentStepId()}
      onNext={handleNext}
      onPrevious={handlePrevious}
      isPreviousDisabled={currentRetryCount >= 3 || isLoading}
      isNextDisabled={
        isLoading ||
        !!currentError ||
        isAutoregressionInfoPage ||
        isDifferencingInfoPage ||
        isInformationCriteriaInfoPage ||
        (isDifferencingValidationPage && !isValidDifferencing)
      }
      nextButtonText={isModelComparisonPage ? '完成' : '下一步'}
    >
      {renderContent()}
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
