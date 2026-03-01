/**
 * Shiyan Experiment Flow
 * 
 * 封装完整的实验流程，供测试复用
 */

import type { Page } from "@playwright/test";
import { SHIYAN } from "../fixtures";

/**
 * 完整的实验流程（加权平均融合）
 */
export async function runWeightedEnsembleExperiment(page: Page) {
  const { dataset } = SHIYAN;
  
  // Step 1: 介绍页
  await completeIntroduction(page);
  
  // Step 2: 行业/公司/产品选择
  await selectIndustryCompanyProduct(page, {
    industry: dataset.industry,
    company: dataset.company,
    product: dataset.primaryProduct,
  });
  
  // Step 3: 数据窗口
  await completeDataWindow(page);
  
  // Step 4: 基础模型介绍和选择
  await completeBaseModelIntro(page);
  await selectModels(page, ["ma", "exp"]); // 移动平均 + 指数平滑
  
  // Step 5: 训练模型
  await completeMovingAverage(page);
  await completeExponentialSmoothing(page);
  
  // Step 6: 融合模型
  await completeEnsembleIntro(page);
  await selectEnsembleModel(page, "weighted"); // 加权平均
  await completeWeightedEnsemble(page);
  
  // Step 7: 评估
  await completeEvaluation(page);
  await completeModelQuiz(page, "加权平均融合模型");
  
  // Step 8: 生产计划
  await completeProductionQuiz(page);
  await completePlanQuiz(page);
  
  // Step 9: 报告
  await completeReport(page);
}

// ===== Step Implementations =====

async function completeIntroduction(page: Page) {
  await page.waitForURL(/\/introduction/, { timeout: 30_000 });
  
  // 点击两次下一步
  await page.getByRole("button", { name: /下一步/ }).click();
  await page.getByRole("button", { name: /下一步/ }).click();
  
  // 开始实验
  await page.getByRole("button", { name: /开始实验/ }).click();
  await page.waitForURL(/\/industry/, { timeout: 30_000 });
}

async function selectIndustryCompanyProduct(
  page: Page, 
  data: { industry: string; company: string; product: string }
) {
  await page.waitForURL(/\/industry/, { timeout: 30_000 });
  
  // 选择行业
  await page.getByText(data.industry).click();
  await page.getByRole("button", { name: /下一步/ }).click();
  
  // 选择公司
  await page.waitForURL(/\/company/, { timeout: 30_000 });
  await page.getByText(data.company).click();
  await page.getByRole("button", { name: /下一步/ }).click();
  
  // 选择产品
  await page.waitForURL(/\/product/, { timeout: 30_000 });
  await page.getByText(data.product).click();
  await page.getByRole("button", { name: /下一步|进入数据窗口/ }).click();
}

async function completeDataWindow(page: Page) {
  await page.waitForURL(/\/datawindow|window/, { timeout: 30_000 });
  
  // 使用默认数据窗口设置，直接下一步
  await page.getByRole("button", { name: /下一步|确认/ }).click();
  
  // 等待确认弹窗
  const confirmBtn = page.getByRole("button", { name: /确定|确认/ });
  if (await confirmBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await confirmBtn.click();
  }
  
  await page.waitForURL(/\/model-intro/, { timeout: 30_000 });
}

async function completeBaseModelIntro(page: Page) {
  await page.waitForURL(/\/model-intro/, { timeout: 30_000 });
  await page.getByRole("button", { name: /下一步|进入模型选择/ }).click();
  await page.waitForURL(/\/model-selection/, { timeout: 30_000 });
}

async function selectModels(page: Page, models: string[]) {
  await page.waitForURL(/\/model-selection/, { timeout: 30_000 });
  
  for (const model of models) {
    await page.locator(`[data-model="${model}"]`).click();
  }
  
  await page.getByRole("button", { name: /下一步|开始训练/ }).click();
}

async function completeMovingAverage(page: Page) {
  await page.waitForURL(/\/train\/ma/, { timeout: 30_000 });
  
  // 等待训练完成
  await page.waitForSelector('[data-status="completed"]', { timeout: 120_000 });
  await page.getByRole("button", { name: /下一步|继续/ }).click();
}

async function completeExponentialSmoothing(page: Page) {
  await page.waitForURL(/\/train\/exp/, { timeout: 30_000 });
  
  // 等待训练完成
  await page.waitForSelector('[data-status="completed"]', { timeout: 120_000 });
  await page.getByRole("button", { name: /下一步|继续/ }).click();
}

async function completeEnsembleIntro(page: Page) {
  await page.waitForURL(/\/ensemble-intro/, { timeout: 30_000 });
  await page.getByRole("button", { name: /下一步|进入融合模型选择/ }).click();
  await page.waitForURL(/\/ensemble-selection/, { timeout: 30_000 });
}

async function selectEnsembleModel(page: Page, type: "weighted" | "stacking" | "boosting") {
  await page.locator(`[data-ensemble="${type}"]`).click();
  await page.getByRole("button", { name: /下一步|开始训练/ }).click();
}

async function completeWeightedEnsemble(page: Page) {
  await page.waitForURL(/\/train\/ensemble/, { timeout: 30_000 });
  
  // 等待训练完成
  await page.waitForSelector('[data-status="completed"]', { timeout: 120_000 });
  await page.getByRole("button", { name: /下一步|进入评估/ }).click();
}

async function completeEvaluation(page: Page) {
  await page.waitForURL(/\/evaluation/, { timeout: 30_000 });
  await page.getByRole("button", { name: /下一步|开始测验/ }).click();
  await page.waitForURL(/\/quiz-model/, { timeout: 30_000 });
}

async function completeModelQuiz(page: Page, bestModel: string) {
  await page.waitForURL(/\/quiz-model/, { timeout: 30_000 });
  
  // 回答模型选择问题
  await page.getByText(bestModel).click();
  await page.getByRole("button", { name: /提交|下一步/ }).click();
  
  // 简答题
  await page.locator("textarea").fill("融合模型综合性能更优，误差指标更均衡。");
  await page.getByRole("button", { name: /提交|下一步/ }).click();
  
  await page.waitForURL(/\/quiz-production/, { timeout: 30_000 });
}

async function completeProductionQuiz(page: Page) {
  await page.waitForURL(/\/quiz-production/, { timeout: 30_000 });
  
  // 回答生产计划相关问题
  await page.locator("textarea").first().fill("安全库存用于应对需求波动，保证服务水平。");
  await page.getByRole("button", { name: /提交|下一步/ }).click();
  
  await page.waitForURL(/\/quiz-plan/, { timeout: 30_000 });
}

async function completePlanQuiz(page: Page) {
  await page.waitForURL(/\/quiz-plan/, { timeout: 30_000 });
  
  // 回答计划相关问题
  await page.locator("textarea").first().fill("MPS计算考虑了产能约束和库存成本。");
  await page.getByRole("button", { name: /提交|下一步/ }).click();
  
  await page.waitForURL(/\/report/, { timeout: 30_000 });
}

async function completeReport(page: Page) {
  await page.waitForURL(/\/report/, { timeout: 30_000 });
  
  // 填写报告分析
  const analyses = SHIYAN.reportAnalyses;
  const textareas = await page.locator("textarea").all();
  
  for (let i = 0; i < Math.min(textareas.length, analyses.length); i++) {
    await textareas[i].fill(analyses[i]);
  }
  
  // 提交报告
  await page.getByRole("button", { name: /提交报告/ }).click();
  
  // 等待提交成功
  await page.waitForSelector('[data-status="submitted"]', { timeout: 30_000 });
}

// ===== Re-exports from original helpers for compatibility =====

export {
  expectHashPath,
  clickLastEnabledButton,
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
