import React, { useEffect, useMemo, useRef, useState } from "react";
import { Sigma, CheckCircle, Loader2, AlertTriangle } from "lucide-react";
import { useExperiment, type AdfStationarityRow, type ModelMetrics } from "../../contexts/ExperimentContext";
import { apiClient } from "../../../../utils/apiClient";

const STEPS = [
  { id: 1, title: "方法步骤" },
  { id: 2, title: "平稳性检验" },
  { id: 3, title: "差分阶数选择" },
  { id: 4, title: "自动参数寻优计算" },
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
  const [showComparison, setShowComparison] = useState(false);

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


  const handleSelectD = async (value: number) => {
    setSelectedD(value);
    setDError(null);
    await updateState({
      arima_d: value,
      arima_completed: false,
      arima_metrics_rmse: null,
      arima_metrics_mae: null,
      arima_metrics_r2: null,
      ...buildDownstreamReset(),
    });
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
      }>("/models/arima/training", requestBody);

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
        // Validate that selected d achieves stationarity
        const selectedDResult = adfResults.find(row => row.diff_order === selectedD);
        if (selectedDResult && !selectedDResult.stationary) {
          setDError(`差分阶数 d=${selectedD} 无法使序列达到平稳，请选择其他差分阶数。`);
          return;
        }
        setDError(null);
        setActiveStep(4);
        setShowComparison(false);
        // Auto-trigger training when entering step 4
        if (!trainingCompleted) {
          await handleStartTraining();
        }
        break;
      }
      case 4: {
        // Toggle comparison view when training is completed
        if (trainingCompleted) {
          setShowComparison(!showComparison);
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
    setShowComparison(false);
    setActiveStep((prev) => Math.max(1, prev - 1));
  };

  const nextLabel = (() => {
    if (activeStep === 1) return "下一步：平稳性检验";
    if (activeStep === 2) return "下一步：差分阶数选择";
    if (activeStep === 3) return "下一步：自动参数寻优计算";
    if (activeStep === 4) {
      if (trainingCompleted) {
        return showComparison ? "返回结果" : "下一步：模型对比";
      }
      if (isTraining) return "模型训练中...";
    }
    return "开始训练";
  })();

  const isNextDisabled =
    (activeStep === 2 && (isRunningAdf || adfResults.length === 0)) ||
    (activeStep === 3 && (selectedD === null || selectedD === undefined)) ||
    (activeStep === 4 && isTraining);

  const renderMethodSteps = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">ARIMA 法的操作步骤</h3>
        <p className="text-sm text-gray-600 mb-4">ARIMA 法的一般步骤为：</p>
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-[#27579d] text-white rounded-full flex items-center justify-center font-bold">
              1
            </div>
            <div>
              <p className="text-sm text-gray-600">
                使用 ADF 单位根检验对原始数据进行平稳性检验；
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-[#27579d] text-white rounded-full flex items-center justify-center font-bold">
              2
            </div>
            <div>
              <p className="text-sm text-gray-600">
                若非平稳，进行差分处理（d 即为差分阶数），将非平稳时间序列转化为平稳时间序列；
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-[#27579d] text-white rounded-full flex items-center justify-center font-bold">
              3
            </div>
            <div>
              <p className="text-sm text-gray-600">
                确定模型的阶数。借助自相关 (AC) 系数和偏自相关 (PAC) 系数，初步识别模型的可能形式，然后根据 AIC 等定阶准则，从可供选择的模型中选择一个最佳模型；
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-[#27579d] text-white rounded-full flex items-center justify-center font-bold">
              4
            </div>
            <div>
              <p className="text-sm text-gray-600">
                参数估计与诊断检验。包括检验模型参数的显著性，模型本身的有效性以及检验残差序列是否为白噪声序列。如果模型通过检验，则模型设定基本正确，否则，必须重新确定模型的形式，并诊断检验，直至得到设定正确的模型形式；
              </p>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex-shrink-0 w-8 h-8 bg-[#27579d] text-white rounded-full flex items-center justify-center font-bold">
              5
            </div>
            <div>
              <p className="text-sm text-gray-600">
                用建立的 ARIMA 模型进行预测。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAdfStep = () => (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <h3 className="text-xl font-semibold text-gray-900">平稳性检验</h3>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
          <h4 className="font-semibold text-gray-900">什么是自回归方程？</h4>
          <p className="text-sm text-gray-600">
            自回归 (AR) 模型是一种用当前值与历史观测值之间的线性关系进行预测的时间序列模型。其基本形式为：
          </p>
          <div className="bg-white border border-gray-200 rounded p-3 text-center">
            <p className="font-mono text-sm">Y<sub>t</sub> = c + φ<sub>1</sub>Y<sub>t-1</sub> + φ<sub>2</sub>Y<sub>t-2</sub> + ... + φ<sub>p</sub>Y<sub>t-p</sub> + ε<sub>t</sub></p>
          </div>
          <p className="text-xs text-gray-500">
            其中 Y<sub>t</sub> 是当前值，φ 是自回归系数，p 是自回归阶数，ε<sub>t</sub> 是误差项。
          </p>
        </div>

        <div>
          <h4 className="font-semibold text-gray-900 mb-2">ADF 平稳性检验</h4>
          <p className="text-sm text-gray-600">
            ADF（Augmented Dickey-Fuller）检验用于检测序列是否存在单位根。p 值越小，越倾向于接受"序列平稳"的结论。
          </p>
        </div>
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
                      <span>正在进行 ADF 检验，请稍候...</span>
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
                    尚未生成检验结果，请点击上方按钮执行检验。
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
                    <tr key={index} className={model.name === 'ARIMA' ? 'bg-blue-50' : ''}>
                      <td className="border border-gray-200 px-4 py-3 font-medium text-gray-900">
                        {model.name}
                        {model.name === 'ARIMA' && (
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
              <p className="text-lg text-gray-700 font-medium">正在训练 ARIMA 模型...</p>
              <p className="text-sm text-gray-500 mt-2">请稍候，系统正在自动寻找最优参数</p>
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

          {trainingCompleted && !isTraining && !trainingError && (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="text-green-800 font-semibold">模型已计算完成并保存</p>
                  <p className="text-sm text-green-700">当前 (p, d, q) = ({state.arima_p ?? "?"}, {storedD ?? "?"}, {state.arima_q ?? "?"})</p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">RMSE</p>
                  <p className="text-2xl font-semibold text-[#27579d] mt-2">{formatNumber(state.arima_metrics_rmse)}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">MAE</p>
                  <p className="text-2xl font-semibold text-[#27579d] mt-2">{formatNumber(state.arima_metrics_mae)}</p>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                  <p className="text-xs text-gray-500 uppercase tracking-wide">R²</p>
                  <p className="text-2xl font-semibold text-[#27579d] mt-2">{formatNumber(state.arima_metrics_r2, 2)}</p>
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
  };

  const renderStepContent = () => {
    switch (activeStep) {
      case 1:
        return renderMethodSteps();
      case 2:
        return renderAdfStep();
      case 3:
        return renderDiffStep();
      case 4:
        return renderResultsStep();
      default:
        return null;
    }
  };

  return (
    <div className="bg-gray-50 rounded-xl border border-gray-200">
      <div className="border-b border-gray-200 bg-white rounded-t-xl p-4">
        <h2 className="flex items-center gap-3 text-xl font-semibold text-gray-900">
          <Sigma className="w-5 h-5 text-blue-600" />
          ARIMA 模型
        </h2>
      </div>

      <div className="px-6 pt-4 pb-4 flex flex-col gap-6">
        <div className="flex items-stretch rounded-lg overflow-hidden">
          {STEPS.map((step, index) => {
            const isActive = step.id === activeStep;
            const isCompleted = (step.id < activeStep) || (trainingCompleted && step.id !== activeStep);
            return (
              <div
                key={step.id}
                className={`flex items-center justify-center px-5 py-6 flex-1 transition-all border-2 ${
                  isActive
                    ? "bg-[#27579d] text-white border-[#1e4275]"
                    : isCompleted
                    ? "bg-white text-gray-900 border-gray-300"
                    : "bg-white text-gray-400 border-gray-200"
                } ${index === 0 ? 'rounded-l-lg' : ''} ${index === STEPS.length - 1 ? 'rounded-r-lg' : ''} ${index > 0 ? '-ml-0.5' : ''}`}
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
