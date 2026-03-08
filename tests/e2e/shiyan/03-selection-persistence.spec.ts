import { test, expect } from "./fixtures";
import {
  DEFAULT_DATA_WINDOW,
  SHIYAN_COMPANY,
  SHIYAN_INDUSTRY,
  SHIYAN_PRIMARY_PRODUCT,
} from "./support/constants";

test("@shiyan selection flow persists the real experiment state", async ({
  studentApi,
  studentApp,
}) => {
  await studentApi.cleanupInProgressExperiments();

  await studentApp.open("/introduction");
  await studentApp.startNewExperimentFromIntroduction();
  await studentApp.completeDefaultSelectionPath();
  await studentApp.configureDefaultDataWindow();

  await expect
    .poll(() => new URL(studentApp.currentPage.url()).hash, { timeout: 20_000 })
    .toBe("#/model/model-intro");

  const activeExperiment = await studentApi.getActiveExperiment();
  expect(activeExperiment).not.toBeNull();
  expect(activeExperiment?.selected_industry).toBe(SHIYAN_INDUSTRY);
  expect(activeExperiment?.selected_company).toBe(SHIYAN_COMPANY);
  expect(activeExperiment?.selected_product).toBe(SHIYAN_PRIMARY_PRODUCT);
  expect(activeExperiment?.data_window_train_start_index).toBe(
    Number(DEFAULT_DATA_WINDOW.trainStart),
  );
  expect(activeExperiment?.data_window_train_end_index).toBe(
    Number(DEFAULT_DATA_WINDOW.trainEnd),
  );
  expect(activeExperiment?.data_window_evaluate_start_index).toBe(
    Number(DEFAULT_DATA_WINDOW.evaluateStart),
  );
  expect(activeExperiment?.data_window_evaluate_end_index).toBe(
    Number(DEFAULT_DATA_WINDOW.evaluateEnd),
  );
  expect((activeExperiment?.highest_completed_step ?? 0) >= 4).toBe(true);
  expect((activeExperiment?.current_step ?? 0) >= 5).toBe(true);
});
