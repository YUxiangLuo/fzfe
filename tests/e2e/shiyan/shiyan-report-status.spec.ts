import { expect, test } from "@playwright/test";
import { expectHashPath, loginAsStudent } from "./helpers";

test("@shiyan 报告状态检查：未驳回时直接进入实验介绍", async ({ page }) => {
  test.setTimeout(2 * 60 * 1000);

  await page.route("**/api/v1/my-latest-report-status", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        is_rejected: false,
      }),
    });
  });

  await loginAsStudent(page);
  await expectHashPath(page, "/introduction");
  await expect(page.getByText("生产计划决策虚拟仿真系统")).toBeVisible();
});

test("@shiyan 报告状态检查：驳回分支与重新实验入口", async ({ page }) => {
  test.setTimeout(3 * 60 * 1000);

  await page.route("**/api/v1/my-latest-report-status", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        is_rejected: true,
        experiment: {
          experiment_id: 990001,
          status: "Completed",
          current_step: 8,
          start_time: "2026-02-10T09:00:00.000Z",
          last_activity_at: "2026-02-10T11:00:00.000Z",
          completion_time: "2026-02-10T11:00:00.000Z",
        },
        report: {
          report_id: 880001,
          experiment_id: 990001,
          student_id: 20240002,
          report_content: "<h1>旧报告</h1>",
          pdf_file_path: null,
          status: "rejected",
          submitted_at: "2026-02-10T11:10:00.000Z",
          grade: null,
          feedback: "请补充模型评估依据，并重新提交完整分析。",
          graded_by: 101,
        },
      }),
    });
  });

  await page.route("**/api/v1/students/me/experiment-runs", (route) => {
    if (route.request().method() !== "POST") {
      route.continue();
      return;
    }
    route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        experiment_id: 990002,
        student_id: 20240002,
        status: "In Progress",
        highest_completed_step: 0,
        current_step: 1,
        start_time: "2026-02-11T09:00:00.000Z",
        last_activity_at: "2026-02-11T09:00:00.000Z",
        completion_time: null,
      }),
    });
  });

  await loginAsStudent(page);

  await expect(page.getByText("您的上一份实验报告已被驳回")).toBeVisible();
  await expect(page.getByText("教师评语 / 驳回原因：")).toBeVisible();
  await expect(page.getByText("请补充模型评估依据，并重新提交完整分析。")).toBeVisible();
  await expect(page.getByText("被驳回的实验信息")).toBeVisible();

  await page.getByRole("button", { name: "重新进行实验" }).click();
  await expectHashPath(page, "/industry");
});

test("@shiyan 报告状态检查：接口异常时展示兜底页并允许进入实验介绍", async ({
  page,
}) => {
  test.setTimeout(2 * 60 * 1000);

  await page.route("**/api/v1/my-latest-report-status", (route) => {
    route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({
        message: "internal server error",
      }),
    });
  });

  await loginAsStudent(page);

  await expect(page.getByText("出错了")).toBeVisible();
  await expect(page.getByText("无法获取报告状态，请稍后重试。")).toBeVisible();

  await page.getByRole("button", { name: "直接进入实验首页" }).click();
  await expectHashPath(page, "/introduction");
});
