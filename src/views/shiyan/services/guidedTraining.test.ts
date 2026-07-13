/// <reference types="bun-types" />

import { resolve } from "path";
import { beforeEach, describe, expect, it, mock } from "bun:test";

mock.restore();

const apiClientModulePath = resolve(import.meta.dir, "../../../utils/apiClient.ts");
const apiPost = mock(async () => ({ session_id: "guided-1" }));
const apiGet = mock(async () => ({ session_id: "guided-1" }));
const apiDelete = mock(async () => undefined);

mock.module(apiClientModulePath, () => ({
  MODEL_API_TIMEOUTS: {
    METADATA: 30_000,
    EXECUTION: 690_000,
    PREDICTION: 690_000,
  },
  apiClient: {
    post: apiPost,
    get: apiGet,
    delete: apiDelete,
  },
}));

const {
  createGuidedTrainingSession,
  fetchGuidedTrainingSession,
  runGuidedTrainingStep,
} = await import("./guidedTraining");

describe("guidedTraining service timeouts", () => {
  beforeEach(() => {
    apiPost.mockClear();
    apiGet.mockClear();
    apiDelete.mockClear();
  });

  it("treats session creation as artifact-capable execution", async () => {
    await createGuidedTrainingSession("weighted_avg", { experiment_id: 7, models: "ma,es" });

    expect(apiPost).toHaveBeenCalledWith(
      "/models/weighted_avg/guided-training/sessions",
      { experiment_id: 7, models: "ma,es" },
      { timeoutMs: 690_000 },
    );
  });

  it("keeps step execution long and session reads metadata-only", async () => {
    await runGuidedTrainingStep("ma", "guided-1", "fit");
    await fetchGuidedTrainingSession("ma", "guided-1");

    expect(apiPost).toHaveBeenCalledWith(
      "/models/ma/guided-training/sessions/guided-1/steps/fit/run",
      {},
      { timeoutMs: 690_000 },
    );
    expect(apiGet).toHaveBeenCalledWith(
      "/models/ma/guided-training/sessions/guided-1",
      { timeoutMs: 30_000 },
    );
  });
});
