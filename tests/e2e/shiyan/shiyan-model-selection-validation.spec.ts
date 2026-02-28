import { expect, test, type Page } from "@playwright/test";
import {
  clickLastEnabledButton,
  completeIndustryCompanyProductAndDataWindow,
  completeIntroductionAndStartExperiment,
  expectHashPath,
  loginAsStudent,
} from "./helpers";

async function mockModelStageExperiment(
  page: Page,
  overrides: Record<string, unknown>,
) {
  const state = {
    experiment_id: 880101,
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
    start_time: "2026-02-01T00:00:00.000Z",
    last_activity_at: "2026-02-01T00:00:00.000Z",
    completion_time: null,
    ...overrides,
  } as Record<string, unknown>;

  await page.route("**/api/v1/students/me/experiment-runs/active", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(state),
    });
  });

  await page.route(/\/api\/v1\/experiment-runs\/\d+$/, async (route) => {
    if (route.request().method() !== "PUT") {
      await route.continue();
      return;
    }

    const payload = route.request().postDataJSON() as Record<string, unknown>;
    Object.assign(state, payload);

    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(state),
    });
  });
}

test("@shiyan 基础模型选择：至少选择两个模型后才可继续", async ({ page }) => {
  test.setTimeout(6 * 60 * 1000);

  await loginAsStudent(page);
  await completeIntroductionAndStartExperiment(page);
  await completeIndustryCompanyProductAndDataWindow(page);

  for (let i = 0; i < 4; i += 1) {
    await clickLastEnabledButton(page, /下一个模型|选择基础模型/);
  }

  await expect(page.getByText("请选择至少两个基础模型进行后续的训练和对比。")).toBeVisible();

  const nextButton = page.getByRole("button", { name: "下一步" });
  await expect(nextButton).toBeDisabled();
  await expect(page.getByText("请至少选择两个模型。")).toBeVisible();

  await page.getByRole("checkbox", { name: "移动平均法" }).check();
  await expect(nextButton).toBeDisabled();

  await page.getByRole("checkbox", { name: "指数平滑法" }).check();
  await expect(nextButton).toBeEnabled();
  await nextButton.click();

  await expectHashPath(page, "/model/model-select");
  await expect(page.getByText("请完成您选择的基础模型")).toBeVisible();
});

test("@shiyan 融合模型选择：至少选择一个模型后才可继续", async ({ page }) => {
  test.setTimeout(3 * 60 * 1000);

  await mockModelStageExperiment(page, {
    selected_base_models: ["moving_average", "exponential_smoothing"],
    moving_average_completed: true,
    exponential_smoothing_completed: true,
    selected_ensemble_models: [],
  });
  await loginAsStudent(page);

  await page.goto("/exp.html#/model/ensemble-intro");
  await expectHashPath(page, "/model/ensemble-intro");

  for (let i = 0; i < 3; i += 1) {
    await clickLastEnabledButton(page, /下一个模型|选择融合模型/);
  }

  await expect(page.getByText("请选择至少一个融合模型进行训练。")).toBeVisible();
  await expect(page.getByText("请至少选择一个模型。")).toBeVisible();

  const nextButton = page.getByRole("button", { name: "下一步" });
  await expect(nextButton).toBeDisabled();

  await page.getByRole("checkbox", { name: "加权平均融合" }).check();
  await expect(nextButton).toBeEnabled();
  await nextButton.click();

  await expectHashPath(page, "/model/ensemble-select");
  await expect(page.getByText("请完成您选择的融合模型")).toBeVisible();
});
