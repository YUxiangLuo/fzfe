/**
 * Shiyan E2E Test - Boosting Ensemble Flow
 * 
 * Boosting 融合模型完整流程测试（使用重构后的架构）
 */

import { shiyanTest as test, expect } from "../fixtures/index.js";
import {
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

test("@shiyan Boosting融合全链路（MA + ES + Boosting）", async ({ studentPage }) => {
  test.setTimeout(15 * 60 * 1000);

  // studentPage 已经登录，直接开始实验流程
  await completeIntroductionAndStartExperiment(studentPage);
  await completeIndustryCompanyProductAndDataWindow(studentPage);

  // Select MA + ES as base models
  await completeBaseModelIntroAndSelectTwo(studentPage);
  await completeMovingAverage(studentPage);
  await completeExponentialSmoothing(studentPage);

  // Select and train Boosting ensemble
  await completeEnsembleIntroAndSelect(studentPage, "Boosting融合");
  await completeBoostingEnsemble(studentPage);
  await enterEvaluation(studentPage);

  await completeEvaluationAndModelQuiz(studentPage, "Boosting融合模型");
  await completeProductionAndPlanQuiz(studentPage);
  await completeReportAndLogout(studentPage);
});
