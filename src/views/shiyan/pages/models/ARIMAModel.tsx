import React, { useEffect, useMemo, useRef, useState } from "react";
import { Sigma, CheckCircle, Loader2, AlertTriangle } from "lucide-react";
import { useExperiment, type AdfStationarityRow, type ModelMetrics } from "../../contexts/ExperimentContext";
import { apiClient } from "../../../../utils/apiClient";

const STEPS = [
  { id: 1, title: "方法简介", description: "了解 ARIMA 模型的结构与适用场景。" },
  { id: 2, title: "ADF 平稳性检验", description: "通过 ADF 检验判断序列是否平稳。" },
  { id: 3, title: "设定差分阶数 d", description: "根据检验结果选择合适的差分阶数。" },
  { id: 4, title: "训练模型并自动寻优", description: "模拟训练过程，得到推荐的 p、q 与误差指标。" },
] as const;

const formatNumber = (value: number | null | undefined, fractionDigits = 3) =>
  typeof value === "number" ? value.toFixed(fractionDigits) : "—";

const ARIMAModel: React.FC = () => {
  const {
    state,
    updateState,
    productSalesData,
    loadProductSalesData,
    isLoadingSales,
    salesDataError,
  } = useExperiment();

  const dUpdateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const adfResults = state.arima_adf_stationarity;
  const storedD = state.arima_d;
  const trainingCompleted = state.arima_completed;
  const { data_window_train_start_index, data_window_train_end_index } = state;
  const monthlySales = productSalesData?.monthlySales ?? [];
  const { selected_industry, selected_company, selected_product } = state;

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

  const initialStep = useMemo(() => {
    if (trainingCompleted) return 4;
    if (storedD !== null && storedD !== undefined) return 4;
    if (adfResults.length > 0) return 3;
    return 1;
  }, [trainingCompleted, storedD, adfResults.length]);

  const [activeStep, setActiveStep] = useState<number>(initialStep);
  const [isRunningAdf, setIsRunningAdf] = useState(false);
  const [adfError, setAdfError] = useState<string | null>(null);
  const [dError, setDError] = useState<string | null>(null);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingError, setTrainingError] = useState<string | null>(null);

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
    production_mps_table: [],
    highest_completed_step: Math.min(state.highest_completed_step ?? 0, 4),
    current_step: Math.min(state.current_step ?? 5, 5),
  });

  const recommendedD = useMemo(() => {
    const firstStationary = adfResults.find((row) => row.stationary);
    return firstStationary?.diff_order ?? 0;
  }, [adfResults]);

  const [selectedD, setSelectedD] = useState<number | null>(storedD ?? null);

  useEffect(() => {
    if (
      productSalesData ||
      isLoadingSales ||
      salesDataError ||
      !selected_industry ||
      !selected_company ||
      !selected_product
    ) {
      return;
    }
    void loadProductSalesData(selected_industry, selected_company, selected_product);
  }, [
    productSalesData,
    isLoadingSales,
    salesDataError,
    selected_industry,
    selected_company,
    selected_product,
    loadProductSalesData,
  ]);

  useEffect(() => {
    if (storedD !== null && storedD !== undefined) {
      setSelectedD(storedD);
    }
  }, [storedD]);

  useEffect(() => {
    return () => {
      if (dUpdateTimer.current) {
        clearTimeout(dUpdateTimer.current);
      }
    };
  }, []);


  const commitDiffOrderUpdate = async (value: number) => {
    const storedDiff = state.arima_d;
    const changed = storedDiff === null || storedDiff === undefined || storedDiff !== value;

    if (!changed) {
      return;
    }

    await updateState({
      arima_d: value,
      arima_completed: false,
      arima_metrics_rmse: null,
      arima_metrics_mae: null,
      arima_metrics_r2: null,
      ...buildDownstreamReset(),
    });
  };

  const handleSelectD = (value: number) => {
    setSelectedD(value);
    setDError(null);

    if (dUpdateTimer.current) {
      clearTimeout(dUpdateTimer.current);
    }

    dUpdateTimer.current = setTimeout(() => {
      dUpdateTimer.current = null;
      void commitDiffOrderUpdate(value);
    }, 300);
  };

  const handleRunAdf = async () => {
    if (isRunningAdf) return;
    setAdfError(null);
    if (
      monthlySales.length === 0 ||
      data_window_train_start_index === null ||
      data_window_train_end_index === null
    ) {
      setAdfError("缺少完整的训练区间销量数据，无法执行 ADF 检验。");
      return;
    }

    setIsRunningAdf(true);

    try {
      const startIndex = Math.max(0, data_window_train_start_index);
      const endIndex = Math.min(monthlySales.length - 1, data_window_train_end_index);
      if (startIndex > endIndex) {
        throw new Error("训练区间起止顺序异常，无法执行 ADF 检验。");
      }

      const trainingSeries = monthlySales.slice(startIndex, endIndex + 1);

      const response = await apiClient.post<{ result: AdfStationarityRow[] }>("/tools/adf", {
        series: trainingSeries.map((record) => ({
          month: record.month,
          sales: record.sales,
        })),
      });

      const results = Array.isArray(response?.result) ? response.result : [];
      if (results.length === 0) {
        throw new Error("后端未返回有效的 ADF 检验结果。");
      }

      await updateState({
        arima_adf_stationarity: results,
        arima_d: null,
        arima_completed: false,
        arima_metrics_rmse: null,
        arima_metrics_mae: null,
        arima_metrics_r2: null,
        ...buildDownstreamReset(),
      });
    } catch (error: any) {
      const message = typeof error?.message === "string" && error.message
        ? error.message
        : "ADF 检验请求失败。";
      setAdfError(message);
    } finally {
      setIsRunningAdf(false);
    }
  };

  const handleStartTraining = async () => {
    if (isTraining || trainingCompleted) return;

    setIsTraining(true);
    setTrainingError(null);

    try {
      // Ensure the latest d value is in global state
      if (selectedD !== null && selectedD !== undefined) {
        await updateState({
          arima_d: selectedD,
          arima_completed: false,
          ...buildDownstreamReset(),
        });
      }

      const requestBody = {
        selected_industry: state.selected_industry,
        selected_company: state.selected_company,
        selected_product: state.selected_product,
        data_window_train_start_index: state.data_window_train_start_index,
        data_window_train_end_index: state.data_window_train_end_index,
        data_window_evaluate_start_index: state.data_window_evaluate_start_index,
        data_window_evaluate_end_index: state.data_window_evaluate_end_index,
        arima_d: selectedD ?? state.arima_d ?? 0,
      };

      const response = await apiClient.post<{
        status: string;
        results: {
          mode: string;
          best_order: {
            p: number;
            d: number;
            q: number;
          };
          metrics: {
            rmse: number;
            mae: number;
            mape: number;
            r2: number;
            aic: number;
          };
          notes?: string[];
        };
      }>("/model/arima/train", requestBody);

      if (response.status === "success") {
        const { best_order, metrics } = response.results;
        await updateState({
          arima_p: best_order.p,
          arima_d: best_order.d,
          arima_q: best_order.q,
          arima_completed: true,
          arima_metrics_rmse: metrics.rmse ?? null,
          arima_metrics_mae: metrics.mae ?? null,
          arima_metrics_r2: metrics.r2 ?? null,
        });
      } else {
        throw new Error("模型训练返回失败状态");
      }
    } catch (err: any) {
      setTrainingError(err.message || "训练过程中发生未知错误");
    } finally {
      setIsTraining(false);
    }
  };

  const handleNext = async () => {
    switch (activeStep) {
      case 1: {
        setActiveStep(2);
        break;
      }
      case 2: {
        if (isRunningAdf) {
          return;
        }
        if (adfResults.length === 0) {
          setAdfError("请先执行 ADF 检验以生成检验结果。");
          return;
        }
        setAdfError(null);
        setActiveStep(3);
        break;
      }
      case 3: {
        if (selectedD === null || selectedD === undefined) {
          setDError("请选择差分阶数 d。");
          return;
        }
        setDError(null);
        if (dUpdateTimer.current) {
          clearTimeout(dUpdateTimer.current);
          dUpdateTimer.current = null;
          await commitDiffOrderUpdate(selectedD);
        } else {
          await commitDiffOrderUpdate(selectedD);
        }
        setActiveStep(4);
        break;
      }
      case 4: {
        if (!trainingCompleted && !isTraining) {
          await handleStartTraining();
        }
        break;
      }
      default:
        break;
    }
  };

  const handleBack = () => {
    if (activeStep === 1) return;
    setAdfError(null);
    setDError(null);
    setActiveStep((prev) => Math.max(1, prev - 1));
  };

  const nextLabel = (() => {
    if (activeStep === 1) return "下一步：ADF 平稳性检验";
    if (activeStep === 2) return "下一步：设定差分阶数 d";
    if (activeStep === 3) return "下一步：训练模型";
    if (trainingCompleted) return "模型已保存";
    if (isTraining) return "模型训练中...";
    return "开始训练并保存结果";
  })();

  const isNextDisabled =
    (activeStep === 2 && (isRunningAdf || adfResults.length === 0)) ||
    (activeStep === 3 && (selectedD === null || selectedD === undefined)) ||
    (activeStep === 4 && (isTraining || trainingCompleted));

  const renderIntroStep = () => (
    <div className="space-y-4">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-3">ARIMA 模型概览</h3>
        <p className="text-sm text-gray-600 leading-relaxed">
          ARIMA（AutoRegressive Integrated Moving Average）模型由自回归 (AR)、差分 (I) 与移动平均 (MA)
          三个部分组成，适用于具有趋势或季节性但经过差分后可转化为平稳序列的时间序列预测任务。
        </p>
        <ul className="mt-4 space-y-2 text-sm text-gray-700 list-disc list-inside">
          <li>AR：利用过去的观察值预测当前值。</li>
          <li>I：通过差分消除趋势，使序列更加平稳。</li>
          <li>MA：利用过去的误差项提升模型拟合能力。</li>
        </ul>
      </div>
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 text-sm text-blue-800">
        请按照向导依次完成平稳性检验、差分设定与训练过程，最终得到推荐的参数与指标。
      </div>
    </div>
  );

  const renderAdfStep = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h3 className="text-xl font-semibold text-gray-900">ADF 平稳性检验</h3>
        <p className="text-sm text-gray-600">
          ADF（Augmented Dickey-Fuller）检验用于检测序列是否存在单位根。p 值越小，越倾向于接受“序列平稳”的结论。
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleRunAdf}
            disabled={isRunningAdf}
            className={`inline-flex items-center space-x-2 px-5 py-2 rounded-lg text-white transition-colors ${
              isRunningAdf ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
            }`}
            type="button"
          >
            {isRunningAdf && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>{isRunningAdf ? "正在执行 ADF 检验..." : adfResults.length > 0 ? "重新执行 ADF 检验" : "执行 ADF 检验"}</span>
          </button>
          {!isRunningAdf && adfResults.length > 0 && (
            <span className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-md px-3 py-1">
              检验结果已生成，可继续下一步。
            </span>
          )}
        </div>

        {adfError && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-2 text-sm text-yellow-700">
            {adfError}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">差分阶数 d</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">ADF 统计量</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">p 值</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">是否平稳</th>
                <th className="px-4 py-2 text-left font-medium text-gray-500 uppercase tracking-wider">临界值 (1% / 5% / 10%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {isRunningAdf ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-blue-600">
                    <div className="inline-flex items-center space-x-3">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>正在模拟 ADF 检验，请稍候...</span>
                    </div>
                  </td>
                </tr>
              ) : adfResults.length > 0 ? (
                adfResults.map((row) => (
                  <tr key={row.diff_order} className={row.stationary ? "bg-green-50" : "bg-white"}>
                    <td className="px-4 py-3 text-gray-900 font-semibold">d = {row.diff_order}</td>
                    <td className="px-4 py-3 text-gray-700">{formatNumber(row.statistic)}</td>
                    <td className="px-4 py-3 text-gray-700">{formatNumber(row.p_value)}</td>
                    <td className="px-4 py-3">
                      {row.stationary ? (
                        <span className="inline-flex items-center space-x-1 text-green-700">
                          <CheckCircle className="w-4 h-4" />
                          <span>平稳</span>
                        </span>
                      ) : (
                        <span className="text-gray-500">不平稳</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {`${formatNumber(row.critical_values["1%"])} / ${formatNumber(row.critical_values["5%"])} / ${formatNumber(row.critical_values["10%"])}`}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gray-500">
                    尚未生成检验结果，请点击上方按钮执行模拟。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderDiffStep = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">选择差分阶数 d</h3>
          <p className="text-sm text-gray-600">
            根据最新的 ADF 检验结果，挑选能够让序列平稳的差分阶数。必要时可以返回上一步重新检验或比较不同 d 值对模型的影响。
          </p>
        </div>

        {adfResults.length > 0 ? (
          <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-medium">推荐差分阶数</span>
              <span className="text-lg font-semibold text-blue-900">d = {recommendedD}</span>
            </div>
            <div className="grid gap-2">
              {adfResults.map((row) => (
                <div
                  key={`adf-summary-${row.diff_order}`}
                  className={`flex items-center justify-between rounded-md px-3 py-2 ${
                    row.stationary ? "bg-white text-blue-800" : "bg-blue-100/60 text-blue-700"
                  }`}
                >
                  <span className="text-sm font-medium">d = {row.diff_order}</span>
                  <span className="text-xs text-blue-600">
                    p 值：{formatNumber(row.p_value, 4)} · {row.stationary ? "结果平稳" : "仍不平稳"}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-blue-700">
              推荐值取自首个判定为平稳的差分阶数，可在下方按钮中直接选择或尝试其他阶数。
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
            尚未生成 ADF 检验结果，请返回上一步执行检验后再选择差分阶数。
          </div>
        )}

        <div className="flex items-center gap-4">
          {[0, 1, 2].map((option) => {
            const isActive = selectedD === option;
            return (
              <button
                key={option}
                onClick={() => handleSelectD(option)}
                className={`px-6 py-3 rounded-lg border-2 transition-all ${
                  isActive ? "border-blue-500 bg-blue-50 text-blue-700" : "border-gray-200 text-gray-700 hover:border-gray-300"
                }`}
                type="button"
              >
                d = {option}
              </button>
            );
          })}
        </div>

        {dError && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-600">
            {dError}
          </div>
        )}
      </div>
    </div>
  );

  const renderTrainingStep = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h3 className="text-xl font-semibold text-gray-900">自动寻优与指标预览</h3>
        <p className="text-sm text-gray-600">点击“开始训练并保存结果”将模拟模型训练过程，训练完成后会展示误差指标。</p>

        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          当前差分阶数 d：<span className="font-semibold text-blue-900">{storedD ?? "未设置"}</span>
        </div>

        {!trainingCompleted && !isTraining && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700">
            点击下方按钮开始训练并保存结果。
          </div>
        )}
        {isTraining && (
          <div className="flex items-center space-x-3 text-blue-600 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>正在训练模型...</span>
          </div>
        )}

        {trainingError && !isTraining && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <div>
              <p className="text-red-800 font-semibold">训练失败</p>
              <p className="text-sm text-red-700">{trainingError}</p>
            </div>
          </div>
        )}

        {trainingCompleted && !trainingError && (
          <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center space-x-3">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-green-900 font-semibold">模型已计算完成并保存。</p>
              <p className="text-sm text-green-700">当前 (p, d, q) = ({state.arima_p ?? "?"}, {storedD ?? "?"}, {state.arima_q ?? "?"})</p>
            </div>
          </div>
        )}

        {trainingCompleted && (
          <div className="grid gap-4 md:grid-cols-3">
            <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide">RMSE</p>
              <p className="text-2xl font-semibold text-blue-700 mt-2">{formatNumber(state.arima_metrics_rmse)}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide">MAE</p>
              <p className="text-2xl font-semibold text-blue-700 mt-2">{formatNumber(state.arima_metrics_mae)}</p>
            </div>
            <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
              <p className="text-xs text-gray-500 uppercase tracking-wide">R²</p>
              <p className="text-2xl font-semibold text-blue-700 mt-2">{formatNumber(state.arima_metrics_r2, 2)}</p>
            </div>
          </div>
        )}

        {trainingCompleted && shouldShowFusionUnlockedNotice && (
          <div className="bg-purple-50 border border-purple-200 rounded-lg px-4 py-3 text-sm text-purple-800">
            🎉 已完成至少两个基础模型，融合模型现已解锁！尝试组合不同算法，进一步提升预测表现。
          </div>
        )}
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (activeStep) {
      case 1:
        return renderIntroStep();
      case 2:
        return renderAdfStep();
      case 3:
        return renderDiffStep();
      case 4:
        return renderTrainingStep();
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center space-x-3 text-sm text-gray-500">
          <Sigma className="w-5 h-5 text-blue-600" />
          <span>ARIMA 模型分步向导</span>
        </div>
        <h2 className="mt-2 text-2xl font-semibold text-gray-900">ARIMA 模型</h2>
        <p className="text-gray-600">依次完成以下步骤，构建并评估 ARIMA 预测模型。</p>
      </div>

      <div className="relative">
        <div className="absolute inset-x-6 top-1/2 -translate-y-1/2 hidden md:block">
          <div className="h-1 rounded-full bg-gray-200">
            <div
              className="h-1 rounded-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500"
              style={{ width: `${((activeStep - 1) / (STEPS.length - 1)) * 100}%` }}
            />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {STEPS.map((step) => {
            const isActive = step.id === activeStep;
            const isCompleted = step.id < activeStep || (step.id === 4 && trainingCompleted);
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
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                      isCompleted ? "bg-green-500 text-white" : isActive ? "bg-blue-500 text-white" : "bg-gray-200 text-gray-700"
                    }`}
                  >
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

      <div className="bg-white border border-gray-200 rounded-xl px-6 py-4 flex justify-between items-center">
        <button
          onClick={handleBack}
          disabled={activeStep === 1}
          className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          type="button"
        >
          上一步
        </button>
        <button
          onClick={handleNext}
          disabled={isNextDisabled}
          className={`px-6 py-2 rounded-lg text-white whitespace-nowrap transition-colors ${
            isNextDisabled
              ? "bg-gray-400 cursor-not-allowed"
              : activeStep === 4
              ? "bg-green-600 hover:bg-green-700"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
          type="button"
        >
          {nextLabel}
        </button>
      </div>
    </div>
  );
};

export default ARIMAModel;
