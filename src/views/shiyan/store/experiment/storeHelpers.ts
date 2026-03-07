import type { ExperimentState, ExperimentUiState } from "./types";

export type ProductSelectionKey = {
  industry: string;
  company: string;
  product: string;
};

export type ProductScopedLoadResult = "success" | "failed" | "ignored";

export const isMatchingProductSelection = (
  state: ExperimentState,
  industry: string,
  company: string,
  product: string,
) => {
  return (
    state.selected_industry === industry &&
    state.selected_company === company &&
    state.selected_product === product
  );
};

export const buildInitialUiState = (): ExperimentUiState => ({
  loading: true,
  isLoadingSales: false,
  salesDataError: null,
  isLoadingFields: false,
  productFieldsError: null,
  isSubmitting: false,
  isTrainingLocked: false,
  trainingLockPath: null,
});

export const mergeExperimentUiState = (
  currentUi: ExperimentUiState,
  updates: Partial<ExperimentUiState>,
): ExperimentUiState => ({
  ...currentUi,
  ...updates,
});