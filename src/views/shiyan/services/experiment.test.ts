/// <reference types="bun-types" />

import { resolve } from "path";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { buildInitialState } from "../store/experiment/initialState";

const r = (p: string) => resolve(import.meta.dir, p);

const apiGet = mock(async () => ({
  experiment_id: 1,
  student_id: 2,
  status: "In Progress",
  highest_completed_step: 1,
  current_step: 2,
  selected_industry: null,
  selected_company: null,
  selected_product: null,
  selected_base_models: [],
  selected_ensemble_models: [],
  data_window_train_start_index: null,
  data_window_train_end_index: null,
  data_window_evaluate_start_index: null,
  data_window_evaluate_end_index: null,
  moving_average_completed: false,
  moving_average_window: null,
  moving_average_metrics_rmse: null,
  moving_average_metrics_mae: null,
  moving_average_metrics_r2: null,
  exponential_smoothing_completed: false,
  exponential_smoothing_alpha: null,
  exponential_smoothing_metrics_rmse: null,
  exponential_smoothing_metrics_mae: null,
  exponential_smoothing_metrics_r2: null,
  arima_completed: false,
  arima_p: null,
  arima_d: null,
  arima_q: null,
  arima_metrics_rmse: null,
  arima_metrics_mae: null,
  arima_metrics_r2: null,
  arima_adf_stationarity: null,
  lstm_completed: false,
  lstm_normalization: null,
  lstm_features: null,
  lstm_target_field: null,
  lstm_metrics_rmse: null,
  lstm_metrics_mae: null,
  lstm_metrics_r2: null,
  ensemble_weighted_completed: false,
  ensemble_weighted_base_models: null,
  ensemble_weighted_metrics_rmse: null,
  ensemble_weighted_metrics_mae: null,
  ensemble_weighted_metrics_r2: null,
  ensemble_boosting_completed: false,
  ensemble_boosting_base_models: null,
  ensemble_boosting_metrics_rmse: null,
  ensemble_boosting_metrics_mae: null,
  ensemble_boosting_metrics_r2: null,
  ensemble_stacking_completed: false,
  ensemble_stacking_base_models: null,
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
  production_mps_table: null,
  production_capacity_mode: null,
  production_capacity_scenario: null,
  production_capacity: null,
  production_custom_capacity: null,
  start_time: "2026-03-27T00:00:00.000Z",
  last_activity_at: "2026-03-27T00:00:00.000Z",
  completion_time: null,
}));

mock.module(r("../../../utils/apiClient.ts"), () => ({
  apiClient: {
    get: apiGet,
    post: mock(),
    put: mock(),
  },
}));

describe("experiment service", () => {
  beforeEach(() => {
    apiGet.mockReset();
  });

  it("returns the initial experiment state when the active experiment endpoint responds with 404", async () => {
    const missingExperimentError = Object.assign(
      new Error("HTTP 404 Not Found - 未找到实验状态"),
      { status: 404 },
    );
    apiGet.mockRejectedValueOnce(missingExperimentError);

    const { getExperimentState } = await import("./experiment");

    await expect(getExperimentState()).resolves.toEqual(buildInitialState());
  });

  it("rethrows non-404 active experiment errors", async () => {
    const serverError = Object.assign(new Error("HTTP 500 Internal Server Error"), {
      status: 500,
    });
    apiGet.mockRejectedValueOnce(serverError);

    const { getExperimentState } = await import("./experiment");

    await expect(getExperimentState()).rejects.toThrow("HTTP 500 Internal Server Error");
  });
});
