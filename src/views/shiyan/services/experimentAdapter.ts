import {
  buildInitialPersistedState,
  buildInitialSessionState,
  buildInitialState,
} from "../store/experiment/initialState";
import {
  normalizeBaseModelSelection,
  normalizeEnsembleModelSelection,
} from "../utils/modelCatalog";
import type {
  AdfStationarityRow,
  ExperimentState,
  MPSTableRow,
  PersistedExperimentState,
} from "../store/experiment/types";

type ExperimentApiState = Partial<PersistedExperimentState> & {
  [key: string]: unknown;
};

const SERVER_MANAGED_UPDATE_FIELDS = [
  "experiment_id",
  "student_id",
  "state_version",
  "status",
  "start_time",
  "last_activity_at",
  "completion_time",
  "quiz_about_model_completed",
  "quiz_about_plan_completed",
] as const satisfies ReadonlyArray<keyof PersistedExperimentState>;

type ExperimentUpdatePayload = Omit<
  Partial<PersistedExperimentState>,
  (typeof SERVER_MANAGED_UPDATE_FIELDS)[number]
> & { state_version: number };

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
  const basePersistedState = buildInitialPersistedState();
  const baseSessionState = buildInitialSessionState();

  if (!state) {
    return baseState;
  }

  return {
    ...basePersistedState,
    ...baseSessionState,
    ...state,
    selected_base_models: normalizeBaseModelSelection(state.selected_base_models),
    selected_ensemble_models: normalizeEnsembleModelSelection(state.selected_ensemble_models),
    arima_adf_stationarity: normalizeAdfRows(state.arima_adf_stationarity),
    lstm_features: normalizeStringArray(state.lstm_features),
    ensemble_weighted_base_models: normalizeBaseModelSelection(
      state.ensemble_weighted_base_models,
    ),
    ensemble_boosting_base_models: normalizeBaseModelSelection(
      state.ensemble_boosting_base_models,
    ),
    ensemble_stacking_base_models: normalizeBaseModelSelection(
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
  updates: Partial<ExperimentState> = state,
): ExperimentUpdatePayload => {
  const payload = { ...updates } as Partial<PersistedExperimentState> & {
    state_version?: number;
  };

  if (updates.selected_base_models !== undefined) {
    payload.selected_base_models = normalizeBaseModelSelection(updates.selected_base_models);
  }
  if (updates.selected_ensemble_models !== undefined) {
    payload.selected_ensemble_models = normalizeEnsembleModelSelection(updates.selected_ensemble_models);
  }
  if (updates.ensemble_weighted_base_models !== undefined) {
    payload.ensemble_weighted_base_models = normalizeBaseModelSelection(
      updates.ensemble_weighted_base_models,
    );
  }
  if (updates.ensemble_boosting_base_models !== undefined) {
    payload.ensemble_boosting_base_models = normalizeBaseModelSelection(
      updates.ensemble_boosting_base_models,
    );
  }
  if (updates.ensemble_stacking_base_models !== undefined) {
    payload.ensemble_stacking_base_models = normalizeBaseModelSelection(
      updates.ensemble_stacking_base_models,
    );
  }

  for (const field of SERVER_MANAGED_UPDATE_FIELDS) {
    delete payload[field];
  }

  payload.state_version = state.state_version;

  return payload as ExperimentUpdatePayload;
};

export type { ExperimentApiState, ExperimentUpdatePayload };
