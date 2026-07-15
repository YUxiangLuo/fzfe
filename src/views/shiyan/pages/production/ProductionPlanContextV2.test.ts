/// <reference types="bun-types" />

import { describe, expect, it } from "bun:test";
import { act, renderHook } from "@testing-library/react";
import { createElement } from "react";
import type { ReactNode } from "react";
import { buildInitialState } from "../../store/experiment/initialState";
import {
  ProductionPlanProvider,
  buildInitialProductionPlanState,
  useProductionPlan,
} from "./ProductionPlanContextV2";

const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(ProductionPlanProvider, { avgDemand: 100, children });

describe("buildInitialProductionPlanState", () => {
  it("hydrates persisted production forecasts and MPS data", () => {
    const persistedState = {
      ...buildInitialState(),
      selected_best_model: "ensemble_weighted" as const,
      production_plan_completed: true,
      production_forecast_periods: 6,
      production_initial_inventory: 12,
      production_target_service_level: 0.95,
      production_safety_stock_z_score: 1.65,
      production_forecast_results: [{
        prediction: 108,
        std_dev: 4.5,
        upper_error_p99: 11,
        uncertainty_source: "empirical" as const,
        calibration_mean_error: 1.5,
        calibration_count: 8,
      }],
      production_mps_table: [
        {
          period: 1,
          period_label: "期 1",
          demand_forecast: 100,
          safety_stock: 0,
          planned_production: 100,
          beginning_inventory: 0,
          production_output: 100,
          ending_inventory: 0,
          stockout: 0,
          service_level: 1,
        },
        {
          period: 2,
          period_label: "期 2",
          demand_forecast: 108,
          safety_stock: 9,
          planned_production: 117,
          beginning_inventory: 0,
          production_output: 100,
          ending_inventory: 0,
          stockout: 8,
          service_level: 0.93,
        },
      ],
      production_capacity_mode: "custom" as const,
      production_capacity_scenario: "abundant" as const,
      production_capacity: 300,
      production_custom_capacity: 280,
    };

    const state = buildInitialProductionPlanState({
      initialModel: "ma",
      avgDemand: 120,
      persistedState,
    });

    expect(state.currentStep).toBe(5);
    expect(state.completedSteps).toEqual([1, 2, 3, 4, 5]);
    expect(state.selectedBestModel).toBe("ma");
    expect(state.forecastPeriods).toBe(6);
    expect(state.initialInventory).toBe(12);
    expect(state.targetServiceLevel).toBe(0.95);
    expect(state.safetyStockZScore).toBe(1.65);
    expect(state.predictions).toEqual([{
      prediction: 108,
      std_dev: 4.5,
      upper_error_p99: 11,
      uncertainty_source: "empirical",
      calibration_mean_error: 1.5,
      calibration_count: 8,
    }]);
    expect(state.period1Data.demandForecast).toBe(100);
    expect(state.period2Data.safetyStock).toBe(9);
    expect(state.fullMPSTable).toHaveLength(2);
    expect(state.isFullPlanGenerated).toBe(true);
    expect(state.capacityMode).toBe("custom");
    expect(state.capacityScenario).toBe("abundant");
    expect(state.productionCapacity).toBe(280);
    expect(state.customCapacity).toBe(280);
    expect(state.hasSavedToGlobal).toBe(true);
  });

  it("falls back to defaults when no persisted production data exists", () => {
    const state = buildInitialProductionPlanState({
      initialModel: "lstm",
      avgDemand: 100,
    });

    expect(state.currentStep).toBe(1);
    expect(state.completedSteps).toEqual([]);
    expect(state.selectedBestModel).toBe("lstm");
    expect(state.forecastPeriods).toBe(6);
    expect(state.predictions).toBeNull();
    expect(state.fullMPSTable).toEqual([]);
    expect(state.isFullPlanGenerated).toBe(false);
    expect(state.productionCapacity).toBeNull();
    expect(state.targetServiceLevel).toBeNull();
    expect(state.safetyStockZScore).toBeNull();
    expect(state.hasSavedToGlobal).toBe(false);
  });

  it("ignores persisted custom capacity when the saved mode is not custom", () => {
    const state = buildInitialProductionPlanState({
      avgDemand: 100,
      persistedState: {
        ...buildInitialState(),
        production_capacity_mode: "scenario",
        production_target_service_level: 0.90,
        production_safety_stock_z_score: 1.28,
        production_capacity: 180,
        production_custom_capacity: 260,
      },
    });

    expect(state.capacityMode).toBe("scenario");
    expect(state.productionCapacity).toBe(180);
    expect(state.customCapacity).toBeNull();
  });

  it("requires a capacity scenario before generating a full MPS", () => {
    const { result } = renderHook(() => useProductionPlan(), { wrapper });

    expect(() => result.current.generateFullMPS([
      { prediction: 100, std_dev: 10, upper_error_p99: 20, uncertainty_source: "empirical", calibration_mean_error: 1, calibration_count: 8 },
      { prediction: 120, std_dev: 10, upper_error_p99: 20, uncertainty_source: "empirical", calibration_mean_error: 1, calibration_count: 8 },
    ])).toThrow("请先选择月产能模式");
  });

  it("discards legacy cached forecasts that lack the current uncertainty contract", () => {
    const state = buildInitialProductionPlanState({
      persistedState: {
        ...buildInitialState(),
        production_forecast_results: [
          { prediction: 108, std_dev: 4.5 },
        ] as never,
      },
    });

    expect(state.predictions).toBeNull();
  });

  it("rejects a persisted plan whose target and Z value are not a canonical pair", () => {
    const state = buildInitialProductionPlanState({
      persistedState: {
        ...buildInitialState(),
        production_plan_completed: true,
        production_target_service_level: 0.95,
        production_safety_stock_z_score: 2.33,
        production_capacity: 200,
        production_mps_table: [{ period: 1 } as never],
      },
    });

    expect(state.targetServiceLevel).toBeNull();
    expect(state.safetyStockZScore).toBeNull();
    expect(state.productionCapacity).toBeNull();
    expect(state.fullMPSTable).toEqual([]);
    expect(state.completedSteps).toEqual([]);
    expect(state.hasSavedToGlobal).toBe(false);
  });

  it("derives Z from the selected service level, clears capacity, and locks both after step 1", () => {
    const { result } = renderHook(() => useProductionPlan(), { wrapper });

    act(() => result.current.selectServiceLevel(0.90));
    expect(result.current.state.safetyStockZScore).toBe(1.28);
    act(() => result.current.updateCapacity({ scenario: "normal", capacity: 150 }));
    expect(result.current.state.productionCapacity).toBe(150);

    act(() => result.current.selectServiceLevel(0.99));
    expect(result.current.state.targetServiceLevel).toBe(0.99);
    expect(result.current.state.safetyStockZScore).toBe(2.33);
    expect(result.current.state.productionCapacity).toBeNull();

    act(() => result.current.completeCurrentStep());
    act(() => result.current.selectServiceLevel(0.95));
    act(() => result.current.updateCapacity({ scenario: "tight", capacity: 90 }));
    expect(result.current.state.targetServiceLevel).toBe(0.99);
    expect(result.current.state.safetyStockZScore).toBe(2.33);
    expect(result.current.state.productionCapacity).toBeNull();
  });
});
