import { expect, test } from "@playwright/test";
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
  completeProductionAndPlanQuiz,
  completeReportAndLogout,
  expectHashPath,
  clickLastEnabledButton,
  answerAllQuizQuestions,
  REPORT_ANALYSES,
} from "./helpers";

test("@shiyan 测验与报告表单校验", async ({ page }) => {
  test.setTimeout(20 * 60 * 1000);

  // ── Fast-track to quiz page (MA + ES + WeightedAvg) ──────────────

  await loginAsStudent(page);
  await completeIntroductionAndStartExperiment(page);
  await completeIndustryCompanyProductAndDataWindow(page);

  await completeBaseModelIntroAndSelectTwo(page);
  await completeMovingAverage(page);
  await completeExponentialSmoothing(page);

  await completeEnsembleIntroAndSelect(page, "加权平均融合");
  await completeWeightedEnsemble(page);
  await enterEvaluation(page);

  // Select best model → enter quiz
  const bestModelOption = page
    .locator("label")
    .filter({ hasText: "加权平均融合模型" })
    .first();
  await bestModelOption.click();
  await clickLastEnabledButton(page, "下一步");

  await expectHashPath(page, "/quiz");
  await expect(page.getByText("预测模型知识测验")).toBeVisible();

  // ── Quiz validation: submit without answering ────────────────────

  await clickLastEnabledButton(page, /提交答案/);
  // Should show error about unanswered questions
  await expect(page.getByText(/未作答/)).toBeVisible();

  // ── Quiz: answer all and submit ──────────────────────────────────

  await answerAllQuizQuestions(page);
  await clickLastEnabledButton(page, /提交答案，开始制定生产计划/);

  await expectHashPath(page, "/production/scenario");

  // ── Fast-track through production + plan quiz to report ──────────

  await completeProductionAndPlanQuiz(page);
  await expectHashPath(page, "/report");

  // ── Report validation: submit with empty fields ──────────────────

  await clickLastEnabledButton(page, /保存并提交报告/);
  // Should show validation error modal
  await expect(page.getByText("内容不完整")).toBeVisible();

  // Close the modal
  const closeBtn = page.getByRole("button", { name: /知道了|关闭|确定/ });
  if (await closeBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await closeBtn.click();
  }

  // ── Report: fill with valid content and submit ───────────────────

  const textareas = page.locator(
    'textarea[placeholder*="请根据上述实验结果"]',
  );
  await expect(textareas).toHaveCount(5);

  for (let idx = 0; idx < REPORT_ANALYSES.length; idx += 1) {
    await textareas.nth(idx).fill(REPORT_ANALYSES[idx]!);
  }

  await clickLastEnabledButton(page, /保存并提交报告/);
  await expect(page.getByText("恭喜！实验完成")).toBeVisible({
    timeout: 60_000,
  });

  await clickLastEnabledButton(page, /退出登录/);
  await expect(page).toHaveURL(/\/login\.html$/);
});
