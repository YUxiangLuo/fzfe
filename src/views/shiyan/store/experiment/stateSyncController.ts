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
  const experimentInitialized =
    !!previousState.experiment_id &&
    previousState.status === "Not Started" &&
    nextState.status === "In Progress" &&
    Object.keys(updates).length > 0;

  return !skipSync && (forceSync || stepCompleted || experimentCompleted || experimentInitialized);
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
  let trackedExperimentId: number | null = null;
  let lastConfirmedCompletedStep: number | null = null;
  let lastOptimisticCompletedStep: number | null = null;

  const resetCompletionTracking = (state: ExperimentState) => {
    trackedExperimentId = state.experiment_id ?? null;
    lastConfirmedCompletedStep = state.highest_completed_step;
    lastOptimisticCompletedStep = state.highest_completed_step;
  };

  const synchronizeCompletionTracking = (state: ExperimentState) => {
    if (
      trackedExperimentId !== (state.experiment_id ?? null) ||
      lastConfirmedCompletedStep === null ||
      lastOptimisticCompletedStep === null
    ) {
      resetCompletionTracking(state);
      return;
    }

    // External state hydration can replace the optimistic store state.
    // Treat those completed steps as already authoritative, so we do not
    // replay historical COMPLETED events on the next save.
    if (state.highest_completed_step > lastOptimisticCompletedStep) {
      lastConfirmedCompletedStep = state.highest_completed_step;
      lastOptimisticCompletedStep = state.highest_completed_step;
    }
  };

  return {
    updateState: async (updates, options = {}) => {
      const { throwOnSyncError = false } = options;
      const previousState = getState();
      synchronizeCompletionTracking(previousState);

      const currentUpdateVersion = ++stateUpdateVersion;
      const nextState = buildNextState(previousState, updates);
      if ((nextState.experiment_id ?? null) !== (previousState.experiment_id ?? null)) {
        resetCompletionTracking(nextState);
      }
      const confirmedCompletedStep =
        lastConfirmedCompletedStep ?? nextState.highest_completed_step;
      lastOptimisticCompletedStep = nextState.highest_completed_step;

      onLocalStateChange(previousState, nextState);
      setState(nextState);

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
        lastOptimisticCompletedStep = serverState.highest_completed_step;

        if (
          serverState.highest_completed_step > confirmedCompletedStep &&
          serverState.experiment_id
        ) {
          for (
            let step = confirmedCompletedStep + 1;
            step <= serverState.highest_completed_step;
            step++
          ) {
            repository.recordStepEvent(serverState.experiment_id, step, "COMPLETED").catch((error) => {
              onCompletedStepRecordError(step, error);
            });
          }
        }
        lastConfirmedCompletedStep = Math.max(
          confirmedCompletedStep,
          serverState.highest_completed_step,
        );

        if (didProductSelectionChange(previousState, serverState)) {
          onRemoteProductSelectionChanged();
        }

        onSyncSuccess();
      } catch (error) {
        onSyncError(error);

        if (throwOnSyncError) {
          setState(previousState);
          lastOptimisticCompletedStep = previousState.highest_completed_step;
          throw error;
        }
      }
    },
  };
};
