import { expect, test, type Page } from "@playwright/test";
import { expectHashPath, loginAsStudent } from "./helpers";

async function mockActiveExperiment(
  page: Page,
  overrides: Record<string, unknown>,
) {
  await page.route("**/api/v1/students/me/experiment-runs/active", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        experiment_id: 880001,
        student_id: 20240002,
        status: "In Progress",
        highest_completed_step: 0,
        current_step: 1,
        start_time: "2026-02-01T00:00:00.000Z",
        last_activity_at: "2026-02-01T00:00:00.000Z",
        completion_time: null,
        ...overrides,
      }),
    });
  });
}

test("@shiyan 路由守卫：低进度状态下受限路由应回退到当前步骤", async ({
  page,
}) => {
  test.setTimeout(2 * 60 * 1000);
  await mockActiveExperiment(page, {
    highest_completed_step: 0,
    current_step: 1,
    quiz_about_model_completed: false,
    quiz_about_plan_completed: false,
  });
  await loginAsStudent(page);

  const guardedTargets = [
    "/company",
    "/product",
    "/data",
    "/model",
    "/evaluation",
    "/production",
    "/quiz",
    "/quiz-plan",
    "/report",
  ];

  for (const target of guardedTargets) {
    await page.goto(`/exp.html#${target}`);
    await expectHashPath(page, "/industry");
  }
});

test("@shiyan 路由守卫：report 在生产已完成但计划测验未完成时回退 quiz-plan", async ({
  page,
}) => {
  test.setTimeout(2 * 60 * 1000);
  await mockActiveExperiment(page, {
    highest_completed_step: 7,
    current_step: 7,
    quiz_about_model_completed: true,
    quiz_about_plan_completed: false,
  });
  await loginAsStudent(page);

  await page.goto("/exp.html#/quiz");
  await expectHashPath(page, "/quiz");

  await page.goto("/exp.html#/report");
  await expectHashPath(page, "/quiz-plan");
  await expect(page.getByText("生产计划知识测验")).toBeVisible();
});
