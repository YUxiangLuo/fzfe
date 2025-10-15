import React, {useEffect, useMemo, useState, useRef} from "react";
import { CheckCircle, Sparkles, Loader2, AlertTriangle } from "lucide-react";
import { useExperiment, type ModelMetrics } from "../../contexts/ExperimentContext";
import { apiClient } from "../../../../utils/apiClient";

const steps = [
  { id: 1, title: "方法简介", description: "了解 Boosting 融合如何逐步提升模型表现。" },
  { id: 2, title: "选择基础模型", description: "勾选已完成的基础模型作为训练序列。" },
  { id: 3, title: "运行并查看指标", description: "执行 Boosting 流程，查看融合后的指标。" },
] as const;

const BoostingEnsembleModel: React.FC = () => {
  const { state, updateState } = useExperiment();
  const modelState = {
    completed: state.ensemble_boosting_completed,
    baseModels: state.ensemble_boosting_base_models,
    metrics: {
      rmse: state.ensemble_boosting_metrics_rmse,
      mae: state.ensemble_boosting_metrics_mae,
      r2: state.ensemble_boosting_metrics_r2,
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
  const hasMountedRef = useRef(false);
  const [selectedModels, setSelectedModels] = useState<string[]>(modelState.baseModels);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingError, setTrainingError] = useState<string | null>(null);

  const resetMetrics = () => ({
    ensemble_boosting_completed: false,
    ensemble_boosting_metrics_rmse: null,
    ensemble_boosting_metrics_mae: null,
    ensemble_boosting_metrics_r2: null,
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

  const handleModelToggle = (modelId: string) => {
    setSelectedModels((prev) => {
      const next = prev.includes(modelId)
        ? prev.filter((id) => id !== modelId)
        : [...prev, modelId];
      return next;
    });
  };

  const handleTrainModel = async () => {
    if (isTraining || modelState.completed) return;
    setIsTraining(true);
    setTrainingError(null);

    try {
      // Map frontend model IDs to backend format
      const modelIdMap: Record<string, string> = {
        'moving_average': 'ma',
        'exponential_smoothing': 'es',
        'arima': 'arima',
        'lstm': 'lstm'
      };

      const backendModels = selectedModels.map(id => modelIdMap[id] || id);

      const requestBody: Record<string, any> = {
        selected_industry: state.selected_industry,
        selected_company: state.selected_company,
        selected_product: state.selected_product,
        data_window_train_start_index: state.data_window_train_start_index,
        data_window_train_end_index: state.data_window_train_end_index,
        data_window_evaluate_start_index: state.data_window_evaluate_start_index,
        data_window_evaluate_end_index: state.data_window_evaluate_end_index,
        ensemble_boosting_base_models: backendModels,
      };

      // Add model-specific parameters ONLY if the model is selected
      if (backendModels.includes('arima')) {
        requestBody.arima_d = state.arima_d;
      }
      if (backendModels.includes('es')) {
        requestBody.exponential_smoothing_alpha = state.exponential_smoothing_alpha;
      }
      if (backendModels.includes('ma')) {
        requestBody.moving_average_window = state.moving_average_window;
      }
      if (backendModels.includes('lstm')) {
        requestBody.lstm_features = state.lstm_features;
        requestBody.lstm_target_field = state.lstm_target_field;
        requestBody.lstm_normalization = state.lstm_normalization;
      }

      // Remove undefined/null values to avoid sending them to backend
      Object.keys(requestBody).forEach(key => {
        if (requestBody[key] === undefined || requestBody[key] === null) {
          delete requestBody[key];
        }
      });

      const response = await apiClient.post<{
        status: string;
        results: {
          mode: string;
          strategy: string;
          n_models: number;
          eval_range: { start: number; end: number; };
          metrics: { rmse: number; mae: number; mape: number; r2: number; };
          notes?: string[];
          saved_ensemble?: string;
        };
      }>("/model/boosting/train", requestBody);

      if (response.status === "success") {
        const metrics = response.results?.metrics;
        await updateState({
          ensemble_boosting_base_models: selectedModels,
          ensemble_boosting_completed: true,
          ensemble_boosting_metrics_rmse: metrics.rmse ?? null,
          ensemble_boosting_metrics_mae: metrics.mae ?? null,
          ensemble_boosting_metrics_r2: metrics.r2 ?? null,
        });
      } else {
        throw new Error("Boosting 融合训练返回失败状态");
      }
    } catch (err: any) {
      setTrainingError(err.message || "训练过程中发生未知错误");
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

    if (activeStep === 3 && !modelState.completed && !isTraining) {
      await handleTrainModel();
    }
  };

  const handleBack = () => {
    if (activeStep === 1) return;
    setActiveStep((prev) => Math.max(1, prev - 1));
  };

  const renderIntro = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Boosting 融合概览</h3>
        <p className="text-sm text-gray-600 leading-relaxed">
          Boosting 通过序列化训练多个弱学习器，每一轮聚焦上一轮的误差，逐步提高整体拟合能力。融合预测时，可对基础模型残差进行再学习，提升精度。
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="font-semibold text-blue-700 mb-2">前提条件</p>
          <p className="text-sm text-blue-700">至少两种互补的基础模型已完成训练。</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="font-semibold text-blue-700 mb-2">优势</p>
          <p className="text-sm text-blue-700">能够逐步减小偏差，提升预测精度。</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="font-semibold text-blue-700 mb-2">注意事项</p>
          <p className="text-sm text-blue-700">需防止过拟合，合理控制迭代次数与学习率。</p>
        </div>
      </div>
    </div>
  );

  const renderSelectionStep = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">选择用于 Boosting 的基础模型</h3>
        <p className="text-sm text-gray-600 mb-6">建议选择两个以上模型，系统将按序列进行训练。</p>
        <div className="space-y-4">
          {availableBaseModels.map((model) => {
            const isSelected = selectedModels.includes(model.id);
            return (
              <div
                key={model.id}
                onClick={() => handleModelToggle(model.id)}
                className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                  isSelected ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-blue-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${isSelected ? "border-blue-500 bg-blue-500" : "border-gray-300"}`}>
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
        <h3 className="text-xl font-semibold text-gray-900 mb-4">运行 Boosting 并查看结果</h3>
        {!modelState.completed && !isTraining && (
          <p className="text-sm text-gray-600">
            点击“开始训练并保存结果”后，系统将按序列训练基础模型并调整残差，输出融合指标。
          </p>
        )}

        {isTraining && (
          <div className="flex items-center space-x-3 text-blue-600 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Boosting 训练中，请稍候...</span>
          </div>
        )}

        {trainingError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-800 font-semibold">训练失败</p>
              <p className="text-sm text-red-700 mt-1">{trainingError}</p>
            </div>
          </div>
        )}

        {modelState.completed && !isTraining && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center space-x-3">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-green-800 font-semibold">Boosting 融合已完成并保存。</p>
                <p className="text-sm text-green-700">参与模型：{modelState.baseModels.length} 个</p>
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
        return renderSelectionStep();
      case 3:
        return renderTrainingStep();
      default:
        return null;
    }
  };

  const nextButtonLabel = (() => {
    if (activeStep === 1) return "下一步：选择基础模型";
    if (activeStep === 2) return "下一步：运行 Boosting";
    if (modelState.completed) return "结果已保存";
    if (isTraining) return "训练中...";
    return "开始训练并保存结果";
  })();

  const isNextDisabled =
    (activeStep === 2 && selectedModels.length < 2) ||
    (activeStep === 3 && (isTraining || Boolean(modelState.completed)));

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200">
      <div className="border-b border-gray-200 bg-white rounded-t-xl p-6">
        <div className="flex items-center space-x-3 text-sm text-gray-500">
          <Sparkles className="w-5 h-5 text-blue-600" />
          <span>Boosting 融合分步指导</span>
        </div>
        <h2 className="mt-2 text-2xl font-semibold text-gray-900">Boosting 融合模型</h2>
        <p className="text-gray-600">按照向导依次完成方法了解、模型选择与融合训练。</p>
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

export default BoostingEnsembleModel;
