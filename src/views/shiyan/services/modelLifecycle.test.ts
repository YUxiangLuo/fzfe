/// <reference types="bun-types" />

import { resolve } from "path";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { SelectedBestModel } from "../store/experiment/types";

mock.restore();

const apiClientModulePath = resolve(import.meta.dir, "../../../utils/apiClient.ts");

const apiPost = mock(async (): Promise<any> => ({
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

const createApiError = (status: number, message: string) => {
  const error = new Error(`HTTP ${status} - ${message}`) as Error & {
    status?: number;
    payload?: unknown;
  };
  error.status = status;
  error.payload = { error: message };
  return error;
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

  it("preserves prediction method metadata from the backend", async () => {
    const { predictWithBestModel } = await loadModelLifecycle();
    apiPost
      .mockResolvedValueOnce({ status: "success", results: { saved_model: "model.pkl" } })
      .mockResolvedValueOnce({
        status: "success",
        results: {
          predictions: [{ prediction: 101.2, std_dev: 3.4 }],
          method_name: "递推移动平均",
          forecast_strategy: "recursive_roll_forward",
          implementation_notes: ["训练后使用拟合模型递推预测未来销量。"],
        },
      });

    const result = await predictWithBestModel("ma", 7, 6);

    expect(result.results).toMatchObject({
      predictions: [{ prediction: 101.2, std_dev: 3.4 }],
      method_name: "递推移动平均",
      forecast_strategy: "recursive_roll_forward",
      implementation_notes: ["训练后使用拟合模型递推预测未来销量。"],
    });
  });

  it("rejects unmapped best model identifiers", async () => {
    const { predictWithBestModel } = await loadModelLifecycle();

    await expect(
      predictWithBestModel("not-real" as SelectedBestModel, 9, 4),
    ).rejects.toThrow("无效的模型类型: not-real");
    expect(apiPost).not.toHaveBeenCalled();
  });

  it("surfaces prepare-production busy errors without automatic retries", async () => {
    const { predictWithBestModel } = await loadModelLifecycle();

    apiPost.mockRejectedValueOnce(createApiError(429, "模型服务繁忙，请稍后再试"));

    await expect(
      predictWithBestModel("ma", 11, 3),
    ).rejects.toMatchObject({
      name: "ProductionPredictionError",
      message: "模型服务当前繁忙，请稍后再次点击“重试”。",
      status: 429,
      stage: "prepare",
      kind: "busy",
    });
    expect(apiPost).toHaveBeenCalledTimes(1);
    expect(apiPost).toHaveBeenNthCalledWith(1, "/models/ma/prepare-production", {
      experiment_id: 11,
    });
  });

  it("surfaces predict conflict errors without automatic retries", async () => {
    const { predictWithBestModel } = await loadModelLifecycle();

    apiPost
      .mockResolvedValueOnce({ ok: true } as any)
      .mockRejectedValueOnce(createApiError(409, "同一模型正在训练或预测，请稍后再试"));

    await expect(
      predictWithBestModel("exp", 13, 5),
    ).rejects.toMatchObject({
      name: "ProductionPredictionError",
      message: "当前模型已有训练或预测任务在执行，请稍后再次点击“重试”。",
      status: 409,
      stage: "predict",
      kind: "conflict",
    });
    expect(apiPost).toHaveBeenCalledTimes(2);
    expect(apiPost).toHaveBeenNthCalledWith(1, "/models/es/prepare-production", {
      experiment_id: 13,
    });
    expect(apiPost).toHaveBeenNthCalledWith(2, "/models/es/predict", {
      experiment_id: 13,
      forecast_steps: 5,
    });
  });

  it("maps prepare-production 400 errors to actionable messages", async () => {
    const { predictWithBestModel, ProductionPredictionError } = await loadModelLifecycle();

    apiPost.mockRejectedValueOnce(createApiError(400, "模型尚未满足生产准备条件"));

    await expect(
      predictWithBestModel("lstm", 15, 6),
    ).rejects.toMatchObject({
      name: "ProductionPredictionError",
      message: expect.stringContaining("当前最佳模型尚未满足生产预测条件"),
      status: 400,
      stage: "prepare",
      kind: "invalid",
    });
    expect(apiPost).toHaveBeenCalledTimes(1);
    expect(ProductionPredictionError).toBeDefined();
  });

  it("maps predict 504 errors without transient retries", async () => {
    const { predictWithBestModel } = await loadModelLifecycle();

    apiPost
      .mockResolvedValueOnce({ ok: true } as any)
      .mockRejectedValueOnce(createApiError(504, "预测超时"));

    await expect(
      predictWithBestModel("arima", 21, 6),
    ).rejects.toMatchObject({
      name: "ProductionPredictionError",
      message: expect.stringContaining("生成需求预测超时"),
      status: 504,
      stage: "predict",
      kind: "timeout",
    });
    expect(apiPost).toHaveBeenCalledTimes(2);
  });
});
