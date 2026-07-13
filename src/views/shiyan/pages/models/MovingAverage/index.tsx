import React, { useEffect, useMemo } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import ModelStepLayout from '../components/ModelStepLayout';
import Intro from './Intro';
import Formula from './Formula';
import Params, { type ParamsProps } from './Params';
import Validation, { type ValidationProps } from './Validation';
import Results, { type ResultsProps } from './Results';
import ModelComparison from './ModelComparison';
import { useExperiment } from '../../../contexts/ExperimentContext.zustand';
import { useSimpleModel } from '../hooks/useSimpleModel';
import { MODEL_RETRY_LIMITS } from '../constants';
import RetryExceededFallback from '../components/RetryExceededFallback';
import { isValidMovingAverageWindow } from './movingAverageValidation';

const MODEL_NAME = '移动平均法';
const BASE_PATH = '/model/moving-average';

const STEPS = [
  { id: 'intro', name: '方法步骤', path: `${BASE_PATH}/intro`, component: Intro },
  { id: 'formula', name: '计算公式', path: `${BASE_PATH}/formula`, component: Formula },
  { id: 'params', name: '时间窗口选取', path: `${BASE_PATH}/params`, component: Params },
  { id: 'results', name: '计算结果', path: `${BASE_PATH}/results`, component: Results },
];

const VALIDATION_PATH = `${BASE_PATH}/validation`;
const COMPARISON_PATH = `${BASE_PATH}/comparison`;

const PARAMS_STEP_INDEX = 2;
const RESULTS_STEP_INDEX = 3;

const MovingAverageStepper: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { state } = useExperiment();

  // Calculate training data length for validation
  const trainDataLength = useMemo(() => {
    if (state.data_window_train_start_index === null || state.data_window_train_end_index === null) {
      return 0;
    }
    return state.data_window_train_end_index - state.data_window_train_start_index + 1;
  }, [state.data_window_train_start_index, state.data_window_train_end_index]);

  // Use shared simple model hook
  const {
    param: windowSize,
    setParam: setWindowSize,
    results,
    isLoading,
    error,
    setError,
    isValidParam: isValidWindowSize,
    markAsCompleted,
    initializeGuidedSession,
    runNextGuidedStep,
    handleRetry,
    discardAndRestart,
    retryCount,
    guidedSession,
    currentProgress,
    progressEvents,
  } = useSimpleModel<number | ''>({
    type: 'moving_average',
    guidedModelType: 'ma',
    stateKeys: {
      param: 'moving_average_window',
      completed: 'moving_average_completed',
      metricsRmse: 'moving_average_metrics_rmse',
      metricsMae: 'moving_average_metrics_mae',
      metricsR2: 'moving_average_metrics_r2',
    },
    paramKey: 'moving_average_window',
    validateParam: (window) => isValidMovingAverageWindow(window, trainDataLength),
  });

  const isValidationPage = location.pathname === VALIDATION_PATH;
  const isComparisonPage = location.pathname === COMPARISON_PATH;

  const currentStepIndex = useMemo(() => {
    if (isValidationPage) {
      return PARAMS_STEP_INDEX;
    }
    if (isComparisonPage) {
      return RESULTS_STEP_INDEX;
    }
    const currentPath = location.pathname;
    const index = STEPS.findIndex(step => step.path === currentPath);
    return index === -1 ? 0 : index;
  }, [location.pathname, isValidationPage, isComparisonPage]);

  const currentStep = useMemo(() => {
    if (isValidationPage) {
      return { id: 'validation', name: '验证', path: VALIDATION_PATH, component: Validation };
    }
    if (isComparisonPage) {
      return { id: 'comparison', name: '模型对比', path: COMPARISON_PATH, component: ModelComparison };
    }
    return STEPS[currentStepIndex];
  }, [currentStepIndex, isValidationPage, isComparisonPage]);

  const handleNext = async () => {

    // 进入隐藏的参数验证页面
    if (currentStep?.id === 'params') {
      navigate(VALIDATION_PATH);
      return;
    }
    

    // 验证页进入计算页
    if (currentStep?.id === 'validation') {
      if (isValidWindowSize) {
          const nextStep = STEPS[RESULTS_STEP_INDEX];
          if (nextStep) navigate(nextStep.path);
          return;
      }
    }

    // 结果页进入指标对比
    if (currentStep?.id === 'results') {
      if (!results) {
        setError('请先完成分阶段训练，生成计算结果后再进入下一步。');
        return;
      }
      try {
        await markAsCompleted(); // 一定要先标记完成，不然找不到刚完成的自己
      } catch {
        return;
      }
      navigate(COMPARISON_PATH);
      return;
    }

    // 回到选择页面
    if (currentStep?.id === 'comparison') {
      navigate('/model/model-select');
      return;
    }

    // 正常路由（也许我应该在这里手动计算， 或者提前判断）
    const nextStep = STEPS[currentStepIndex + 1];
    if (nextStep) {
      navigate(nextStep.path);
    }
  };

  const handlePrevious = () => {

    // 隐藏页面返回
    if (isValidationPage) {
      const prevStep = STEPS[PARAMS_STEP_INDEX];
      if (prevStep) navigate(prevStep.path);
      return;
    }

    // 隐藏页面返回
    if (isComparisonPage) {
      const prevStep = STEPS[RESULTS_STEP_INDEX];
      if (prevStep) navigate(prevStep.path);
      return;
    }

    // 正常路由返回上一步
    const prevStep = STEPS[currentStepIndex - 1];
    if (prevStep) {
      navigate(prevStep.path);
    } else {
      navigate('/model/model-select');
    }
  };


  useEffect(() => {
    if (currentStep?.id === 'results' && isValidWindowSize && !results && !error) {
      void initializeGuidedSession();
    }
  }, [currentStep?.id, error, initializeGuidedSession, isValidWindowSize, results]);

  if (!currentStep) {
    return null;
  }



  // 准备根据当前state渲染组件currentStep
  const CurrentComponent = currentStep.component as React.FC<any>;

  // 确定要传给当前currentStep组件的state/setState
  const componentProps: { [key: string]: ParamsProps | ValidationProps | ResultsProps | {} } = {
    params: { windowSize, setWindowSize },
    validation: { windowSize, isValid: isValidWindowSize, trainDataLength },
    results: {
      data: results,
      guidedSession,
      isLoading,
      error,
      onRetry: handleRetry,
      onInitialize: initializeGuidedSession,
      onRunNextStep: runNextGuidedStep,
      currentProgress,
      progressEvents,
    },
  };

  const propsForCurrentStep = componentProps[currentStep.id] ?? {};

  const getNextButtonText = () => {
    if (isComparisonPage) return '完成';
    if (currentStepIndex === STEPS.length - 1) return '下一步';
    return '下一步';
  };

  const getCurrentStepId = () => {
    if (isValidationPage) return 'params';
    if (isComparisonPage) return 'results';
    return currentStep.id;
  };

  const renderContent = () => {
    // 如果达到错误上限就不再渲染功能组件
    if (currentStep.id === 'results' && error && retryCount >= MODEL_RETRY_LIMITS.maxFailures) {
      return <RetryExceededFallback navigate={navigate} onRestart={discardAndRestart} />;
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
      isPreviousDisabled={retryCount >= MODEL_RETRY_LIMITS.maxFailures || isLoading}
      // 计算请求loading的时候 计算请求返回错误的时候 window验证失败的时候不能点击下一步
      isNextDisabled={isLoading || !!error || (isValidationPage && !isValidWindowSize) || (currentStep.id === 'results' && !results)}
      nextButtonText={getNextButtonText()}
    >
      {renderContent()}
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
