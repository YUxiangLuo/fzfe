/// <reference types="bun-types" />

import { resolve } from "path";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { SelectedBestModel } from "../store/experiment/types";

mock.restore();

const apiClientModulePath = resolve(import.meta.dir, "../../../utils/apiClient.ts");

const apiPost = mock(async () => ({
  status: "success",
  results: {
    predictions: [{ prediction: 101.2, std_dev: 3.4 }],
  },
}));

mock.module(apiClientModulePath, () => ({
  apiClient: {
    post: apiPost,
  },
}));

let importVersion = 0;

const loadModelLifecycle = async () => {
  importVersion += 1;
  return await import(`./modelLifecycle.ts?model-lifecycle-test=${importVersion}`);
};

describe("modelLifecycle", () => {
  beforeEach(() => {
    apiPost.mockReset();
    apiPost.mockResolvedValue({
      status: "success",
      results: {
        predictions: [{ prediction: 101.2, std_dev: 3.4 }],
      },
    });
  });

  it("prepares base models before predicting", async () => {
    const { predictWithBestModel } = await loadModelLifecycle();

    const result = await predictWithBestModel("ma", 7, 6);

    expect(apiPost).toHaveBeenCalledTimes(2);
    expect(apiPost).toHaveBeenNthCalledWith(1, "/models/ma/prepare-production", {
      experiment_id: 7,
    });
    expect(apiPost).toHaveBeenNthCalledWith(2, "/models/ma/predict", {
      experiment_id: 7,
      forecast_steps: 6,
    });
    expect(result).toEqual({
      status: "success",
      results: {
        predictions: [{ prediction: 101.2, std_dev: 3.4 }],
      },
    });
  });

  it("prepares ensemble best models before predicting", async () => {
    const { predictWithBestModel } = await loadModelLifecycle();

    await predictWithBestModel("ensemble_weighted", 9, 4);

    expect(apiPost).toHaveBeenCalledTimes(2);
    expect(apiPost).toHaveBeenNthCalledWith(1, "/models/weighted_avg/prepare-production", {
      experiment_id: 9,
    });
    expect(apiPost).toHaveBeenNthCalledWith(2, "/models/weighted_avg/predict", {
      experiment_id: 9,
      forecast_steps: 4,
    });
  });

  it("rejects unmapped best model identifiers", async () => {
    const { predictWithBestModel } = await loadModelLifecycle();

    await expect(
      predictWithBestModel("not-real" as SelectedBestModel, 9, 4),
    ).rejects.toThrow("无效的模型类型: not-real");
    expect(apiPost).not.toHaveBeenCalled();
  });
});
