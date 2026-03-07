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
});