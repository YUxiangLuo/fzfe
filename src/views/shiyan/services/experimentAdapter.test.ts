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
      selected_base_models: ["should-be-ignored"],
      selected_ensemble_models: ["should-be-ignored"],
      lstm_features: ["sales", 123, null],
      ensemble_weighted_base_models: ["ma", false],
      ensemble_boosting_base_models: ["arima"],
      ensemble_stacking_base_models: "invalid",
      arima_adf_stationarity: [{ diff_order: 1 }],
      production_forecast_results: [{ prediction: 10, std_dev: 2 }, null],
      production_mps_table: [{ period: 1 }, null],
    } as unknown as ExperimentApiState;

    const state = fromExperimentApi(apiState);

    expect(state.experiment_id).toBe(7);
    expect(state.selected_industry).toBe("electronics");
    expect(state.selected_base_models).toEqual([]);
    expect(state.selected_ensemble_models).toEqual([]);
    expect(state.lstm_features).toEqual(["sales"]);
    expect(state.ensemble_weighted_base_models).toEqual(["ma"]);
    expect(state.ensemble_boosting_base_models).toEqual(["arima"]);
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

  it("removes frontend-only fields from update payloads", () => {
    const state = {
      ...buildInitialState(),
      experiment_id: 11,
      selected_base_models: ["ma", "lstm"],
      selected_ensemble_models: ["ensemble_weighted"],
    };

    const payload = toExperimentUpdatePayload(state);

    expect("selected_base_models" in payload).toBeFalse();
    expect("selected_ensemble_models" in payload).toBeFalse();
    expect(payload.experiment_id).toBe(11);
  });
});