import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle, Layers } from "lucide-react";
import { useExperiment, type ModelMetrics } from "../../contexts/ExperimentContext";

const MOCK_METRICS = { rmse: 2.3, mae: 1.3, r2: 0.98 };

const steps = [
  { id: 1, title: "方法简介", description: "了解 Stacking 融合的层级结构及优势。" },
  { id: 2, title: "选择基础模型", description: "勾选作为第一层输入的基础模型。" },
  { id: 3, title: "运行并查看指标", description: "训练元学习器并输出融合模型指标。" },
] as const;

const StackingEnsembleModel: React.FC = () => {
  const { state, updateState } = useExperiment();
  const modelState = {
    completed: state.ensemble_stacking_completed,
    baseModels: state.ensemble_stacking_base_models,
    metrics: {
      rmse: state.ensemble_stacking_metrics_rmse,
      mae: state.ensemble_stacking_metrics_mae,
      r2: state.ensemble_stacking_metrics_r2,
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
    if (modelState.baseModels.length > 0) return 3;
    return 1;
  }, [modelState.completed, modelState.baseModels.length]);

  const [activeStep, setActiveStep] = useState(derivedStep);
  const [selectedModels, setSelectedModels] = useState<string[]>(modelState.baseModels);

  useEffect(() => {
    setActiveStep(derivedStep);
  }, [derivedStep]);

  useEffect(() => {
    setSelectedModels(modelState.baseModels);
  }, [modelState.baseModels]);

  const handleModelToggle = (modelId: string) => {
    setSelectedModels((prev) =>
      prev.includes(modelId) ? prev.filter((id) => id !== modelId) : [...prev, modelId],
    );
  };

  const handleNext = async () => {
    if (activeStep === 1) {
      setActiveStep(2);
      return;
    }

    if (activeStep === 2) {
      await updateState({
        ensemble_stacking_base_models: selectedModels,
        ensemble_stacking_completed: false,
        ensemble_stacking_metrics_rmse: null,
        ensemble_stacking_metrics_mae: null,
        ensemble_stacking_metrics_r2: null,
      });
      setActiveStep(3);
      return;
    }

    if (activeStep === 3 && !modelState.completed) {
      await updateState({
        ensemble_stacking_base_models: selectedModels,
        ensemble_stacking_completed: true,
        ensemble_stacking_metrics_rmse: MOCK_METRICS.rmse,
        ensemble_stacking_metrics_mae: MOCK_METRICS.mae,
        ensemble_stacking_metrics_r2: MOCK_METRICS.r2,
      });
    }
  };

  const handleBack = () => {
    if (activeStep === 1) return;
    setActiveStep((prev) => Math.max(1, prev - 1));
  };

  const renderIntro = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Stacking 融合概览</h3>
        <p className="text-sm text-gray-600 leading-relaxed">
          Stacking 通过多层结构组合多个基础模型：第一层输入原始特征，输出再作为第二层（元学习器）的输入。元学习器掌握各基础模型的优势区间，产生最终预测结果。
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
          <p className="font-semibold text-teal-700 mb-2">前提条件</p>
          <p className="text-sm text-teal-700">至少两个基础模型已完成训练，且预测目标一致。</p>
        </div>
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
          <p className="font-semibold text-teal-700 mb-2">优势</p>
          <p className="text-sm text-teal-700">可综合多模型特征，显著提升泛化能力。</p>
        </div>
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
          <p className="font-semibold text-teal-700 mb-2">注意事项</p>
          <p className="text-sm text-teal-700">需防止信息泄露，训练时应采用交叉验证或 out-of-fold 方案。</p>
        </div>
      </div>
    </div>
  );

  const renderSelectionStep = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">选择第一层基础模型</h3>
        <p className="text-sm text-gray-600 mb-6">建议选择 2-4 个表现互补的模型，元学习器将利用它们的预测作为输入。</p>
        <div className="space-y-4">
          {availableBaseModels.map((model) => {
            const isSelected = selectedModels.includes(model.id);
            return (
              <div
                key={model.id}
                onClick={() => handleModelToggle(model.id)}
                className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                  isSelected ? "border-teal-500 bg-teal-50" : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected ? "border-teal-500 bg-teal-500" : "border-gray-300"}`}>
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
        <h3 className="text-xl font-semibold text-gray-900 mb-4">训练 Stacking 元学习器</h3>
        {!modelState.completed && (
          <p className="text-sm text-gray-600">
            点击“保存融合结果”后，系统将使用元学习器对基础模型输出进行训练并保存指标。
          </p>
        )}

        {modelState.completed && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-green-800 font-semibold">Stacking 融合已完成并保存。</p>
                <p className="text-sm text-green-700">参与模型：{modelState.baseModels.length} 个</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wide">RMSE</p>
                <p className="text-2xl font-semibold text-teal-700 mt-2">{modelState.metrics.rmse ?? '—'}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wide">MAE</p>
                <p className="text-2xl font-semibold text-teal-700 mt-2">{modelState.metrics.mae ?? '—'}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wide">R²</p>
                <p className="text-2xl font-semibold text-teal-700 mt-2">{modelState.metrics.r2 ?? '—'}</p>
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
    if (activeStep === 2) return "下一步：保存融合";
    if (modelState.completed) return "结果已保存";
    return "保存融合结果";
  })();

  const isNextDisabled =
    (activeStep === 2 && selectedModels.length < 2) ||
    (activeStep === 3 && Boolean(modelState.completed));

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200">
      <div className="border-b border-gray-200 bg-white rounded-t-xl p-6">
        <div className="flex items-center space-x-3 text-sm text-gray-500">
          <Layers className="w-5 h-5 text-teal-600" />
          <span>Stacking 融合分步指导</span>
        </div>
        <h2 className="mt-2 text-2xl font-semibold text-gray-900">Stacking 融合模型</h2>
        <p className="text-gray-600">按照向导依次完成方法了解、模型选择与元学习器训练。</p>
      </div>

      <div className="px-6 pt-6 pb-4 flex flex-col gap-6">
        <div className="relative">
          <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 hidden md:block">
            <div className="h-1 rounded-full bg-gray-200">
              <div
                className="h-1 rounded-full bg-gradient-to-r from-teal-500 to-green-500 transition-all duration-500"
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
                      ? "border-teal-500 bg-teal-50"
                      : isCompleted
                      ? "border-green-500 bg-green-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${isCompleted ? "bg-green-500 text-white" : isActive ? "bg-teal-500 text-white" : "bg-gray-200 text-gray-700"}`}>
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
              : "bg-teal-600 hover:bg-teal-700"
          }`}
        >
          <span>{nextButtonLabel}</span>
        </button>
      </div>
    </div>
  );
};

export default StackingEnsembleModel;
