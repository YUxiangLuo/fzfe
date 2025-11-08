import React, {useEffect, useMemo, useState, useRef} from "react";
import { CheckCircle, Scale, Loader2, AlertTriangle } from "lucide-react";
import { useExperiment, type ModelMetrics } from "../../contexts/ExperimentContext";
import { apiClient } from "../../../../utils/apiClient";

const steps = [
  { id: 1, title: "方法步骤" },
  { id: 2, title: "模型选择" },
  { id: 3, title: "计算结果" },
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
  const [showComparison, setShowComparison] = useState(false);

  // 评估数据
  const [evaluationData, setEvaluationData] = useState<{
    months: string[];
    y_true: number[];
    predictions: number[];
  } | null>(null);

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
    production_capacity_mode: null,
    production_capacity_scenario: null,
    production_capacity: null,
    production_custom_capacity: null,
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
          evaluate_range: { months: string[]; };
          eval_y_true: number[];
          eval_predictions: number[];
          metrics: { rmse: number; mae: number; mape: number; r2: number; };
          notes?: string[];
          saved_ensemble?: string;
        };
      }>("/models/weighted-average/training", requestBody);

      if (response.status === "success") {
        const metrics = response.results?.metrics;

        // 保存评估数据
        if (response.results?.eval_y_true && response.results?.eval_predictions && response.results?.evaluate_range?.months) {
          setEvaluationData({
            months: response.results.evaluate_range.months,
            y_true: response.results.eval_y_true,
            predictions: response.results.eval_predictions,
          });
        }

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
      setShowComparison(false);
      // Auto-trigger training when entering step 3
      if (!modelState.completed) {
        await handleTrainModel();
      }
      return;
    }

    if (activeStep === 3) {
      // Toggle comparison view when training is completed
      if (modelState.completed) {
        setShowComparison(!showComparison);
      }
    }
  };

  const handleBack = () => {
    if (activeStep === 1) return;
    setShowComparison(false);
    setActiveStep((prev) => Math.max(1, prev - 1));
  };

  const renderMethodSteps = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">加权融合法的操作步骤</h3>
        <p className="text-sm text-gray-600 mb-4">加权融合法的一般步骤为：</p>
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-[#27579d] text-white rounded-full flex items-center justify-center font-bold">
              1
            </div>
            <div>
              <p className="text-sm text-gray-600">
                选择至少两个已完成的基础模型作为融合对象；
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-[#27579d] text-white rounded-full flex items-center justify-center font-bold">
              2
            </div>
            <div>
              <p className="text-sm text-gray-600">
                系统根据各模型在验证集上的表现，通过误差优化或交叉验证自动计算最优权重；
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-[#27579d] text-white rounded-full flex items-center justify-center font-bold">
              3
            </div>
            <div>
              <p className="text-sm text-gray-600">
                使用计算得到的权重对各模型的预测结果进行加权平均，生成最终融合预测。
              </p>
            </div>
          </div>
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

  const renderModelComparison = () => {
    const allModels = [
      {
        name: '移动平均法',
        completed: state.moving_average_completed,
        metrics: {
          rmse: state.moving_average_metrics_rmse,
          mae: state.moving_average_metrics_mae,
          r2: state.moving_average_metrics_r2,
        },
      },
      {
        name: '指数平滑法',
        completed: state.exponential_smoothing_completed,
        metrics: {
          rmse: state.exponential_smoothing_metrics_rmse,
          mae: state.exponential_smoothing_metrics_mae,
          r2: state.exponential_smoothing_metrics_r2,
        },
      },
      {
        name: 'ARIMA',
        completed: state.arima_completed,
        metrics: {
          rmse: state.arima_metrics_rmse,
          mae: state.arima_metrics_mae,
          r2: state.arima_metrics_r2,
        },
      },
      {
        name: 'LSTM',
        completed: state.lstm_completed,
        metrics: {
          rmse: state.lstm_metrics_rmse,
          mae: state.lstm_metrics_mae,
          r2: state.lstm_metrics_r2,
        },
      },
      {
        name: '加权融合',
        completed: state.ensemble_weighted_completed,
        metrics: {
          rmse: state.ensemble_weighted_metrics_rmse,
          mae: state.ensemble_weighted_metrics_mae,
          r2: state.ensemble_weighted_metrics_r2,
        },
      },
      {
        name: 'Boosting融合',
        completed: state.ensemble_boosting_completed,
        metrics: {
          rmse: state.ensemble_boosting_metrics_rmse,
          mae: state.ensemble_boosting_metrics_mae,
          r2: state.ensemble_boosting_metrics_r2,
        },
      },
      {
        name: 'Stacking融合',
        completed: state.ensemble_stacking_completed,
        metrics: {
          rmse: state.ensemble_stacking_metrics_rmse,
          mae: state.ensemble_stacking_metrics_mae,
          r2: state.ensemble_stacking_metrics_r2,
        },
      },
    ];

    const completedModels = allModels.filter(m => m.completed);

    return (
      <div className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">模型对比</h3>
          {completedModels.length === 0 ? (
            <p className="text-gray-600 text-center py-8">暂无已完成的模型可供对比</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-900">模型名称</th>
                    <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-900">RMSE</th>
                    <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-900">MAE</th>
                    <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-900">R²</th>
                  </tr>
                </thead>
                <tbody>
                  {completedModels.map((model, index) => (
                    <tr key={index} className={model.name === '加权融合' ? 'bg-blue-50' : ''}>
                      <td className="border border-gray-200 px-4 py-3 font-medium text-gray-900">
                        {model.name}
                        {model.name === '加权融合' && (
                          <span className="ml-2 text-xs bg-[#27579d] text-white px-2 py-1 rounded">当前</span>
                        )}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-center text-gray-700">
                        {model.metrics.rmse?.toFixed(2) ?? '—'}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-center text-gray-700">
                        {model.metrics.mae?.toFixed(2) ?? '—'}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-center text-gray-700">
                        {model.metrics.r2?.toFixed(4) ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderResultsStep = () => {
    if (showComparison) {
      return renderModelComparison();
    }

    return (
      <div className="space-y-6">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">计算结果</h3>

          {isTraining && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 text-[#27579d] animate-spin mb-4" />
              <p className="text-lg text-gray-700 font-medium">正在训练加权融合模型...</p>
              <p className="text-sm text-gray-500 mt-2">请稍候，系统正在优化权重并融合预测</p>
            </div>
          )}

          {trainingError && !isTraining && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-800 font-semibold">训练失败</p>
                <p className="text-sm text-red-700">{trainingError}</p>
              </div>
            </div>
          )}

          {modelState.completed && !isTraining && !trainingError && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-green-800 font-semibold">模型已计算完成并保存</p>
                  <p className="text-sm text-green-700">融合模型数量：{modelState.baseModels.length} 个</p>
                </div>
              </div>
              {/* 评估区间预测对比表格 */}
              {evaluationData && evaluationData.months.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <h4 className="font-semibold text-gray-900">评估区间预测对比</h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-200 px-4 py-3 text-left font-semibold text-gray-900">日期</th>
                          <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-900">真实值</th>
                          <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-900">预测值</th>
                          <th className="border border-gray-200 px-4 py-3 text-center font-semibold text-gray-900">预测准确率</th>
                        </tr>
                      </thead>
                      <tbody>
                        {evaluationData.months.map((month, index) => {
                          const trueValue = evaluationData.y_true[index];
                          const predictedValue = evaluationData.predictions[index];
                          const accuracy = trueValue !== 0
                            ? Math.max(0, 100 - Math.abs(trueValue - predictedValue) / Math.abs(trueValue) * 100)
                            : (predictedValue === 0 ? 100 : 0);

                          return (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="border border-gray-200 px-4 py-3 font-medium text-gray-900">{month}</td>
                              <td className="border border-gray-200 px-4 py-3 text-center text-gray-700">
                                {trueValue?.toLocaleString() ?? '—'}
                              </td>
                              <td className="border border-gray-200 px-4 py-3 text-center text-gray-700">
                                {predictedValue?.toLocaleString(undefined, { maximumFractionDigits: 2 }) ?? '—'}
                              </td>
                              <td className="border border-gray-200 px-4 py-3 text-center">
                                <span className={`font-semibold ${
                                  accuracy >= 80 ? 'text-green-600' :
                                  accuracy >= 60 ? 'text-yellow-600' :
                                  'text-red-600'
                                }`}>
                                  {accuracy.toFixed(2)}%
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 1:
        return renderMethodSteps();
      case 2:
        return renderSelectionStep();
      case 3:
        return renderResultsStep();
      default:
        return null;
    }
  };

  const nextButtonLabel = (() => {
    if (activeStep === 1) return "下一步：模型选择";
    if (activeStep === 2) return "下一步：计算结果";
    if (activeStep === 3) {
      if (modelState.completed) {
        return showComparison ? "返回结果" : "下一步：模型对比";
      }
      if (isTraining) return "融合中...";
    }
    return "开始训练";
  })();

  const isNextDisabled =
    (activeStep === 2 && selectedModels.length < 2) ||
    (activeStep === 3 && isTraining);

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200">
      <div className="border-b border-gray-200 bg-white rounded-t-xl p-4">
        <h2 className="flex items-center gap-3 text-xl font-semibold text-gray-900">
          <Scale className="w-5 h-5 text-blue-600" />
          加权平均融合模型
        </h2>
      </div>

      <div className="px-6 pt-4 pb-4 flex flex-col gap-6">
        <div className="flex items-stretch rounded-lg overflow-hidden">
          {steps.map((step, index) => {
            const isActive = step.id === activeStep;
            const isCompleted = (step.id < activeStep) || (modelState.completed && step.id !== activeStep);
            return (
              <div
                key={step.id}
                className={`flex items-center justify-center px-5 py-6 flex-1 transition-all border-2 ${
                  isActive
                    ? "bg-[#27579d] text-white border-[#1e4275]"
                    : isCompleted
                    ? "bg-white text-gray-900 border-gray-300"
                    : "bg-white text-gray-400 border-gray-200"
                } ${index === 0 ? 'rounded-l-lg' : ''} ${index === steps.length - 1 ? 'rounded-r-lg' : ''} ${index > 0 ? '-ml-0.5' : ''}`}
              >
                <span className="text-2xl font-bold whitespace-nowrap">
                  {step.title}
                </span>
              </div>
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
