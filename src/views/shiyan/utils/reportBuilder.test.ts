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
      moving_average_metrics_r2: 0.8,
      ensemble_weighted_completed: true,
      ensemble_weighted_base_models: ["ma", "lstm"],
      ensemble_weighted_metrics_rmse: 0.7,
      ensemble_weighted_metrics_mae: 0.5,
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
    });

    expect(markdown).toContain("# Alice的实验报告");
    expect(markdown).toContain("| 行业 | electronics |");
    expect(markdown).toContain("**选定模型**: 加权平均融合");
    expect(markdown).toContain("95%");
    expect(markdown).toContain("decision analysis");
    expect(markdown).toContain("| P1 | 100 | 10 | 110 |");
  });
});