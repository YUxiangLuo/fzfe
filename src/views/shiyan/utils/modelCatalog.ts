import type { SelectedBestModel } from "../store/experiment/types";

export const BASE_MODEL_SELECTION_ORDER = [
  "moving_average",
  "exponential_smoothing",
  "arima",
  "lstm",
] as const;

export const ENSEMBLE_MODEL_SELECTION_ORDER = [
  "weighted_ensemble",
  "boosting_ensemble",
  "stacking_ensemble",
] as const;

const BASE_MODEL_SELECTION_ALIASES: Record<string, (typeof BASE_MODEL_SELECTION_ORDER)[number]> = {
  moving_average: "moving_average",
  ma: "moving_average",
  exponential_smoothing: "exponential_smoothing",
  exp: "exponential_smoothing",
  es: "exponential_smoothing",
  arima: "arima",
  lstm: "lstm",
};

const ENSEMBLE_MODEL_SELECTION_ALIASES: Record<string, (typeof ENSEMBLE_MODEL_SELECTION_ORDER)[number]> = {
  weighted_ensemble: "weighted_ensemble",
  ensemble_weighted: "weighted_ensemble",
  weighted_avg: "weighted_ensemble",
  boosting_ensemble: "boosting_ensemble",
  ensemble_boosting: "boosting_ensemble",
  boosting: "boosting_ensemble",
  stacking_ensemble: "stacking_ensemble",
  ensemble_stacking: "stacking_ensemble",
  stacking: "stacking_ensemble",
};

const sortUniqueByKnownOrder = <TOrder extends readonly string[]>(
  values: unknown,
  order: TOrder,
  aliases: Record<string, TOrder[number]>,
): TOrder[number][] => {
  if (!Array.isArray(values)) {
    return [];
  }

  const unique = new Set<TOrder[number]>();
  for (const value of values) {
    if (typeof value !== "string") {
      continue;
    }

    const normalizedValue = aliases[value];
    if (normalizedValue) {
      unique.add(normalizedValue);
    }
  }

  return order.filter((value) => unique.has(value));
};

export const normalizeBaseModelSelection = (values: unknown) =>
  sortUniqueByKnownOrder(values, BASE_MODEL_SELECTION_ORDER, BASE_MODEL_SELECTION_ALIASES);

export const normalizeEnsembleModelSelection = (values: unknown) =>
  sortUniqueByKnownOrder(values, ENSEMBLE_MODEL_SELECTION_ORDER, ENSEMBLE_MODEL_SELECTION_ALIASES);

export const BEST_MODEL_TO_BACKEND_MODEL_TYPE: Record<SelectedBestModel, string> = {
  ma: "ma",
  exp: "es",
  arima: "arima",
  lstm: "lstm",
  ensemble_weighted: "weighted_avg",
  ensemble_boosting: "boosting",
  ensemble_stacking: "stacking",
};

export const isBaseBestModel = (
  selectedBestModel: SelectedBestModel,
): selectedBestModel is Extract<SelectedBestModel, "ma" | "exp" | "arima" | "lstm"> => (
  selectedBestModel === "ma"
  || selectedBestModel === "exp"
  || selectedBestModel === "arima"
  || selectedBestModel === "lstm"
);
