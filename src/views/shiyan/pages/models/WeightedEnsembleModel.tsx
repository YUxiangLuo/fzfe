import React, {useEffect, useMemo, useState, useRef} from "react";
import { CheckCircle, Scale, Loader2, AlertTriangle } from "lucide-react";
import { useExperiment, type ModelMetrics } from "../../contexts/ExperimentContext";
import { apiClient } from "../../../../utils/apiClient";

const steps = [
  { id: 1, title: "方法简介" },
  { id: 2, title: "选择基础模型" },
  { id: 3, title: "运行并查看指标" },
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
  const [trainingError, setTrainingError] = useState<string | null>(null);

  const resetMetrics = () => ({
    ensemble_weighted_completed: false,
    ensemble_weighted_metrics_rmse: null,
    ensemble_weighted_metrics_mae: null,
    ensemble_weighted_metrics_r2: null,
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

  const handleModelToggle = async (modelId: string) => {
    const next = selectedModels.includes(modelId)
      ? selectedModels.filter((id) => id !== modelId)
      : [...selectedModels, modelId];
    setSelectedModels(next);
    await updateState({
      ensemble_weighted_base_models: next,
      ...resetMetrics(),
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

      const requestBody = {
        selected_industry: state.selected_industry,
        selected_company: state.selected_company,
        selected_product: state.selected_product,
        data_window_train_start_index: state.data_window_train_start_index,
        data_window_train_end_index: state.data_window_train_end_index,
        data_window_evaluate_start_index: state.data_window_evaluate_start_index,
        data_window_evaluate_end_index: state.data_window_evaluate_end_index,
        ensemble_weighted_base_models: backendModels,
      };

      const response = await apiClient.post<{
        status: string;
        results: {
          mode: string;
          strategy: string;
          n_models: number;
          weights: number[];
          eval_range: { start: number; end: number; };
          metrics: { rmse: number; mae: number; mape: number; r2: number; };
          notes?: string[];
          saved_ensemble?: string;
        };
      }>("/model/weighted-average/train", requestBody);

      if (response.status === "success") {
        const metrics = response.results?.metrics;
        await updateState({
          ensemble_weighted_base_models: selectedModels,
          ensemble_weighted_completed: true,
          ensemble_weighted_metrics_rmse: metrics.rmse ?? null,
          ensemble_weighted_metrics_mae: metrics.mae ?? null,
          ensemble_weighted_metrics_r2: metrics.r2 ?? null,
        });
      } else {
        throw new Error("融合模型训练返回失败状态");
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
        <h3 className="text-xl font-semibold text-gray-900 mb-4">什么是加权平均融合？</h3>
        <p className="text-sm text-gray-600 leading-relaxed">
          加权平均融合通过对多个基础模型赋予不同权重，将其预测结果合成为一个更稳定、更准确的预测。权重通常通过误差优化或交叉验证获得。
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="font-semibold text-blue-700 mb-2">前提条件</p>
          <p className="text-sm text-blue-700">至少完成两个基础模型，并确保预测目标一致。</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="font-semibold text-blue-700 mb-2">优势</p>
          <p className="text-sm text-blue-700">可减小单一模型偏差，提升整体稳定性。</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="font-semibold text-blue-700 mb-2">注意事项</p>
          <p className="text-sm text-blue-700">基础模型需表现互补；权重优化需防止过拟合。</p>
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
        <h3 className="text-xl font-semibold text-gray-900 mb-4">运行融合模型并查看结果</h3>
        {!modelState.completed && !isTraining && (
          <p className="text-sm text-gray-600">
            点击“开始训练并保存结果”后，系统将根据基础模型表现自动优化权重并输出融合指标。
          </p>
        )}

        {isTraining && (
          <div className="flex items-center space-x-3 text-blue-600 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>正在优化权重并融合预测...</span>
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
                <p className="text-green-800 font-semibold">融合模型已训练完成并保存。</p>
                <p className="text-sm text-green-700">融合模型数量：{modelState.baseModels.length} 个</p>
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
      <div className="border-b border-gray-200 bg-white rounded-t-xl p-4">
        <h2 className="flex items-center gap-3 text-xl font-semibold text-gray-900">
          <Scale className="w-5 h-5 text-blue-600" />
          加权平均融合模型
        </h2>
      </div>

      <div className="px-6 pt-4 pb-4 flex flex-col gap-6">
        <div className="flex items-center gap-2">
          {steps.map((step, index) => {
            const isActive = step.id === activeStep;
            const isCompleted = step.id < activeStep || (step.id === steps.length && modelState.completed);
            return (
              <React.Fragment key={step.id}>
                <div
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                    isActive
                      ? "border-blue-500 bg-blue-50"
                      : isCompleted
                      ? "border-green-500 bg-green-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${isCompleted ? "bg-green-500 text-white" : isActive ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"}`}>
                    {isCompleted ? <CheckCircle className="w-3.5 h-3.5" /> : step.id}
                  </div>
                  <span className={`text-sm font-medium whitespace-nowrap ${isActive ? "text-blue-700" : isCompleted ? "text-green-700" : "text-gray-600"}`}>
                    {step.title}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`h-0.5 flex-1 ${isCompleted ? "bg-green-500" : "bg-gray-200"}`} />
                )}
              </React.Fragment>
            );
          })}
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

export default WeightedEnsembleModel;
