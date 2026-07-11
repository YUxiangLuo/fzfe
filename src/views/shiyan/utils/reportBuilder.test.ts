/// <reference types="bun-types" />

import { describe, expect, it } from "bun:test";
import { buildInitialState } from "../store/experiment/initialState";
import { buildExperimentReportMarkdown, buildReportViewModel } from "./reportBuilder";
import type { ProductSalesData } from "../store/experiment/types";

const productSalesData: ProductSalesData = {
  meta: {
    industry: "electronics",
    company: "acme",
    product: "widget",
    name: "Widget",
    description: "desc",
    unit: "件",
  },
  monthlySales: [
    { month: "2024-01", sales: 10 },
    { month: "2024-02", sales: 20 },
    { month: "2024-03", sales: 30 },
    { month: "2024-04", sales: 40 },
  ],
};

const createMonthlySales = (count: number): ProductSalesData["monthlySales"] =>
  Array.from({ length: count }, (_, index) => {
    const year = 2022 + Math.floor(index / 12);
    const month = (index % 12) + 1;
    return {
      month: `${year}-${String(month).padStart(2, "0")}`,
      sales: index + 1,
    };
  });

describe("reportBuilder", () => {
  it("builds a report view model from selected ranges and completed models", () => {
    const state = {
      ...buildInitialState(),
      data_window_train_start_index: 0,
      data_window_train_end_index: 1,
      data_window_evaluate_start_index: 2,
      data_window_evaluate_end_index: 3,
      moving_average_completed: true,
      moving_average_window: 3,
      moving_average_metrics_rmse: 1.1,
      moving_average_metrics_mae: 0.9,
      moving_average_metrics_mape: 6.2,
      moving_average_metrics_r2: 0.8,
      ensemble_weighted_completed: true,
      ensemble_weighted_base_models: ["ma", "lstm"],
      ensemble_weighted_metrics_rmse: 0.7,
      ensemble_weighted_metrics_mae: 0.5,
      ensemble_weighted_metrics_mape: 4.5,
      ensemble_weighted_metrics_r2: 0.92,
      selected_best_model: "ensemble_weighted" as const,
      production_mps_table: [
        {
          period: 1,
          period_label: "P1",
          demand_forecast: 100,
          safety_stock: 10,
          planned_production: 110,
          beginning_inventory: 20,
          production_output: 105,
          ending_inventory: 15,
          stockout: 0,
          service_level: 1,
        },
        {
          period: 2,
          period_label: "P2",
          demand_forecast: 90,
          safety_stock: 8,
          planned_production: 95,
          beginning_inventory: 15,
          production_output: 95,
          ending_inventory: 12,
          stockout: 2,
          service_level: 0.95,
        },
      ],
    };

    const viewModel = buildReportViewModel(state, productSalesData);

    expect(viewModel.trainingData).toEqual(productSalesData.monthlySales.slice(0, 2));
    expect(viewModel.evaluationData).toEqual(productSalesData.monthlySales.slice(2, 4));
    expect(viewModel.allModels).toHaveLength(2);
    expect(viewModel.allModels[1]?.params).toContain("移动平均法");
    expect(viewModel.bestModelMetrics?.rmse).toBe(0.7);
    expect(viewModel.planSummary?.totalStockout).toBe(2);
    expect(viewModel.planSummary?.periodsWithStockout).toBe(1);
  });

  it("renders markdown with key report sections and computed values", () => {
    const state = {
      ...buildInitialState(),
      experiment_id: 8,
      student_id: 15,
      start_time: "2026-03-08T08:00:00.000Z",
      selected_industry: "electronics",
      selected_company: "acme",
      selected_product: "widget",
      production_target_service_level: 0.95,
      production_safety_stock_z_score: 1.65,
      production_capacity_mode: "scenario" as const,
      production_capacity_scenario: "normal" as const,
      production_capacity: 500,
      selected_best_model: "ensemble_weighted" as const,
      production_mps_table: [
        {
          period: 1,
          period_label: "P1",
          demand_forecast: 100,
          safety_stock: 10,
          planned_production: 110,
          beginning_inventory: 20,
          production_output: 105,
          ending_inventory: 15,
          stockout: 0,
          service_level: 1,
        },
        {
          period: 2,
          period_label: "P2",
          demand_forecast: 90,
          safety_stock: 8,
          planned_production: 95,
          beginning_inventory: 15,
          production_output: 95,
          ending_inventory: 12,
          stockout: 2,
          service_level: 0.95,
        },
      ],
    };
    const viewModel = buildReportViewModel(
      {
        ...state,
        data_window_train_start_index: 0,
        data_window_train_end_index: 1,
        data_window_evaluate_start_index: 2,
        data_window_evaluate_end_index: 3,
        ensemble_weighted_completed: true,
        ensemble_weighted_base_models: ["ma", "lstm"],
        ensemble_weighted_metrics_rmse: 0.7,
        ensemble_weighted_metrics_mae: 0.5,
        ensemble_weighted_metrics_mape: 4.5,
        ensemble_weighted_metrics_r2: 0.92,
      },
      productSalesData,
    );

    const markdown = buildExperimentReportMarkdown({
      state,
      userInfo: {
        user_id: 15,
        username: "alice",
        full_name: "Alice",
        email: "alice@example.com",
      },
      analyses: {
        data: "data analysis",
        comparison: "comparison analysis",
        selection: "selection analysis",
        params: "params analysis",
        decision: "decision analysis",
      },
      viewModel,
      quizResults: {
        model: [
          {
            question_id: 101,
            quiz_type: "quiz_about_model",
            knowledge_point: "预测模型",
            question_type: "Single Choice",
            question_text: "RMSE | MAE\n哪个越小越好？",
            options: { A: "越大越好", B: "越小|越好" },
            submitted_answer: ["A"],
            correct_answers: ["B"],
            is_correct: false,
          },
        ],
        plan: [],
      },
    });

    expect(markdown).toContain("# Alice的实验报告");
    expect(markdown).toContain("| 行业 | electronics |");
    expect(markdown).toContain("**选定模型**: 加权平均融合");
    expect(markdown).toContain("4.50%");
    expect(markdown).toContain("95%");
    expect(markdown).toContain("| 产能模式 | 产能正常 |");
    expect(markdown).toContain("decision analysis");
    expect(markdown).toContain("| P1 | 100 | 10 | 110 |");
    expect(markdown).toContain("## 六、知识测验答题记录");
    expect(markdown).toContain("- **正确题数**: 0 / 1");
    expect(markdown).toContain("RMSE \\| MAE<br>哪个越小越好？");
    expect(markdown).toContain("B. 越小\\|越好");
    expect(markdown).toContain("### 生产计划知识测验\n\n暂无答题记录");
  });

  it("prioritizes explicit capacity mode over a leftover scenario label", () => {
    const state = {
      ...buildInitialState(),
      production_target_service_level: 0.95,
      production_safety_stock_z_score: 1.65,
      production_capacity_mode: "custom" as const,
      production_capacity_scenario: "normal" as const,
      production_capacity: 500,
    };

    const markdown = buildExperimentReportMarkdown({
      state,
      userInfo: null,
      analyses: {
        data: "",
        comparison: "",
        selection: "",
        params: "",
        decision: "",
      },
      viewModel: buildReportViewModel(state, productSalesData),
    });

    expect(markdown).toContain("| 产能模式 | 自定义产能 |");
    expect(markdown).not.toContain("| 产能模式 | 产能正常 |");
  });

  it("renders fallback sections when report data is incomplete", () => {
    const state = {
      ...buildInitialState(),
      experiment_id: 9,
      student_id: 16,
      selected_industry: null,
      selected_company: null,
      selected_product: null,
      selected_best_model: null,
      production_mps_table: [],
    };

    const markdown = buildExperimentReportMarkdown({
      state,
      userInfo: null,
      analyses: {
        data: "d",
        comparison: "c",
        selection: "s",
        params: "p",
        decision: "x",
      },
      viewModel: buildReportViewModel(state, null),
    });

    expect(markdown).toContain("# 学生的实验报告");
    expect(markdown).toContain("| 行业 | N/A |");
    expect(markdown).toContain("**选定模型**: N/A");
    expect(markdown).toContain("**📝 说明：生产计划数据未保存**");
    expect(markdown).toContain("**📝 说明：无汇总数据**");
  });

  it("summarizes large sales windows in the body and keeps complete details in the appendix", () => {
    const largeSalesData: ProductSalesData = {
      ...productSalesData,
      monthlySales: createMonthlySales(42),
    };
    const state = {
      ...buildInitialState(),
      data_window_train_start_index: 0,
      data_window_train_end_index: 29,
      data_window_evaluate_start_index: 30,
      data_window_evaluate_end_index: 41,
    };

    const markdown = buildExperimentReportMarkdown({
      state,
      userInfo: null,
      analyses: {
        data: "data",
        comparison: "",
        selection: "",
        params: "",
        decision: "",
      },
      viewModel: buildReportViewModel(state, largeSalesData),
    });

    const [body, appendix] = markdown.split("## 附录：原始销量明细");

    expect(body).toContain("#### 数据窗口统计摘要");
    expect(body).toContain("| 数据集 | 总条数 | 有效销量 | 起止月份 | 最小销量 | 最大销量 | 平均销量 | 样本方差 | 样本标准差 |");
    expect(body).toContain("| 训练集 | 30 | 30 | 2022-01 至 2024-06 | 1 | 30 | 15.5 | 77.5 | 8.8 |");
    expect(body).toContain("| 评估集 | 12 | 12 | 2024-07 至 2025-06 | 31 | 42 | 36.5 | 13 | 3.61 |");
    expect(body).toContain("| ... | 已省略 20 条，完整明细见附录 |");
    expect(body).toContain("| ... | 已省略 2 条，完整明细见附录 |");
    expect(body).not.toContain("| 2022-10 | 10 |");
    expect(body).not.toContain("| 2025-01 | 37 |");

    expect(markdown).toContain('<div class="report-appendix-break"></div>');
    expect(appendix).toContain("### A.1 训练集完整明细 (30条)");
    expect(appendix).toContain("### A.2 评估集完整明细 (12条)");
    expect(appendix).toContain("| 2022-10 | 10 |");
    expect(appendix).toContain("| 2025-01 | 37 |");
    expect(appendix).toContain("| 2025-06 | 42 |");
  });

  it("reports zero sample variance for a one-point sales window", () => {
    const singlePointData: ProductSalesData = {
      ...productSalesData,
      monthlySales: [{ month: "2024-01", sales: 100 }],
    };
    const state = {
      ...buildInitialState(),
      data_window_train_start_index: 0,
      data_window_train_end_index: 0,
    };

    const markdown = buildExperimentReportMarkdown({
      state,
      userInfo: null,
      analyses: {
        data: "",
        comparison: "",
        selection: "",
        params: "",
        decision: "",
      },
      viewModel: buildReportViewModel(state, singlePointData),
    });

    expect(markdown).toContain("| 训练集 | 1 | 1 | 2024-01 至 2024-01 | 100 | 100 | 100 | 0 | 0 |");
  });
});
