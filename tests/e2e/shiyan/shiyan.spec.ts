import { test } from "@playwright/test";
import {
  loginAsStudent,
  completeIntroductionAndStartExperiment,
  completeIndustryCompanyProductAndDataWindow,
  completeBaseModelIntroAndSelectTwo,
  completeMovingAverage,
  completeExponentialSmoothing,
  completeEnsembleIntroAndSelect,
  completeWeightedEnsemble,
  enterEvaluation,
  completeEvaluationAndModelQuiz,
  completeProductionAndPlanQuiz,
  completeReportAndLogout,
} from "./helpers";

test("@shiyan 学生端全链路覆盖（真实训练数据集）", async ({ page }) => {
  test.setTimeout(15 * 60 * 1000);

  await loginAsStudent(page);
  await completeIntroductionAndStartExperiment(page);
  await completeIndustryCompanyProductAndDataWindow(page);

  await completeBaseModelIntroAndSelectTwo(page);
  await completeMovingAverage(page);
  await completeExponentialSmoothing(page);

  await completeEnsembleIntroAndSelect(page, "加权平均融合");
  await completeWeightedEnsemble(page);
  await enterEvaluation(page);

  await completeEvaluationAndModelQuiz(page, "加权平均融合模型");
  await completeProductionAndPlanQuiz(page);
  await completeReportAndLogout(page);
});
