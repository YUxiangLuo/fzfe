import { test } from "@playwright/test";
import {
  loginAsStudent,
  completeIntroductionAndStartExperiment,
  completeIndustryCompanyProductAndDataWindow,
  completeBaseModelIntroAndSelectTwo,
  completeMovingAverage,
  completeExponentialSmoothing,
  completeEnsembleIntroAndSelect,
  completeBoostingEnsemble,
  enterEvaluation,
  completeEvaluationAndModelQuiz,
  completeProductionAndPlanQuiz,
  completeReportAndLogout,
} from "./helpers";

test("@shiyan Boosting融合全链路（MA + ES + Boosting）", async ({ page }) => {
  test.setTimeout(15 * 60 * 1000);

  await loginAsStudent(page);
  await completeIntroductionAndStartExperiment(page);
  await completeIndustryCompanyProductAndDataWindow(page);

  // Select MA + ES as base models
  await completeBaseModelIntroAndSelectTwo(page);
  await completeMovingAverage(page);
  await completeExponentialSmoothing(page);

  // Select and train Boosting ensemble (distinct from WeightedAvg / Stacking tests)
  await completeEnsembleIntroAndSelect(page, "Boosting融合");
  await completeBoostingEnsemble(page);
  await enterEvaluation(page);

  await completeEvaluationAndModelQuiz(page, "Boosting融合模型");
  await completeProductionAndPlanQuiz(page);
  await completeReportAndLogout(page);
});
