import { expect, test, type Page } from "@playwright/test";
import { expectHashPath, loginAsStudent } from "./helpers";

const TRAINING_LOCK_MESSAGE =
  "融合模型训练进行中，请等待当前训练完成后再离开此页面";

async function mockWeightedEnsembleStageExperiment(
  page: Page,
  overrides: Record<string, unknown> = {},
) {
  await page.route("**/api/v1/students/me/experiment-runs/active", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        experiment_id: 880303,
        student_id: 20240002,
        status: "In Progress",
        highest_completed_step: 4,
        current_step: 5,
        selected_industry: "E2E智能制造业",
        selected_company: "E2E样本企业A",
        selected_product: "智能传感器A型",
        data_window_train_start_index: 0,
        data_window_train_end_index: 27,
        data_window_evaluate_start_index: 28,
        data_window_evaluate_end_index: 35,
        selected_base_models: ["moving_average", "exponential_smoothing"],
        moving_average_completed: true,
        exponential_smoothing_completed: true,
        start_time: "2026-02-01T00:00:00.000Z",
        last_activity_at: "2026-02-01T00:00:00.000Z",
        completion_time: null,
        ...overrides,
      }),
    });
  });
}

test("@shiyan 训练锁：融合模型训练期间禁止离开页面", async ({ page }) => {
  test.setTimeout(4 * 60 * 1000);

  await mockWeightedEnsembleStageExperiment(page);

  let releaseTraining: (() => void) | null = null;
  const trainingGate = new Promise<void>((resolve) => {
    releaseTraining = resolve;
  });

  await page.route("**/api/v1/models/weighted_avg/training", async (route) => {
    await trainingGate;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        results: {
          metrics: { rmse: 12.3, mae: 9.1, r2: 0.82 },
          eval_y_true: [100, 110],
          eval_predictions: [101, 109],
          weights: [0.58, 0.42],
          model_names: ["ma", "es"],
        },
      }),
    });
  });

  await loginAsStudent(page);
  await page.goto("/exp.html#/model/weighted-ensemble/select-models");
  await expectHashPath(page, "/model/weighted-ensemble/select-models");

  await page.getByRole("checkbox", { name: "移动平均法" }).check();
  await page.getByRole("checkbox", { name: "指数平滑法" }).check();
  await page.getByRole("button", { name: "下一步" }).click();

  await expectHashPath(page, "/model/weighted-ensemble/results");
  await expect(page.getByText("融合模型训练中")).toBeVisible();
  await expect(page.getByText("预计需要几分钟时间")).toBeVisible();

  const profileLink = page.getByRole("link", { name: "个人信息" });
  await expect(profileLink).toHaveAttribute("aria-disabled", "true");
  await expect(profileLink).toHaveAttribute("title", TRAINING_LOCK_MESSAGE);
  await profileLink.click({ force: true });
  await expectHashPath(page, "/model/weighted-ensemble/results");

  const sidebar = page.locator("aside, nav").first();
  await expect(sidebar.getByRole("link", { name: /选择行业/ })).toHaveCount(0);
  await expect(sidebar.getByRole("link", { name: /结果评估/ })).toHaveCount(0);

  releaseTraining?.();

  await expect(page.getByText("加权平均融合 - 计算结果")).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByRole("button", { name: "下一步" })).toBeEnabled();
});
