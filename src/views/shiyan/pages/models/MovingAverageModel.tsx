import React, { useEffect, useMemo, useState } from "react";
import { BarChart3, CheckCircle, Loader2 } from "lucide-react";
import { useExperiment } from "../../contexts/ExperimentContext";

const MOCK_METRICS = { rmse: 4.6, mae: 2.9, r2: 0.88 };

const steps = [
  { id: 1, title: "方法简介", description: "了解移动平均法的基本概念及其适用场景。" },
  { id: 2, title: "设置时间窗口", description: "调整时间窗口大小，平衡平滑度与敏感性。" },
  { id: 3, title: "运行并查看指标", description: "执行模型计算并查看 RMSE / MAE / R² 指标。" },
] as const;

const MovingAverageModel: React.FC = () => {
  const { state, updateState } = useExperiment();
  const modelState = state.movingAverage;

  const derivedStep = useMemo(() => {
    if (modelState.completed) return 3;
    if (modelState.window !== null && modelState.window !== undefined) return 3;
    return 1;
  }, [modelState.completed, modelState.window]);

  const [activeStep, setActiveStep] = useState(derivedStep);
  const [windowSize, setWindowSize] = useState(modelState.window ?? 3);
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    setActiveStep(derivedStep);
  }, [derivedStep]);

  useEffect(() => {
    if (modelState.window !== null && modelState.window !== undefined) {
      setWindowSize(modelState.window);
    }
  }, [modelState.window]);

  const handleNext = async () => {
    if (activeStep === 1) {
      setActiveStep(2);
      return;
    }

    if (activeStep === 2) {
      await updateState({
        movingAverage: {
          ...modelState,
          completed: false,
          window: windowSize,
          metrics: modelState.metrics,
        },
      });
      setActiveStep(3);
      return;
    }

    if (activeStep === 3 && !modelState.completed && !isCalculating) {
      setIsCalculating(true);
      const baseline = state.movingAverage;
      setTimeout(async () => {
        await updateState({
          movingAverage: {
            ...baseline,
            completed: true,
            window: windowSize,
            metrics: { ...MOCK_METRICS },
          },
        });
        setIsCalculating(false);
      }, 1200);
    }
  };

  const handleBack = () => {
    if (activeStep === 1) return;
    setActiveStep((prev) => Math.max(1, prev - 1));
  };

  const renderIntro = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">什么是移动平均法？</h3>
        <p className="text-sm text-gray-600 leading-relaxed">
          移动平均法通过对固定时间窗口内的历史数据取平均，平滑短期波动、揭示需求趋势。窗口越大，对异常值越不敏感，但响应速度越慢；窗口越小，对最新变化更敏捷，但预测可能更波动。
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="font-semibold text-blue-700 mb-2">适用场景</p>
          <p className="text-sm text-blue-700">需求相对稳定、季节波动不明显的产品线。</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="font-semibold text-blue-700 mb-2">优势</p>
          <p className="text-sm text-blue-700">实现简单、易于解释，可作为其他算法的基准。</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="font-semibold text-blue-700 mb-2">注意事项</p>
          <p className="text-sm text-blue-700">窗口选取不当会导致滞后或过度震荡，需要结合业务经验调整。</p>
        </div>
      </div>
    </div>
  );

  const renderWindowStep = () => (
    <div className="space-y-8">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">设置时间窗口大小</h3>
        <p className="text-sm text-gray-600 mb-6">窗口大小决定了参与平均的历史期数，建议结合产品特性选择 3-6 个月作为起点。</p>
        <label className="block text-lg font-medium text-gray-700 mb-3">
          窗口大小：<span className="text-blue-600 font-bold">{windowSize}</span> 个月
        </label>
        <input
          type="range"
          min="2"
          max="12"
          value={windowSize}
          onChange={(e) => setWindowSize(Number(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <p className="text-xs text-gray-500 mt-2">提示：窗口越大，结果越平滑，但对最新变化的响应更慢。</p>
      </div>
    </div>
  );

  const renderTrainingStep = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">运行模型并查看结果</h3>
        {!modelState.completed && !isCalculating && (
          <p className="text-sm text-gray-600">
            点击“开始计算并保存结果”后，系统将使用窗口大小 {windowSize} 个月的移动平均，输出误差指标帮助你评估模型效果。
          </p>
        )}

        {isCalculating && (
          <div className="flex items-center space-x-3 text-blue-600 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>正在计算移动平均结果...</span>
          </div>
        )}

        {modelState.completed && !isCalculating && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-green-800 font-semibold">模型已计算完成并保存。</p>
                <p className="text-sm text-green-700">窗口大小：{modelState.window ?? windowSize} 个月</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wide">RMSE</p>
                <p className="text-2xl font-semibold text-blue-700 mt-2">{modelState.metrics.rmse ?? '—'}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wide">MAE</p>
                <p className="text-2xl font-semibold text-blue-700 mt-2">{modelState.metrics.mae ?? '—'}</p>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                <p className="text-xs text-gray-500 uppercase tracking-wide">R²</p>
                <p className="text-2xl font-semibold text-blue-700 mt-2">{modelState.metrics.r2 ?? '—'}</p>
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
        return renderWindowStep();
      case 3:
        return renderTrainingStep();
      default:
        return null;
    }
  };

  const nextButtonLabel = (() => {
    if (activeStep === 1) return "下一步：设置窗口";
    if (activeStep === 2) return "下一步：运行模型";
    if (modelState.completed) return "结果已保存";
    if (isCalculating) return "计算中...";
    return "开始计算并保存结果";
  })();

  const isNextDisabled =
    (activeStep === 2 && windowSize < 2) ||
    (activeStep === 3 && (isCalculating || Boolean(modelState.completed)));

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200">
      <div className="border-b border-gray-200 bg-white rounded-t-xl p-6">
        <div className="flex items-center space-x-3 text-sm text-gray-500">
          <BarChart3 className="w-5 h-5 text-blue-600" />
          <span>移动平均法分步指导</span>
        </div>
        <h2 className="mt-2 text-2xl font-semibold text-gray-900">移动平均模型</h2>
        <p className="text-gray-600">按照向导依次完成方法了解、参数设置与模型运行。</p>
      </div>

      <div className="px-6 pt-6 pb-4 flex flex-col gap-6">
        <div className="relative">
          <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 hidden md:block">
            <div className="h-1 rounded-full bg-gray-200">
              <div
                className="h-1 rounded-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
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
                      ? "border-blue-500 bg-blue-50"
                      : isCompleted
                      ? "border-green-500 bg-green-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${isCompleted ? "bg-green-500 text-white" : isActive ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"}`}>
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
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          <span>{nextButtonLabel}</span>
        </button>
      </div>
    </div>
  );
};

export default MovingAverageModel;
