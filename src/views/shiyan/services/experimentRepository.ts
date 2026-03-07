import {
  createExperimentState,
  getExperimentState,
  recordStepEvent,
  updateExperimentState,
} from "./experiment";
import type { ExperimentState } from "../store/experiment/types";

type StepEventType = "STARTED" | "COMPLETED";

type ExperimentRepositoryDependencies = {
  createExperimentState: typeof createExperimentState;
  getExperimentState: typeof getExperimentState;
  updateExperimentState: typeof updateExperimentState;
  recordStepEvent: typeof recordStepEvent;
};

export interface ExperimentRepository {
  create: () => Promise<ExperimentState>;
  getActive: () => Promise<ExperimentState>;
  save: (state: ExperimentState) => Promise<ExperimentState>;
  recordStepEvent: (
    experimentId: number,
    stepOrder: number,
    eventType: StepEventType,
  ) => Promise<void>;
}

const mergePersistedState = (
  localState: ExperimentState,
  persistedState: ExperimentState,
): ExperimentState => ({
  ...persistedState,
  selected_base_models: localState.selected_base_models,
  selected_ensemble_models: localState.selected_ensemble_models,
});

export const createExperimentRepository = (
  dependencies: ExperimentRepositoryDependencies = {
    createExperimentState,
    getExperimentState,
    updateExperimentState,
    recordStepEvent,
  },
): ExperimentRepository => ({
  create: async () => {
    return await dependencies.createExperimentState();
  },

  getActive: async () => {
    return await dependencies.getExperimentState();
  },

  save: async (state) => {
    const persistedState = await dependencies.updateExperimentState(state);
    return mergePersistedState(state, persistedState);
  },

  recordStepEvent: async (experimentId, stepOrder, eventType) => {
    await dependencies.recordStepEvent(experimentId, stepOrder, eventType);
  },
});

export const experimentRepository: ExperimentRepository = createExperimentRepository();