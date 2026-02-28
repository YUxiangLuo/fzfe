import { expect, test, type Page } from "@playwright/test";
import {
  clickLastEnabledButton,
  completeIndustryCompanyProductAndGotoModelWindow,
  completeIntroductionAndStartExperiment,
  expectHashPath,
  loginAsStudent,
} from "./helpers";

async function mockWindowStageExperiment(page: Page) {
  await page.route("**/api/v1/students/me/experiment-runs/active", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        experiment_id: 880202,
        student_id: 20240002,
        status: "In Progress",
        highest_completed_step: 4,
        current_step: 5,
        selected_industry: "E2E智能制造业",
        selected_company: "E2E样本企业A",
        selected_product: "智能传感器A型",
        start_time: "2026-02-01T00:00:00.000Z",
        last_activity_at: "2026-02-01T00:00:00.000Z",
        completion_time: null,
      }),
    });
  });
}

test("@shiyan 数据窗口校验：训练区间、重叠与连续性约束", async ({ page }) => {
  test.setTimeout(5 * 60 * 1000);

  await loginAsStudent(page);
  await completeIntroductionAndStartExperiment(page);
  await completeIndustryCompanyProductAndGotoModelWindow(page);

  const selects = page.locator("select");
  await expect(selects).toHaveCount(4);

  // 训练结束=开始，不允许
  await selects.nth(0).selectOption("0");
  await selects.nth(1).selectOption("0");
  await selects.nth(2).selectOption("1");
  await selects.nth(3).selectOption("2");
  await expect(
    page.getByText("训练区间的结束月份必须大于开始月份（至少跨越2个月）"),
  ).toBeVisible();

  // 评估区间与训练区间重叠，不允许
  await selects.nth(1).selectOption("10");
  await selects.nth(2).selectOption("10");
  await selects.nth(3).selectOption("12");
  await expect(page.getByText("评估区间必须在训练区间之后，不能重叠")).toBeVisible();

  // 评估区间必须紧接训练区间
  await selects.nth(2).selectOption("12");
  await selects.nth(3).selectOption("14");
  await expect(page.getByText("评估区间必须紧接着训练区间")).toBeVisible();

  // 修正为合法区间后可进入下一步
  await selects.nth(2).selectOption("11");
  await selects.nth(3).selectOption("14");
  await clickLastEnabledButton(page, "下一步");
  await expectHashPath(page, "/model/model-intro");
});

test("@shiyan 数据窗口校验：包含空白月份时阻止继续", async ({ page }) => {
  test.setTimeout(5 * 60 * 1000);

  await mockWindowStageExperiment(page);
  await page.route("**/api/v1/datasets/**/sales", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        meta: {
          industry: "E2E智能制造业",
          company: "E2E样本企业A",
          product: "智能传感器A型",
          name: "智能传感器A型",
          description: "E2E 空白月份校验数据",
          unit: "件",
        },
        monthlySales: [
          { month: "2023-01", sales: 100 },
          { month: "2023-02", sales: 120 },
          { month: "2023-04", sales: 130 },
          { month: "2023-05", sales: 140 },
          { month: "2023-06", sales: 160 },
        ],
      }),
    });
  });

  await loginAsStudent(page);
  await page.goto("/exp.html#/model/window");
  await expectHashPath(page, "/model/window");

  const selects = page.locator("select");
  await expect(selects).toHaveCount(4);

  // 区间覆盖 2023-03（由缺失月份补齐为空白）
  await selects.nth(0).selectOption("0");
  await selects.nth(1).selectOption("2");
  await selects.nth(2).selectOption("3");
  await selects.nth(3).selectOption("4");

  await expect(
    page.getByText("训练区间包含 1 个空白数据月份：2023-03"),
  ).toBeVisible();
});
