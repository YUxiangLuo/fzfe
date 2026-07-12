import {
  createExperimentState,
  getExperimentState,
  recordStepEvent,
  updateExperimentState,
} from "./experiment";
import type {
  ExperimentState,
} from "../store/experiment/types";

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
  save: (
    state: ExperimentState,
    updates?: Partial<ExperimentState>,
  ) => Promise<ExperimentState>;
  recordStepEvent: (
    experimentId: number,
    stepOrder: number,
    eventType: StepEventType,
  ) => Promise<void>;
}

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

  save: async (state, updates) => {
    return await dependencies.updateExperimentState(state, updates);
  },

  recordStepEvent: async (experimentId, stepOrder, eventType) => {
    await dependencies.recordStepEvent(experimentId, stepOrder, eventType);
  },
});

export const experimentRepository: ExperimentRepository = createExperimentRepository();
