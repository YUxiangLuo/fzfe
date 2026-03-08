import { test, expect } from "./fixtures";
import { SHIYAN_COMPANY, SHIYAN_INDUSTRY } from "./support/constants";

test.describe("@shiyan route guards and resume", () => {
  test("direct access to locked routes is redirected by the real app state", async ({
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

  test("introduction resume dialog continues to the persisted workflow step", async ({
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
