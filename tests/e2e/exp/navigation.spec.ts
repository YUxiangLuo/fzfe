import { expect, test } from "@playwright/test";
import { createFakeJwt, setTokenBeforeNavigation } from "../helpers/auth";
import { installExperimentApiMock } from "../helpers/expApiMock";

test.describe("Experiment Smoke", () => {
  test.beforeEach(async ({ page }) => {
    await installExperimentApiMock(page);
    const studentToken = createFakeJwt({
      sub: 1001,
      username: "student_e2e",
      full_name: "实验学生",
      role: "Student",
    });
    await setTokenBeforeNavigation(page, studentToken);
    await page.goto("/exp");
  });

  test("can start experiment and navigate to historical data", async ({ page }) => {
    await expect(page.getByText("面向企业多源需求融合预测的")).toBeVisible();

    await page.getByRole("button", { name: "下一步" }).click();
    await expect(page.getByText("实验流程概览")).toBeVisible();

    await page.getByRole("button", { name: "下一步" }).click();
    await expect(page.getByRole("button", { name: "开始实验" })).toBeVisible();

    await page.getByRole("button", { name: "开始实验" }).click();
    await expect(page).toHaveURL(/\/exp#\/industry$/);
    await expect(page.getByRole("heading", { name: "步骤 1: 选择行业" })).toBeVisible();

    await page.getByText("消费电子").first().click();
    await page.getByRole("button", { name: "下一步" }).click();
    await expect(page).toHaveURL(/\/exp#\/company$/);
    await expect(page.getByRole("heading", { name: "步骤 2: 选择企业" })).toBeVisible();

    await page.getByText("华东工厂").first().click();
    await page.getByRole("button", { name: "下一步" }).click();
    await expect(page).toHaveURL(/\/exp#\/product$/);
    await expect(page.getByRole("heading", { name: "步骤 3: 选择产品" })).toBeVisible();

    await page.getByText("旗舰手机A").first().click();
    await page.getByRole("button", { name: "下一步" }).click();
    await expect(page).toHaveURL(/\/exp#\/data$/);
    await expect(page.getByRole("heading", { name: "步骤 4: 历史数据分析" })).toBeVisible();
    await expect(page.getByText("统计性表格")).toBeVisible();
  });
});
