import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LineChart, CheckCircle, Loader2, AlertTriangle } from "lucide-react";
import { useExperiment, type ModelMetrics } from "../../contexts/ExperimentContext";
import { apiClient } from "../../../../utils/apiClient";
import debounce from "lodash.debounce";

const steps = [
  { id: 1, title: "方法步骤" },
  { id: 2, title: "计算公式" },
  { id: 3, title: "时间窗口选取" },
  { id: 4, title: "计算结果" },
] as const;

const MovingAverageModel: React.FC = () => {
  const { state, updateState, productSalesData } = useExperiment();
  const modelState = {
    completed: state.moving_average_completed,
    window: state.moving_average_window,
    metrics: {
      rmse: state.moving_average_metrics_rmse,
      mae: state.moving_average_metrics_mae,
      r2: state.moving_average_metrics_r2,
    } as ModelMetrics,
  };

  // 从前端状态计算评估区间的月份
  const evaluateMonths = useMemo(() => {
    if (!productSalesData ||
        state.data_window_evaluate_start_index === null ||
        state.data_window_evaluate_end_index === null) {
      return [];
    }
    const start = state.data_window_evaluate_start_index;
    const end = state.data_window_evaluate_end_index;
    return productSalesData.monthlySales
      .slice(start, end + 1)
      .map(item => item.month);
  }, [productSalesData, state.data_window_evaluate_start_index, state.data_window_evaluate_end_index]);

  const getInitialStep = () => {
    if (modelState.completed) return 4;
    if (modelState.window !== null) return 3;
    return 1;
  };

  const [activeStep, setActiveStep] = useState(getInitialStep);
  const [windowSize, setWindowSize] = useState(modelState.window ?? 3);
  const [isCalculating, setIsCalculating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 评估数据
  const [evaluationData, setEvaluationData] = useState<{
    months: string[];
    y_true: number[];
    predictions: number[];
  } | null>(null);

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

  useEffect(() => {
    if (modelState.window !== null) {
      setWindowSize(modelState.window);
    }
  }, [modelState.window]);

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
    production_capacity_mode: null,
    production_capacity_scenario: null,
    production_capacity: null,
    production_custom_capacity: null,
    highest_completed_step: Math.min(state.highest_completed_step ?? 0, 4),
    current_step: Math.min(state.current_step ?? 5, 5),
  });

  const debouncedUpdate = useCallback(
    debounce(async (newWindowSize: number) => {
      await updateState({
        moving_average_window: newWindowSize,
        moving_average_completed: false,
        moving_average_metrics_rmse: null,
        moving_average_metrics_mae: null,
        moving_average_metrics_r2: null,
        ...buildDownstreamReset(),
      });
    }, 500),
    [updateState],
  );

  const handleWindowChange = (newWindowSize: number) => {
    setWindowSize(newWindowSize);
    debouncedUpdate(newWindowSize);
  };

  const handleCalculate = async () => {
    if (isCalculating || modelState.completed) return;

    setIsCalculating(true);
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
        moving_average_window: windowSize,
      };

      const response = await apiClient.post<{
        status: string;
        results: {
          metrics: {
            window: number;
            evaluated_points: number;
            rmse: number;
            mae: number;
            mape: number;
            r2: number;
            evaluate_indices: number[];
            evaluate_months: string[];
          };
          evaluate_range: {
            months: string[];
          };
          eval_y_true: number[];
          eval_predictions: number[];
          saved_model?: string;
        };
      }>("/models/ma/training", requestBody);

      if (response.status === "success") {
        const metrics = response.results?.metrics ?? { rmse: null, mae: null, r2: null };

        // 保存评估数据 - 使用前端计算的月份
        if (response.results?.eval_y_true && response.results?.eval_predictions && evaluateMonths.length > 0) {
          setEvaluationData({
            months: evaluateMonths,
            y_true: response.results.eval_y_true,
            predictions: response.results.eval_predictions,
          });
        }

        await updateState({
          moving_average_window: windowSize,
          moving_average_completed: true,
          moving_average_metrics_rmse: metrics.rmse ?? null,
          moving_average_metrics_mae: metrics.mae ?? null,
          moving_average_metrics_r2: metrics.r2 ?? null,
        });
      } else {
        throw new Error("模型计算返回失败状态");
      }
    } catch (err: any) {
      setError(err.message || "计算过程中发生未知错误");
      // No need to rollback state here, as completed was already set to false
    } finally {
      setIsCalculating(false);
    }
  };

  const [showComparison, setShowComparison] = useState(false);

  const validateWindow = () => {
    const trainSize = (state.data_window_train_end_index ?? 0) - (state.data_window_train_start_index ?? 0) + 1;
    if (windowSize < 2) {
      setError("时间窗口必须至少为2个月");
      return false;
    }
    if (windowSize > 12) {
      setError("时间窗口不能超过12个月");
      return false;
    }
    if (windowSize >= trainSize) {
      setError(`时间窗口（${windowSize}）不能大于或等于训练数据长度（${trainSize}）`);
      return false;
    }
    setError(null);
    return true;
  };

  const handleNext = async () => {
    if (activeStep === 1) {
      setActiveStep(2);
    } else if (activeStep === 2) {
      setActiveStep(3);
    } else if (activeStep === 3) {
      // 验证窗口合法性
      if (!validateWindow()) {
        return;
      }
      // 验证通过，进入第4步并开始训练
      setActiveStep(4);
      setShowComparison(false);
      handleCalculate();
    } else if (activeStep === 4 && modelState.completed) {
      // 步骤4已完成，在结果和对比视图之间切换
      setShowComparison(!showComparison);
    }
  };

  const handleBack = () => {
    if (activeStep > 1) {
      if (activeStep === 4) {
        setShowComparison(false);
      }
      setActiveStep((prev) => prev - 1);
    }
  };

  const renderMethodSteps = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">移动平均法的操作步骤</h3>
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-[#27579d] text-white rounded-full flex items-center justify-center font-bold">
              1
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">选择时间窗口并计算移动平均数</h4>
              <p className="text-sm text-gray-600">
                确定一个固定的时间窗口大小（如3个月、5个月等），然后对窗口内的历史销量数据求平均值，得到该时间点的移动平均预测值。
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-[#27579d] text-white rounded-full flex items-center justify-center font-bold">
              2
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-1">在原始数据表的末尾添加移动平均值</h4>
              <p className="text-sm text-gray-600">
                将计算得到的移动平均值追加到原始数据序列的末尾，作为对未来时间点的预测。随着窗口向前滑动，不断更新预测值。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderFormula = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">移动平均法的计算公式</h3>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            移动平均法的基本公式如下：
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="text-center">
              <p className="text-lg font-mono">
                MA<sub>t</sub> = (Y<sub>t-n+1</sub> + Y<sub>t-n+2</sub> + ... + Y<sub>t</sub>) / n
              </p>
            </div>
          </div>
          <div className="space-y-2 text-sm text-gray-600">
            <p><strong>其中：</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>MA<sub>t</sub></strong>：时间点 t 的移动平均预测值</li>
              <li><strong>Y<sub>t</sub></strong>：时间点 t 的实际观测值</li>
              <li><strong>n</strong>：时间窗口大小（即参与平均计算的历史期数）</li>
            </ul>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>示例：</strong>如果窗口大小 n=3，则第4个月的预测值 = (第1月销量 + 第2月销量 + 第3月销量) / 3
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderWindowStep = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">选择时间窗口大小</h3>
        <p className="text-sm text-gray-600 mb-6">窗口大小决定了参与平均的历史期数，建议结合产品特性选择 3-6 个月作为起点。</p>
        <label className="block text-lg font-medium text-gray-700 mb-3">
          窗口大小：<span className="text-[#27579d] font-bold">{windowSize}</span> 个月
        </label>
        <input
          type="range"
          min="2"
          max="12"
          value={windowSize}
          onChange={(e) => handleWindowChange(Number(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <p className="text-xs text-gray-500 mt-2">提示：窗口越大，结果越平滑，但对最新变化的响应更慢。</p>
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-800 font-semibold">参数验证失败</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
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
        name: '加权平均融合',
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
                    <tr key={index} className={model.name === '移动平均法' ? 'bg-blue-50' : ''}>
                      <td className="border border-gray-200 px-4 py-3 font-medium text-gray-900">
                        {model.name}
                        {model.name === '移动平均法' && (
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

          {isCalculating && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-12 h-12 text-[#27579d] animate-spin mb-4" />
              <p className="text-lg text-gray-700 font-medium">正在计算移动平均结果...</p>
              <p className="text-sm text-gray-500 mt-2">请稍候，系统正在处理您的数据</p>
            </div>
          )}

          {error && !isCalculating && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-800 font-semibold">计算失败</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          )}

          {modelState.completed && !isCalculating && !error && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-green-800 font-semibold">模型已计算完成并保存</p>
                  <p className="text-sm text-green-700">窗口大小：{modelState.window ?? windowSize} 个月</p>
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

                          // 计算预测准确率：100% - |真实值 - 预测值| / 真实值 * 100%
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
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 1:
        return renderMethodSteps();
      case 2:
        return renderFormula();
      case 3:
        return renderWindowStep();
      case 4:
        return renderResultsStep();
      default:
        return null;
    }
  };

  const nextButtonLabel = (() => {
    if (activeStep === 1) return "下一步：计算公式";
    if (activeStep === 2) return "下一步：时间窗口选取";
    if (activeStep === 3) return "开始计算";
    if (activeStep === 4 && showComparison) return "返回结果";
    if (activeStep === 4 && modelState.completed) return "下一步：模型对比";
    return "请等待...";
  })();

  const isNextDisabled =
    (activeStep === 4 && !modelState.completed) || isCalculating;

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200">
      <div className="border-b border-gray-200 bg-white rounded-t-xl p-4">
        <h2 className="flex items-center gap-3 text-xl font-semibold text-gray-900">
          <LineChart className="w-5 h-5 text-blue-600" />
          移动平均模型
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
                className={`flex items-center justify-center px-4 py-6 flex-1 transition-all border-2 ${
                  isActive
                    ? "bg-[#27579d] text-white border-[#1e4275]"
                    : isCompleted
                    ? "bg-white text-gray-900 border-gray-300"
                    : "bg-white text-gray-400 border-gray-200"
                } ${index === 0 ? 'rounded-l-lg' : ''} ${index === steps.length - 1 ? 'rounded-r-lg' : ''} ${index > 0 ? '-ml-0.5' : ''}`}
              >
                <span className="text-xl font-bold whitespace-nowrap">
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
          className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 whitespace-nowrap"
        >
          上一步
        </button>
        <button
          onClick={handleNext}
          disabled={isNextDisabled}
          className={`flex items-center justify-center space-x-2 px-6 py-2 rounded-lg text-white whitespace-nowrap ${
            isNextDisabled
              ? "bg-gray-400 cursor-not-allowed"
              : activeStep === 3
              ? "bg-green-600 hover:bg-green-700"
              : "bg-[#27579d] hover:bg-[#1e4275]"
          }`}
        >
          {isCalculating && <Loader2 className="w-5 h-5 animate-spin" />}
          <span>{nextButtonLabel}</span>
        </button>
      </div>
    </div>
  );
};

export default MovingAverageModel;
