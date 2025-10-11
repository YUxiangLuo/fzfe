import React, {useEffect, useMemo, useState, useRef} from "react";
import { CheckCircle, Layers, Loader2 } from "lucide-react";
import { useExperiment, type ModelMetrics } from "../../contexts/ExperimentContext";

const MOCK_METRICS = { rmse: 2.7, mae: 1.5, r2: 0.96 };

const steps = [
  { id: 1, title: "方法简介", description: "了解加权平均融合的原理及适用前提。" },
  { id: 2, title: "选择基础模型", description: "勾选已完成的基础模型作为融合输入。" },
  { id: 3, title: "运行并查看指标", description: "执行加权优化并查看融合模型指标。" },
] as const;

const WeightedEnsembleModel: React.FC = () => {
  const { state, updateState } = useExperiment();
  const modelState = {
    completed: state.ensemble_weighted_completed,
    baseModels: state.ensemble_weighted_base_models,
    metrics: {
      rmse: state.ensemble_weighted_metrics_rmse,
      mae: state.ensemble_weighted_metrics_mae,
      r2: state.ensemble_weighted_metrics_r2,
    } as ModelMetrics,
  };

  const completionMap = useMemo(
    () => ({
      moving_average: state.moving_average_completed,
      exponential_smoothing: state.exponential_smoothing_completed,
      arima: state.arima_completed,
      lstm: state.lstm_completed,
    }),
    [
      state.arima_completed,
      state.exponential_smoothing_completed,
      state.lstm_completed,
      state.moving_average_completed,
    ],
  );

  const availableBaseModels = useMemo(
    () =>
      [
        { id: 'moving_average', name: '移动平均法' },
        { id: 'exponential_smoothing', name: '指数平滑法' },
        { id: 'arima', name: 'ARIMA 模型' },
        { id: 'lstm', name: 'LSTM 神经网络' },
      ].filter((model) => completionMap[model.id as keyof typeof completionMap]),
    [completionMap],
  );

  const derivedStep = useMemo(() => {
    if (modelState.completed) return 3;
    if (modelState.baseModels.length > 0) return 2;
    return 1;
  }, [modelState.completed, modelState.baseModels.length]);

  const [activeStep, setActiveStep] = useState(derivedStep);
  const [selectedModels, setSelectedModels] = useState<string[]>(modelState.baseModels);
  const [isTraining, setIsTraining] = useState(false);
  const selectionUpdateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetMetrics = () => ({
    ensemble_weighted_completed: false,
    ensemble_weighted_metrics_rmse: null,
    ensemble_weighted_metrics_mae: null,
    ensemble_weighted_metrics_r2: null,
  });


  const hasMountedRef = useRef(false);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      setActiveStep(derivedStep);
      return;
    }

    if (derivedStep > 1) {
      setActiveStep(derivedStep);
    }
  }, [derivedStep]);


  useEffect(() => {
    setSelectedModels(modelState.baseModels);
  }, [modelState.baseModels]);

  const commitSelectionUpdate = async (models: string[]) => {
    const storedModels = state.ensemble_weighted_base_models ?? [];
    const changed =
      models.length !== storedModels.length ||
      models.some((model) => !storedModels.includes(model));

    if (!changed) {
      return;
    }

    await updateState({
      ensemble_weighted_base_models: models,
      ...resetMetrics(),
    });
  };

  const scheduleSelectionUpdate = (models: string[]) => {
    if (selectionUpdateTimer.current) {
      clearTimeout(selectionUpdateTimer.current);
    }
    selectionUpdateTimer.current = setTimeout(() => {
      selectionUpdateTimer.current = null;
      void commitSelectionUpdate(models);
    }, 300);
  };

  useEffect(() => {
    return () => {
      if (selectionUpdateTimer.current) {
        clearTimeout(selectionUpdateTimer.current);
      }
    };
  }, []);

  const handleModelToggle = (modelId: string) => {
    setSelectedModels((prev) => {
      const next = prev.includes(modelId)
        ? prev.filter((id) => id !== modelId)
        : [...prev, modelId];
      scheduleSelectionUpdate(next);
      return next;
    });
  };

  const handleNext = async () => {
    if (activeStep === 1) {
      setActiveStep(2);
      return;
    }

    if (activeStep === 2) {
      if (selectionUpdateTimer.current) {
        clearTimeout(selectionUpdateTimer.current);
        selectionUpdateTimer.current = null;
        await commitSelectionUpdate(selectedModels);
      } else {
        await commitSelectionUpdate(selectedModels);
      }
      setActiveStep(3);
      return;
    }

    if (activeStep === 3 && !modelState.completed && !isTraining) {
      setIsTraining(true);
      setTimeout(async () => {
        await updateState({
          ensemble_weighted_base_models: selectedModels,
          ensemble_weighted_completed: true,
          ensemble_weighted_metrics_rmse: MOCK_METRICS.rmse,
          ensemble_weighted_metrics_mae: MOCK_METRICS.mae,
          ensemble_weighted_metrics_r2: MOCK_METRICS.r2,
        });
        setIsTraining(false);
      }, 1500);
    }
  };

  const handleBack = () => {
    if (activeStep === 1) return;
    setActiveStep((prev) => Math.max(1, prev - 1));
  };

  const renderIntro = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">什么是加权平均融合？</h3>
        <p className="text-sm text-gray-600 leading-relaxed">
          加权平均融合通过对多个基础模型赋予不同权重，将其预测结果合成为一个更稳定、更准确的预测。权重通常通过误差优化或交叉验证获得。
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <p className="font-semibold text-indigo-700 mb-2">前提条件</p>
          <p className="text-sm text-indigo-700">至少完成两个基础模型，并确保预测目标一致。</p>
        </div>
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <p className="font-semibold text-indigo-700 mb-2">优势</p>
          <p className="text-sm text-indigo-700">可减小单一模型偏差，提升整体稳定性。</p>
        </div>
        <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
          <p className="font-semibold text-indigo-700 mb-2">注意事项</p>
          <p className="text-sm text-indigo-700">基础模型需表现互补；权重优化需防止过拟合。</p>
        </div>
      </div>
    </div>
  );

  const renderSelectionStep = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">选择用于融合的基础模型</h3>
        <p className="text-sm text-gray-600 mb-6">建议至少选择两个模型。系统会在训练阶段自动优化权重。</p>
        <div className="space-y-4">
          {availableBaseModels.map((model) => {
            const isSelected = selectedModels.includes(model.id);
            return (
              <div
                key={model.id}
                onClick={() => handleModelToggle(model.id)}
                className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                  isSelected ? "border-indigo-500 bg-indigo-50" : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected ? "border-indigo-500 bg-indigo-500" : "border-gray-300"}`}>
                      {isSelected && <CheckCircle className="w-3 h-3 text-white" />}
                    </div>
                    <h4 className="font-semibold text-gray-900">{model.name}</h4>
                  </div>
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">已完成</span>
                </div>
              </div>
            );
          })}
        </div>
        {availableBaseModels.length === 0 && (
          <p className="text-sm text-gray-500 text-center mt-4">暂无可用基础模型，请先完成至少两个基础模型。</p>
        )}
      </div>
    </div>
  );

  const renderTrainingStep = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">运行融合模型并查看结果</h3>
        {!modelState.completed && !isTraining && (
          <p className="text-sm text-gray-600">
            点击“开始训练并保存结果”后，系统将根据基础模型表现自动优化权重并输出融合指标。
          </p>
        )}

        {isTraining && (
          <div className="flex items-center space-x-3 text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-3">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>正在优化权重并融合预测...</span>
          </div>
        )}

        {modelState.completed && !isTraining && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-green-800 font-semibold">融合模型已训练完成并保存。</p>
                <p className="text-sm text-green-700">融合模型数量：{modelState.baseModels.length} 个</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wide">RMSE</p>
                <p className="text-2xl font-semibold text-indigo-700 mt-2">{modelState.metrics.rmse ?? '—'}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wide">MAE</p>
                <p className="text-2xl font-semibold text-indigo-700 mt-2">{modelState.metrics.mae ?? '—'}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wide">R²</p>
                <p className="text-2xl font-semibold text-indigo-700 mt-2">{modelState.metrics.r2 ?? '—'}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (activeStep) {
      case 1:
        return renderIntro();
      case 2:
        return renderSelectionStep();
      case 3:
        return renderTrainingStep();
      default:
        return null;
    }
  };

  const nextButtonLabel = (() => {
    if (activeStep === 1) return "下一步：选择基础模型";
    if (activeStep === 2) return "下一步：运行融合";
    if (modelState.completed) return "结果已保存";
    if (isTraining) return "融合中...";
    return "开始训练并保存结果";
  })();

  const isNextDisabled =
    (activeStep === 2 && selectedModels.length < 2) ||
    (activeStep === 3 && (isTraining || Boolean(modelState.completed)));

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200">
      <div className="border-b border-gray-200 bg-white rounded-t-xl p-6">
        <div className="flex items-center space-x-3 text-sm text-gray-500">
          <Layers className="w-5 h-5 text-indigo-600" />
          <span>加权平均融合分步指导</span>
        </div>
        <h2 className="mt-2 text-2xl font-semibold text-gray-900">加权平均融合模型</h2>
        <p className="text-gray-600">按照向导依次完成方法了解、模型选择与融合训练。</p>
      </div>

      <div className="px-6 pt-6 pb-4 flex flex-col gap-6">
        <div className="relative">
          <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 hidden md:block">
            <div className="h-1 rounded-full bg-gray-200">
              <div
                className="h-1 rounded-full bg-gradient-to-r from-indigo-500 to-green-500 transition-all duration-500"
                style={{ width: `${((activeStep - 1) / (steps.length - 1)) * 100}%` }}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {steps.map((step) => {
              const isActive = step.id === activeStep;
              const isCompleted = step.id < activeStep || (step.id === steps.length && modelState.completed);
              return (
                <div
                  key={step.id}
                  className={`relative rounded-xl border p-5 transition-all shadow-sm ${
                    isActive
                      ? "border-indigo-500 bg-indigo-50"
                      : isCompleted
                      ? "border-green-500 bg-green-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${isCompleted ? "bg-green-500 text-white" : isActive ? "bg-indigo-500 text-white" : "bg-gray-200 text-gray-700"}`}>
                      {step.id}
                    </div>
                    {isCompleted && <CheckCircle className="w-4 h-4 text-green-600" />}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">{step.description}</p>
                </div>
              );
            })}
          </div>
        </div>

        {renderStepContent()}
      </div>

      <div className="bg-white border-t border-gray-200 rounded-b-xl px-6 py-4 flex justify-between items-center">
        <button
          onClick={handleBack}
          disabled={activeStep === 1}
          className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          上一步
        </button>
        <button
          onClick={handleNext}
          disabled={isNextDisabled}
          className={`flex items-center space-x-2 px-6 py-2 rounded-lg text-white ${
            isNextDisabled
              ? "bg-gray-400 cursor-not-allowed"
              : activeStep === 3
              ? "bg-green-600 hover:bg-green-700"
              : "bg-indigo-600 hover:bg-indigo-700"
          }`}
        >
          <span>{nextButtonLabel}</span>
        </button>
      </div>
    </div>
  );
};

export default WeightedEnsembleModel;
