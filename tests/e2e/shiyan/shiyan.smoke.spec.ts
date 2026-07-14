import { test, expect } from "./fixtures";
import { SHIYAN_COMPANY, SHIYAN_INDUSTRY } from "./support/constants";

test.describe("@shiyan @smoke 核心路径", () => {
  test("学生可以通过 UI 登录并启动新实验", async ({
    studentApi,
    studentApp,
  }) => {
    await studentApi.cleanupInProgressExperiments();

    await studentApp.loginViaUi();
    const reportHomeButton = studentApp.currentPage.getByRole("button", {
      name: "进入实验首页",
    });
    await expect
      .poll(async () => (
        new URL(studentApp.currentPage.url()).hash === "#/introduction"
        || await reportHomeButton.isVisible().catch(() => false)
      ))
      .toBe(true);
    if (await reportHomeButton.isVisible().catch(() => false)) {
      await reportHomeButton.click();
    }
    await studentApp.expectHash("/introduction");
    await studentApp.startNewExperimentFromIntroduction();

    const activeExperiment = await studentApi.getActiveExperiment();
    expect(activeExperiment).not.toBeNull();
    expect(activeExperiment?.experiment_id).toBeGreaterThan(0);
    expect(activeExperiment?.status).not.toBe("Completed");
  });

  test("学生从锁定路由进入时会被重定向到当前可访问步骤", async ({
    studentApi,
    studentApp,
  }) => {
    const experiment = await studentApi.ensureFreshExperiment();
    await studentApi.updateExperiment(experiment.experiment_id, {
      selected_industry: SHIYAN_INDUSTRY,
      selected_company: SHIYAN_COMPANY,
      current_step: 3,
      highest_completed_step: 2,
    });

    await studentApp.open("/evaluation");
    await studentApp.expectHash("/industry");
  });

  test("学生可以从 introduction 恢复未完成实验", async ({
    page,
    studentApi,
    studentApp,
  }) => {
    const experiment = await studentApi.ensureFreshExperiment();
    await studentApi.updateExperiment(experiment.experiment_id, {
      selected_industry: SHIYAN_INDUSTRY,
      selected_company: SHIYAN_COMPANY,
      current_step: 3,
      highest_completed_step: 2,
    });

    await studentApp.open("/introduction");
    await studentApp.advanceIntroductionToFinalStep();
    await studentApp.clickEnabledButton("开始实验");

    await expect(page.getByText("检测到未完成的实验")).toBeVisible();
    await expect(page.getByText("步骤 3 / 7")).toBeVisible();

    await studentApp.clickEnabledButton("继续未完成的实验");
    await studentApp.expectHash("/product");
  });
});
