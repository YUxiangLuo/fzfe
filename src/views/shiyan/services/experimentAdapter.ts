import { buildInitialState } from "../store/experiment/initialState";
import type {
  AdfStationarityRow,
  ExperimentState,
  MPSTableRow,
} from "../store/experiment/types";

type ExperimentApiState = Partial<Omit<ExperimentState, FrontendOnlyExperimentField>> & {
  [key: string]: unknown;
};

type FrontendOnlyExperimentField = "selected_base_models" | "selected_ensemble_models";

type ExperimentUpdatePayload = Omit<ExperimentState, FrontendOnlyExperimentField>;

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
};

const normalizeAdfRows = (value: unknown): AdfStationarityRow[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is AdfStationarityRow =>
      typeof item === "object" && item !== null,
  );
};

const normalizeMpsRows = (value: unknown): MPSTableRow[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is MPSTableRow => typeof item === "object" && item !== null,
  );
};

const normalizeForecastResults = (
  value: unknown,
): ExperimentState["production_forecast_results"] => {
  if (!Array.isArray(value)) {
    return null;
  }

  return value.filter(
    (
      item,
    ): item is NonNullable<ExperimentState["production_forecast_results"]>[number] =>
      typeof item === "object" && item !== null,
  );
};

export const fromExperimentApi = (state: ExperimentApiState | null | undefined): ExperimentState => {
  const baseState = buildInitialState();

  if (!state) {
    return baseState;
  }

  return {
    ...baseState,
    ...state,
    selected_base_models: baseState.selected_base_models,
    selected_ensemble_models: baseState.selected_ensemble_models,
    arima_adf_stationarity: normalizeAdfRows(state.arima_adf_stationarity),
    lstm_features: normalizeStringArray(state.lstm_features),
    ensemble_weighted_base_models: normalizeStringArray(
      state.ensemble_weighted_base_models,
    ),
    ensemble_boosting_base_models: normalizeStringArray(
      state.ensemble_boosting_base_models,
    ),
    ensemble_stacking_base_models: normalizeStringArray(
      state.ensemble_stacking_base_models,
    ),
    production_forecast_results: normalizeForecastResults(
      state.production_forecast_results,
    ),
    production_mps_table: normalizeMpsRows(state.production_mps_table),
  };
};

export const toExperimentUpdatePayload = (
  state: ExperimentState,
): ExperimentUpdatePayload => {
  const {
    selected_base_models: _selectedBaseModels,
    selected_ensemble_models: _selectedEnsembleModels,
    ...payload
  } = state;

  return payload;
};

export type { ExperimentApiState, ExperimentUpdatePayload };