/// <reference types="bun-types" />

import { describe, expect, it } from "bun:test";
import { buildInitialState } from "./initialState";
import {
  buildInitialUiState,
  isMatchingProductSelection,
  mergeExperimentUiState,
} from "./storeHelpers";

describe("storeHelpers", () => {
  it("matches only identical industry/company/product selections", () => {
    const state = {
      ...buildInitialState(),
      selected_industry: "electronics",
      selected_company: "acme",
      selected_product: "widget",
    };

    expect(isMatchingProductSelection(state, "electronics", "acme", "widget")).toBeTrue();
    expect(isMatchingProductSelection(state, "electronics", "acme", "other")).toBeFalse();
    expect(isMatchingProductSelection(state, "chem", "acme", "widget")).toBeFalse();
  });

  it("builds the expected initial ui state", () => {
    expect(buildInitialUiState()).toEqual({
      loading: true,
      isLoadingSales: false,
      salesDataError: null,
      isLoadingFields: false,
      productFieldsError: null,
      isSubmitting: false,
      isTrainingLocked: false,
      trainingLockPath: null,
    });
  });

  it("merges ui state updates without losing untouched flags", () => {
    const currentUi = {
      ...buildInitialUiState(),
      isSubmitting: true,
      isTrainingLocked: true,
      trainingLockPath: "/modeling",
    };

    const nextUi = mergeExperimentUiState(currentUi, {
      isLoadingSales: true,
      salesDataError: "boom",
    });

    expect(nextUi.isSubmitting).toBeTrue();
    expect(nextUi.isTrainingLocked).toBeTrue();
    expect(nextUi.trainingLockPath).toBe("/modeling");
    expect(nextUi.isLoadingSales).toBeTrue();
    expect(nextUi.salesDataError).toBe("boom");
  });
});