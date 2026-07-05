import { test, expect } from "./fixtures";
import { completeWeightedFlowToReportStage } from "./support/slow-flow";
import { completeReportAndLogout } from "./support/ui-flow";

test("@shiyan weighted ensemble path completes report submission against the real backend", async ({
  page,
  studentApi,
  studentApp,
}) => {
  test.slow();

  await studentApi.cleanupInProgressExperiments();
  await studentApp.open("/introduction");
  await completeWeightedFlowToReportStage(page);
  await completeReportAndLogout(page);

  const experiments = await studentApi.listExperiments();
  expect(experiments.length).toBeGreaterThan(0);

  const latestExperiment = [...experiments].sort(
    (left, right) => right.experiment_id - left.experiment_id,
  )[0];
  expect(latestExperiment).toBeDefined();
  expect(latestExperiment?.selected_best_model).toBe("ensemble_weighted");
  expect(latestExperiment?.production_plan_completed).toBe(true);
  expect((latestExperiment?.highest_completed_step ?? 0) >= 7).toBe(true);

  const latestReportStatus = await studentApi.getLatestReportStatus();
  expect(latestReportStatus.is_rejected).toBe(false);
  expect(latestReportStatus.has_report).toBe(true);
  expect(latestReportStatus.report?.status).toBe("submitted");

  await studentApp.open("/");
  await expect(page.getByText("您的实验报告已提交")).toBeVisible();
  await expect(page.getByText("待评分")).toBeVisible();
  await page.getByRole("button", { name: "进入实验首页" }).click();
  await studentApp.expectHash("/introduction");
});
