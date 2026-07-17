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
  "moving_average_completed",
  "moving_average_metrics_rmse",
  "moving_average_metrics_mae",
  "moving_average_metrics_r2",
  "exponential_smoothing_completed",
  "exponential_smoothing_metrics_rmse",
  "exponential_smoothing_metrics_mae",
  "exponential_smoothing_metrics_r2",
  "arima_completed",
  "arima_p",
  "arima_q",
  "arima_metrics_rmse",
  "arima_metrics_mae",
  "arima_metrics_r2",
  "lstm_completed",
  "lstm_metrics_rmse",
  "lstm_metrics_mae",
  "lstm_metrics_r2",
  "ensemble_weighted_completed",
  "ensemble_weighted_metrics_rmse",
  "ensemble_weighted_metrics_mae",
  "ensemble_weighted_metrics_r2",
  "ensemble_boosting_completed",
  "ensemble_boosting_metrics_rmse",
  "ensemble_boosting_metrics_mae",
  "ensemble_boosting_metrics_r2",
  "ensemble_stacking_completed",
  "ensemble_stacking_metrics_rmse",
  "ensemble_stacking_metrics_mae",
  "ensemble_stacking_metrics_r2",
] as const satisfies ReadonlyArray<keyof PersistedExperimentState>;

type ExperimentUpdatePayload = Omit<
  Partial<PersistedExperimentState>,
  (typeof SERVER_MANAGED_UPDATE_FIELDS)[number]
> & { expected_version: number };

const normalizeStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const isAdfRow = (value: unknown): value is AdfStationarityRow => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const row = value as Record<string, unknown>;
  const criticalValues = row.critical_values;
  if (
    typeof criticalValues !== "object"
    || criticalValues === null
    || Array.isArray(criticalValues)
  ) {
    return false;
  }
  const critical = criticalValues as Record<string, unknown>;
  return Number.isSafeInteger(row.diff_order)
    && Number(row.diff_order) >= 0
    && Number(row.diff_order) <= 2
    && isFiniteNumber(row.statistic)
    && isFiniteNumber(row.p_value)
    && row.p_value >= 0
    && row.p_value <= 1
    && Number.isSafeInteger(row.used_lags)
    && Number(row.used_lags) >= 0
    && Number.isSafeInteger(row.n_obs)
    && Number(row.n_obs) >= 1
    && typeof row.stationary === "boolean"
    && isFiniteNumber(critical["1%"])
    && isFiniteNumber(critical["5%"])
    && isFiniteNumber(critical["10%"]);
};

const normalizeAdfRows = (value: unknown): AdfStationarityRow[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const rows = value.filter(isAdfRow);
  const diffOrders = rows.map((row) => row.diff_order);
  if (rows.length > 3 || new Set(diffOrders).size !== diffOrders.length) {
    return [];
  }
  return rows;
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
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }
  const valid = value.every((item) => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) return false;
    const point = item as Record<string, unknown>;
    return typeof point.prediction === "number" && Number.isFinite(point.prediction)
      && typeof point.std_dev === "number" && Number.isFinite(point.std_dev) && point.std_dev >= 0
      && typeof point.upper_error_p99 === "number"
      && Number.isFinite(point.upper_error_p99)
      && point.upper_error_p99 >= 0
      && (
        point.upper_error_p99_kind === undefined
        || (typeof point.upper_error_p99_kind === "string" && point.upper_error_p99_kind.length > 0)
      )
      && (
        point.coverage_guarantee === undefined
        || typeof point.coverage_guarantee === "boolean"
      )
      && (
        point.calibration_origins === undefined
        || (
          typeof point.calibration_origins === "number"
          && Number.isInteger(point.calibration_origins)
          && point.calibration_origins > 0
        )
      )
      && ["model", "empirical", "fallback"].includes(String(point.uncertainty_source))
      && (point.uncertainty_reason === undefined || typeof point.uncertainty_reason === "string")
      && (
        (point.calibration_mean_error === null && point.calibration_count === null)
        || (
          typeof point.calibration_mean_error === "number"
          && Number.isFinite(point.calibration_mean_error)
          && typeof point.calibration_count === "number"
          && Number.isInteger(point.calibration_count)
          && point.calibration_count > 0
        )
      );
  });
  return valid
    ? value as NonNullable<ExperimentState["production_forecast_results"]>
    : null;
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
  updates: Partial<ExperimentState>,
  expectedVersion: number,
): ExperimentUpdatePayload => {
  const payload: Record<string, unknown> = { ...updates, expected_version: expectedVersion };

  if (updates.selected_base_models) payload.selected_base_models = normalizeBaseModelSelection(updates.selected_base_models);
  if (updates.selected_ensemble_models) payload.selected_ensemble_models = normalizeEnsembleModelSelection(updates.selected_ensemble_models);
  if (updates.ensemble_weighted_base_models) payload.ensemble_weighted_base_models = normalizeBaseModelSelection(updates.ensemble_weighted_base_models);
  if (updates.ensemble_boosting_base_models) payload.ensemble_boosting_base_models = normalizeBaseModelSelection(updates.ensemble_boosting_base_models);
  if (updates.ensemble_stacking_base_models) payload.ensemble_stacking_base_models = normalizeBaseModelSelection(updates.ensemble_stacking_base_models);

  for (const field of SERVER_MANAGED_UPDATE_FIELDS) {
    delete payload[field];
  }

  return payload as ExperimentUpdatePayload;
};

export type { ExperimentApiState, ExperimentUpdatePayload };
