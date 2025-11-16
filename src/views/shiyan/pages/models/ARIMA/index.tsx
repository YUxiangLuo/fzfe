import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
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
  const { state, updateState, productSalesData } = useExperiment();

  const [adfResults, setAdfResults] = useState<AdfStationarityRow[]>([]);
  const [selectedD, setSelectedD] = useState<number | ''>(state.arima_d ?? '');
  const [results, setResults] = useState<any>(null);
  const [autoParamsView, setAutoParamsView] = useState<'params' | 'results'>('params');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adfRetryCount, setAdfRetryCount] = useState(0);
  const [retryCount, setRetryCount] = useState(0);

  const adfAbortControllerRef = useRef<AbortController | null>(null);
  const calculateAbortControllerRef = useRef<AbortController | null>(null);

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
    if (adfAbortControllerRef.current) {
      adfAbortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    adfAbortControllerRef.current = abortController;


    // 重新请求adf之前清除所有错误/清除adf结果
    setError(null);
    setAdfResults([]);
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
      const response = await apiClient.post<{ result: AdfStationarityRow[] }>(
        "/tools/adf",
        {
          series: trainingSeries.map(r => ({ month: r.month, sales: r.sales })),
        },
        { signal: abortController.signal }
      );

      if (!response.result || response.result.length === 0) {
        throw new Error("ADF检验未返回有效结果。");
      }

      const validResults = response.result.filter(r => r.stationary !== null);
      setAdfResults(validResults);
      await updateState({ arima_adf_stationarity: validResults });
    } catch (e: any) {
      // Ignore abort errors
      if (e.name === 'AbortError') {
        return;
      }
      setError(e.message || "ADF检验失败，请重试...");
      setAdfRetryCount(prev => prev + 1);
    } finally {
      if (adfAbortControllerRef.current === abortController) {
        setIsLoading(false);
      }
    }
  }, [state, productSalesData, updateState]);

  const handleCalculate = useCallback(async () => {
    if (calculateAbortControllerRef.current) {
      calculateAbortControllerRef.current.abort();
    }
    const abortController = new AbortController();
    calculateAbortControllerRef.current = abortController;

    // 计算之前清除所有错误和已有结果
    setError(null);
    setResults(null);
    setIsLoading(true);
    try {
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
      const response = await apiClient.post<any>(
        "/models/arima/training",
        requestBody,
        { signal: abortController.signal }
      );
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
        throw new Error(response.message || "计算失败，请重试...");
      }
    } catch (e: any) {
      // Ignore abort errors
      if (e.name === 'AbortError') {
        return;
      }
      setError(e.message || "遇到错误，请重试...");
      setRetryCount(prev => prev + 1);
    } finally {
      if (calculateAbortControllerRef.current === abortController) {
        setIsLoading(false);
      }
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

  useAutoCalculation({
    calculationStepId: 'stationarity-table',
    currentStepId: currentStep?.id,
    handleCalculate: handleRunAdf,
    canCalculate: adfResults.length === 0,
    results: adfResults.length > 0 ? adfResults : null,
    isLoading,
    error,
  });
  useAutoCalculation({
    calculationStepId: 'autoparams',
    currentStepId: currentStep?.id,
    handleCalculate: handleCalculate,
    canCalculate: selectedD !== '',
    results,
    isLoading,
    error,
  });

  useEffect(() => {
    setResults(null);
    setError(null);
  }, [selectedD]);

  // Cleanup: cancel all pending requests on unmount
  useEffect(() => {
    return () => {
      if (adfAbortControllerRef.current) {
        adfAbortControllerRef.current.abort();
      }
      if (calculateAbortControllerRef.current) {
        calculateAbortControllerRef.current.abort();
      }
    };
  }, []);

  const handleNext = async () => {
    if (currentStep?.id === 'stationarity') {
      navigate(STATIONARITY_TABLE_PATH);
      return;
    }

    if (currentStep?.id === 'stationarity-table') {
      // 在adf检验结果页面
      const isAnyStationary = adfResults.some(r => r.stationary);
      if (!isAnyStationary) {
        setError("所有差分阶数的检验结果均为非平稳，无法继续进行ARIMA建模。请尝试调整数据窗口或选择其他产品。");
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
        setError("差分阶数检验未通过，请返回上一步重新选择。");
        return;
      }
      await updateState({ arima_d: selectedD === '' ? null : selectedD });
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
        await updateState({ arima_completed: true });
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

    if (currentStep?.id === 'stationarity-table') {
      // 在adf检验结果页面返回上一步，清除错误
      setError(null);
      const prevStep = STEPS[currentStepIndex - 1];
      if (prevStep) {
        navigate(prevStep.path);
      } 
      return;
    }

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

  const handleAdfRetry = useCallback(() => {
    if (adfRetryCount < 3) {
      setError(null);
    }
  }, [adfRetryCount]);

  const handleCalculateRetry = useCallback(() => {
    if (retryCount < 3) {
      setError(null);
    }
  }, [retryCount]);

  const componentProps: { [key: string]: StationarityProps | StationarityTableProps | DifferencingProps | DifferencingValidationProps | {} } = {
    stationarity: { onShowAutoregression: handleShowAutoregression },
    'stationarity-table': { adfResults, isLoading, error, onRetry: handleAdfRetry, navigate },
    differencing: { selectedD, setSelectedD, error, onShowDifferencingInfo: handleShowDifferencingInfo },
    'differencing-validation': { selectedD, adfResults },
    autoparams: { view: autoParamsView, data: results, isLoading, error, onRetry: handleCalculateRetry, onShowInformationCriteriaInfo: handleShowInformationCriteriaInfo },
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
    if (currentStep.id === 'stationarity-table' && error && adfRetryCount >= 3) {
      return <RetryExceededFallback navigate={navigate} />;
    }
    if (currentStep.id === 'autoparams' && error && retryCount >= 3) {
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
      isPreviousDisabled={retryCount>=3 || isLoading}
      isNextDisabled={
        isLoading ||
        !!error ||
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
