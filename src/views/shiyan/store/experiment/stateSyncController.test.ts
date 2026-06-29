/// <reference types="bun-types" />

import { describe, expect, it, mock } from "bun:test";
import { buildInitialState } from "./initialState";
import { createExperimentStateSyncController } from "./stateSyncController";
import type { ExperimentRepository } from "../../services/experimentRepository";
import type { ExperimentState } from "./types";

const createRepositoryStub = (): ExperimentRepository => ({
  create: mock(async () => buildInitialState()),
  getActive: mock(async () => buildInitialState()),
  save: mock(async (state: ExperimentState) => state),
  recordStepEvent: mock(async () => {}),
});

describe("stateSyncController", () => {
  it("updates local state immediately and syncs when forced", async () => {
    let currentState = buildInitialState();
    const repository = createRepositoryStub();
    const onLocalStateChange = mock(() => {});
    const onSyncSuccess = mock(() => {});

    const controller = createExperimentStateSyncController({
      repository,
      getState: () => currentState,
      setState: (state) => {
        currentState = state;
      },
      onLocalStateChange,
      onSyncSuccess,
      onSyncError: mock(() => {}),
      onIgnoreStaleResponse: mock(() => {}),
      onRemoteProductSelectionChanged: mock(() => {}),
      onCompletedStepRecordError: mock(() => {}),
    });

    await controller.updateState({ selected_industry: "electronics" }, { forceSync: true });

    expect(currentState.selected_industry).toBe("electronics");
    expect(currentState.status).toBe("In Progress");
    expect(currentState.start_time).not.toBeNull();
    expect(onLocalStateChange).toHaveBeenCalledTimes(1);
    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(onSyncSuccess).toHaveBeenCalledTimes(1);
  });

  it("records completed step events for each newly completed step", async () => {
    let currentState: ExperimentState = {
      ...buildInitialState(),
      experiment_id: 42,
      highest_completed_step: 2,
    };
    const repository = createRepositoryStub();

    const controller = createExperimentStateSyncController({
      repository,
      getState: () => currentState,
      setState: (state) => {
        currentState = state;
      },
      onLocalStateChange: mock(() => {}),
      onSyncSuccess: mock(() => {}),
      onSyncError: mock(() => {}),
      onIgnoreStaleResponse: mock(() => {}),
      onRemoteProductSelectionChanged: mock(() => {}),
      onCompletedStepRecordError: mock(() => {}),
    });

    await controller.updateState({ highest_completed_step: 4 }, { forceSync: true });

    expect(repository.recordStepEvent).toHaveBeenCalledTimes(2);
    expect(repository.recordStepEvent).toHaveBeenNthCalledWith(1, 42, 3, "COMPLETED");
    expect(repository.recordStepEvent).toHaveBeenNthCalledWith(2, 42, 4, "COMPLETED");
  });

  it("records completed step events only after the save succeeds", async () => {
    let currentState: ExperimentState = {
      ...buildInitialState(),
      experiment_id: 42,
      highest_completed_step: 0,
    };
    let releaseSave!: (state: ExperimentState) => void;
    const repository = createRepositoryStub();
    repository.save = mock(
      (state: ExperimentState) =>
        new Promise<ExperimentState>((resolve) => {
          releaseSave = resolve;
        }),
    );

    const controller = createExperimentStateSyncController({
      repository,
      getState: () => currentState,
      setState: (state) => {
        currentState = state;
      },
      onLocalStateChange: mock(() => {}),
      onSyncSuccess: mock(() => {}),
      onSyncError: mock(() => {}),
      onIgnoreStaleResponse: mock(() => {}),
      onRemoteProductSelectionChanged: mock(() => {}),
      onCompletedStepRecordError: mock(() => {}),
    });

    const pendingUpdate = controller.updateState({ highest_completed_step: 1 }, { forceSync: true });

    expect(repository.recordStepEvent).not.toHaveBeenCalled();

    releaseSave({
      ...currentState,
      highest_completed_step: 1,
    });
    await pendingUpdate;

    expect(repository.recordStepEvent).toHaveBeenCalledTimes(1);
    expect(repository.recordStepEvent).toHaveBeenCalledWith(42, 1, "COMPLETED");
  });

  it("does not read the store state during controller construction", async () => {
    let currentState: ExperimentState | null = null;
    const repository = createRepositoryStub();

    const controller = createExperimentStateSyncController({
      repository,
      getState: () => {
        if (currentState === null) {
          throw new Error("state unavailable");
        }
        return currentState;
      },
      setState: (state) => {
        currentState = state;
      },
      onLocalStateChange: mock(() => {}),
      onSyncSuccess: mock(() => {}),
      onSyncError: mock(() => {}),
      onIgnoreStaleResponse: mock(() => {}),
      onRemoteProductSelectionChanged: mock(() => {}),
      onCompletedStepRecordError: mock(() => {}),
    });

    currentState = {
      ...buildInitialState(),
      experiment_id: 42,
      highest_completed_step: 3,
    };

    await controller.updateState({ selected_industry: "electronics" }, { forceSync: true });

    expect(repository.recordStepEvent).not.toHaveBeenCalled();
    expect(currentState.selected_industry).toBe("electronics");
  });

  it("reverts local state when sync fails and throwOnSyncError is enabled", async () => {
    const initialState = buildInitialState();
    let currentState = initialState;
    const repository = createRepositoryStub();
    repository.save = mock(async () => {
      throw new Error("sync failed");
    });
    const onSyncError = mock(() => {});

    const controller = createExperimentStateSyncController({
      repository,
      getState: () => currentState,
      setState: (state) => {
        currentState = state;
      },
      onLocalStateChange: mock(() => {}),
      onSyncSuccess: mock(() => {}),
      onSyncError,
      onIgnoreStaleResponse: mock(() => {}),
      onRemoteProductSelectionChanged: mock(() => {}),
      onCompletedStepRecordError: mock(() => {}),
    });

    await expect(
      controller.updateState({ selected_company: "acme" }, { forceSync: true, throwOnSyncError: true }),
    ).rejects.toThrow("sync failed");

    expect(onSyncError).toHaveBeenCalledTimes(1);
    expect(currentState).toEqual(initialState);
  });

  it("does not record completed step events when sync fails", async () => {
    let currentState: ExperimentState = {
      ...buildInitialState(),
      experiment_id: 42,
      highest_completed_step: 0,
    };
    const repository = createRepositoryStub();
    repository.save = mock(async () => {
      throw new Error("sync failed");
    });

    const controller = createExperimentStateSyncController({
      repository,
      getState: () => currentState,
      setState: (state) => {
        currentState = state;
      },
      onLocalStateChange: mock(() => {}),
      onSyncSuccess: mock(() => {}),
      onSyncError: mock(() => {}),
      onIgnoreStaleResponse: mock(() => {}),
      onRemoteProductSelectionChanged: mock(() => {}),
      onCompletedStepRecordError: mock(() => {}),
    });

    await expect(
      controller.updateState({ highest_completed_step: 1 }, { forceSync: true, throwOnSyncError: true }),
    ).rejects.toThrow("sync failed");

    expect(repository.recordStepEvent).not.toHaveBeenCalled();
  });

  it("skips repository save when sync conditions are not met", async () => {
    let currentState = buildInitialState();
    const repository = createRepositoryStub();

    const controller = createExperimentStateSyncController({
      repository,
      getState: () => currentState,
      setState: (state) => {
        currentState = state;
      },
      onLocalStateChange: mock(() => {}),
      onSyncSuccess: mock(() => {}),
      onSyncError: mock(() => {}),
      onIgnoreStaleResponse: mock(() => {}),
      onRemoteProductSelectionChanged: mock(() => {}),
      onCompletedStepRecordError: mock(() => {}),
    });

    await controller.updateState({ selected_company: "acme" });

    expect(repository.save).not.toHaveBeenCalled();
    expect(currentState.selected_company).toBe("acme");
  });

  it("syncs when an existing experiment is initialized with its first persisted changes", async () => {
    let currentState: ExperimentState = {
      ...buildInitialState(),
      experiment_id: 123,
      status: "Not Started",
    };
    const repository = createRepositoryStub();

    const controller = createExperimentStateSyncController({
      repository,
      getState: () => currentState,
      setState: (state) => {
        currentState = state;
      },
      onLocalStateChange: mock(() => {}),
      onSyncSuccess: mock(() => {}),
      onSyncError: mock(() => {}),
      onIgnoreStaleResponse: mock(() => {}),
      onRemoteProductSelectionChanged: mock(() => {}),
      onCompletedStepRecordError: mock(() => {}),
    });

    await controller.updateState({ selected_industry: "electronics", current_step: 2 }, { throwOnSyncError: true });

    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(currentState.selected_industry).toBe("electronics");
    expect(currentState.current_step).toBe(2);
  });

  it("ignores stale save responses before emitting sync success", async () => {
    let currentState = buildInitialState();
    let releaseFirstSave!: (state: ExperimentState) => void;
    const repository = createRepositoryStub();
    repository.save = mock(
      (state: ExperimentState) =>
        new Promise<ExperimentState>((resolve) => {
          if (!releaseFirstSave) {
            releaseFirstSave = resolve;
            return;
          }

          resolve(state);
        }),
    );
    const onSyncSuccess = mock(() => {});
    const onIgnoreStaleResponse = mock(() => {});

    const controller = createExperimentStateSyncController({
      repository,
      getState: () => currentState,
      setState: (state) => {
        currentState = state;
      },
      onLocalStateChange: mock(() => {}),
      onSyncSuccess,
      onSyncError: mock(() => {}),
      onIgnoreStaleResponse,
      onRemoteProductSelectionChanged: mock(() => {}),
      onCompletedStepRecordError: mock(() => {}),
    });

    const firstUpdate = controller.updateState({ selected_industry: "first" }, { forceSync: true });
    const secondUpdate = controller.updateState({ selected_industry: "second" }, { forceSync: true });

    await secondUpdate;
    releaseFirstSave({
      ...buildInitialState(),
      selected_industry: "first",
      status: "In Progress",
    });
    await firstUpdate;

    expect(onIgnoreStaleResponse).toHaveBeenCalledTimes(1);
    expect(onSyncSuccess).toHaveBeenCalledTimes(1);
    expect(currentState.selected_industry).toBe("second");
  });

  it("records newly completed steps from the latest successful save even when an earlier response becomes stale", async () => {
    let currentState: ExperimentState = {
      ...buildInitialState(),
      experiment_id: 42,
      highest_completed_step: 0,
    };
    let releaseFirstSave!: (state: ExperimentState) => void;
    const repository = createRepositoryStub();
    repository.save = mock(
      (state: ExperimentState) =>
        new Promise<ExperimentState>((resolve) => {
          if (!releaseFirstSave) {
            releaseFirstSave = resolve;
            return;
          }

          resolve(state);
        }),
    );

    const controller = createExperimentStateSyncController({
      repository,
      getState: () => currentState,
      setState: (state) => {
        currentState = state;
      },
      onLocalStateChange: mock(() => {}),
      onSyncSuccess: mock(() => {}),
      onSyncError: mock(() => {}),
      onIgnoreStaleResponse: mock(() => {}),
      onRemoteProductSelectionChanged: mock(() => {}),
      onCompletedStepRecordError: mock(() => {}),
    });

    const firstUpdate = controller.updateState({ highest_completed_step: 1 }, { forceSync: true });
    const secondUpdate = controller.updateState({ selected_industry: "electronics" }, { forceSync: true });

    await secondUpdate;

    expect(repository.recordStepEvent).toHaveBeenCalledTimes(1);
    expect(repository.recordStepEvent).toHaveBeenCalledWith(42, 1, "COMPLETED");

    releaseFirstSave({
      ...currentState,
      highest_completed_step: 1,
    });
    await firstUpdate;

    expect(repository.recordStepEvent).toHaveBeenCalledTimes(1);
  });

  it("resets completed-step tracking when switching to a new experiment run", async () => {
    let currentState: ExperimentState = {
      ...buildInitialState(),
      experiment_id: 42,
      highest_completed_step: 6,
      current_step: 7,
    };
    const repository = createRepositoryStub();

    const controller = createExperimentStateSyncController({
      repository,
      getState: () => currentState,
      setState: (state) => {
        currentState = state;
      },
      onLocalStateChange: mock(() => {}),
      onSyncSuccess: mock(() => {}),
      onSyncError: mock(() => {}),
      onIgnoreStaleResponse: mock(() => {}),
      onRemoteProductSelectionChanged: mock(() => {}),
      onCompletedStepRecordError: mock(() => {}),
    });

    await controller.updateState({
      ...buildInitialState(),
      experiment_id: 43,
      current_step: 1,
      highest_completed_step: 0,
    }, { skipSync: true });
    await controller.updateState({ highest_completed_step: 1 }, { forceSync: true });

    expect(repository.recordStepEvent).toHaveBeenCalledTimes(1);
    expect(repository.recordStepEvent).toHaveBeenCalledWith(43, 1, "COMPLETED");
  });

  it("notifies when remote sync changes product selection", async () => {
    let currentState: ExperimentState = {
      ...buildInitialState(),
      selected_industry: "electronics",
      selected_company: "acme",
      selected_product: "widget-a",
    };
    const repository = createRepositoryStub();
    repository.save = mock(async (state: ExperimentState) => ({
      ...state,
      selected_product: "widget-b",
    }));
    const onRemoteProductSelectionChanged = mock(() => {});

    const controller = createExperimentStateSyncController({
      repository,
      getState: () => currentState,
      setState: (state) => {
        currentState = state;
      },
      onLocalStateChange: mock(() => {}),
      onSyncSuccess: mock(() => {}),
      onSyncError: mock(() => {}),
      onIgnoreStaleResponse: mock(() => {}),
      onRemoteProductSelectionChanged,
      onCompletedStepRecordError: mock(() => {}),
    });

    await controller.updateState({ selected_company: "acme-2" }, { forceSync: true });

    expect(onRemoteProductSelectionChanged).toHaveBeenCalledTimes(1);
    expect(currentState.selected_product).toBe("widget-b");
  });

  it("surfaces completed-step event recording failures through the callback", async () => {
    let currentState: ExperimentState = {
      ...buildInitialState(),
      experiment_id: 42,
      highest_completed_step: 0,
    };
    const repository = createRepositoryStub();
    repository.recordStepEvent = mock(async (_experimentId, step) => {
      if (step === 1) {
        throw new Error("event failed");
      }
    });
    const onCompletedStepRecordError = mock(() => {});

    const controller = createExperimentStateSyncController({
      repository,
      getState: () => currentState,
      setState: (state) => {
        currentState = state;
      },
      onLocalStateChange: mock(() => {}),
      onSyncSuccess: mock(() => {}),
      onSyncError: mock(() => {}),
      onIgnoreStaleResponse: mock(() => {}),
      onRemoteProductSelectionChanged: mock(() => {}),
      onCompletedStepRecordError,
    });

    await controller.updateState({ highest_completed_step: 1 }, { forceSync: true });
    await Promise.resolve();

    expect(onCompletedStepRecordError).toHaveBeenCalledTimes(1);
    expect(onCompletedStepRecordError).toHaveBeenCalledWith(1, expect.any(Error));
  });
});
