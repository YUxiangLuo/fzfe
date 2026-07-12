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

  if (nextState.experiment_id === previousState.experiment_id) {
    nextState.state_version = Math.max(
      previousState.state_version,
      nextState.state_version,
    );
  }

  if (nextState.status === "Not Started" && Object.keys(updates).length > 0) {
    nextState.status = "In Progress";
    nextState.start_time = nextState.start_time ?? new Date().toISOString();
  }

  nextState.last_activity_at = new Date().toISOString();

  return nextState;
};

const arePersistedValuesEqual = (left: unknown, right: unknown) => {
  if (Object.is(left, right)) return true;
  if (left === null || right === null || typeof left !== "object" || typeof right !== "object") {
    return false;
  }
  return JSON.stringify(left) === JSON.stringify(right);
};

const NON_CLIENT_UPDATE_FIELDS = new Set<keyof ExperimentState>([
  "experiment_id",
  "student_id",
  "state_version",
  "status",
  "start_time",
  "last_activity_at",
  "completion_time",
  "quiz_about_model_completed",
  "quiz_about_plan_completed",
]);

const buildChangedUpdates = (
  previousState: ExperimentState,
  nextState: ExperimentState,
  requestedUpdates: Partial<ExperimentState>,
): Partial<ExperimentState> => Object.fromEntries(
  Object.keys(requestedUpdates)
    .filter((key) => {
      const field = key as keyof ExperimentState;
      return !NON_CLIENT_UPDATE_FIELDS.has(field)
        && !arePersistedValuesEqual(previousState[field], nextState[field]);
    })
    .map((key) => {
      const field = key as keyof ExperimentState;
      return [field, nextState[field]];
    }),
) as Partial<ExperimentState>;

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

const getConflictState = (error: unknown): ExperimentState | null => {
  if (
    error instanceof Error
    && error.name === "ExperimentStateConflictError"
    && "currentState" in error
  ) {
    return (error as Error & { currentState: ExperimentState }).currentState;
  }
  return null;
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
  let syncQueue: Promise<void> = Promise.resolve();

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
      const changedUpdates = buildChangedUpdates(previousState, nextState, updates);
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

      if (Object.keys(changedUpdates).length === 0) {
        return;
      }

      const synchronize = async () => {
        try {
          const requestState = {
            ...nextState,
            state_version: getState().state_version,
          };
          const serverState = await repository.save(requestState, changedUpdates);

          if (currentUpdateVersion !== stateUpdateVersion) {
            onIgnoreStaleResponse(currentUpdateVersion, stateUpdateVersion);
            const latestState = getState();
            setState({
              ...latestState,
              state_version: Math.max(
                latestState.state_version,
                serverState.state_version,
              ),
            });
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
          const conflictState = getConflictState(error);
          if (conflictState) {
            if (currentUpdateVersion !== stateUpdateVersion) {
              const latestState = getState();
              setState({
                ...latestState,
                state_version: Math.max(
                  latestState.state_version,
                  conflictState.state_version,
                ),
              });
            } else {
              setState(conflictState);
              resetCompletionTracking(conflictState);
              if (didProductSelectionChange(previousState, conflictState)) {
                onRemoteProductSelectionChanged();
              }
            }
          }
          onSyncError(error);

          if (throwOnSyncError) {
            if (!conflictState) {
              setState(previousState);
              lastOptimisticCompletedStep = previousState.highest_completed_step;
            }
            throw error;
          }
        }
      };

      const queuedSync = syncQueue.then(synchronize, synchronize);
      syncQueue = queuedSync.catch(() => {});
      await queuedSync;
    },
  };
};
