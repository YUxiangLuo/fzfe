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