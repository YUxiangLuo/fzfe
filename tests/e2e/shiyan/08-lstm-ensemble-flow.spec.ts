import { test, expect } from "./fixtures";
import { completeLstmWeightedFlowToReportStage } from "./support/slow-flow";
import { completeReportAndLogout } from "./support/ui-flow";

test("@shiyan LSTM-based weighted ensemble completes full flow including prediction", async ({
  page,
  studentApi,
  studentApp,
}) => {
  test.slow();

  await studentApi.cleanupInProgressExperiments();
  await studentApp.open("/introduction");
  await completeLstmWeightedFlowToReportStage(page);
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
});
