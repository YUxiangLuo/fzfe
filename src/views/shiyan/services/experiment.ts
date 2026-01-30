import { apiClient } from "@/utils/apiClient";
import { initialState } from "../store/experiment/initialState";
import type { ExperimentState } from "../store/experiment/types";

const cloneInitialState = (): ExperimentState =>
  JSON.parse(JSON.stringify(initialState)) as ExperimentState;

const mergeWithInitial = (state: Partial<ExperimentState>): ExperimentState => ({
  ...cloneInitialState(),
  ...state,
});

export const createExperimentState = async (): Promise<ExperimentState> => {
  const created = await apiClient.post<ExperimentState>("/students/me/experiment-runs", {});
  return mergeWithInitial(created);
};

export const getExperimentState = async (): Promise<ExperimentState> => {
  const existing = await apiClient.get<ExperimentState>("/students/me/experiment-runs/active");
  return mergeWithInitial(existing);
};

export const updateExperimentState = async (state: ExperimentState): Promise<ExperimentState> => {
  if (!state.experiment_id) {
    throw new Error("Experiment ID is required to update experiment status.");
  }
  const updated = await apiClient.put<ExperimentState>(
    `/experiment-runs/${state.experiment_id}`,
    state,
  );
  return mergeWithInitial(updated);
};

export const recordStepEvent = async (
  experimentId: number,
  stepOrder: number,
  eventType: "STARTED" | "COMPLETED",
): Promise<{ message: string; event_id: number }> => {
  return await apiClient.post<{ message: string; event_id: number }>(
    `/experiment-runs/${experimentId}/events`,
    {
      step_order: stepOrder,
      event_type: eventType,
    },
  );
};
