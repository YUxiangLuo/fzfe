import type { ExperimentRepository } from "../../services/experimentRepository";
import type { ExperimentState } from "./types";

export interface UpdateStateOptions {
  forceSync?: boolean;
  skipSync?: boolean;
  throwOnSyncError?: boolean;
}

export interface ExperimentStateSyncController {
  updateState: (updates: Partial<ExperimentState>, options?: UpdateStateOptions) => Promise<void>;
}

const buildNextState = (
  previousState: ExperimentState,
  updates: Partial<ExperimentState>,
): ExperimentState => {
  const nextState: ExperimentState = { ...previousState, ...updates };

  if (nextState.status === "Not Started" && Object.keys(updates).length > 0) {
    nextState.status = "In Progress";
    nextState.start_time = nextState.start_time ?? new Date().toISOString();
  }

  nextState.last_activity_at = new Date().toISOString();

  return nextState;
};

const shouldSyncState = (
  previousState: ExperimentState,
  nextState: ExperimentState,
  updates: Partial<ExperimentState>,
  options: UpdateStateOptions,
) => {
  const { forceSync = false, skipSync = false } = options;

  const stepCompleted = nextState.highest_completed_step > previousState.highest_completed_step;
  const experimentCompleted =
    Object.prototype.hasOwnProperty.call(updates, "status") &&
    nextState.status === "Completed" &&
    previousState.status !== "Completed";

  return !skipSync && (forceSync || stepCompleted || experimentCompleted);
};

const didProductSelectionChange = (
  previousState: ExperimentState,
  nextState: ExperimentState,
) => {
  return (
    nextState.selected_industry !== previousState.selected_industry ||
    nextState.selected_company !== previousState.selected_company ||
    nextState.selected_product !== previousState.selected_product
  );
};

export const createExperimentStateSyncController = ({
  repository,
  getState,
  setState,
  onLocalStateChange,
  onSyncSuccess,
  onSyncError,
  onIgnoreStaleResponse,
  onRemoteProductSelectionChanged,
  onCompletedStepRecordError,
}: {
  repository: ExperimentRepository;
  getState: () => ExperimentState;
  setState: (state: ExperimentState) => void;
  onLocalStateChange: (previousState: ExperimentState, nextState: ExperimentState) => void;
  onSyncSuccess: () => void;
  onSyncError: (error: unknown) => void;
  onIgnoreStaleResponse: (responseVersion: number, latestVersion: number) => void;
  onRemoteProductSelectionChanged: () => void;
  onCompletedStepRecordError: (step: number, error: unknown) => void;
}): ExperimentStateSyncController => {
  let stateUpdateVersion = 0;

  return {
    updateState: async (updates, options = {}) => {
      const { throwOnSyncError = false } = options;
      const previousState = getState();
      const currentUpdateVersion = ++stateUpdateVersion;
      const nextState = buildNextState(previousState, updates);

      onLocalStateChange(previousState, nextState);
      setState(nextState);

      if (
        nextState.highest_completed_step > previousState.highest_completed_step &&
        nextState.experiment_id
      ) {
        for (
          let step = previousState.highest_completed_step + 1;
          step <= nextState.highest_completed_step;
          step++
        ) {
          repository.recordStepEvent(nextState.experiment_id, step, "COMPLETED").catch((error) => {
            onCompletedStepRecordError(step, error);
          });
        }
      }

      if (!shouldSyncState(previousState, nextState, updates, options)) {
        return;
      }

      try {
        const serverState = await repository.save(nextState);

        if (currentUpdateVersion !== stateUpdateVersion) {
          onIgnoreStaleResponse(currentUpdateVersion, stateUpdateVersion);
          return;
        }

        setState(serverState);

        if (didProductSelectionChange(previousState, serverState)) {
          onRemoteProductSelectionChanged();
        }

        onSyncSuccess();
      } catch (error) {
        onSyncError(error);

        if (throwOnSyncError) {
          setState(previousState);
          throw error;
        }
      }
    },
  };
};