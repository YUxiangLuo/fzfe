import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChartSpline, CheckCircle, Loader2, AlertTriangle } from "lucide-react";
import { useExperiment, type ModelMetrics } from "../../contexts/ExperimentContext";
import { apiClient } from "../../../../utils/apiClient";
import debounce from "lodash.debounce";

const steps = [
  { id: 1, title: "方法步骤" },
  { id: 2, title: "计算公式" },
  { id: 3, title: "平滑系数选择" },
  { id: 4, title: "计算结果" },
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
    if (modelState.completed) return 4;
    if (modelState.alpha !== null && modelState.alpha !== undefined) return 3;
    return 1;
  }, [modelState.completed, modelState.alpha]);

  const [activeStep, setActiveStep] = useState(derivedStep);
  const [alpha, setAlpha] = useState(modelState.alpha ?? 0.5);
  const [isTraining, setIsTraining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showComparison, setShowComparison] = useState(false);

  // 评估数据
  const [evaluationData, setEvaluationData] = useState<{
    months: string[];
    y_true: number[];
    predictions: number[];
  } | null>(null);

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

  useEffect(() => {
    setActiveStep(derivedStep);
  }, [derivedStep]);

  useEffect(() => {
    if (modelState.alpha !== null && modelState.alpha !== undefined) {
      setAlpha(modelState.alpha);
    }
  }, [modelState.alpha]);

  const debouncedUpdate = useCallback(
    debounce(async (newValue: number) => {
      await updateState({
        exponential_smoothing_alpha: newValue,
        exponential_smoothing_completed: false,
        exponential_smoothing_metrics_rmse: null,
        exponential_smoothing_metrics_mae: null,
        exponential_smoothing_metrics_r2: null,
        ...buildDownstreamReset(),
      });
    }, 500),
    [updateState],
  );

  const handleAlphaChange = (value: number) => {
    setAlpha(value);
    debouncedUpdate(value);
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
            months: string[];
          };
          evaluated_points: number;
          evaluate_indices: number[];
          evaluate_months: string[];
          eval_y_true: number[];
          eval_predictions: number[];
          metrics: {
            rmse: number;
            mae: number;
            mape: number;
            r2: number;
          };
          notes?: string[];
          saved_model?: string;
        };
      }>("/models/es/training", requestBody);

      if (response.status === "success") {
        const metrics = response.results?.metrics ?? { rmse: null, mae: null, r2: null };

        // 保存评估数据
        if (response.results?.eval_y_true && response.results?.eval_predictions && response.results?.evaluate_range?.months) {
          setEvaluationData({
            months: response.results.evaluate_range.months,
            y_true: response.results.eval_y_true,
            predictions: response.results.eval_predictions,
          });
        }

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

  const validateAlpha = () => {
    if (alpha <= 0 || alpha > 1) {
      setError("平滑系数 α 必须在 (0, 1] 区间内");
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
      // 验证平滑系数合法性
      if (!validateAlpha()) {
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
        <h3 className="text-xl font-semibold text-gray-900 mb-4">指数平滑法的操作步骤</h3>
        <p className="text-sm text-gray-600 mb-4">指数平滑法的一般步骤为：</p>
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-[#27579d] text-white rounded-full flex items-center justify-center font-bold">
              1
            </div>
            <div>
              <p className="text-sm text-gray-600">
                选择一个初始值作为预测的起点；
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-[#27579d] text-white rounded-full flex items-center justify-center font-bold">
              2
            </div>
            <div>
              <p className="text-sm text-gray-600">
                选择一个平滑系数（常用符号为 α）；
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-[#27579d] text-white rounded-full flex items-center justify-center font-bold">
              3
            </div>
            <div>
              <p className="text-sm text-gray-600">
                使用指数平滑公式计算下一个时间点的预测值；
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-[#27579d] text-white rounded-full flex items-center justify-center font-bold">
              4
            </div>
            <div>
              <p className="text-sm text-gray-600">
                根据得到的预测值和新的观测值，继续迭代计算下一个时间点的预测值，直至需要预测的时间段结束。
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
        <h3 className="text-xl font-semibold text-gray-900 mb-4">指数平滑法的计算公式</h3>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            指数平滑法的基本公式如下：
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="text-center space-y-2">
              <p className="text-lg font-mono">
                S<sub>t</sub> = α × Y<sub>t</sub> + (1 - α) × S<sub>t-1</sub>
              </p>
              <p className="text-sm text-gray-600">或等价于：</p>
              <p className="text-lg font-mono">
                S<sub>t</sub> = S<sub>t-1</sub> + α × (Y<sub>t</sub> - S<sub>t-1</sub>)
              </p>
            </div>
          </div>
          <div className="space-y-2 text-sm text-gray-600">
            <p><strong>其中：</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li><strong>S<sub>t</sub></strong>：时间点 t 的指数平滑预测值</li>
              <li><strong>Y<sub>t</sub></strong>：时间点 t 的实际观测值</li>
              <li><strong>α</strong>：平滑系数（0 &lt; α ≤ 1）</li>
              <li><strong>S<sub>t-1</sub></strong>：上一时间点的平滑值</li>
            </ul>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>示例：</strong>如果 α=0.3，当前实际值为100，上期平滑值为90，则本期平滑值 = 0.3×100 + 0.7×90 = 93
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAlphaStep = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">选择平滑系数 α</h3>
        <p className="text-sm text-gray-600 mb-6">α 越大，模型越关注最新数据；α 越小，模型越平滑。通常可从 0.1 - 0.3 起步。</p>
        <label className="block text-lg font-medium text-gray-700 mb-3">
          平滑系数 (α)：<span className="text-[#27579d] font-bold">{alpha.toFixed(2)}</span>
        </label>
        <input
          type="range"
          min="0.01"
          max="1"
          step="0.01"
          value={alpha}
          onChange={(e) => handleAlphaChange(Number(e.target.value))}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
        />
        <p className="text-xs text-gray-500 mt-2">提示：α=0.1-0.3 适合平稳趋势，α&gt;0.5 适合快速变化场景。</p>
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
                    <tr key={index} className={model.name === '指数平滑法' ? 'bg-blue-50' : ''}>
                      <td className="border border-gray-200 px-4 py-3 font-medium text-gray-900">
                        {model.name}
                        {model.name === '指数平滑法' && (
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
              <p className="text-lg text-gray-700 font-medium">正在计算指数平滑结果...</p>
              <p className="text-sm text-gray-500 mt-2">请稍候，系统正在处理您的数据</p>
            </div>
          )}

          {error && !isTraining && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
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
                  <p className="text-green-800 font-semibold">模型已计算完成并保存</p>
                  <p className="text-sm text-green-700">平滑系数：{(modelState.alpha ?? alpha).toFixed(2)}</p>
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
        return renderAlphaStep();
      case 4:
        return renderResultsStep();
      default:
        return null;
    }
  };

  const nextButtonLabel = (() => {
    if (activeStep === 1) return "下一步：计算公式";
    if (activeStep === 2) return "下一步：平滑系数选择";
    if (activeStep === 3) return "开始计算";
    if (activeStep === 4 && showComparison) return "返回结果";
    if (activeStep === 4 && modelState.completed) return "下一步：模型对比";
    return "请等待...";
  })();

  const isNextDisabled =
    (activeStep === 4 && !modelState.completed) || isTraining;

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200">
      <div className="border-b border-gray-200 bg-white rounded-t-xl p-4">
        <h2 className="flex items-center gap-3 text-xl font-semibold text-gray-900">
          <ChartSpline className="w-5 h-5 text-blue-600" />
          指数平滑模型
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
          className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
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
          {isTraining && <Loader2 className="w-5 h-5 animate-spin" />}
          <span>{nextButtonLabel}</span>
        </button>
      </div>
    </div>
  );
};

export default ExponentialSmoothingModel;
