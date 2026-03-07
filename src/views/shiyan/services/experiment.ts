import { apiClient } from "@/utils/apiClient";
import type { ExperimentState } from "../store/experiment/types";
import {
  fromExperimentApi,
  toExperimentUpdatePayload,
  type ExperimentApiState,
} from "./experimentAdapter";

export const createExperimentState = async (): Promise<ExperimentState> => {
  const created = await apiClient.post<ExperimentApiState>("/students/me/experiment-runs", {});
  return fromExperimentApi(created);
};

export const getExperimentState = async (): Promise<ExperimentState> => {
  const existing = await apiClient.get<ExperimentApiState>("/students/me/experiment-runs/active");
  return fromExperimentApi(existing);
};

export const updateExperimentState = async (state: ExperimentState): Promise<ExperimentState> => {
  if (!state.experiment_id) {
    throw new Error("Experiment ID is required to update experiment status.");
  }
  const updated = await apiClient.put<ExperimentApiState>(
    `/experiment-runs/${state.experiment_id}`,
    toExperimentUpdatePayload(state),
  );
  return fromExperimentApi(updated);
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
