/// <reference types="bun-types" />

import { describe, expect, it } from "bun:test";
import { buildInitialState } from "../store/experiment/initialState";
import {
  fromExperimentApi,
  toExperimentUpdatePayload,
  type ExperimentApiState,
} from "./experimentAdapter";

describe("experimentAdapter", () => {
  it("normalizes API payloads into a safe experiment state", () => {
    const apiState = {
      experiment_id: 7,
      selected_industry: "electronics",
      selected_base_models: ["lstm", "moving_average", "lstm", "invalid"],
      selected_ensemble_models: ["stacking_ensemble", "ensemble_weighted", "invalid"],
      lstm_features: ["sales", 123, null],
      ensemble_weighted_base_models: ["lstm", "ma", false],
      ensemble_boosting_base_models: ["arima", "exp"],
      ensemble_stacking_base_models: "invalid",
      arima_adf_stationarity: [{ diff_order: 1 }],
      production_forecast_results: [{ prediction: 10, std_dev: 2 }, null],
      production_mps_table: [{ period: 1 }, null],
    } as unknown as ExperimentApiState;

    const state = fromExperimentApi(apiState);

    expect(state.experiment_id).toBe(7);
    expect(state.selected_industry).toBe("electronics");
    expect(state.selected_base_models).toEqual(["moving_average", "lstm"]);
    expect(state.selected_ensemble_models).toEqual(["weighted_ensemble", "stacking_ensemble"]);
    expect(state.lstm_features).toEqual(["sales"]);
    expect(state.ensemble_weighted_base_models).toEqual(["moving_average", "lstm"]);
    expect(state.ensemble_boosting_base_models).toEqual(["exponential_smoothing", "arima"]);
    expect(state.ensemble_stacking_base_models).toEqual([]);
    expect(state.arima_adf_stationarity).toHaveLength(1);
    expect(state.arima_adf_stationarity[0]?.diff_order).toBe(1);
    expect(state.production_forecast_results).toEqual([{ prediction: 10, std_dev: 2 }]);
    expect(state.production_mps_table).toHaveLength(1);
    expect(state.production_mps_table[0]?.period).toBe(1);
  });

  it("falls back to initial state for missing or null API payloads", () => {
    const initialState = buildInitialState();

    expect(fromExperimentApi(null)).toEqual(initialState);
    expect(fromExperimentApi(undefined)).toEqual(initialState);
  });

  it("canonicalizes model selections and removes only server-managed fields from update payloads", () => {
    const state = {
      ...buildInitialState(),
      experiment_id: 11,
      student_id: 42,
      status: "In Progress" as const,
      quiz_about_model_completed: true,
      quiz_about_plan_completed: true,
      selected_base_models: ["ma", "lstm"],
      selected_ensemble_models: ["ensemble_weighted"],
      ensemble_weighted_base_models: ["ma", "exp"],
    };

    const payload = toExperimentUpdatePayload(state, 7);

    expect(payload.selected_base_models).toEqual(["moving_average", "lstm"]);
    expect(payload.selected_ensemble_models).toEqual(["weighted_ensemble"]);
    expect(payload.ensemble_weighted_base_models).toEqual([
      "moving_average",
      "exponential_smoothing",
    ]);
    expect("experiment_id" in payload).toBeFalse();
    expect("student_id" in payload).toBeFalse();
    expect("status" in payload).toBeFalse();
    expect("quiz_about_model_completed" in payload).toBeFalse();
    expect("quiz_about_plan_completed" in payload).toBeFalse();
    expect(payload.expected_version).toBe(7);
  });
});
