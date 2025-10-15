import React, { useEffect, useMemo, useRef, useState } from "react";
import { ChartSpline, CheckCircle, Loader2, AlertTriangle } from "lucide-react";
import { useExperiment, type ModelMetrics } from "../../contexts/ExperimentContext";
import { apiClient } from "../../../../utils/apiClient";

const steps = [
  { id: 1, title: "方法简介", description: "了解指数平滑法的核心思想和适用场景。" },
  { id: 2, title: "设置平滑系数", description: "调整 α 值，控制对最新数据的敏感度。" },
  { id: 3, title: "运行并查看指标", description: "执行模型训练并查看 RMSE / MAE / R² 指标。" },
] as const;

const ExponentialSmoothingModel: React.FC = () => {
  const { state, updateState } = useExperiment();
  const modelState = {
    completed: state.exponential_smoothing_completed,
    alpha: state.exponential_smoothing_alpha,
    metrics: {
      rmse: state.exponential_smoothing_metrics_rmse,
      mae: state.exponential_smoothing_metrics_mae,
      r2: state.exponential_smoothing_metrics_r2,
    } as ModelMetrics,
  };

  const baseModelsCompletedCount = [
    state.moving_average_completed,
    state.exponential_smoothing_completed,
    state.arima_completed,
    state.lstm_completed,
  ].filter(Boolean).length;

  const hasAnyEnsembleCompleted = [
    state.ensemble_weighted_completed,
    state.ensemble_boosting_completed,
    state.ensemble_stacking_completed,
  ].some(Boolean);

  const shouldShowFusionUnlockedNotice =
    baseModelsCompletedCount >= 2 && !hasAnyEnsembleCompleted;

  const derivedStep = useMemo(() => {
    if (modelState.completed) return 3;
    if (modelState.alpha !== null && modelState.alpha !== undefined) return 2;
    return 1;
  }, [modelState.completed, modelState.alpha]);

  const [activeStep, setActiveStep] = useState(derivedStep);
  const [alpha, setAlpha] = useState(modelState.alpha ?? 0.5);
  const [isTraining, setIsTraining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildDownstreamReset = () => ({
    ensemble_weighted_completed: false,
    ensemble_weighted_base_models: [],
    ensemble_weighted_metrics_rmse: null,
    ensemble_weighted_metrics_mae: null,
    ensemble_weighted_metrics_r2: null,
    ensemble_boosting_completed: false,
    ensemble_boosting_base_models: [],
    ensemble_boosting_metrics_rmse: null,
    ensemble_boosting_metrics_mae: null,
    ensemble_boosting_metrics_r2: null,
    ensemble_stacking_completed: false,
    ensemble_stacking_base_models: [],
    ensemble_stacking_metrics_rmse: null,
    ensemble_stacking_metrics_mae: null,
    ensemble_stacking_metrics_r2: null,
    selected_best_model: null,
    quiz_about_model_completed: false,
    quiz_about_plan_completed: false,
    production_plan_completed: false,
    production_forecast_periods: null,
    production_initial_inventory: null,
    production_target_service_level: null,
    production_safety_stock_z_score: null,
    production_forecast_results: null,
    production_mps_table: [],
    highest_completed_step: Math.min(state.highest_completed_step ?? 0, 4),
    current_step: Math.min(state.current_step ?? 5, 5),
  });

  useEffect(() => {
    setActiveStep(derivedStep);
  }, [derivedStep]);

  useEffect(() => {
    if (modelState.alpha !== null && modelState.alpha !== undefined) {
      setAlpha(modelState.alpha);
    }
  }, [modelState.alpha]);

  const handleAlphaChange = (value: number) => {
    setAlpha(value);
  };

  const handleCalculate = async () => {
    if (isTraining || modelState.completed) return;

    setIsTraining(true);
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
        exponential_smoothing_alpha: alpha,
      };

      const response = await apiClient.post<{
        status: string;
        results: {
          mode: string;
          data_points: number;
          alpha: number;
          train_range: {
            start_index: number;
            end_index: number;
            months: string[];
          };
          evaluate_range: {
            start_index: number;
            end_index: number;
            months: string[];
          };
          evaluated_points: number;
          evaluate_indices: number[];
          evaluate_months: string[];
          metrics: {
            rmse: number;
            mae: number;
            mape: number;
            r2: number;
          };
          notes?: string[];
          saved_model?: string;
        };
      }>("/model/es/train", requestBody);

      if (response.status === "success") {
        const metrics = response.results?.metrics ?? { rmse: null, mae: null, r2: null };
        await updateState({
          exponential_smoothing_alpha: alpha,
          exponential_smoothing_completed: true,
          exponential_smoothing_metrics_rmse: metrics.rmse ?? null,
          exponential_smoothing_metrics_mae: metrics.mae ?? null,
          exponential_smoothing_metrics_r2: metrics.r2 ?? null,
        });
      } else {
        throw new Error("模型计算返回失败状态");
      }
    } catch (err: any) {
      setError(err.message || "计算过程中发生未知错误");
    } finally {
      setIsTraining(false);
    }
  };

  const handleNext = async () => {
    if (activeStep === 1) {
      setActiveStep(2);
      return;
    }

    if (activeStep === 2) {
      setActiveStep(3);
      return;
    }

    if (activeStep === 3) {
      handleCalculate();
    }
  };

  const handleBack = () => {
    if (activeStep === 1) return;
    setActiveStep((prev) => Math.max(1, prev - 1));
  };

  const renderIntro = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">什么是指数平滑法？</h3>
        <p className="text-sm text-gray-600 leading-relaxed">
          指数平滑法通过指数递减的权重为历史数据赋值，使最新数据影响最大、远期数据影响逐步减小。α 值越大，模型对最新变化越敏感；α 值越小，预测曲线越平滑。
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="font-semibold text-blue-700 mb-2">适用场景</p>
          <p className="text-sm text-blue-700">短期预测、需求趋势较稳定的产品线。</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="font-semibold text-blue-700 mb-2">优势</p>
          <p className="text-sm text-blue-700">计算简便、对突变具有较快响应速度。</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="font-semibold text-blue-700 mb-2">注意事项</p>
          <p className="text-sm text-blue-700">需要调参以平衡响应速度与稳定性，过大或过小都会影响效果。</p>
        </div>
      </div>
    </div>
  );

  const renderAlphaStep = () => (
    <div className="space-y-8">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">选择平滑系数 α</h3>
        <p className="text-sm text-gray-600 mb-6">α 越大，模型越关注最新数据；α 越小，模型越平滑。通常可从 0.1 - 0.3 起步。</p>
        <label className="block text-lg font-medium text-gray-700 mb-3">
          平滑系数 (α)：<span className="text-blue-600 font-bold">{alpha.toFixed(2)}</span>
        </label>
        <input
          type="range"
          min="0.01"
          max="1"
          step="0.01"
          value={alpha}
          onChange={(e) => handleAlphaChange(Number(e.target.value))}
          className="w-full"
        />
        <p className="text-xs text-gray-500 mt-2">提示：α=0.1-0.3 适合平稳趋势，α&gt;0.5 适合快速变化场景。</p>
      </div>
    </div>
  );

  const renderTrainingStep = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">运行模型并查看结果</h3>
        {!modelState.completed && !isTraining && (
          <p className="text-sm text-gray-600">
            点击"开始计算并保存结果"后，系统将使用 α = {alpha.toFixed(2)} 的指数平滑，对最新销量给予更高权重。
          </p>
        )}

        {isTraining && (
          <div className="flex items-center space-x-3 text-blue-600 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>正在计算指数平滑结果...</span>
          </div>
        )}

        {error && !isTraining && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <div>
              <p className="text-red-800 font-semibold">计算失败</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {modelState.completed && !isTraining && !error && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-green-800 font-semibold">模型已计算完成并保存。</p>
                <p className="text-sm text-green-700">平滑系数：{(modelState.alpha ?? alpha).toFixed(2)}</p>
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
            {shouldShowFusionUnlockedNotice && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-3 text-sm text-purple-800">
                🎉 已完成至少两个基础模型，融合模型现已解锁！尝试组合不同算法，进一步提升预测表现。
              </div>
            )}
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
        return renderAlphaStep();
      case 3:
        return renderTrainingStep();
      default:
        return null;
    }
  };

  const nextButtonLabel = (() => {
    if (activeStep === 1) return "下一步：设置 α";
    if (activeStep === 2) return "下一步：运行模型";
    if (modelState.completed) return "结果已保存";
    if (isTraining) return "计算中...";
    return "开始计算并保存结果";
  })();

  const isNextDisabled =
    (activeStep === 2 && (alpha <= 0 || alpha > 1)) ||
    (activeStep === 3 && (isTraining || Boolean(modelState.completed)));

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200">
      <div className="border-b border-gray-200 bg-white rounded-t-xl p-6">
        <div className="flex items-center space-x-3 text-sm text-gray-500">
          <ChartSpline className="w-5 h-5 text-blue-600" />
          <span>指数平滑法分步指导</span>
        </div>
        <h2 className="mt-2 text-2xl font-semibold text-gray-900">指数平滑模型</h2>
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
                  className={`relative rounded-xl border p-5 transition-all shadow-sm text-center ${
                    isActive
                      ? "border-blue-500 bg-blue-50"
                      : isCompleted
                      ? "border-green-500 bg-green-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <div className="flex flex-col items-center gap-2 mb-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold leading-none ${isCompleted ? "bg-green-500 text-white" : isActive ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"}`}>
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

export default ExponentialSmoothingModel;
