import { expect, test } from "@playwright/test";
import { createFakeJwt, setTokenBeforeNavigation } from "../helpers/auth";
import { installExperimentApiMock } from "../helpers/expApiMock";

const createStudentToken = () =>
  createFakeJwt({
    sub: 1001,
    username: "student_e2e",
    full_name: "实验学生",
    role: "Student",
  });

const SAMPLE_MPS_TABLE = [
  {
    period: 1,
    period_label: "期 1",
    demand_forecast: 1500,
    safety_stock: 0,
    planned_production: 1500,
    beginning_inventory: 0,
    production_output: 1500,
    ending_inventory: 0,
    stockout: 0,
    service_level: 1,
  },
  {
    period: 2,
    period_label: "期 2",
    demand_forecast: 1520,
    safety_stock: 120,
    planned_production: 1640,
    beginning_inventory: 0,
    production_output: 1500,
    ending_inventory: 0,
    stockout: 20,
    service_level: 0.9868,
  },
  {
    period: 3,
    period_label: "期 3",
    demand_forecast: 1540,
    safety_stock: 130,
    planned_production: 1690,
    beginning_inventory: 0,
    production_output: 1640,
    ending_inventory: 100,
    stockout: 0,
    service_level: 1,
  },
];

test.describe("Experiment Advanced Flow", () => {
  test("can select best model and submit model quiz", async ({ page }) => {
    await installExperimentApiMock(page, {
      initialExperimentState: {
        experiment_id: 9001,
        student_id: 1001,
        status: "In Progress",
        highest_completed_step: 5,
        current_step: 6,
        selected_industry: "消费电子",
        selected_company: "华东工厂",
        selected_product: "旗舰手机A",
        data_window_train_start_index: 0,
        data_window_train_end_index: 17,
        data_window_evaluate_start_index: 18,
        data_window_evaluate_end_index: 23,
        moving_average_completed: true,
        moving_average_metrics_rmse: 10.12,
        moving_average_metrics_mae: 8.21,
        moving_average_metrics_r2: 0.93,
      },
    });
    await setTokenBeforeNavigation(page, createStudentToken());

    await page.goto("/exp#/evaluation");
    await expect(page.getByText("最优准则")).toBeVisible();

    await page.locator("label").filter({ hasText: "移动平均法" }).first().click();
    await page.getByRole("button", { name: "下一步" }).click();

    await expect(page).toHaveURL(/\/exp#\/quiz$/);
    await expect(page.getByRole("heading", { name: "预测模型知识测验" })).toBeVisible();

    const quizQuestions = page.locator("div.border-b.border-gray-200.pb-6");
    const questionCount = await quizQuestions.count();
    for (let i = 0; i < questionCount; i += 1) {
      await quizQuestions.nth(i).locator("label").first().click();
    }

    await page.getByRole("button", { name: "提交答案，开始制定生产计划" }).click();
    await expect(page).toHaveURL(/\/exp#\/production/);
    await expect(page.getByText("步骤 7: 制定生产计划")).toBeVisible();
  });

  test("can submit plan quiz and final experiment report", async ({ page }) => {
    await installExperimentApiMock(page, {
      initialExperimentState: {
        experiment_id: 9001,
        student_id: 1001,
        status: "In Progress",
        highest_completed_step: 7,
        current_step: 7,
        selected_industry: "消费电子",
        selected_company: "华东工厂",
        selected_product: "旗舰手机A",
        data_window_train_start_index: 0,
        data_window_train_end_index: 17,
        data_window_evaluate_start_index: 18,
        data_window_evaluate_end_index: 23,
        selected_best_model: "ma",
        moving_average_completed: true,
        moving_average_metrics_rmse: 10.12,
        moving_average_metrics_mae: 8.21,
        moving_average_metrics_r2: 0.93,
        production_plan_completed: true,
        production_forecast_periods: 6,
        production_initial_inventory: 0,
        production_target_service_level: 0.99,
        production_safety_stock_z_score: 2.33,
        production_capacity: 1700,
        production_capacity_scenario: "normal",
        production_mps_table: SAMPLE_MPS_TABLE,
      },
    });
    await setTokenBeforeNavigation(page, createStudentToken());

    await page.goto("/exp#/quiz-plan");
    await expect(page.getByRole("heading", { name: "生产计划知识测验" })).toBeVisible();

    const quizQuestions = page.locator("div.border-b.border-gray-200.pb-6");
    const questionCount = await quizQuestions.count();
    for (let i = 0; i < questionCount; i += 1) {
      await quizQuestions.nth(i).locator("label").first().click();
    }

    await page.getByRole("button", { name: "提交答案，开始编写实验报告" }).click();
    await expect(page).toHaveURL(/\/exp#\/report$/);
    await expect(page.getByRole("heading", { name: "实验报告" })).toBeVisible();

    const analysisTextareas = page.locator(
      'textarea[placeholder="请根据上述实验结果展开具体分析..."]',
    );
    await expect(analysisTextareas).toHaveCount(5);
    for (let i = 0; i < 5; i += 1) {
      await analysisTextareas.nth(i).fill(`E2E report analysis section ${i + 1}`);
    }

    await page.getByRole("button", { name: "保存并提交报告" }).click();
    await expect(page.getByRole("heading", { name: "恭喜！实验完成" })).toBeVisible();
  });
});
