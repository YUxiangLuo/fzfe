import { test } from "@playwright/test";
import {
  loginAsStudent,
  completeIntroductionAndStartExperiment,
  completeIndustryCompanyProductAndDataWindow,
  completeBaseModelIntroAndSelectAll,
  completeMovingAverage,
  completeExponentialSmoothing,
  completeARIMA,
  completeLSTM,
  completeEnsembleIntroAndSelect,
  completeStackingEnsemble,
  enterEvaluation,
  completeEvaluationAndModelQuiz,
  completeProductionAndPlanQuiz,
  completeReportAndLogout,
} from "./helpers";

test("@shiyan 全模型覆盖（ARIMA + LSTM + Stacking）", async ({ page }) => {
  test.setTimeout(25 * 60 * 1000);

  await loginAsStudent(page);
  await completeIntroductionAndStartExperiment(page);
  await completeIndustryCompanyProductAndDataWindow(page);

  // Select all 4 base models
  await completeBaseModelIntroAndSelectAll(page);

  // Train all 4 base models
  await completeMovingAverage(page);
  await completeExponentialSmoothing(page);
  await completeARIMA(page);
  await completeLSTM(page);

  // Select and train Stacking ensemble (different from default test's WeightedAvg)
  await completeEnsembleIntroAndSelect(page, "Stacking融合");
  await completeStackingEnsemble(page);
  await enterEvaluation(page);

  // Complete remaining flow with Stacking as best model
  await completeEvaluationAndModelQuiz(page, "Stacking融合模型");
  await completeProductionAndPlanQuiz(page);
  await completeReportAndLogout(page);
});
