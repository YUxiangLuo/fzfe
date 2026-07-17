/// <reference types="bun-types" />

import { resolve } from "path";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import type { SelectedBestModel } from "../store/experiment/types";

mock.restore();

const apiClientModulePath = resolve(import.meta.dir, "../../../utils/apiClient.ts");

const predictionResponse = {
  status: "success",
  results: {
    predictions: Array.from({ length: 12 }, (_, index) => ({
      prediction: 101.2 + index,
      std_dev: 3.4,
      upper_error_p99: 8.2,
      upper_error_p99_kind: "uncalibrated_estimate",
      coverage_guarantee: false,
      calibration_origins: 1,
      uncertainty_source: "model" as const,
      calibration_mean_error: 1.2,
      calibration_count: 6,
    })),
  },
};

const preparationResponse = {
  status: "success",
  results: {
    session_id: "22222222-2222-4222-8222-222222222222",
    session_status: "completed" as const,
    completed_step_ids: ["initialize", "fit_model", "finalize"],
    total_steps: 3,
    next_step: null,
    error_message: null,
    preparation_token: "11111111-1111-4111-8111-111111111111",
    prepared_forecast_steps: 12,
    reused_existing: false,
  },
};

const apiPost = mock(async (endpoint: string): Promise<any> =>
  endpoint.includes("/production-preparation/")
    ? preparationResponse
    : predictionResponse
);

mock.module(apiClientModulePath, () => ({
  MODEL_API_TIMEOUTS: {
    METADATA: 30_000,
    EXECUTION: 690_000,
    PREDICTION: 690_000,
  },
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
    apiPost.mockImplementation(async (endpoint: string) =>
      endpoint.includes("/production-preparation/")
        ? preparationResponse
        : predictionResponse
    );
  });

  it("prepares the production artifact before predicting", async () => {
    const { predictWithBestModel } = await loadModelLifecycle();

    const result = await predictWithBestModel("ma", 7, 6);

    expect(apiPost).toHaveBeenCalledTimes(2);
    expect(apiPost).toHaveBeenNthCalledWith(1, "/models/ma/production-preparation/sessions", {
      experiment_id: 7,
      forecast_steps: 6,
    }, {
      timeoutMs: 690_000,
    });
    expect(apiPost).toHaveBeenNthCalledWith(2, "/models/ma/predict", {
      experiment_id: 7,
      forecast_steps: 6,
      preparation_token: preparationResponse.results.preparation_token,
    }, {
      timeoutMs: 690_000,
    });
    expect(result).toEqual(predictionResponse);
  });

  it("uses the explicit prepare/predict protocol for ensemble best models", async () => {
    const { predictWithBestModel } = await loadModelLifecycle();

    await predictWithBestModel("ensemble_weighted", 9, 4);

    expect(apiPost).toHaveBeenCalledTimes(2);
    expect(apiPost).toHaveBeenNthCalledWith(1, "/models/weighted_avg/production-preparation/sessions", {
      experiment_id: 9,
      forecast_steps: 4,
    }, {
      timeoutMs: 690_000,
    });
    expect(apiPost).toHaveBeenNthCalledWith(2, "/models/weighted_avg/predict", {
      experiment_id: 9,
      forecast_steps: 4,
      preparation_token: preparationResponse.results.preparation_token,
    }, {
      timeoutMs: 690_000,
    });
  });

  it("runs resumable preparation steps until the session completes", async () => {
    const { predictWithBestModel } = await loadModelLifecycle();
    type RecordedProgress = {
      completedSteps: number;
      totalSteps: number;
      nextStepLabel: string | null;
      status: "ready" | "running" | "failed" | "completed" | "superseded";
    };
    const progress: RecordedProgress[] = [];
    const sessionId = "33333333-3333-4333-8333-333333333333";
    const session = (
      status: "ready" | "completed",
      completed: string[],
      nextStep: { id: string; label: string } | null,
      totalSteps: number,
    ) => ({
      status: "success",
      results: {
        session_id: sessionId,
        session_status: status,
        completed_step_ids: completed,
        total_steps: totalSteps,
        next_step: nextStep,
        error_message: null,
        ...(status === "completed" ? {
          preparation_token: preparationResponse.results.preparation_token,
          prepared_forecast_steps: 12,
        } : {}),
      },
    });
    apiPost.mockResolvedValueOnce(session("ready", [], { id: "initialize", label: "初始化" }, 2));
    apiPost.mockResolvedValueOnce(session("ready", ["initialize"], { id: "fit_model", label: "重拟合" }, 3));
    apiPost.mockResolvedValueOnce(session("ready", ["initialize", "fit_model"], { id: "finalize", label: "组装" }, 3));
    apiPost.mockResolvedValueOnce(session("completed", ["initialize", "fit_model", "finalize"], null, 3));
    apiPost.mockResolvedValueOnce(predictionResponse);

    await predictWithBestModel("ma", 17, 6, {
      onPreparationProgress: (value: RecordedProgress) => progress.push(value),
    });

    expect(apiPost).toHaveBeenCalledTimes(5);
    expect(apiPost).toHaveBeenNthCalledWith(
      2,
      `/models/ma/production-preparation/sessions/${sessionId}/steps/initialize/run`,
      undefined,
      { timeoutMs: 690_000 },
    );
    expect(apiPost).toHaveBeenNthCalledWith(
      4,
      `/models/ma/production-preparation/sessions/${sessionId}/steps/finalize/run`,
      undefined,
      { timeoutMs: 690_000 },
    );
    expect(progress).toEqual([
      { completedSteps: 0, totalSteps: 2, nextStepLabel: "初始化", status: "ready" },
      { completedSteps: 1, totalSteps: 3, nextStepLabel: "重拟合", status: "ready" },
      { completedSteps: 2, totalSteps: 3, nextStepLabel: "组装", status: "ready" },
      { completedSteps: 3, totalSteps: 3, nextStepLabel: null, status: "completed" },
    ]);
  });

  it("rejects a preparation step response from a different session", async () => {
    const { predictWithBestModel } = await loadModelLifecycle();
    apiPost.mockResolvedValueOnce({
      status: "success",
      results: {
        session_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        session_status: "ready",
        completed_step_ids: [],
        total_steps: 2,
        next_step: { id: "initialize", label: "初始化" },
        error_message: null,
      },
    });
    apiPost.mockResolvedValueOnce({
      status: "success",
      results: {
        session_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        session_status: "ready",
        completed_step_ids: ["initialize"],
        total_steps: 3,
        next_step: { id: "fit_model", label: "重拟合" },
        error_message: null,
      },
    });

    await expect(predictWithBestModel("ma", 18, 6)).rejects.toMatchObject({
      stage: "prepare",
      kind: "invalid-response",
      code: "PRODUCTION_RESPONSE_INVALID",
    });
    expect(apiPost).toHaveBeenCalledTimes(2);
  });

  it("preserves prediction method metadata from the backend", async () => {
    const { predictWithBestModel } = await loadModelLifecycle();
    apiPost.mockResolvedValueOnce(preparationResponse);
    apiPost.mockResolvedValueOnce({
        status: "success",
        results: {
          predictions: predictionResponse.results.predictions.slice(0, 6),
          method_name: "递推移动平均",
          forecast_strategy: "recursive_roll_forward",
          implementation_notes: ["训练后使用拟合模型递推预测未来销量。"],
        },
      });

    const result = await predictWithBestModel("ma", 7, 6);

    expect(result.results).toMatchObject({
      predictions: predictionResponse.results.predictions.slice(0, 6),
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

  it("surfaces predict busy errors without automatic retries", async () => {
    const { predictWithBestModel } = await loadModelLifecycle();

    apiPost.mockResolvedValueOnce(preparationResponse);
    apiPost.mockRejectedValueOnce(createApiError(429, "模型服务繁忙，请稍后再试"));

    await expect(
      predictWithBestModel("ma", 11, 3),
    ).rejects.toMatchObject({
      name: "ProductionPredictionError",
      message: "模型服务当前繁忙，请稍后再次点击“重试”。",
      status: 429,
      stage: "predict",
      kind: "busy",
      recoveryAction: "retry",
    });
    expect(apiPost).toHaveBeenCalledTimes(2);
    expect(apiPost).toHaveBeenNthCalledWith(2, "/models/ma/predict", {
      experiment_id: 11,
      forecast_steps: 3,
      preparation_token: preparationResponse.results.preparation_token,
    }, {
      timeoutMs: 690_000,
    });
  });

  it("surfaces predict conflict errors without automatic retries", async () => {
    const { predictWithBestModel } = await loadModelLifecycle();

    apiPost.mockResolvedValueOnce(preparationResponse);
    apiPost.mockRejectedValueOnce(createApiError(409, "同一模型正在训练或预测，请稍后再试"));

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
    expect(apiPost).toHaveBeenNthCalledWith(2, "/models/es/predict", {
      experiment_id: 13,
      forecast_steps: 5,
      preparation_token: preparationResponse.results.preparation_token,
    }, {
      timeoutMs: 690_000,
    });
  });

  it("explains a stale production preparation as a version change", async () => {
    const { predictWithBestModel } = await loadModelLifecycle();

    const staleError = new Error("HTTP 409 - stale") as Error & { status?: number; payload?: unknown };
    staleError.status = 409;
    staleError.payload = { error: "预测期间模型版本已变化", code: "PRODUCTION_PREPARATION_STALE" };

    apiPost.mockResolvedValueOnce(preparationResponse);
    apiPost.mockRejectedValueOnce(staleError);

    const rejected = await predictWithBestModel("exp", 13, 5).catch((error: any) => error);
    expect(rejected.status).toBe(409);
    expect(rejected.kind).toBe("conflict");
    expect(rejected.code).toBe("PRODUCTION_PREPARATION_STALE");
    expect(rejected.recoveryAction).toBe("retry");
    // Distinct from the generic MODEL_BUSY 409 wording.
    expect(rejected.message).toContain("生产模型版本已更新");
    expect(rejected.message).toContain("重新生成需求预测");
    expect(rejected.message).not.toContain("已有训练或预测任务在执行");
  });

  it("tells the user to retrain when prepare detects a corrupt backtest artifact", async () => {
    const { predictWithBestModel } = await loadModelLifecycle();

    const artifactError = new Error("HTTP 409 - artifact invalid") as Error & {
      status?: number;
      payload?: unknown;
    };
    artifactError.status = 409;
    artifactError.payload = {
      error: "MA 回测模型产物已损坏，请重新训练该模型",
      code: "MODEL_ARTIFACT_INVALID",
      required_action: "retrain",
    };
    apiPost.mockRejectedValueOnce(artifactError);

    await expect(
      predictWithBestModel("ma", 13, 6),
    ).rejects.toMatchObject({
      name: "ProductionPredictionError",
      message: expect.stringContaining("请返回对应模型的训练页面重新训练"),
      status: 409,
      stage: "prepare",
      kind: "conflict",
      code: "MODEL_ARTIFACT_INVALID",
      recoveryAction: "retrain",
    });
    expect(apiPost).toHaveBeenCalledTimes(1);
  });

  it("maps production prediction 400 errors to actionable messages", async () => {
    const { predictWithBestModel, ProductionPredictionError } = await loadModelLifecycle();

    apiPost.mockResolvedValueOnce(preparationResponse);
    apiPost.mockRejectedValueOnce(createApiError(400, "模型尚未满足生产准备条件"));

    await expect(
      predictWithBestModel("lstm", 15, 6),
    ).rejects.toMatchObject({
      name: "ProductionPredictionError",
      message: expect.stringContaining("生产预测请求无效"),
      status: 400,
      stage: "predict",
      kind: "invalid",
    });
    expect(apiPost).toHaveBeenCalledTimes(2);
    expect(ProductionPredictionError).toBeDefined();
  });

  it("maps predict 504 errors without transient retries", async () => {
    const { predictWithBestModel } = await loadModelLifecycle();

    apiPost.mockResolvedValueOnce(preparationResponse);
    apiPost.mockRejectedValueOnce(createApiError(504, "预测超时"));

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

  it("maps a frontend execution deadline to a timeout error", async () => {
    const { predictWithBestModel } = await loadModelLifecycle();
    apiPost.mockRejectedValueOnce(Object.assign(
      new Error("请求超时（690秒），请检查网络连接后重试"),
      { code: "CLIENT_TIMEOUT", timeoutMs: 690_000 },
    ));

    await expect(
      predictWithBestModel("ensemble_stacking", 22, 6),
    ).rejects.toMatchObject({
      name: "ProductionPredictionError",
      message: expect.stringContaining("生成需求预测超时"),
      stage: "prepare",
      kind: "timeout",
    });
    expect(apiPost).toHaveBeenCalledTimes(1);
  });

  it("rejects an empty successful prepare response as a typed protocol error", async () => {
    const { predictWithBestModel } = await loadModelLifecycle();
    apiPost.mockResolvedValueOnce(null);

    await expect(
      predictWithBestModel("ma", 31, 6),
    ).rejects.toMatchObject({
      name: "ProductionPredictionError",
      stage: "prepare",
      kind: "invalid-response",
      code: "PRODUCTION_RESPONSE_INVALID",
      recoveryAction: "retry",
    });
    expect(apiPost).toHaveBeenCalledTimes(1);
  });

  it("rejects a prepare response whose token or horizon is invalid", async () => {
    const { predictWithBestModel } = await loadModelLifecycle();
    apiPost.mockResolvedValueOnce({
      status: "success",
      results: {
        session_id: "44444444-4444-4444-8444-444444444444",
        session_status: "completed",
        completed_step_ids: ["initialize", "fit_model", "finalize"],
        total_steps: 3,
        next_step: null,
        error_message: null,
        preparation_token: "",
        prepared_forecast_steps: 5,
      },
    });

    await expect(
      predictWithBestModel("arima", 32, 6),
    ).rejects.toMatchObject({
      stage: "prepare",
      kind: "invalid-response",
      recoveryAction: "retry",
    });
    expect(apiPost).toHaveBeenCalledTimes(1);
  });

  it("rejects a prediction response with too few periods", async () => {
    const { predictWithBestModel } = await loadModelLifecycle();
    apiPost.mockResolvedValueOnce(preparationResponse);
    apiPost.mockResolvedValueOnce({
      status: "success",
      results: {
        predictions: predictionResponse.results.predictions.slice(0, 2),
      },
    });

    await expect(
      predictWithBestModel("lstm", 33, 6),
    ).rejects.toMatchObject({
      stage: "predict",
      kind: "invalid-response",
      recoveryAction: "retry",
    });
    expect(apiPost).toHaveBeenCalledTimes(2);
  });

  it("rejects non-finite prediction points and negative standard deviations", async () => {
    const { predictWithBestModel } = await loadModelLifecycle();
    apiPost.mockResolvedValueOnce(preparationResponse);
    apiPost.mockResolvedValueOnce({
      status: "success",
      results: {
        predictions: [
          ...predictionResponse.results.predictions.slice(0, 5),
          { prediction: Number.NaN, std_dev: -1, upper_error_p99: -1, uncertainty_source: "model" },
        ],
      },
    });

    await expect(
      predictWithBestModel("exp", 34, 6),
    ).rejects.toMatchObject({
      stage: "predict",
      kind: "invalid-response",
      code: "PRODUCTION_RESPONSE_INVALID",
    });
    expect(apiPost).toHaveBeenCalledTimes(2);
  });

  it("rejects prediction points without an uncertainty source", async () => {
    const { predictWithBestModel } = await loadModelLifecycle();
    apiPost.mockResolvedValueOnce(preparationResponse);
    apiPost.mockResolvedValueOnce({
      status: "success",
      results: {
        predictions: Array.from({ length: 6 }, (_, index) => ({
          prediction: 100 + index,
          std_dev: 4,
          upper_error_p99: 9,
        })),
      },
    });

    await expect(
      predictWithBestModel("ma", 35, 6),
    ).rejects.toMatchObject({
      stage: "predict",
      kind: "invalid-response",
      code: "PRODUCTION_RESPONSE_INVALID",
    });
  });

  it("rejects prediction points without a complete bias diagnostic pair", async () => {
    const { predictWithBestModel } = await loadModelLifecycle();
    apiPost.mockResolvedValueOnce(preparationResponse);
    apiPost.mockResolvedValueOnce({
      status: "success",
      results: {
        predictions: Array.from({ length: 6 }, (_, index) => ({
          prediction: 100 + index,
          std_dev: 4,
          upper_error_p99: 9,
          uncertainty_source: "empirical",
          calibration_mean_error: 2,
          calibration_count: null,
        })),
      },
    });

    await expect(
      predictWithBestModel("ma", 35, 6),
    ).rejects.toMatchObject({
      stage: "predict",
      kind: "invalid-response",
      code: "PRODUCTION_RESPONSE_INVALID",
    });
  });

  it("preserves fallback uncertainty explanations", async () => {
    const { predictWithBestModel } = await loadModelLifecycle();
    apiPost.mockResolvedValueOnce(preparationResponse);
    apiPost.mockResolvedValueOnce({
      status: "success",
      results: {
        predictions: Array.from({ length: 6 }, (_, index) => ({
          prediction: 100 + index,
          std_dev: 4 + index,
          upper_error_p99: 10 + index,
          uncertainty_source: "fallback",
          uncertainty_reason: "验证残差不足，使用差分波动回退",
          calibration_mean_error: null,
          calibration_count: null,
        })),
      },
    });

    const result = await predictWithBestModel("ma", 36, 6);
    expect(result.results.predictions[0]).toEqual({
      prediction: 100,
      std_dev: 4,
      upper_error_p99: 10,
      uncertainty_source: "fallback",
      uncertainty_reason: "验证残差不足，使用差分波动回退",
      calibration_mean_error: null,
      calibration_count: null,
    });
  });
});
