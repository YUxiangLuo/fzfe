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

const valuesEqual = (left: unknown, right: unknown) => {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right) || (left && typeof left === "object") || (right && typeof right === "object")) {
    try {
      return JSON.stringify(left) === JSON.stringify(right);
    } catch {
      return false;
    }
  }
  return false;
};

const buildChangedPatch = (
  previousState: ExperimentState,
  nextState: ExperimentState,
  requestedUpdates: Partial<ExperimentState>,
): Partial<ExperimentState> => {
  const patch: Partial<ExperimentState> = {};
  for (const key of Object.keys(requestedUpdates) as Array<keyof ExperimentState>) {
    if (!valuesEqual(previousState[key], nextState[key])) {
      (patch as Record<string, unknown>)[key] = nextState[key];
    }
  }
  return patch;
};

const isVersionConflict = (error: unknown) =>
  error instanceof Error && (error as Error & { status?: number }).status === 409;

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
  let confirmedServerState: ExperimentState | null = null;
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
      const incomingStateVersion = updates.state_version;
      const targetsCurrentExperiment = updates.experiment_id === undefined
        || updates.experiment_id === previousState.experiment_id;
      if (
        options.skipSync
        && targetsCurrentExperiment
        && typeof incomingStateVersion === "number"
        && Number.isFinite(incomingStateVersion)
        && incomingStateVersion < previousState.state_version
      ) {
        onIgnoreStaleResponse(incomingStateVersion, previousState.state_version);
        return;
      }
      synchronizeCompletionTracking(previousState);

      const currentUpdateVersion = ++stateUpdateVersion;
      const nextState = buildNextState(previousState, updates);
      const changedPatch = buildChangedPatch(previousState, nextState, updates);
      if ((nextState.experiment_id ?? null) !== (previousState.experiment_id ?? null)) {
        resetCompletionTracking(nextState);
        confirmedServerState = nextState;
      }
      const confirmedCompletedStep =
        lastConfirmedCompletedStep ?? nextState.highest_completed_step;
      lastOptimisticCompletedStep = nextState.highest_completed_step;

      onLocalStateChange(previousState, nextState);
      setState(nextState);

      if (
        Object.keys(changedPatch).length === 0
        || !shouldSyncState(previousState, nextState, updates, options)
      ) {
        if (options.skipSync && nextState.state_version >= previousState.state_version) {
          confirmedServerState = nextState;
        }
        return;
      }

      const synchronize = async () => {
        try {
          if (!previousState.experiment_id) {
            throw new Error("Experiment ID is required to update experiment status.");
          }
          const syncBaseState = confirmedServerState?.experiment_id === previousState.experiment_id
            ? confirmedServerState
            : previousState;
          let serverState: ExperimentState;
          try {
            serverState = await repository.save(
              previousState.experiment_id,
              changedPatch,
              syncBaseState.state_version,
            );
          } catch (error) {
            if (!isVersionConflict(error)) throw error;
            const latestState = await repository.getActive();
            if (!latestState.experiment_id || latestState.experiment_id !== previousState.experiment_id) {
              throw error;
            }
            const rebasedState = buildNextState(latestState, changedPatch);
            const rebasedPatch = buildChangedPatch(latestState, rebasedState, changedPatch);
            serverState = await repository.save(
              latestState.experiment_id,
              rebasedPatch,
              latestState.state_version,
            );
          }
          confirmedServerState = serverState;

          if (currentUpdateVersion !== stateUpdateVersion) {
            onIgnoreStaleResponse(currentUpdateVersion, stateUpdateVersion);
            return;
          }

          setState(serverState);
          lastOptimisticCompletedStep = serverState.highest_completed_step;

          if (
            serverState.highest_completed_step > confirmedCompletedStep
            && serverState.experiment_id
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
      };

      const scheduledSync = syncQueue.then(synchronize, synchronize);
      syncQueue = scheduledSync.catch(() => {});
      await scheduledSync;
    },
  };
};
