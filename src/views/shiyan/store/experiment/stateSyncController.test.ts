/// <reference types="bun-types" />

import { describe, expect, it, mock } from "bun:test";
import { buildInitialState } from "./initialState";
import { createExperimentStateSyncController } from "./stateSyncController";
import type { ExperimentRepository } from "../../services/experimentRepository";
import type { ExperimentState } from "./types";

const createRepositoryStub = (): ExperimentRepository => ({
  create: mock(async () => buildInitialState()),
  getActive: mock(async () => buildInitialState()),
  save: mock(async (experimentId, updates, expectedVersion) => ({
    ...buildInitialState(),
    experiment_id: experimentId,
    ...updates,
    status: "In Progress" as const,
    start_time: "2026-01-01T00:00:00.000Z",
    state_version: expectedVersion + 1,
  })),
  recordStepEvent: mock(async () => {}),
});

describe("stateSyncController", () => {
  it("updates local state immediately and syncs when forced", async () => {
    let currentState: ExperimentState = { ...buildInitialState(), experiment_id: 42 };
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

  it("ignores an older authoritative skipSync patch for the current experiment", async () => {
    let currentState: ExperimentState = {
      ...buildInitialState(),
      experiment_id: 42,
      state_version: 11,
      ensemble_weighted_completed: true,
      selected_best_model: "ensemble_weighted",
      production_plan_completed: true,
    };
    const repository = createRepositoryStub();
    const onLocalStateChange = mock(() => {});
    const onIgnoreStaleResponse = mock(() => {});
    const controller = createExperimentStateSyncController({
      repository,
      getState: () => currentState,
      setState: (state) => {
        currentState = state;
      },
      onLocalStateChange,
      onSyncSuccess: mock(() => {}),
      onSyncError: mock(() => {}),
      onIgnoreStaleResponse,
      onRemoteProductSelectionChanged: mock(() => {}),
      onCompletedStepRecordError: mock(() => {}),
    });

    await controller.updateState({
      state_version: 3,
      ensemble_weighted_completed: false,
      selected_best_model: null,
      production_plan_completed: false,
    }, { skipSync: true });

    expect(currentState).toMatchObject({
      state_version: 11,
      ensemble_weighted_completed: true,
      selected_best_model: "ensemble_weighted",
      production_plan_completed: true,
    });
    expect(onLocalStateChange).not.toHaveBeenCalled();
    expect(repository.save).not.toHaveBeenCalled();
    expect(onIgnoreStaleResponse).toHaveBeenCalledWith(3, 11);
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
      (_experimentId: number, _updates: Partial<ExperimentState>, _expectedVersion: number) =>
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

    await Promise.resolve();
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
    const initialState: ExperimentState = { ...buildInitialState(), experiment_id: 42 };
    let currentState: ExperimentState = initialState;
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
    let currentState: ExperimentState = {
      ...buildInitialState(),
      experiment_id: 42,
      status: "In Progress" as const,
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

  it("rebases only the local delta onto the latest server state after a version conflict", async () => {
    let currentState: ExperimentState = {
      ...buildInitialState(),
      experiment_id: 42,
      state_version: 2,
      selected_company: "old-company",
    };
    const repository = createRepositoryStub();
    const conflict = Object.assign(new Error("version conflict"), { status: 409 });
    repository.save = mock()
      .mockRejectedValueOnce(conflict)
      .mockImplementationOnce(async (experimentId, updates, expectedVersion) => ({
        ...buildInitialState(),
        experiment_id: experimentId,
        selected_industry: "remote-industry",
        selected_company: "remote-company",
        ...updates,
        status: "In Progress",
        state_version: expectedVersion + 1,
      }));
    repository.getActive = mock(async () => ({
      ...buildInitialState(),
      experiment_id: 42,
      selected_industry: "remote-industry",
      selected_company: "remote-company",
      status: "In Progress" as const,
      state_version: 5,
    }));

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

    await controller.updateState(
      { selected_company: "local-company" },
      { forceSync: true, throwOnSyncError: true },
    );

    expect(repository.save).toHaveBeenNthCalledWith(1, 42, {
      selected_company: "local-company",
    }, 2);
    expect(repository.getActive).toHaveBeenCalledTimes(1);
    expect(repository.save).toHaveBeenNthCalledWith(2, 42, {
      selected_company: "local-company",
    }, 5);
    expect(currentState.selected_industry).toBe("remote-industry");
    expect(currentState.selected_company).toBe("local-company");
    expect(currentState.state_version).toBe(6);
  });

  it("does not send an empty forced patch when the requested value is unchanged", async () => {
    let currentState: ExperimentState = {
      ...buildInitialState(),
      experiment_id: 42,
      selected_company: "same-company",
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

    await controller.updateState(
      { selected_company: "same-company" },
      { forceSync: true, throwOnSyncError: true },
    );

    expect(repository.save).not.toHaveBeenCalled();
  });

  it("ignores stale save responses before emitting sync success", async () => {
    let currentState: ExperimentState = { ...buildInitialState(), experiment_id: 42 };
    let releaseFirstSave!: (state: ExperimentState) => void;
    const repository = createRepositoryStub();
    repository.save = mock(
      (experimentId: number, updates: Partial<ExperimentState>, expectedVersion: number) =>
        new Promise<ExperimentState>((resolve) => {
          if (!releaseFirstSave) {
            releaseFirstSave = resolve;
            return;
          }

          resolve({
            ...buildInitialState(),
            experiment_id: experimentId,
            ...updates,
            status: "In Progress",
            state_version: expectedVersion + 1,
          });
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

    await Promise.resolve();
    releaseFirstSave({
      ...buildInitialState(),
      experiment_id: 42,
      selected_industry: "first",
      status: "In Progress",
      state_version: 1,
    });
    await firstUpdate;
    await secondUpdate;

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
      (experimentId: number, updates: Partial<ExperimentState>, expectedVersion: number) =>
        new Promise<ExperimentState>((resolve) => {
          if (!releaseFirstSave) {
            releaseFirstSave = resolve;
            return;
          }

          resolve({
            ...buildInitialState(),
            experiment_id: experimentId,
            highest_completed_step: 1,
            ...updates,
            status: "In Progress",
            state_version: expectedVersion + 1,
          });
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

    await Promise.resolve();
    releaseFirstSave({
      ...currentState,
      experiment_id: 42,
      highest_completed_step: 1,
      state_version: 1,
    });
    await firstUpdate;
    await secondUpdate;

    expect(repository.recordStepEvent).toHaveBeenCalledTimes(1);
    expect(repository.recordStepEvent).toHaveBeenCalledWith(42, 1, "COMPLETED");

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
      experiment_id: 42,
      selected_industry: "electronics",
      selected_company: "acme",
      selected_product: "widget-a",
    };
    const repository = createRepositoryStub();
    repository.save = mock(async (experimentId, updates, expectedVersion) => ({
      ...buildInitialState(),
      experiment_id: experimentId,
      ...updates,
      selected_product: "widget-b",
      state_version: expectedVersion + 1,
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
