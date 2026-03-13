import type { ExperimentState } from "../store/experiment/types";
import { normalizeEnsembleModelSelection } from "./modelCatalog";

type EnsembleProgressState = Pick<
  ExperimentState,
  | "selected_ensemble_models"
  | "ensemble_weighted_completed"
  | "ensemble_boosting_completed"
  | "ensemble_stacking_completed"
>;

const ENSEMBLE_COMPLETION_STATE_KEYS = {
  weighted_ensemble: "ensemble_weighted_completed",
  boosting_ensemble: "ensemble_boosting_completed",
  stacking_ensemble: "ensemble_stacking_completed",
} as const satisfies Record<string, keyof EnsembleProgressState>;

export const hasCompletedAllSelectedEnsembleModels = (
  state: EnsembleProgressState,
): boolean => {
  const selectedModels = normalizeEnsembleModelSelection(state.selected_ensemble_models);

  if (selectedModels.length === 0) {
    return false;
  }

  return selectedModels.every((modelId) => Boolean(state[ENSEMBLE_COMPLETION_STATE_KEYS[modelId]]));
};
