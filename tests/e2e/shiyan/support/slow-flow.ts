import type { Page } from "@playwright/test";
import {
  completeBaseModelIntroAndSelectMAAndLSTM,
  completeBaseModelIntroAndSelectTwo,
  completeEnsembleIntroAndSelect,
  completeEvaluationAndModelQuiz,
  completeExponentialSmoothing,
  completeIntroductionAndStartExperiment,
  completeIndustryCompanyProductAndDataWindow,
  completeLSTM,
  completeMovingAverage,
  completeProductionAndPlanQuiz,
  enterEvaluation,
  completeWeightedEnsemble,
  completeWeightedEnsembleWithLSTM,
} from "./ui-flow";

export async function completeWeightedFlowToReportStage(page: Page) {
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
}

export async function completeLstmWeightedFlowToReportStage(page: Page) {
  await completeIntroductionAndStartExperiment(page);
  await completeIndustryCompanyProductAndDataWindow(page);
  await completeBaseModelIntroAndSelectMAAndLSTM(page);
  await completeMovingAverage(page);
  await completeLSTM(page);
  await completeEnsembleIntroAndSelect(page, "加权平均融合");
  await completeWeightedEnsembleWithLSTM(page);
  await enterEvaluation(page);
  await completeEvaluationAndModelQuiz(page, "加权平均融合模型");
  await completeProductionAndPlanQuiz(page);
}
