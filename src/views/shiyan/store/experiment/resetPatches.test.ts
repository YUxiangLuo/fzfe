/// <reference types="bun-types" />

import { describe, expect, it } from "bun:test";
import { buildInitialState } from "./initialState";
import {
  buildResetArimaPatch,
  buildResetMovingAveragePatch,
  buildResetWeightedEnsemblePatch,
} from "./resetPatches";

describe("experiment reset patches", () => {
  it("builds moving average reset patch from initial state values", () => {
    const initialState = buildInitialState();
    const patch = buildResetMovingAveragePatch();

    expect(patch.moving_average_completed).toBe(initialState.moving_average_completed);
    expect(patch.moving_average_window).toBe(initialState.moving_average_window);
    expect(patch.ensemble_weighted_completed).toBe(initialState.ensemble_weighted_completed);
    expect(patch.ensemble_boosting_base_models).toEqual(
      initialState.ensemble_boosting_base_models,
    );
    expect(patch.ensemble_stacking_metrics_r2).toBe(initialState.ensemble_stacking_metrics_r2);
    expect(patch.selected_best_model).toBeNull();
    expect(patch.production_plan_completed).toBeFalse();
    expect(patch.production_forecast_results).toBeNull();
    expect(patch.production_mps_table).toEqual([]);
  });

  it("resets arima-specific fields and downstream ensembles together", () => {
    const initialState = buildInitialState();
    const patch = buildResetArimaPatch();

    expect(patch.arima_completed).toBeFalse();
    expect(patch.arima_p).toBe(initialState.arima_p);
    expect(patch.arima_adf_stationarity).toEqual(initialState.arima_adf_stationarity);
    expect(patch.ensemble_weighted_base_models).toEqual([]);
    expect(patch.ensemble_boosting_completed).toBeFalse();
    expect(patch.ensemble_stacking_completed).toBeFalse();
  });

  it("keeps weighted ensemble patch focused on weighted model fields and downstream decisions", () => {
    const patch = buildResetWeightedEnsemblePatch();

    expect(patch.ensemble_weighted_completed).toBeFalse();
    expect(patch.ensemble_weighted_base_models).toEqual([]);
    expect(patch.ensemble_boosting_completed).toBeUndefined();
    expect(patch.ensemble_stacking_completed).toBeUndefined();
    expect(patch.selected_best_model).toBeNull();
    expect(patch.production_plan_completed).toBeFalse();
  });
});
