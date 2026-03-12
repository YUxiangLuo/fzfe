/// <reference types="bun-types" />

import { describe, expect, it, mock } from "bun:test";
import { buildInitialState } from "../store/experiment/initialState";
import { createExperimentRepository } from "./experimentRepository";
import type { ExperimentState } from "../store/experiment/types";

describe("experimentRepository", () => {
  it("returns the server-normalized model selections when saving", async () => {
    const localState: ExperimentState = {
      ...buildInitialState(),
      experiment_id: 12,
      selected_base_models: ["ma", "lstm"],
      selected_ensemble_models: ["ensemble_weighted"],
      selected_industry: "electronics",
    };
    const updateExperimentState = mock(async () => ({
      ...buildInitialState(),
      experiment_id: 12,
      selected_base_models: ["moving_average", "lstm"],
      selected_ensemble_models: ["weighted_ensemble"],
      selected_industry: "electronics",
      status: "In Progress" as const,
    }));

    const repository = createExperimentRepository({
      createExperimentState: mock(async () => buildInitialState()),
      getExperimentState: mock(async () => buildInitialState()),
      updateExperimentState,
      recordStepEvent: mock(async () => ({ message: "ok", event_id: 1 })),
    });

    const savedState = await repository.save(localState);

    expect(updateExperimentState).toHaveBeenCalledWith(localState);
    expect(savedState.selected_base_models).toEqual(["moving_average", "lstm"]);
    expect(savedState.selected_ensemble_models).toEqual(["weighted_ensemble"]);
    expect(savedState.status).toBe("In Progress");
  });

  it("delegates create, getActive, and step event recording to dependencies", async () => {
    const createdState = { ...buildInitialState(), experiment_id: 3 };
    const activeState = { ...buildInitialState(), experiment_id: 4 };
    const createExperimentState = mock(async () => createdState);
    const getExperimentState = mock(async () => activeState);
    const recordStepEvent = mock(async () => ({ message: "ok", event_id: 9 }));

    const repository = createExperimentRepository({
      createExperimentState,
      getExperimentState,
      updateExperimentState: mock(async (state) => state),
      recordStepEvent,
    });

    await expect(repository.create()).resolves.toEqual(createdState);
    await expect(repository.getActive()).resolves.toEqual(activeState);
    await expect(repository.recordStepEvent(7, 2, "STARTED")).resolves.toBeUndefined();

    expect(createExperimentState).toHaveBeenCalledTimes(1);
    expect(getExperimentState).toHaveBeenCalledTimes(1);
    expect(recordStepEvent).toHaveBeenCalledWith(7, 2, "STARTED");
  });
});