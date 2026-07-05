import { test, expect } from "./fixtures";
import { ApiError } from "./support/backend";

test.describe("@shiyan bootstrap", () => {
  test("student UI login boots the app and starting a new experiment creates an active run", async ({
    studentApi,
    studentApp,
  }) => {
    await studentApi.cleanupInProgressExperiments();

    await studentApp.loginViaUi();
    await studentApp.expectHash("/introduction");
    await studentApp.startNewExperimentFromIntroduction();

    const activeExperiment = await studentApi.getActiveExperiment();
    expect(activeExperiment).not.toBeNull();
    expect(activeExperiment?.experiment_id).toBeGreaterThan(0);
    expect(activeExperiment?.status).not.toBe("Completed");
  });

  test("default bootstrap enters the introduction page when the latest experiment has no report", async ({
    studentApi,
    studentApp,
  }) => {
    await studentApi.ensureFreshExperiment();
    await studentApp.open("/");
    await studentApp.expectHash("/introduction");

    const reportStatus = await studentApi.getLatestReportStatus();
    expect(reportStatus.is_rejected).toBe(false);
    expect(reportStatus.has_report).toBe(false);
  });

  test("active experiment API returns 404 only when no in-progress experiment exists", async ({
    studentApi,
  }) => {
    await studentApi.cleanupInProgressExperiments();

    const active = await studentApi.getActiveExperiment();
    expect(active).toBeNull();

    const created = await studentApi.createExperiment();
    const activeAfterCreate = await studentApi.getActiveExperiment();
    expect(activeAfterCreate?.experiment_id).toBe(created.experiment_id);

    await studentApi.deleteExperiment(created.experiment_id);

    try {
      await studentApi.getActiveExperiment();
    } catch (error) {
      if (error instanceof ApiError) {
        throw new Error(`expected null from getActiveExperiment, got ${error.status}`);
      }
      throw error;
    }
  });
});
