import { expect, test, type Page } from "@playwright/test";
import { expectHashPath, loginAsStudent } from "./helpers";

async function mockModelStageExperiment(
  page: Page,
  overrides: Record<string, unknown> = {},
) {
  await page.route("**/api/v1/students/me/experiment-runs/active", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        experiment_id: 880404,
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
        moving_average_window: 6,
        moving_average_completed: false,
        start_time: "2026-02-01T00:00:00.000Z",
        last_activity_at: "2026-02-01T00:00:00.000Z",
        completion_time: null,
        ...overrides,
      }),
    });
  });
}

test("@shiyan 模型训练重试：连续失败三次后进入兜底页", async ({ page }) => {
  test.setTimeout(4 * 60 * 1000);

  await mockModelStageExperiment(page);

  await page.route("**/api/v1/models/ma/training", (route) => {
    if (route.request().method() !== "POST") {
      route.continue();
      return;
    }

    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ message: "forced e2e persistent failure" }),
    });
  });

  await loginAsStudent(page);
  await page.goto("/exp.html#/model/moving-average/results");
  await expectHashPath(page, "/model/moving-average/results");

  const retryButton = page.getByRole("button", { name: "重试" });
  await expect(retryButton).toBeVisible();

  await retryButton.click();
  await expect(retryButton).toBeVisible();
  await retryButton.click();

  await expect(
    page.getByText("我们尝试了多次，但仍然无法成功计算。"),
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("button", { name: "重新选择数据时段" })).toBeVisible();
  await expect(page.getByRole("button", { name: "重新选择产品" })).toBeVisible();

  await page.getByRole("button", { name: "重新选择数据时段" }).click();
  await expectHashPath(page, "/model/window");
});
