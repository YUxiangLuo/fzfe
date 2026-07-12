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

export class ExperimentStateConflictError extends Error {
  constructor(
    message: string,
    public readonly currentState: ExperimentState,
  ) {
    super(message);
    this.name = "ExperimentStateConflictError";
  }
}

export const updateExperimentState = async (
  state: ExperimentState,
  updates: Partial<ExperimentState> = state,
): Promise<ExperimentState> => {
  if (!state.experiment_id) {
    throw new Error("Experiment ID is required to update experiment status.");
  }
  try {
    const updated = await apiClient.put<ExperimentApiState>(
      `/experiment-runs/${state.experiment_id}`,
      toExperimentUpdatePayload(state, updates),
    );
    return fromExperimentApi(updated);
  } catch (error) {
    const requestError = error as Error & {
      status?: number;
      payload?: { current_state?: ExperimentApiState };
    };
    if (requestError.status === 409 && requestError.payload?.current_state) {
      throw new ExperimentStateConflictError(
        "实验状态已在其他页面更新，请基于最新状态重试。",
        fromExperimentApi(requestError.payload.current_state),
      );
    }
    throw error;
  }
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
