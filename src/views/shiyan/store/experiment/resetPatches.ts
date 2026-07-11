import { buildInitialState } from "./initialState";
import type { ExperimentState } from "./types";

type ResettableField = keyof ExperimentState;

const pickStateFields = <Field extends ResettableField>(
  source: ExperimentState,
  fields: readonly Field[],
): Pick<ExperimentState, Field> => {
  const result = {} as Pick<ExperimentState, Field>;

  fields.forEach((field) => {
    result[field] = source[field];
  });

  return result;
};

const ensembleResetFields = [
  "ensemble_weighted_completed",
  "ensemble_weighted_base_models",
  "ensemble_weighted_metrics_rmse",
  "ensemble_weighted_metrics_mae",
  "ensemble_weighted_metrics_mape",
  "ensemble_weighted_metrics_r2",
  "ensemble_boosting_completed",
  "ensemble_boosting_base_models",
  "ensemble_boosting_metrics_rmse",
  "ensemble_boosting_metrics_mae",
  "ensemble_boosting_metrics_mape",
  "ensemble_boosting_metrics_r2",
  "ensemble_stacking_completed",
  "ensemble_stacking_base_models",
  "ensemble_stacking_metrics_rmse",
  "ensemble_stacking_metrics_mae",
  "ensemble_stacking_metrics_mape",
  "ensemble_stacking_metrics_r2",
] as const satisfies readonly ResettableField[];

const movingAverageResetFields = [
  "moving_average_completed",
  "moving_average_window",
  "moving_average_metrics_rmse",
  "moving_average_metrics_mae",
  "moving_average_metrics_mape",
  "moving_average_metrics_r2",
] as const satisfies readonly ResettableField[];

const exponentialSmoothingResetFields = [
  "exponential_smoothing_completed",
  "exponential_smoothing_alpha",
  "exponential_smoothing_metrics_rmse",
  "exponential_smoothing_metrics_mae",
  "exponential_smoothing_metrics_mape",
  "exponential_smoothing_metrics_r2",
] as const satisfies readonly ResettableField[];

const arimaResetFields = [
  "arima_completed",
  "arima_p",
  "arima_d",
  "arima_q",
  "arima_metrics_rmse",
  "arima_metrics_mae",
  "arima_metrics_mape",
  "arima_metrics_r2",
  "arima_adf_stationarity",
] as const satisfies readonly ResettableField[];

const lstmResetFields = [
  "lstm_completed",
  "lstm_normalization",
  "lstm_features",
  "lstm_target_field",
  "lstm_metrics_rmse",
  "lstm_metrics_mae",
  "lstm_metrics_mape",
  "lstm_metrics_r2",
] as const satisfies readonly ResettableField[];

const weightedEnsembleResetFields = [
  "ensemble_weighted_completed",
  "ensemble_weighted_base_models",
  "ensemble_weighted_metrics_rmse",
  "ensemble_weighted_metrics_mae",
  "ensemble_weighted_metrics_mape",
  "ensemble_weighted_metrics_r2",
] as const satisfies readonly ResettableField[];

const boostingEnsembleResetFields = [
  "ensemble_boosting_completed",
  "ensemble_boosting_base_models",
  "ensemble_boosting_metrics_rmse",
  "ensemble_boosting_metrics_mae",
  "ensemble_boosting_metrics_mape",
  "ensemble_boosting_metrics_r2",
] as const satisfies readonly ResettableField[];

const stackingEnsembleResetFields = [
  "ensemble_stacking_completed",
  "ensemble_stacking_base_models",
  "ensemble_stacking_metrics_rmse",
  "ensemble_stacking_metrics_mae",
  "ensemble_stacking_metrics_mape",
  "ensemble_stacking_metrics_r2",
] as const satisfies readonly ResettableField[];

const buildResetPatch = (
  ...fieldGroups: ReadonlyArray<readonly ResettableField[]>
): Partial<ExperimentState> => {
  const initialState = buildInitialState();

  return fieldGroups.reduce<Partial<ExperimentState>>((patch, fields) => {
    return {
      ...patch,
      ...pickStateFields(initialState, fields),
    };
  }, {});
};

export const buildResetMovingAveragePatch = (): Partial<ExperimentState> => {
  return buildResetPatch(movingAverageResetFields, ensembleResetFields);
};

export const buildResetExponentialSmoothingPatch = (): Partial<ExperimentState> => {
  return buildResetPatch(exponentialSmoothingResetFields, ensembleResetFields);
};

export const buildResetArimaPatch = (): Partial<ExperimentState> => {
  return buildResetPatch(arimaResetFields, ensembleResetFields);
};

export const buildResetLstmPatch = (): Partial<ExperimentState> => {
  return buildResetPatch(lstmResetFields, ensembleResetFields);
};

export const buildResetWeightedEnsemblePatch = (): Partial<ExperimentState> => {
  return buildResetPatch(weightedEnsembleResetFields);
};

export const buildResetBoostingEnsemblePatch = (): Partial<ExperimentState> => {
  return buildResetPatch(boostingEnsembleResetFields);
};

export const buildResetStackingEnsemblePatch = (): Partial<ExperimentState> => {
  return buildResetPatch(stackingEnsembleResetFields);
};
