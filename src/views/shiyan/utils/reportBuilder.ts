import type {
  ExperimentState,
  ModelMetrics,
  MPSTableRow,
  ProductSalesData,
  SelectedBestModel,
} from "../store/experiment/types";

export interface ReportUserSummary {
  user_id: number;
  username: string;
  full_name: string;
  email: string;
}

export interface ReportAnalysisValues {
  data: string;
  comparison: string;
  selection: string;
  params: string;
  decision: string;
}

export interface ReportModelSummary {
  name: string;
  params: string;
  rmse: number | null;
  mae: number | null;
  r2: number | null;
}

export interface ReportPlanSummary {
  avgServiceLevel: number;
  totalStockout: number;
  avgInventory: number;
  periodsWithStockout: number;
  totalPeriods: number;
}

export interface ReportViewModel {
  trainingData: ProductSalesData["monthlySales"];
  evaluationData: ProductSalesData["monthlySales"];
  allModels: ReportModelSummary[];
  bestModelMetrics: ModelMetrics | null;
  planSummary: ReportPlanSummary | null;
}

interface BuildExperimentReportMarkdownInput {
  state: ExperimentState;
  userInfo: ReportUserSummary | null;
  analyses: ReportAnalysisValues;
  viewModel: ReportViewModel;
}

const MODEL_LABELS: Record<SelectedBestModel, string> = {
  ma: "移动平均法",
  exp: "指数平滑法",
  arima: "ARIMA模型",
  lstm: "LSTM模型",
  ensemble_weighted: "加权平均融合",
  ensemble_boosting: "Boosting融合",
  ensemble_stacking: "Stacking融合",
};

const MODEL_DISPLAY_NAME_MAP: Record<string, string> = {
  moving_average: "移动平均法",
  exponential_smoothing: "指数平滑法",
  ARIMA: "ARIMA模型",
  LSTM: "LSTM模型",
  ma: "移动平均法",
  exp: "指数平滑法",
  arima: "ARIMA模型",
  lstm: "LSTM模型",
};

const CAPACITY_SCENARIO_LABELS: Record<string, string> = {
  tight: "产能紧张",
  normal: "产能正常",
  abundant: "产能充裕",
};

const formatCapacityMode = (state: ExperimentState): string => {
  if (state.production_capacity_mode === "custom") return "自定义产能";
  if (state.production_capacity_mode === "auto") return "自动计算";
  if (state.production_capacity_scenario) {
    return CAPACITY_SCENARIO_LABELS[state.production_capacity_scenario] ?? state.production_capacity_scenario;
  }
  return "N/A";
};

const stripHtmlTags = (text: string): string =>
  text.replace(/<[^>]*>/g, "");

const formatSales = (value: number | null | undefined): string => {
  if (value == null) return "N/A";
  return value.toLocaleString();
};

const formatMetricValue = (value: number | null | undefined, precision: number = 4): string => {
  return value != null ? value.toFixed(precision) : "N/A";
};

const formatDate = (dateString: string | null): string => {
  return dateString
    ? new Date(dateString).toLocaleString("zh-CN", { hour12: false })
    : "未知";
};

const getEnsembleParams = (baseModels: string[] | null | undefined): string => {
  if (!baseModels || baseModels.length === 0) return "N/A";
  return baseModels.map((key) => MODEL_DISPLAY_NAME_MAP[key] || key).join(", ");
};

const buildPlanSummary = (table: MPSTableRow[]): ReportPlanSummary | null => {
  if (table.length === 0) return null;

  const totalPeriods = table.length;
  const avgServiceLevel = table.reduce((sum, row) => sum + (row.service_level ?? 0), 0) / totalPeriods;
  const totalStockout = table.reduce((sum, row) => sum + (row.stockout ?? 0), 0);
  const avgInventory = table.reduce((sum, row) => sum + (row.ending_inventory ?? 0), 0) / totalPeriods;
  const periodsWithStockout = table.filter((row) => (row.stockout ?? 0) > 0).length;

  return {
    avgServiceLevel,
    totalStockout,
    avgInventory,
    periodsWithStockout,
    totalPeriods,
  };
};

export const buildReportViewModel = (
  state: ExperimentState,
  productSalesData: ProductSalesData | null,
): ReportViewModel => {
  const sales = productSalesData?.monthlySales ?? [];
  const hasTrainingRange =
    state.data_window_train_start_index !== null &&
    state.data_window_train_end_index !== null;
  const hasEvaluationRange =
    state.data_window_evaluate_start_index !== null &&
    state.data_window_evaluate_end_index !== null;

  const trainingData = hasTrainingRange
    ? sales.slice(state.data_window_train_start_index!, state.data_window_train_end_index! + 1)
    : [];
  const evaluationData = hasEvaluationRange
    ? sales.slice(
      state.data_window_evaluate_start_index!,
      state.data_window_evaluate_end_index! + 1,
    )
    : [];

  const allModels: ReportModelSummary[] = [];

  if (state.moving_average_completed) {
    allModels.push({
      name: "移动平均法",
      params: `窗口: ${state.moving_average_window ?? "N/A"}`,
      rmse: state.moving_average_metrics_rmse,
      mae: state.moving_average_metrics_mae,
      r2: state.moving_average_metrics_r2,
    });
  }

  if (state.exponential_smoothing_completed) {
    allModels.push({
      name: "指数平滑法",
      params: `Alpha: ${state.exponential_smoothing_alpha ?? "N/A"}`,
      rmse: state.exponential_smoothing_metrics_rmse,
      mae: state.exponential_smoothing_metrics_mae,
      r2: state.exponential_smoothing_metrics_r2,
    });
  }

  if (state.arima_completed) {
    allModels.push({
      name: "ARIMA",
      params: `(p,d,q): (${state.arima_p ?? "?"},${state.arima_d ?? "?"},${state.arima_q ?? "?"})`,
      rmse: state.arima_metrics_rmse,
      mae: state.arima_metrics_mae,
      r2: state.arima_metrics_r2,
    });
  }

  if (state.lstm_completed) {
    allModels.push({
      name: "LSTM",
      params: `归一化: ${state.lstm_normalization || "N/A"}`,
      rmse: state.lstm_metrics_rmse,
      mae: state.lstm_metrics_mae,
      r2: state.lstm_metrics_r2,
    });
  }

  if (state.ensemble_weighted_completed) {
    allModels.push({
      name: "加权平均融合",
      params: getEnsembleParams(state.ensemble_weighted_base_models),
      rmse: state.ensemble_weighted_metrics_rmse,
      mae: state.ensemble_weighted_metrics_mae,
      r2: state.ensemble_weighted_metrics_r2,
    });
  }

  if (state.ensemble_boosting_completed) {
    allModels.push({
      name: "Boosting融合",
      params: getEnsembleParams(state.ensemble_boosting_base_models),
      rmse: state.ensemble_boosting_metrics_rmse,
      mae: state.ensemble_boosting_metrics_mae,
      r2: state.ensemble_boosting_metrics_r2,
    });
  }

  if (state.ensemble_stacking_completed) {
    allModels.push({
      name: "Stacking融合",
      params: getEnsembleParams(state.ensemble_stacking_base_models),
      rmse: state.ensemble_stacking_metrics_rmse,
      mae: state.ensemble_stacking_metrics_mae,
      r2: state.ensemble_stacking_metrics_r2,
    });
  }

  const metricsMap = {
    ma: {
      rmse: state.moving_average_metrics_rmse,
      mae: state.moving_average_metrics_mae,
      r2: state.moving_average_metrics_r2,
    },
    exp: {
      rmse: state.exponential_smoothing_metrics_rmse,
      mae: state.exponential_smoothing_metrics_mae,
      r2: state.exponential_smoothing_metrics_r2,
    },
    arima: {
      rmse: state.arima_metrics_rmse,
      mae: state.arima_metrics_mae,
      r2: state.arima_metrics_r2,
    },
    lstm: {
      rmse: state.lstm_metrics_rmse,
      mae: state.lstm_metrics_mae,
      r2: state.lstm_metrics_r2,
    },
    ensemble_weighted: {
      rmse: state.ensemble_weighted_metrics_rmse,
      mae: state.ensemble_weighted_metrics_mae,
      r2: state.ensemble_weighted_metrics_r2,
    },
    ensemble_boosting: {
      rmse: state.ensemble_boosting_metrics_rmse,
      mae: state.ensemble_boosting_metrics_mae,
      r2: state.ensemble_boosting_metrics_r2,
    },
    ensemble_stacking: {
      rmse: state.ensemble_stacking_metrics_rmse,
      mae: state.ensemble_stacking_metrics_mae,
      r2: state.ensemble_stacking_metrics_r2,
    },
  } satisfies Record<SelectedBestModel, ModelMetrics>;

  return {
    trainingData,
    evaluationData,
    allModels,
    bestModelMetrics: state.selected_best_model ? metricsMap[state.selected_best_model] : null,
    planSummary: buildPlanSummary(state.production_mps_table),
  };
};

export const buildExperimentReportMarkdown = ({
  state,
  userInfo,
  analyses,
  viewModel,
}: BuildExperimentReportMarkdownInput): string => {
  const currentDate = new Date().toLocaleString("zh-CN", { hour12: false });
  const [period1, period2] = state.production_mps_table;
  const selectedModelLabel = state.selected_best_model
    ? MODEL_LABELS[state.selected_best_model]
    : "N/A";

  const periodComparisonSection = !period1 || !period2
    ? "**📝 说明：数据不完整**"
    : `| 变量/参数 | 期 1 (参考) | 期 2 (学习) |
|---|---|---|
| **需求与库存** | | |
| 需求预测 | ${period1.demand_forecast?.toLocaleString()} | ${period2.demand_forecast?.toLocaleString()} |
| 期初库存 | ${period1.beginning_inventory?.toLocaleString()} | ${period2.beginning_inventory?.toLocaleString()} |
| 安全库存 | ${period1.safety_stock?.toLocaleString()} | ${period2.safety_stock?.toLocaleString()} |
| 预测量 | ${((period1.demand_forecast ?? 0) + (period1.safety_stock ?? 0)).toLocaleString()} | ${((period2.demand_forecast ?? 0) + (period2.safety_stock ?? 0)).toLocaleString()} |
| **生产与产出** | | |
| 计划生产 (投入量) | ${period1.planned_production?.toLocaleString()} | ${period2.planned_production?.toLocaleString()} |
| 产出量 | ${period1.production_output?.toLocaleString()} | ${period2.production_output?.toLocaleString()} |
| **结果与评估** | | |
| 期末库存 | ${period1.ending_inventory?.toLocaleString()} | ${period2.ending_inventory?.toLocaleString()} |
| 缺货量 | ${period1.stockout?.toLocaleString()} | ${period2.stockout?.toLocaleString()} |
| 服务水平 | ${((period1.service_level ?? 0) * 100).toFixed(1)}% | ${((period2.service_level ?? 0) * 100).toFixed(1)}% |
`;

  const mpsTableSection = state.production_mps_table.length > 0
    ? `| 周期 | 预测需求 | 安全库存 | 计划生产 | 期初库存 | 产出量 | 期末库存 | 缺货量 | 服务水平 |
|------|----------|----------|----------|----------|--------|----------|--------|----------|
${state.production_mps_table
  .map(
    (row) => `| ${row.period_label} | ${row.demand_forecast} | ${row.safety_stock} | ${row.planned_production} | ${row.beginning_inventory} | ${row.production_output} | ${row.ending_inventory} | ${row.stockout} | ${((row.service_level ?? 0) * 100).toFixed(1)}% |`,
  )
  .join("\n")}`
    : "**📝 说明：生产计划数据未保存**";

  const planSummarySection = viewModel.planSummary
    ? `| 指标 | 结果 |
|------|------|
| 平均服务水平 | ${(viewModel.planSummary.avgServiceLevel * 100).toFixed(1)}% |
| 总缺货量 | ${viewModel.planSummary.totalStockout.toLocaleString()} 件 |
| 平均期末库存 | ${Math.round(viewModel.planSummary.avgInventory).toLocaleString()} 件 |
| 缺货周期数 | ${viewModel.planSummary.periodsWithStockout} / ${viewModel.planSummary.totalPeriods} |`
    : "**📝 说明：无汇总数据**";

  return `# ${userInfo?.full_name || "学生"}的实验报告

## 报告信息

- **学生姓名**: ${userInfo?.full_name || "未知"}
- **学生ID**: ${state.student_id || "未知"}
- **实验ID**: ${state.experiment_id || "未知"}
- **实验开始时间**: ${formatDate(state.start_time)}
- **报告生成时间**: ${currentDate}

---

## 一、实验概述

### 1.1 实验选择
| 项目 | 内容 |
|------|------|
| 行业 | ${state.selected_industry || "N/A"} |
| 公司 | ${state.selected_company || "N/A"} |
| 产品 | ${state.selected_product || "N/A"} |

### 1.2 数据预处理

#### 训练集 (${viewModel.trainingData.length}条)
| 月份 | 销量 |
|---|---|
${viewModel.trainingData.map((item) => `| ${item.month} | ${formatSales(item.sales)} |`).join("\n")}

#### 评估集 (${viewModel.evaluationData.length}条)
| 月份 | 销量 |
|---|---|
${viewModel.evaluationData.map((item) => `| ${item.month} | ${formatSales(item.sales)} |`).join("\n")}

### 1.3 分析
${stripHtmlTags(analyses.data)}

---

## 二、模型性能对比

| 模型 | 参数 | RMSE | MAE | R² |
|------|------|------|-----|-----|
${viewModel.allModels.map((model) => `| ${model.name} | ${model.params} | ${formatMetricValue(model.rmse)} | ${formatMetricValue(model.mae)} | ${formatMetricValue(model.r2)} |`).join("\n")}

### 分析
${stripHtmlTags(analyses.comparison)}

---

## 三、最优模型选择

**选定模型**: ${selectedModelLabel}

| 指标 | 值 |
|------|-----|
| RMSE | ${formatMetricValue(viewModel.bestModelMetrics?.rmse)} |
| MAE | ${formatMetricValue(viewModel.bestModelMetrics?.mae)} |
| R² | ${formatMetricValue(viewModel.bestModelMetrics?.r2)} |

### 分析
${stripHtmlTags(analyses.selection)}

---

## 四、生产计划参数计算结果
(以期1和期2为例)

### 4.1 默认参数
| 参数 | 值 |
|------|-----|
| 目标服务水平 | ${state.production_target_service_level ? `${state.production_target_service_level * 100}%` : "N/A"} |
| 安全库存Z值 | ${state.production_safety_stock_z_score || "N/A"} |
| 产能模式 | ${formatCapacityMode(state)} |
| 产能上限/期 | ${state.production_capacity ? `${state.production_capacity.toLocaleString()} 件` : "N/A"} |

### 4.2 数据对比
${periodComparisonSection}

### 4.3 分析
${stripHtmlTags(analyses.params)}

---

## 五、生产计划决策结果

### 5.1 完整生产计划表 (MPS)
${mpsTableSection}

### 5.2 计划总体评估
${planSummarySection}

### 5.3 分析
${stripHtmlTags(analyses.decision)}`;
};
