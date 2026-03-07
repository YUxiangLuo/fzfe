/// <reference types="bun-types" />

import { describe, expect, it } from "bun:test";
import { STEPS } from "../../constants/steps";
import { buildInitialState } from "./initialState";
import {
  applyBestModelChangeTransition,
  applyDataWindowChangeTransition,
  applyIndustryChangeTransition,
} from "./transitions";

describe("experiment transitions", () => {
  it("resets downstream workflow when industry changes", () => {
    const state = {
      ...buildInitialState(),
      selected_industry: "old-industry",
      selected_company: "old-company",
      selected_product: "old-product",
      highest_completed_step: STEPS.EVALUATION,
      current_step: STEPS.PRODUCTION,
      moving_average_completed: true,
      quiz_about_model_completed: true,
      quiz_about_plan_completed: true,
      production_plan_completed: true,
    };

    const nextState = applyIndustryChangeTransition(state, "new-industry");

    expect(nextState.selected_industry).toBe("new-industry");
    expect(nextState.selected_company).toBeNull();
    expect(nextState.selected_product).toBeNull();
    expect(nextState.highest_completed_step).toBe(STEPS.INDUSTRY);
    expect(nextState.current_step).toBe(STEPS.COMPANY);
    expect(nextState.moving_average_completed).toBeFalse();
    expect(nextState.production_plan_completed).toBeFalse();
    expect(nextState.quiz_about_model_completed).toBeFalse();
    expect(nextState.quiz_about_plan_completed).toBeFalse();
  });

  it("preserves selected data window while resetting modeling state", () => {
    const state = {
      ...buildInitialState(),
      data_window_train_start_index: 1,
      data_window_train_end_index: 12,
      data_window_evaluate_start_index: 13,
      data_window_evaluate_end_index: 18,
      lstm_completed: true,
      selected_best_model: "lstm" as const,
    };

    const nextState = applyDataWindowChangeTransition(state, {
      data_window_train_end_index: 10,
      data_window_evaluate_start_index: 11,
      data_window_evaluate_end_index: 16,
    });

    expect(nextState.data_window_train_start_index).toBe(1);
    expect(nextState.data_window_train_end_index).toBe(10);
    expect(nextState.data_window_evaluate_start_index).toBe(11);
    expect(nextState.data_window_evaluate_end_index).toBe(16);
    expect(nextState.lstm_completed).toBeFalse();
    expect(nextState.selected_best_model).toBeNull();
    expect(nextState.highest_completed_step).toBe(STEPS.DATA_WINDOW);
    expect(nextState.current_step).toBe(STEPS.MODEL);
  });

  it("clears production planning when best model changes", () => {
    const state = {
      ...buildInitialState(),
      selected_best_model: "ma" as const,
      production_plan_completed: true,
      production_capacity: 123,
      quiz_about_plan_completed: true,
    };

    const nextState = applyBestModelChangeTransition(state, "ensemble_stacking");

    expect(nextState.selected_best_model).toBe("ensemble_stacking");
    expect(nextState.production_plan_completed).toBeFalse();
    expect(nextState.production_capacity).toBeNull();
    expect(nextState.quiz_about_plan_completed).toBeFalse();
    expect(nextState.highest_completed_step).toBe(STEPS.EVALUATION);
    expect(nextState.current_step).toBe(STEPS.PRODUCTION);
  });
});