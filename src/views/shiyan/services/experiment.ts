import { apiClient } from "@/utils/apiClient";
import type { ExperimentState } from "../store/experiment/types";
import { buildInitialState } from "../store/experiment/initialState";
import {
  fromExperimentApi,
  toExperimentUpdatePayload,
  type ExperimentApiState,
} from "./experimentAdapter";

export const createExperimentState = async (): Promise<ExperimentState> => {
  const created = await apiClient.post<ExperimentApiState>("/students/me/experiment-runs", {});
  return fromExperimentApi(created);
};

const isEmptyActiveExperimentError = (error: unknown): boolean => {
  return (
    error instanceof Error &&
    (error as Error & { status?: number }).status === 404
  );
};

export const getExperimentState = async (): Promise<ExperimentState> => {
  try {
    const existing = await apiClient.get<ExperimentApiState>("/students/me/experiment-runs/active");
    return fromExperimentApi(existing);
  } catch (error) {
    if (isEmptyActiveExperimentError(error)) {
      return buildInitialState();
    }
    throw error;
  }
};

export const updateExperimentState = async (
  experimentId: number,
  updates: Partial<ExperimentState>,
  expectedVersion: number,
): Promise<ExperimentState> => {
  if (!experimentId) {
    throw new Error("Experiment ID is required to update experiment status.");
  }
  const updated = await apiClient.patch<ExperimentApiState>(
    `/experiment-runs/${experimentId}`,
    toExperimentUpdatePayload(updates, expectedVersion),
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
