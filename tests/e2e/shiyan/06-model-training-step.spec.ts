import { test, expect } from "./fixtures";
import type { Page } from "@playwright/test";
import {
  prepareEnsembleReadyExperiment,
  prepareModelStageExperiment,
  seedAuthoritativeTrainingFixture,
} from "./support/model-training";
import { completeGuidedTraining } from "./support/ui-flow";

const advanceBaseModelIntroToSelection = async (
  clickEnabledButton: (name: string | RegExp, timeout?: number) => Promise<void>,
) => {
  for (let index = 0; index < 4; index += 1) {
    await clickEnabledButton(/下一个模型|选择基础模型/);
  }
};

const advanceEnsembleIntroToSelection = async (
  clickEnabledButton: (name: string | RegExp, timeout?: number) => Promise<void>,
) => {
  for (let index = 0; index < 3; index += 1) {
    await clickEnabledButton(/下一个模型|选择融合模型/);
  }
};

const expectJsonFeatureList = (value: unknown, expectedFeatures: string[]) => {
  expect(typeof value).toBe("string");
  expect(JSON.parse(value as string)).toEqual(expectedFeatures);
};

type GuidedModelType = "ma" | "es" | "arima" | "lstm" | "weighted_avg" | "stacking" | "boosting";

type GuidedTrainingResult = {
  status: string;
  message?: string;
  results: Record<string, unknown>;
  inferred_feature_types?: unknown;
  experiment_state_patch?: Record<string, unknown>;
};

type GuidedTrainingFailure = {
  status?: number;
  error: string;
};

type MockGuidedTrainingOptions = {
  result: GuidedTrainingResult;
  actionLabel?: string;
  onCreate?: (body: Record<string, unknown>) => void;
  beforeRun?: (attempt: number, requestBody: Record<string, unknown>) => Promise<void> | void;
  failRun?: (
    attempt: number,
    requestBody: Record<string, unknown>,
  ) => GuidedTrainingFailure | null | Promise<GuidedTrainingFailure | null>;
};

const createMockGuidedSession = (
  modelType: GuidedModelType,
  status: "ready" | "running" | "failed" | "completed",
  result: GuidedTrainingResult | null,
  errorMessage: string | null,
  actionLabel = "校验数据",
) => ({
  session_id: `${modelType}-guided-e2e-session`,
  experiment_id: 1,
  model_type: modelType,
  status,
  current_step_id: status === "completed" ? null : "complete",
  next_step_id: status === "completed" ? null : "complete",
  steps: [
    {
      id: "complete",
      label: "E2E 分阶段训练",
      description: "执行端到端测试中的模拟训练阶段。",
      actionLabel,
      status:
        status === "completed"
          ? "completed"
          : status === "failed"
            ? "failed"
            : "active",
      output: status === "completed" ? { status: "success" } : {},
    },
  ],
  step_outputs: {},
  result,
  error_message: errorMessage,
});

const mockGuidedTraining = async (
  page: Page,
  modelType: GuidedModelType,
  options: MockGuidedTrainingOptions,
) => {
  let latestRequestBody: Record<string, unknown> = {};
  let attempts = 0;

  await page.route(`**/api/v1/models/${modelType}/guided-training/sessions`, async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }

    latestRequestBody = route.request().postDataJSON() as Record<string, unknown>;
    options.onCreate?.(latestRequestBody);

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: createMockGuidedSession(
          modelType,
          "ready",
          null,
          null,
          options.actionLabel,
        ),
      }),
    });
  });

  await page.route(`**/api/v1/models/${modelType}/guided-training/sessions/**/steps/**/run`, async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }

    attempts += 1;
    await options.beforeRun?.(attempts, latestRequestBody);
    const failure = await options.failRun?.(attempts, latestRequestBody);
    if (failure) {
      await route.fulfill({
        status: failure.status ?? 500,
        contentType: "application/json",
        body: JSON.stringify({ error: failure.error }),
      });
      return;
    }

    const authoritativeResult = options.result.status === "success"
      ? {
          ...options.result,
          experiment_state_patch: seedAuthoritativeTrainingFixture(
            modelType,
            latestRequestBody,
            options.result,
          ),
        }
      : options.result;

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        data: createMockGuidedSession(
          modelType,
          "completed",
          authoritativeResult,
          null,
          options.actionLabel,
        ),
      }),
    });
  });

  return {
    get attempts() {
      return attempts;
    },
    get latestRequestBody() {
      return latestRequestBody;
    },
  };
};

const runGuidedTrainingAttempt = async (page: Page) => {
  const initializeButton = page.getByRole("button", { name: "进入分阶段训练" });
  if (await initializeButton.isVisible().catch(() => false)) {
    await expect(initializeButton).toBeEnabled();
    await initializeButton.click();
  }

  const runButton = page.getByRole("button", {
    name: /校验数据|准备窗口|生成预测|估计残差|计算指标|保存结果|拟合模型|准备搜索|运行 AIC|运行 BIC|选择模型|解析数据|构造样本|构建网络|训练模型|划分数据|训练并预测|计算权重|生成评估预测|组合评估|划分层级|生成二层特征|拟合元模型|初始化残差|评估候选|重训模型链/,
  }).last();
  await expect(runButton).toBeVisible({ timeout: 30_000 });
  await expect(runButton).toBeEnabled();
  await runButton.click();
};

test.describe("@shiyan model training step", () => {
  test("base-model selection requires at least two models before training can start", async ({
    page,
    studentApi,
    studentApp,
  }) => {
    await prepareModelStageExperiment(studentApi);

    await studentApp.open("/model/model-intro");
    await studentApp.expectHash("/model/model-intro");
    await advanceBaseModelIntroToSelection(studentApp.clickEnabledButton.bind(studentApp));

    await expect(page.getByText("请选择至少两个基础模型进行后续的训练和对比。")).toBeVisible();

    const nextButton = page.getByRole("button", { name: "下一步" });
    await expect(nextButton).toBeDisabled();
    await expect(page.getByText("请至少选择两个模型。")).toBeVisible();

    await page.getByRole("checkbox", { name: "移动平均法" }).check();
    await expect(nextButton).toBeDisabled();

    await page.getByRole("checkbox", { name: "指数平滑法" }).check();
    await expect(nextButton).toBeEnabled();
    await nextButton.click();

    await studentApp.expectHash("/model/model-select");
    await expect(page.getByText("请完成您选择的基础模型")).toBeVisible();
    await expect(page.getByText("移动平均法")).toBeVisible();
    await expect(page.getByText("指数平滑法")).toBeVisible();
    await expect(page.getByText("ARIMA模型")).toHaveCount(0);
  });

  test("ensemble-model selection requires at least one ensemble before entering training", async ({
    page,
    studentApi,
    studentApp,
  }) => {
    await prepareEnsembleReadyExperiment(studentApi);

    await studentApp.open("/model/ensemble-intro");
    await studentApp.expectHash("/model/ensemble-intro");
    await advanceEnsembleIntroToSelection(studentApp.clickEnabledButton.bind(studentApp));

    await expect(page.getByText("请选择至少一个融合模型进行训练。")).toBeVisible();

    const nextButton = page.getByRole("button", { name: "下一步" });
    await expect(nextButton).toBeDisabled();
    await expect(page.getByText("请至少选择一个模型。")).toBeVisible();

    await page.getByRole("checkbox", { name: "加权平均融合" }).check();
    await expect(nextButton).toBeEnabled();
    await nextButton.click();

    await studentApp.expectHash("/model/ensemble-select");
    await expect(page.getByText("请完成您选择的融合模型")).toBeVisible();
    await expect(page.getByText("加权平均融合")).toBeVisible();
    await expect(page.getByText("Boosting融合")).toHaveCount(0);
  });

  test("weighted-ensemble training locks navigation until the in-flight job finishes", async ({
    page,
    studentApi,
    studentApp,
  }) => {
    await prepareEnsembleReadyExperiment(studentApi);

    let releaseTraining: (() => void) | null = null;
    const trainingGate = new Promise<void>((resolve) => {
      releaseTraining = resolve;
    });

    await mockGuidedTraining(page, "weighted_avg", {
      beforeRun: async () => {
        await trainingGate;
      },
      result: {
        status: "success",
        results: {
          metrics: { rmse: 10.2, mae: 8.4, r2: 0.88 },
          eval_y_true: [100, 110, 120, 130, 140, 150, 160, 170],
          eval_predictions: [101, 109, 121, 128, 142, 149, 159, 171],
          weights: [0.58, 0.42],
          model_names: ["ma", "es"],
        },
      },
    });

    await studentApp.open("/model/weighted-ensemble/select-models");
    await studentApp.expectHash("/model/weighted-ensemble/select-models");

    await page.getByRole("checkbox", { name: "移动平均法" }).check();
    await page.getByRole("checkbox", { name: "指数平滑法" }).check();
    await studentApp.clickEnabledButton("下一步");

    await studentApp.expectHash("/model/weighted-ensemble/results");
    try {
      await runGuidedTrainingAttempt(page);
      await expect(page.getByRole("button", { name: "校验数据" })).toBeDisabled();

      const profileLink = page.getByRole("link", { name: "个人信息" });
      await expect(profileLink).toHaveAttribute("aria-disabled", "true");
      await expect(profileLink).toHaveAttribute("title", /模型训练进行中/);
      const logoutButton = page.locator("button").filter({ has: page.locator(".lucide-log-out") }).first();
      await expect(logoutButton).toBeDisabled();

      await profileLink.click({ force: true });
      await studentApp.expectHash("/model/weighted-ensemble/results");
    } finally {
      releaseTraining?.();
    }

    await expect(page.getByText("加权平均融合 - 计算结果")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByRole("button", { name: "下一步" })).toBeEnabled();
  });

  test("moving-average training falls back after the single allowed retry fails", async ({
    page,
    studentApi,
    studentApp,
  }) => {
    await prepareModelStageExperiment(studentApi, {
      moving_average_window: 6,
    });

    const guidedMock = await mockGuidedTraining(page, "ma", {
      result: {
        status: "success",
        results: {
          metrics: { rmse: 8.9, mae: 6.8, r2: 0.89 },
          eval_y_true: [100, 110, 120, 130, 140, 150, 160, 170],
          eval_predictions: [99, 111, 118, 131, 141, 149, 161, 168],
        },
      },
      failRun: () => ({ error: "forced e2e persistent failure" }),
    });

    await studentApp.open("/model/moving-average/results");
    await studentApp.expectHash("/model/moving-average/results");
    await runGuidedTrainingAttempt(page);

    const retryButton = page.getByRole("button", { name: "重试" });
    await expect(retryButton).toBeVisible();

    await retryButton.click();

    await expect(
      page.getByText("我们已经重试一次，但仍然无法成功计算。"),
    ).toBeVisible({ timeout: 30_000 });
    expect(guidedMock.attempts).toBe(2);

    await page.getByRole("button", { name: "重新选择数据时段" }).click();
    await studentApp.expectHash("/model/window");
  });

  test("moving-average validation blocks oversized window values", async ({
    page,
    studentApi,
    studentApp,
  }) => {
    await prepareModelStageExperiment(studentApi);

    await studentApp.open("/model/moving-average/params");
    await studentApp.expectHash("/model/moving-average/params");

    await page.locator("#window-size").fill("40");
    await studentApp.clickEnabledButton("下一步");

    await studentApp.expectHash("/model/moving-average/validation");
    await expect(page.getByText("未通过合法性检验")).toBeVisible();
    await expect(
      page.getByText("时间窗口大小不能超过训练数据长度（28）"),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "下一步" })).toBeDisabled();

    await studentApp.clickEnabledButton("上一步");
    await studentApp.expectHash("/model/moving-average/params");
  });

  test("moving-average validation blocks window values below the minimum size", async ({
    page,
    studentApi,
    studentApp,
  }) => {
    await prepareModelStageExperiment(studentApi);

    await studentApp.open("/model/moving-average/params");
    await studentApp.expectHash("/model/moving-average/params");

    await page.locator("#window-size").fill("1");
    await studentApp.clickEnabledButton("下一步");

    await studentApp.expectHash("/model/moving-average/validation");
    await expect(page.getByText("未通过合法性检验")).toBeVisible();
    await expect(page.getByText("时间窗口大小至少为 2")).toBeVisible();
    await expect(page.getByRole("button", { name: "下一步" })).toBeDisabled();
  });

  test("moving-average results recover even after repeated backend busy responses", async ({
    page,
    studentApi,
    studentApp,
  }) => {
    await prepareModelStageExperiment(studentApi, {
      moving_average_window: 6,
    });

    const guidedMock = await mockGuidedTraining(page, "ma", {
      result: {
        status: "success",
        results: {
          metrics: { rmse: 7.4, mae: 5.6, r2: 0.91 },
          eval_y_true: [100, 110, 120, 130, 140, 150, 160, 170],
          eval_predictions: [101, 109, 121, 129, 141, 148, 162, 169],
        },
      },
      failRun: (attempt) =>
        attempt <= 3
          ? { status: 429, error: "模型服务繁忙，请稍后再试" }
          : null,
    });

    await studentApp.open("/model/moving-average/results");
    await studentApp.expectHash("/model/moving-average/results");
    await runGuidedTrainingAttempt(page);

    await expect(page.getByText(/模型服务当前繁忙/)).toBeVisible({
      timeout: 30_000,
    });

    await page.getByRole("button", { name: "重试" }).click();
    await expect(page.getByText(/模型服务当前繁忙/)).toBeVisible({
      timeout: 30_000,
    });

    await page.getByRole("button", { name: "重试" }).click();
    await expect(page.getByText(/模型服务当前繁忙/)).toBeVisible({
      timeout: 30_000,
    });

    await page.getByRole("button", { name: "重试" }).click();

    await expect(
      page.getByRole("heading", { name: "移动平均法 - 计算结果" }),
    ).toBeVisible({ timeout: 30_000 });
    await expect(
      page.getByText("我们已经重试一次，但仍然无法成功计算。"),
    ).toHaveCount(0);
    await expect(page.getByRole("button", { name: "下一步" })).toBeEnabled();
    expect(guidedMock.attempts).toBe(4);
  });

  test("moving-average allows parameter changes to clear stale errors and retry budget", async ({
    page,
    studentApi,
    studentApp,
  }) => {
    await prepareModelStageExperiment(studentApi, {
      moving_average_window: 6,
    });

    const guidedMock = await mockGuidedTraining(page, "ma", {
      result: {
        status: "success",
        results: {
          metrics: { rmse: 6.1, mae: 4.7, r2: 0.92 },
          eval_y_true: [100, 110, 120, 130, 140, 150, 160, 170],
          eval_predictions: [99, 111, 121, 129, 141, 149, 161, 168],
        },
      },
      failRun: (_attempt, body) =>
        body.moving_average_window === 6
          ? { error: "forced ma failure for window 6" }
          : null,
    });

    await studentApp.open("/model/moving-average/results");
    await studentApp.expectHash("/model/moving-average/results");
    await runGuidedTrainingAttempt(page);
    await expect(page.getByText("forced ma failure for window 6")).toBeVisible({
      timeout: 30_000,
    });

    await studentApp.clickEnabledButton("上一步");
    await studentApp.expectHash("/model/moving-average/params");

    await page.locator("#window-size").fill("4");
    await expect(page.getByText("forced ma failure for window 6")).toHaveCount(0);
    await studentApp.clickEnabledButton("下一步");
    await studentApp.expectHash("/model/moving-average/validation");
    await studentApp.clickEnabledButton("下一步");
    await studentApp.expectHash("/model/moving-average/results");

    await completeGuidedTraining(page, "移动平均法 - 计算结果", 120_000);
    await expect(page.getByText("forced ma failure for window 6")).toHaveCount(0);
    expect(guidedMock.attempts).toBe(2);
  });

  test("moving-average training persists parameter, metrics, and completion state", async ({
    page,
    studentApi,
    studentApp,
  }) => {
    await prepareModelStageExperiment(studentApi);

    let capturedRequest: Record<string, unknown> | null = null;
    await mockGuidedTraining(page, "ma", {
      onCreate: (body) => {
        capturedRequest = body;
      },
      result: {
        status: "success",
        results: {
          metrics: { rmse: 8.9, mae: 6.8, r2: 0.89 },
          eval_y_true: [100, 110, 120, 130, 140, 150, 160, 170],
          eval_predictions: [99, 111, 118, 131, 141, 149, 161, 168],
        },
      },
    });

    await studentApp.open("/model/moving-average/params");
    await studentApp.expectHash("/model/moving-average/params");

    await page.locator("#window-size").fill("6");
    await studentApp.clickEnabledButton("下一步");

    await studentApp.expectHash("/model/moving-average/validation");
    await expect(page.getByText("时间窗口填写正确")).toBeVisible();

    await studentApp.clickEnabledButton("下一步");
    await studentApp.expectHash("/model/moving-average/results");
    await completeGuidedTraining(page, "移动平均法 - 计算结果", 120_000);

    await page.getByRole("button", { name: "图表" }).click();
    await page.getByRole("button", { name: "表格" }).click();

    await studentApp.clickEnabledButton("下一步");
    await studentApp.expectHash("/model/moving-average/comparison");
    await expect(page.getByText("模型指标对比")).toBeVisible();
    await expect(page.getByRole("cell", { name: "移动平均法" })).toBeVisible();

    await studentApp.clickEnabledButton("完成");
    await studentApp.expectHash("/model/model-select");

    expect(capturedRequest).not.toBeNull();
    expect(capturedRequest?.moving_average_window).toBe(6);

    const activeExperiment = await studentApi.getActiveExperiment();
    expect(activeExperiment).not.toBeNull();
    expect(activeExperiment?.moving_average_window).toBe(6);
    expect(activeExperiment?.moving_average_completed).toBe(true);
    expect(activeExperiment?.moving_average_metrics_rmse).toBe(8.9);
    expect(activeExperiment?.moving_average_metrics_mae).toBe(6.8);
    expect(activeExperiment?.moving_average_metrics_r2).toBe(0.89);
  });

  test("exponential-smoothing validation blocks alpha values above one", async ({
    page,
    studentApi,
    studentApp,
  }) => {
    await prepareModelStageExperiment(studentApi);

    await studentApp.open("/model/exponential-smoothing/params");
    await studentApp.expectHash("/model/exponential-smoothing/params");

    await page.locator("#alpha-input").fill("1.2");
    await studentApp.clickEnabledButton("下一步");

    await studentApp.expectHash("/model/exponential-smoothing/validation");
    await expect(page.getByText("未通过合法性检验")).toBeVisible();
    await expect(page.getByText("平滑系数不能大于 1")).toBeVisible();
    await expect(page.getByRole("button", { name: "下一步" })).toBeDisabled();

    await studentApp.clickEnabledButton("上一步");
    await studentApp.expectHash("/model/exponential-smoothing/params");
  });

  test("exponential-smoothing validation blocks non-positive alpha values", async ({
    page,
    studentApi,
    studentApp,
  }) => {
    await prepareModelStageExperiment(studentApi);

    await studentApp.open("/model/exponential-smoothing/params");
    await studentApp.expectHash("/model/exponential-smoothing/params");

    await page.locator("#alpha-input").fill("0");
    await studentApp.clickEnabledButton("下一步");

    await studentApp.expectHash("/model/exponential-smoothing/validation");
    await expect(page.getByText("未通过合法性检验")).toBeVisible();
    await expect(
      page.getByText("请输入一个有效的平滑系数（α > 0）"),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "下一步" })).toBeDisabled();
  });

  test("exponential-smoothing training persists alpha, metrics, and completion state", async ({
    page,
    studentApi,
    studentApp,
  }) => {
    await prepareModelStageExperiment(studentApi);

    let capturedRequest: Record<string, unknown> | null = null;
    await mockGuidedTraining(page, "es", {
      onCreate: (body) => {
        capturedRequest = body;
      },
      result: {
        status: "success",
        results: {
          metrics: { rmse: 8.2, mae: 6.3, r2: 0.9 },
          eval_y_true: [100, 110, 120, 130, 140, 150, 160, 170],
          eval_predictions: [100, 109, 121, 132, 139, 151, 158, 172],
        },
      },
    });

    await studentApp.open("/model/exponential-smoothing/params");
    await studentApp.expectHash("/model/exponential-smoothing/params");

    await page.locator("#alpha-input").fill("0.35");
    await studentApp.clickEnabledButton("下一步");

    await studentApp.expectHash("/model/exponential-smoothing/validation");
    await expect(page.getByText("平滑系数填写正确")).toBeVisible();

    await studentApp.clickEnabledButton("下一步");
    await studentApp.expectHash("/model/exponential-smoothing/results");
    await completeGuidedTraining(page, "指数平滑法 - 计算结果", 120_000);

    await page.getByRole("button", { name: "图表" }).click();
    await page.getByRole("button", { name: "表格" }).click();

    await studentApp.clickEnabledButton("下一步");
    await studentApp.expectHash("/model/exponential-smoothing/comparison");
    await expect(page.getByText("模型指标对比")).toBeVisible();
    await expect(page.getByRole("cell", { name: "指数平滑法" })).toBeVisible();

    await studentApp.clickEnabledButton("完成");
    await studentApp.expectHash("/model/model-select");

    expect(capturedRequest).not.toBeNull();
    expect(capturedRequest?.exponential_smoothing_alpha).toBe(0.35);

    const activeExperiment = await studentApi.getActiveExperiment();
    expect(activeExperiment).not.toBeNull();
    expect(activeExperiment?.exponential_smoothing_alpha).toBe(0.35);
    expect(activeExperiment?.exponential_smoothing_completed).toBe(true);
    expect(activeExperiment?.exponential_smoothing_metrics_rmse).toBe(8.2);
    expect(activeExperiment?.exponential_smoothing_metrics_mae).toBe(6.3);
    expect(activeExperiment?.exponential_smoothing_metrics_r2).toBe(0.9);
  });

  test("ARIMA blocks progression when every differencing order remains non-stationary", async ({
    page,
    studentApi,
    studentApp,
  }) => {
    await prepareModelStageExperiment(studentApi);

    await page.route("**/api/v1/tools/adf", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          result: [
            {
              diff_order: 0,
              statistic: -1.12,
              p_value: 0.71,
              used_lags: 0,
              n_obs: 14,
              stationary: false,
              critical_values: { "1%": -3.75, "5%": -2.99, "10%": -2.64 },
            },
            {
              diff_order: 1,
              statistic: -1.38,
              p_value: 0.58,
              used_lags: 1,
              n_obs: 13,
              stationary: false,
              critical_values: { "1%": -3.75, "5%": -2.99, "10%": -2.64 },
            },
            {
              diff_order: 2,
              statistic: -1.41,
              p_value: 0.55,
              used_lags: 2,
              n_obs: 12,
              stationary: false,
              critical_values: { "1%": -3.75, "5%": -2.99, "10%": -2.64 },
            },
          ],
        }),
      });
    });

    await studentApp.open("/model/arima/stationarity-table");
    await studentApp.expectHash("/model/arima/stationarity-table");
    await expect(page.getByRole("heading", { name: "ADF 单位根检验表" })).toBeVisible();

    await studentApp.clickEnabledButton("下一步");

    await expect(
      page.getByText("所有差分阶数均未通过当前ADF门槛，无法继续进行ARIMA建模。请尝试调整数据窗口或选择其他产品。"),
    ).toBeVisible();

    await page.getByRole("button", { name: "重新选择数据时段" }).click();
    await studentApp.expectHash("/model/window");
  });

  test("ARIMA recovers when ADF succeeds after a retry", async ({
    page,
    studentApi,
    studentApp,
  }) => {
    await prepareModelStageExperiment(studentApi);

    let attempts = 0;
    await page.route("**/api/v1/tools/adf", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }

      attempts += 1;
      if (attempts === 1) {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "forced adf failure" }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          result: [
            {
              diff_order: 0,
              statistic: -1.12,
              p_value: 0.71,
              used_lags: 0,
              n_obs: 14,
              stationary: false,
              critical_values: { "1%": -3.75, "5%": -2.99, "10%": -2.64 },
            },
            {
              diff_order: 1,
              statistic: -3.84,
              p_value: 0.018,
              used_lags: 1,
              n_obs: 13,
              stationary: true,
              critical_values: { "1%": -3.75, "5%": -2.99, "10%": -2.64 },
            },
            {
              diff_order: 2,
              statistic: -4.22,
              p_value: 0.006,
              used_lags: 2,
              n_obs: 12,
              stationary: true,
              critical_values: { "1%": -3.75, "5%": -2.99, "10%": -2.64 },
            },
          ],
        }),
      });
    });

    await studentApp.open("/model/arima/stationarity-table");
    await studentApp.expectHash("/model/arima/stationarity-table");

    const retryButton = page.getByRole("button", { name: "重试" });
    await expect(retryButton).toBeVisible();

    await retryButton.click();

    await expect(page.getByRole("heading", { name: "ADF 单位根检验表" })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("d = 1")).toBeVisible();
    await expect(page.getByText("1 / 13")).toBeVisible();
    await expect(
      page
        .getByRole("row")
        .filter({ has: page.getByText("d = 1") })
        .getByText("通过", { exact: true }),
    ).toBeVisible();
    expect(attempts).toBe(2);
  });

  test("ARIMA resets the ADF retry budget after leaving the stationarity table", async ({
    page,
    studentApi,
    studentApp,
  }) => {
    await prepareModelStageExperiment(studentApi);

    let attempts = 0;
    await page.route("**/api/v1/tools/adf", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }

      attempts += 1;
      if (attempts <= 2) {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: `forced adf failure ${attempts}` }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          result: [
            {
              diff_order: 0,
              statistic: -1.12,
              p_value: 0.71,
              used_lags: 0,
              n_obs: 14,
              stationary: false,
              critical_values: { "1%": -3.75, "5%": -2.99, "10%": -2.64 },
            },
            {
              diff_order: 1,
              statistic: -3.84,
              p_value: 0.018,
              used_lags: 1,
              n_obs: 13,
              stationary: true,
              critical_values: { "1%": -3.75, "5%": -2.99, "10%": -2.64 },
            },
          ],
        }),
      });
    });

    await studentApp.open("/model/arima/stationarity-table");
    await studentApp.expectHash("/model/arima/stationarity-table");

    const retryButton = page.getByRole("button", { name: "重试" });
    await expect(retryButton).toBeVisible();

    await studentApp.clickEnabledButton("上一步");
    await studentApp.expectHash("/model/arima/stationarity");

    await studentApp.clickEnabledButton("下一步");
    await studentApp.expectHash("/model/arima/stationarity-table");
    await expect(retryButton).toBeVisible();

    await retryButton.click();

    await expect(page.getByRole("heading", { name: "ADF 单位根检验表" })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("d = 1")).toBeVisible();
    expect(attempts).toBe(3);
  });

  test("ARIMA falls back after the single allowed ADF retry fails", async ({
    page,
    studentApi,
    studentApp,
  }) => {
    await prepareModelStageExperiment(studentApi);

    let attempts = 0;
    await page.route("**/api/v1/tools/adf", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }

      attempts += 1;
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "forced adf failure" }),
      });
    });

    await studentApp.open("/model/arima/stationarity-table");
    await studentApp.expectHash("/model/arima/stationarity-table");

    const retryButton = page.getByRole("button", { name: "重试" });
    await expect(retryButton).toBeVisible();

    await retryButton.click();

    await expect(
      page.getByText("我们已经重试一次，但仍然无法成功计算。"),
    ).toBeVisible({ timeout: 30_000 });
    expect(attempts).toBe(2);

    await page.getByRole("button", { name: "重新选择产品" }).click();
    await studentApp.expectHash("/product");
  });

  test("ARIMA training falls back after the single allowed auto-parameter retry fails", async ({
    page,
    studentApi,
    studentApp,
  }) => {
    await prepareModelStageExperiment(studentApi, {
      arima_d: 1,
      arima_adf_stationarity: [
        {
          diff_order: 0,
          statistic: -1.12,
          p_value: 0.71,
          used_lags: 0,
          n_obs: 14,
          stationary: false,
          critical_values: { "1%": -3.75, "5%": -2.99, "10%": -2.64 },
        },
        {
          diff_order: 1,
          statistic: -3.84,
          p_value: 0.018,
          used_lags: 1,
          n_obs: 13,
          stationary: true,
          critical_values: { "1%": -3.75, "5%": -2.99, "10%": -2.64 },
        },
      ],
    });

    const guidedMock = await mockGuidedTraining(page, "arima", {
      actionLabel: "准备搜索",
      result: {
        status: "success",
        results: {
          metrics: { rmse: 6.4, mae: 4.8, r2: 0.91 },
          eval_y_true: [100, 110, 120, 130, 140, 150, 160, 170],
          eval_predictions: [98, 111, 121, 129, 142, 151, 158, 171],
          best_order: { p: 2, d: 1, q: 1 },
        },
      },
      failRun: () => ({ error: "forced arima training failure" }),
    });

    await studentApp.open("/model/arima/autoparams");
    await studentApp.expectHash("/model/arima/autoparams");
    await runGuidedTrainingAttempt(page);

    const retryButton = page.getByRole("button", { name: "重试" });
    await expect(retryButton).toBeVisible();

    await retryButton.click();

    await expect(
      page.getByText("我们已经重试一次，但仍然无法成功计算。"),
    ).toBeVisible({ timeout: 30_000 });
    expect(guidedMock.attempts).toBe(2);

    await page.getByRole("button", { name: "重新选择数据时段" }).click();
    await studentApp.expectHash("/model/window");
  });

  test("ARIMA persists selected differencing and best order across the full training flow", async ({
    page,
    studentApi,
    studentApp,
  }) => {
    await prepareModelStageExperiment(studentApi);

    let capturedRequest: Record<string, unknown> | null = null;
    await page.route("**/api/v1/tools/adf", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          result: [
            {
              diff_order: 0,
              statistic: -1.12,
              p_value: 0.71,
              used_lags: 0,
              n_obs: 14,
              stationary: false,
              critical_values: { "1%": -3.75, "5%": -2.99, "10%": -2.64 },
            },
            {
              diff_order: 1,
              statistic: -3.84,
              p_value: 0.018,
              used_lags: 1,
              n_obs: 13,
              stationary: true,
              critical_values: { "1%": -3.75, "5%": -2.99, "10%": -2.64 },
            },
            {
              diff_order: 2,
              statistic: -4.22,
              p_value: 0.006,
              used_lags: 2,
              n_obs: 12,
              stationary: true,
              critical_values: { "1%": -3.75, "5%": -2.99, "10%": -2.64 },
            },
          ],
        }),
      });
    });

    await mockGuidedTraining(page, "arima", {
      actionLabel: "准备搜索",
      onCreate: (body) => {
        capturedRequest = body;
      },
      result: {
        status: "success",
        results: {
          metrics: { rmse: 6.4, mae: 4.8, r2: 0.91 },
          eval_y_true: [100, 110, 120, 130, 140, 150, 160, 170],
          eval_predictions: [98, 111, 121, 129, 142, 151, 158, 171],
          best_order: { p: 2, d: 1, q: 1 },
        },
      },
    });

    await studentApp.open("/model/arima/stationarity-table");
    await studentApp.expectHash("/model/arima/stationarity-table");
    await expect(page.getByRole("heading", { name: "ADF 单位根检验表" })).toBeVisible();
    await expect(page.getByText("d = 1")).toBeVisible();
    await expect(
      page
        .getByRole("row")
        .filter({ has: page.getByText("d = 1") })
        .getByText("通过", { exact: true }),
    ).toBeVisible();

    await studentApp.clickEnabledButton("下一步");
    await studentApp.expectHash("/model/arima/differencing");

    await page.locator("#diff-order").fill("0");
    await studentApp.clickEnabledButton("下一步");
    await studentApp.expectHash("/model/arima/differencing-validation");
    await expect(page.getByText("差分阶数 d=0 未通过当前ADF门槛")).toBeVisible();
    await expect(page.getByRole("button", { name: "下一步" })).toBeDisabled();

    await studentApp.clickEnabledButton("上一步");
    await studentApp.expectHash("/model/arima/differencing");

    await page.locator("#diff-order").fill("1");
    await studentApp.clickEnabledButton("下一步");
    await studentApp.expectHash("/model/arima/differencing-validation");
    await expect(page.getByText("差分阶数 d=1 通过当前ADF门槛")).toBeVisible();

    await studentApp.clickEnabledButton("下一步");
    await studentApp.expectHash("/model/arima/autoparams");
    await completeGuidedTraining(page, /ARIMA 法 - 自动参数寻优计算/, 180_000);
    await expect(page.getByText(/ARIMA\(2,\s*1,\s*1\)/)).toBeVisible();

    await page.getByRole("button", { name: "信息准则函数法" }).click();
    await studentApp.expectHash("/model/arima/information-criteria-info");
    await studentApp.clickEnabledButton("上一步");
    await studentApp.expectHash("/model/arima/autoparams");

    await studentApp.clickEnabledButton("下一步");
    await expect(page.getByText("ARIMA 法 - 预测结果")).toBeVisible();

    await page.getByRole("button", { name: "图表" }).click();
    await page.getByRole("button", { name: "表格" }).click();

    await studentApp.clickEnabledButton("下一步");
    await studentApp.expectHash("/model/arima/comparison");
    await expect(page.getByText("模型指标对比")).toBeVisible();
    await expect(page.getByText("ARIMA模型")).toBeVisible();

    await studentApp.clickEnabledButton("完成");
    await studentApp.expectHash("/model/model-select");

    expect(capturedRequest).not.toBeNull();
    expect(capturedRequest?.arimaD).toBe(1);

    const activeExperiment = await studentApi.getActiveExperiment();
    expect(activeExperiment).not.toBeNull();
    expect(activeExperiment?.arima_d).toBe(1);
    expect(activeExperiment?.arima_p).toBe(2);
    expect(activeExperiment?.arima_q).toBe(1);
    expect(activeExperiment?.arima_completed).toBe(true);
    expect(activeExperiment?.arima_metrics_rmse).toBe(6.4);
    expect(activeExperiment?.arima_metrics_mae).toBe(4.8);
    expect(activeExperiment?.arima_metrics_r2).toBe(0.91);
  });

  test("LSTM training persists preprocessing choices, request payload, and metrics", async ({
    page,
    studentApi,
    studentApp,
  }) => {
    await prepareModelStageExperiment(studentApi);

    let capturedRequest: Record<string, unknown> | null = null;
    await mockGuidedTraining(page, "lstm", {
      actionLabel: "解析数据",
      onCreate: (body) => {
        capturedRequest = body;
      },
      result: {
        status: "success",
        results: {
          metrics: { rmse: 7.6, mae: 5.4, r2: 0.93 },
          eval_y_true: [100, 110, 120, 130, 140, 150, 160, 170],
          eval_predictions: [102, 111, 119, 131, 141, 148, 161, 169],
        },
      },
    });

    await studentApp.open("/model/lstm/preprocessing");
    await studentApp.expectHash("/model/lstm/preprocessing");
    await page.locator("#min-max").check({ force: true });
    await studentApp.clickEnabledButton("下一步");

    await studentApp.expectHash("/model/lstm/build");
    await expect(page.getByText("请选择需求预测时所使用的特征")).toBeVisible();

    const selectedFeatureNames: string[] = [];
    for (const featureName of ["年份", "月份", "促销投入", "价格指数", "产能利用率"]) {
      const checkbox = page.getByRole("checkbox", { name: featureName });
      if ((await checkbox.count()) === 0) {
        continue;
      }
      await checkbox.check({ force: true });
      selectedFeatureNames.push(featureName);
      if (selectedFeatureNames.length === 2) {
        break;
      }
    }

    expect(selectedFeatureNames).toHaveLength(2);

    await studentApp.clickEnabledButton("下一步");
    await studentApp.expectHash("/model/lstm/results");
    await completeGuidedTraining(page, "LSTM 法 - 计算结果", 240_000);

    await studentApp.clickEnabledButton("下一步");
    await studentApp.expectHash("/model/lstm/comparison");
    await expect(page.getByText("模型指标对比")).toBeVisible();

    expect(capturedRequest).not.toBeNull();
    expect(capturedRequest?.lstmNormalization).toBe("minmax");
    expectJsonFeatureList(capturedRequest?.lstmFeatures, selectedFeatureNames);
    expect(String(capturedRequest?.lstmTargetFeature ?? "")).toContain("销售数量");

    const activeExperiment = await studentApi.getActiveExperiment();
    expect(activeExperiment).not.toBeNull();
    expect(activeExperiment?.lstm_normalization).toBe("minmax");
    expect(activeExperiment?.lstm_completed).toBe(true);
    expect(activeExperiment?.lstm_features).toEqual(selectedFeatureNames);
    expect(String(activeExperiment?.lstm_target_field ?? "")).toContain("销售数量");
    expect(activeExperiment?.lstm_metrics_rmse).toBe(7.6);
    expect(activeExperiment?.lstm_metrics_mae).toBe(5.4);
    expect(activeExperiment?.lstm_metrics_r2).toBe(0.93);
  });

  test("LSTM gates navigation until normalization and features are selected, while keeping the target field excluded", async ({
    page,
    studentApi,
    studentApp,
  }) => {
    await prepareModelStageExperiment(studentApi);

    await studentApp.open("/model/lstm/preprocessing");
    await studentApp.expectHash("/model/lstm/preprocessing");

    const nextButton = page.getByRole("button", { name: "下一步" });
    await expect(nextButton).toBeDisabled();

    await page.getByRole("button", { name: "什么是标准化？" }).click();
    await studentApp.expectHash("/model/lstm/normalization-info");
    await expect(nextButton).toBeDisabled();

    await studentApp.clickEnabledButton("上一步");
    await studentApp.expectHash("/model/lstm/preprocessing");

    await page.locator("#z-score").check({ force: true });
    await expect(nextButton).toBeEnabled();
    await nextButton.click();

    await studentApp.expectHash("/model/lstm/build");
    await expect(page.getByText("请选择需求预测时所使用的特征")).toBeVisible();

    await page.getByRole("button", { name: "构建LSTM方法" }).click();
    await studentApp.expectHash("/model/lstm/lstm-method-info");
    await expect(nextButton).toBeDisabled();

    await studentApp.clickEnabledButton("上一步");
    await studentApp.expectHash("/model/lstm/build");

    const targetCheckbox = page.locator("#feature-销售数量");
    await expect(targetCheckbox).toBeDisabled();
    await expect(page.getByText("(目标字段)")).toBeVisible();
    await expect(nextButton).toBeDisabled();

    await page.getByRole("checkbox", { name: "价格指数" }).check({ force: true });
    await expect(nextButton).toBeEnabled();
  });

  test("LSTM training falls back after the single allowed retry fails", async ({
    page,
    studentApi,
    studentApp,
  }) => {
    await prepareModelStageExperiment(studentApi, {
      lstm_normalization: "minmax",
      lstm_features: ["价格指数", "产能利用率"],
      lstm_target_field: "销售数量",
    });

    const guidedMock = await mockGuidedTraining(page, "lstm", {
      actionLabel: "解析数据",
      result: {
        status: "success",
        results: {
          metrics: { rmse: 7.6, mae: 5.4, r2: 0.93 },
          eval_y_true: [100, 110, 120, 130, 140, 150, 160, 170],
          eval_predictions: [102, 111, 119, 131, 141, 148, 161, 169],
        },
      },
      failRun: () => ({ error: "forced lstm training failure" }),
    });

    await studentApp.open("/model/lstm/results");
    await studentApp.expectHash("/model/lstm/results");
    await runGuidedTrainingAttempt(page);

    const retryButton = page.getByRole("button", { name: "重试" });
    await expect(retryButton).toBeVisible();

    await retryButton.click();

    await expect(
      page.getByText("我们已经重试一次，但仍然无法成功计算。"),
    ).toBeVisible({ timeout: 30_000 });
    expect(guidedMock.attempts).toBe(2);

    await page.getByRole("button", { name: "重新选择数据时段" }).click();
    await studentApp.expectHash("/model/window");
  });

  test("boosting ensemble completes training and persists metrics against the experiment state", async ({
    page,
    studentApi,
    studentApp,
  }) => {
    await prepareEnsembleReadyExperiment(studentApi);

    let capturedRequest: Record<string, unknown> | null = null;
    await mockGuidedTraining(page, "boosting", {
      actionLabel: "初始化残差",
      onCreate: (body) => {
        capturedRequest = body;
      },
      result: {
        status: "success",
        results: {
          metrics: { rmse: 8.8, mae: 6.9, r2: 0.92 },
          eval_y_true: [100, 110, 120, 130, 140, 150, 160, 170],
          eval_predictions: [101, 109, 121, 128, 141, 149, 161, 169],
        },
      },
    });

    await studentApp.open("/model/boosting-ensemble/select-models");
    await studentApp.expectHash("/model/boosting-ensemble/select-models");

    await page.getByRole("checkbox", { name: "移动平均法" }).check();
    await page.getByRole("checkbox", { name: "指数平滑法" }).check();
    await studentApp.clickEnabledButton("下一步");

    await studentApp.expectHash("/model/boosting-ensemble/results");
    await completeGuidedTraining(page, "Boosting 融合 - 计算结果", 240_000);

    await page.getByRole("button", { name: "图表" }).click();
    await page.getByRole("button", { name: "表格" }).click();

    await studentApp.clickEnabledButton("下一步");
    await studentApp.expectHash("/model/boosting-ensemble/model-metrics-comparison");
    await expect(page.getByText("Boosting融合模型")).toBeVisible();
    await expect(page.getByText("移动平均法")).toBeVisible();
    await expect(page.getByText("指数平滑法")).toBeVisible();

    await studentApp.clickEnabledButton("完成");
    await studentApp.expectHash("/model/ensemble-select");

    expect(capturedRequest).not.toBeNull();
    expect(capturedRequest?.models).toBe("ma,es");

    const activeExperiment = await studentApi.getActiveExperiment();
    expect(activeExperiment).not.toBeNull();
    expect(activeExperiment?.ensemble_boosting_completed).toBe(true);
    expect(activeExperiment?.ensemble_boosting_base_models).toEqual([
      "moving_average",
      "exponential_smoothing",
    ]);
    expect(activeExperiment?.ensemble_boosting_metrics_rmse).toBe(8.8);
    expect(activeExperiment?.ensemble_boosting_metrics_mae).toBe(6.9);
    expect(activeExperiment?.ensemble_boosting_metrics_r2).toBe(0.92);
  });

  test("stacking ensemble completes training and persists metrics against the experiment state", async ({
    page,
    studentApi,
    studentApp,
  }) => {
    await prepareEnsembleReadyExperiment(studentApi);

    let capturedRequest: Record<string, unknown> | null = null;
    await mockGuidedTraining(page, "stacking", {
      actionLabel: "划分层级",
      onCreate: (body) => {
        capturedRequest = body;
      },
      result: {
        status: "success",
        results: {
          metrics: { rmse: 8.1, mae: 6.1, r2: 0.94 },
          eval_y_true: [100, 110, 120, 130, 140, 150, 160, 170],
          eval_predictions: [100, 111, 120, 129, 142, 150, 162, 170],
          meta_model: {
            intercept: 0.75,
            coefficients: [0.6, 0.4],
          },
        },
      },
    });

    await studentApp.open("/model/stacking-ensemble/select-models");
    await studentApp.expectHash("/model/stacking-ensemble/select-models");

    await page.getByRole("checkbox", { name: "移动平均法" }).check();
    await page.getByRole("checkbox", { name: "指数平滑法" }).check();
    await studentApp.clickEnabledButton("下一步");

    await studentApp.expectHash("/model/stacking-ensemble/results");
    await completeGuidedTraining(page, "Stacking 融合 - 计算结果", 240_000);

    await page.getByRole("button", { name: "图表" }).click();
    await page.getByRole("button", { name: "表格" }).click();

    await studentApp.clickEnabledButton("下一步");
    await studentApp.expectHash("/model/stacking-ensemble/model-metrics-comparison");
    await expect(page.getByText("Stacking融合模型")).toBeVisible();
    await expect(page.getByText("移动平均法")).toBeVisible();
    await expect(page.getByText("指数平滑法")).toBeVisible();

    await studentApp.clickEnabledButton("完成");
    await studentApp.expectHash("/model/ensemble-select");

    expect(capturedRequest).not.toBeNull();
    expect(capturedRequest?.models).toBe("ma,es");

    const activeExperiment = await studentApi.getActiveExperiment();
    expect(activeExperiment).not.toBeNull();
    expect(activeExperiment?.ensemble_stacking_completed).toBe(true);
    expect(activeExperiment?.ensemble_stacking_base_models).toEqual([
      "moving_average",
      "exponential_smoothing",
    ]);
    expect(activeExperiment?.ensemble_stacking_metrics_rmse).toBe(8.1);
    expect(activeExperiment?.ensemble_stacking_metrics_mae).toBe(6.1);
    expect(activeExperiment?.ensemble_stacking_metrics_r2).toBe(0.94);
  });

  test("stacking ensemble sends ARIMA and LSTM-specific parameters when those base models are selected", async ({
    page,
    studentApi,
    studentApp,
  }) => {
    await prepareModelStageExperiment(studentApi, {
      arima_d: 1,
      arima_completed: true,
      arima_metrics_rmse: 9.4,
      arima_metrics_mae: 7.2,
      arima_metrics_r2: 0.87,
      lstm_completed: true,
      lstm_normalization: "minmax",
      lstm_features: ["价格指数", "产能利用率"],
      lstm_target_field: "销售数量",
      lstm_metrics_rmse: 7.1,
      lstm_metrics_mae: 5.7,
      lstm_metrics_r2: 0.93,
    });

    let capturedRequest: Record<string, unknown> | null = null;
    await mockGuidedTraining(page, "stacking", {
      actionLabel: "划分层级",
      onCreate: (body) => {
        capturedRequest = body;
      },
      result: {
        status: "success",
        results: {
          metrics: { rmse: 6.9, mae: 5.2, r2: 0.95 },
          eval_y_true: [100, 110, 120, 130, 140, 150, 160, 170],
          eval_predictions: [99, 110, 121, 130, 141, 149, 161, 171],
          meta_model: {
            intercept: 0.5,
            coefficients: [0.55, 0.45],
          },
        },
      },
    });

    await studentApp.open("/model/stacking-ensemble/select-models");
    await studentApp.expectHash("/model/stacking-ensemble/select-models");

    await page.getByRole("checkbox", { name: "ARIMA模型" }).check();
    await page.getByRole("checkbox", { name: "LSTM模型" }).check();
    await studentApp.clickEnabledButton("下一步");

    await studentApp.expectHash("/model/stacking-ensemble/results");
    await completeGuidedTraining(page, "Stacking 融合 - 计算结果", 240_000);

    await studentApp.clickEnabledButton("下一步");
    await studentApp.expectHash("/model/stacking-ensemble/model-metrics-comparison");
    await studentApp.clickEnabledButton("完成");
    await studentApp.expectHash("/model/ensemble-select");

    expect(capturedRequest).not.toBeNull();
    expect(capturedRequest?.models).toBe("arima,lstm");
    expect(capturedRequest?.arimaD).toBe(1);
    expect(capturedRequest?.lstmNormalization).toBe("minmax");
    expectJsonFeatureList(capturedRequest?.lstmFeatures, ["价格指数", "产能利用率"]);
    expect(capturedRequest?.lstmTargetFeature).toBe("销售数量");
  });

  test("weighted-ensemble completes hidden comparison pages and persists selected base models", async ({
    page,
    studentApi,
    studentApp,
  }) => {
    await prepareEnsembleReadyExperiment(studentApi);

    let capturedRequest: Record<string, unknown> | null = null;
    await mockGuidedTraining(page, "weighted_avg", {
      actionLabel: "划分数据",
      onCreate: (body) => {
        capturedRequest = body;
      },
      result: {
        status: "success",
        results: {
          metrics: { rmse: 9.1, mae: 7.2, r2: 0.9 },
          eval_y_true: [100, 110, 120, 130, 140, 150, 160, 170],
          eval_predictions: [99, 111, 121, 129, 141, 151, 159, 171],
          weights: [0.58, 0.42],
          model_names: ["ma", "es"],
        },
      },
    });

    await studentApp.open("/model/weighted-ensemble/select-models");
    await studentApp.expectHash("/model/weighted-ensemble/select-models");

    const nextButton = page.getByRole("button", { name: "下一步" });
    await expect(nextButton).toBeDisabled();

    await page.getByRole("checkbox", { name: "移动平均法" }).check();
    await expect(nextButton).toBeDisabled();

    await page.getByRole("checkbox", { name: "指数平滑法" }).check();
    await expect(nextButton).toBeEnabled();
    await nextButton.click();

    await studentApp.expectHash("/model/weighted-ensemble/results");
    await completeGuidedTraining(page, "加权平均融合 - 计算结果", 240_000);

    await page.getByRole("button", { name: "表格" }).click();
    await expect(page.getByText("移动平均法")).toBeVisible();
    await expect(page.getByText("指数平滑法")).toBeVisible();
    await expect(page.getByText("58.00%")).toBeVisible();
    await expect(page.getByText("42.00%")).toBeVisible();

    await studentApp.clickEnabledButton("下一步");
    await studentApp.expectHash("/model/weighted-ensemble/prediction-comparison");
    await expect(
      page.getByRole("heading", { name: "加权平均融合 - 预测结果" }).first(),
    ).toBeVisible();

    await page.getByRole("button", { name: "图表" }).click();
    await page.getByRole("button", { name: "表格" }).click();

    await studentApp.clickEnabledButton("下一步");
    await studentApp.expectHash("/model/weighted-ensemble/model-metrics-comparison");
    await expect(page.getByText("模型指标对比")).toBeVisible();
    await expect(page.getByText("加权平均融合模型")).toBeVisible();
    await expect(page.getByText("移动平均法")).toBeVisible();
    await expect(page.getByText("指数平滑法")).toBeVisible();

    await studentApp.clickEnabledButton("完成");
    await studentApp.expectHash("/model/ensemble-select");

    expect(capturedRequest).not.toBeNull();
    expect(capturedRequest?.models).toBe("ma,es");

    const activeExperiment = await studentApi.getActiveExperiment();
    expect(activeExperiment).not.toBeNull();
    expect(activeExperiment?.ensemble_weighted_completed).toBe(true);
    expect(activeExperiment?.ensemble_weighted_base_models).toEqual([
      "moving_average",
      "exponential_smoothing",
    ]);
    expect(activeExperiment?.ensemble_weighted_metrics_rmse).toBe(9.1);
    expect(activeExperiment?.ensemble_weighted_metrics_mae).toBe(7.2);
    expect(activeExperiment?.ensemble_weighted_metrics_r2).toBe(0.9);
  });

  test("weighted-ensemble select page shows the empty-state warning when no completed base models are available", async ({
    page,
    studentApi,
    studentApp,
  }) => {
    await prepareModelStageExperiment(studentApi);

    await studentApp.open("/model/weighted-ensemble/select-models");
    await studentApp.expectHash("/model/weighted-ensemble/select-models");

    await expect(
      page.getByText("没有已完成的基础模型可供选择。请先完成至少两个基础模型的训练。"),
    ).toBeVisible();
    await expect(page.locator('input[name="basemodel"]')).toHaveCount(0);
    await expect(page.getByRole("button", { name: "下一步" })).toBeDisabled();
  });

  test("weighted-ensemble lets users switch to another valid model set after a failed run", async ({
    page,
    studentApi,
    studentApp,
  }) => {
    await prepareEnsembleReadyExperiment(studentApi, {
      arima_d: 1,
      arima_p: 2,
      arima_q: 1,
      arima_completed: true,
      arima_metrics_rmse: 10.8,
      arima_metrics_mae: 8.1,
      arima_metrics_r2: 0.86,
    });

    const seenModelSets: string[] = [];
    await mockGuidedTraining(page, "weighted_avg", {
      actionLabel: "划分数据",
      onCreate: (body) => {
        const models = String(body.models ?? "");
        seenModelSets.push(models);
      },
      result: {
        status: "success",
        results: {
          metrics: { rmse: 7.9, mae: 6.1, r2: 0.9 },
          eval_y_true: [100, 110, 120, 130, 140, 150, 160, 170],
          eval_predictions: [100, 109, 121, 128, 142, 149, 160, 170],
          weights: [0.62, 0.38],
          model_names: ["ma", "arima"],
        },
      },
      failRun: (_attempt, body) => {
        const models = String(body.models ?? "");
        return models === "ma,es"
          ? { error: "forced weighted failure for ma,es" }
          : null;
      },
    });

    await studentApp.open("/model/weighted-ensemble/select-models");
    await studentApp.expectHash("/model/weighted-ensemble/select-models");

    await page.getByRole("checkbox", { name: "移动平均法" }).check();
    await page.getByRole("checkbox", { name: "指数平滑法" }).check();
    await studentApp.clickEnabledButton("下一步");
    await studentApp.expectHash("/model/weighted-ensemble/results");
    await runGuidedTrainingAttempt(page);
    await expect(page.getByText("forced weighted failure for ma,es")).toBeVisible({
      timeout: 30_000,
    });

    await studentApp.clickEnabledButton("上一步");
    await studentApp.expectHash("/model/weighted-ensemble/select-models");

    await page.getByRole("checkbox", { name: "指数平滑法" }).uncheck();
    await page.getByRole("checkbox", { name: "ARIMA模型" }).check();
    await expect(page.getByText("forced weighted failure for ma,es")).toHaveCount(0);

    const nextButton = page.getByRole("button", { name: "下一步" });
    await expect(nextButton).toBeEnabled();
    await nextButton.click();

    await studentApp.expectHash("/model/weighted-ensemble/results");
    await completeGuidedTraining(page, "加权平均融合 - 计算结果", 240_000);
    await page.getByRole("button", { name: "表格" }).click();
    await expect(page.getByText("移动平均法")).toBeVisible();
    await expect(page.getByText("ARIMA模型")).toBeVisible();
    expect(seenModelSets).toEqual(["ma,es", "ma,arima"]);
  });

  test("boosting ensemble falls back after the single allowed retry fails", async ({
    page,
    studentApi,
    studentApp,
  }) => {
    await prepareEnsembleReadyExperiment(studentApi);

    const guidedMock = await mockGuidedTraining(page, "boosting", {
      actionLabel: "初始化残差",
      result: {
        status: "success",
        results: {
          metrics: { rmse: 8.8, mae: 6.9, r2: 0.92 },
          eval_y_true: [100, 110, 120, 130, 140, 150, 160, 170],
          eval_predictions: [101, 109, 121, 128, 141, 149, 161, 169],
        },
      },
      failRun: () => ({ error: "forced boosting training failure" }),
    });

    await studentApp.open("/model/boosting-ensemble/select-models");
    await studentApp.expectHash("/model/boosting-ensemble/select-models");

    await page.getByRole("checkbox", { name: "移动平均法" }).check();
    await page.getByRole("checkbox", { name: "指数平滑法" }).check();
    await studentApp.clickEnabledButton("下一步");
    await runGuidedTrainingAttempt(page);

    const retryButton = page.getByRole("button", { name: "重试" });
    await expect(retryButton).toBeVisible({ timeout: 30_000 });

    await retryButton.click();

    await expect(
      page.getByText("我们已经重试一次，但仍然无法成功计算。"),
    ).toBeVisible({ timeout: 30_000 });
    expect(guidedMock.attempts).toBe(2);

    await page.getByRole("button", { name: "重新选择产品" }).click();
    await studentApp.expectHash("/product");
  });
});
