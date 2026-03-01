/**
 * Assistant E2E Tests
 * 
 * Tests for assistant role covering:
 * - Layout and navigation
 * - Experiment reports (search, review, batch review, export)
 * - Assessment management (grade weights, grade overview)
 * - Personal info management
 */

import { expect, test, type Page } from "@playwright/test";
import {
  // Generators
  makePhone,
  makeLetters,
  // Navigation
  openTopLevelPage,
  openSubMenuPage,
  openPersonalInfoPage,
  // Locators
  tableRowByText,
  getVisibleModal,
  fillFormField,
  // Stats & API
  getStatisticValue,
  unwrapDataEnvelope,
  // Assertions
  expectSuccessMessage,
  // Grade Weights
  setWeightByLabel,
  // Login
  loginAs,
  logout,
  // Fixtures & Constants
  ACCOUNTS,
  TEST_DATA,
  API,
  // Types
  type GradeSummaryRow,
  // Selectors
  CommonSelectors,
  ClassManagementSelectors,
  ExperimentReportSelectors,
  ExperimentProgressSelectors,
  ExperimentLogSelectors,
  GradeWeightSelectors,
  GradeOverviewSelectors,
  PersonalInfoSelectors,
  SuccessMessages,
  ModalTitles,
} from "../helpers";

// ===== Setup =====

async function loginAsAssistant(page: Page, password = ACCOUNTS.assistant.password): Promise<void> {
  await loginAs(page, { username: ACCOUNTS.assistant.username, password, role: "assistant" });
}

// ===== Test Suite =====

test.describe("@assistant 布局与导航", () => {
  test("菜单与权限限制", async ({ page }) => {
    await loginAsAssistant(page);
    
    // Verify role indicator
    await expect(page.getByText("助教")).toBeVisible();
    
    // Verify no assistant management menu
    await expect(page.getByRole("menuitem", { name: "助教管理" })).toHaveCount(0);

    // Toggle menu
    const menuToggle = page.locator("header button").first();
    await menuToggle.click();
    await expect(page.getByRole("heading", { level: 4, name: "T" })).toBeVisible();
    await menuToggle.click();

    // Navigate allowed pages
    await openTopLevelPage(page, "班级管理", "班级管理");
    
    const classRow = tableRowByText(page, TEST_DATA.defaultClassName);
    await expect(classRow).toBeVisible();
    await classRow.getByRole(ClassManagementSelectors.studentListBtn.role, { name: ClassManagementSelectors.studentListBtn.name }).click();
    const studentsModal = await getVisibleModal(page, `学生列表 - ${TEST_DATA.defaultClassName}`);
    await expect(studentsModal.locator(CommonSelectors.table)).toBeVisible();
    await studentsModal.getByRole("button", { name: "关闭" }).click();

    await openTopLevelPage(page, "学生管理", "学生管理");
    await openSubMenuPage(page, "账户设置", "个人信息", "个人信息管理");
    await openSubMenuPage(page, "考核管理", "题库管理", "题库管理");

    // Logout
    await logout(page);
    const token = await page.evaluate(() => localStorage.getItem("token"));
    expect(token).toBeNull();
  });
});

test.describe("@assistant 实验报告", () => {
  test("检索与评阅", async ({ page }) => {
    await loginAsAssistant(page);
    await openSubMenuPage(page, "实验管理", "实验报告", "实验报告");

    await expect(page.getByText("报告平均得分")).toBeVisible();
    
    const searchInput = page.getByPlaceholder(ExperimentReportSelectors.searchInput.placeholder);
    await searchInput.fill(TEST_DATA.students.pendingReview1);
    
    const reportRow = tableRowByText(page, TEST_DATA.students.pendingReview1);
    await expect(reportRow).toBeVisible();
    await expect(reportRow.getByText(ExperimentReportSelectors.statusSubmitted)).toBeVisible();
    
    const pendingBefore = await getStatisticValue(page, "待评阅");

    // Review
    await reportRow.getByRole(ExperimentReportSelectors.reviewBtn.role, { name: ExperimentReportSelectors.reviewBtn.name }).click();
    const reviewModal = await getVisibleModal(page, ModalTitles.reviewReport);
    
    await reviewModal.getByPlaceholder(ExperimentReportSelectors.reportScoreInput.placeholder).fill("89");
    await reviewModal.getByPlaceholder(ExperimentReportSelectors.modelScoreInput.placeholder).fill("91");
    await reviewModal.getByPlaceholder(ExperimentReportSelectors.feedbackInput.placeholder).fill("Assistant E2E 自动评阅。");
    await reviewModal.getByRole(ExperimentReportSelectors.saveReviewBtn.role, { name: ExperimentReportSelectors.saveReviewBtn.name }).click();
    
    await expectSuccessMessage(page, SuccessMessages.reviewSaved);
    await expect(tableRowByText(page, TEST_DATA.students.pendingReview1).getByText(ExperimentReportSelectors.statusGraded)).toBeVisible();
    
    const pendingAfter = await getStatisticValue(page, "待评阅");
    expect(pendingAfter).toBe(Math.max(pendingBefore - 1, 0));
  });

  test("批量评阅", async ({ page }) => {
    await loginAsAssistant(page);
    await openSubMenuPage(page, "实验管理", "实验报告", "实验报告");

    const pendingBefore = await getStatisticValue(page, "待评阅");
    expect(pendingBefore).toBeGreaterThanOrEqual(2);

    // Review first student
    let searchInput = page.getByPlaceholder(ExperimentReportSelectors.searchInput.placeholder);
    await searchInput.fill(TEST_DATA.students.pendingReview1);
    
    let reportRow = tableRowByText(page, TEST_DATA.students.pendingReview1);
    await reportRow.getByRole(ExperimentReportSelectors.reviewBtn.role, { name: ExperimentReportSelectors.reviewBtn.name }).click();
    
    let reviewModal = await getVisibleModal(page, ModalTitles.reviewReport);
    await reviewModal.getByPlaceholder(ExperimentReportSelectors.reportScoreInput.placeholder).fill("85");
    await reviewModal.getByPlaceholder(ExperimentReportSelectors.modelScoreInput.placeholder).fill("88");
    await reviewModal.getByRole(ExperimentReportSelectors.saveReviewBtn.role, { name: ExperimentReportSelectors.saveReviewBtn.name }).click();
    await expectSuccessMessage(page, SuccessMessages.reviewSaved);

    // Review second student (shared with teacher seed)
    await searchInput.clear();
    await searchInput.fill(TEST_DATA.students.pendingReview2);
    
    reportRow = tableRowByText(page, TEST_DATA.students.pendingReview2);
    await reportRow.getByRole(ExperimentReportSelectors.reviewBtn.role, { name: ExperimentReportSelectors.reviewBtn.name }).click();
    
    reviewModal = await getVisibleModal(page, ModalTitles.reviewReport);
    await reviewModal.getByPlaceholder(ExperimentReportSelectors.reportScoreInput.placeholder).fill("78");
    await reviewModal.getByPlaceholder(ExperimentReportSelectors.modelScoreInput.placeholder).fill("80");
    await reviewModal.getByPlaceholder(ExperimentReportSelectors.feedbackInput.placeholder).fill("Assistant 批量评阅 - 教师应能看到此记录。");
    await reviewModal.getByRole(ExperimentReportSelectors.saveReviewBtn.role, { name: ExperimentReportSelectors.saveReviewBtn.name }).click();
    await expectSuccessMessage(page, SuccessMessages.reviewSaved);

    // Verify pending count decreased
    const pendingAfter = await getStatisticValue(page, "待评阅");
    expect(pendingAfter).toBe(pendingBefore - 2);
  });

  test("导出功能", async ({ page }) => {
    await loginAsAssistant(page);
    await openSubMenuPage(page, "实验管理", "实验报告", "实验报告");

    // Export CSV
    await page.getByRole(ExperimentReportSelectors.exportCsvBtn.role, { name: ExperimentReportSelectors.exportCsvBtn.name }).click();
    await expectSuccessMessage(page, SuccessMessages.csvExported);
    await expect(page.getByRole(ExperimentReportSelectors.downloadCsvLink.role, { name: ExperimentReportSelectors.downloadCsvLink.name })).toBeVisible();

    // Export all reports
    await page.getByRole(ExperimentReportSelectors.exportAllBtn.role, { name: ExperimentReportSelectors.exportAllBtn.name }).click();
    await expectSuccessMessage(page, SuccessMessages.reportsExported);
    await expect(page.getByRole(ExperimentReportSelectors.downloadReportLink.role, { name: ExperimentReportSelectors.downloadReportLink.name })).toBeVisible();
  });
});

test.describe("@assistant 考核管理", () => {
  test("成绩权重设置", async ({ page }) => {
    await loginAsAssistant(page);
    await openSubMenuPage(page, "考核管理", "成绩权重", "成绩权重设置");

    // Reset and save default
    await page.getByRole(GradeWeightSelectors.resetBtn.role, { name: GradeWeightSelectors.resetBtn.name }).click();
    await expectSuccessMessage(page, SuccessMessages.weightsReset);

    let savePromise = page.waitForResponse(
      (r) => r.request().method() === "PUT" && API.gradingPolicy.test(r.url()),
    );
    await page.getByRole(GradeWeightSelectors.saveBtn.role, { name: GradeWeightSelectors.saveBtn.name }).click();
    expect((await savePromise).ok()).toBeTruthy();
    await expectSuccessMessage(page, SuccessMessages.weightsSaved);

    // Update weights
    await setWeightByLabel(page, "需求预测 - 数据准备", 6);
    await setWeightByLabel(page, "报告提交", 34);
    
    savePromise = page.waitForResponse(
      (r) => r.request().method() === "PUT" && API.gradingPolicy.test(r.url()),
    );
    await page.getByRole(GradeWeightSelectors.saveBtn.role, { name: GradeWeightSelectors.saveBtn.name }).click();
    const updateResponse = await savePromise;
    expect(updateResponse.ok()).toBeTruthy();
    
    const payload = updateResponse.request().postDataJSON() as Record<string, unknown>;
    expect(Number(payload.exp_flow_demand_data_preparation)).toBe(6);
    expect(Number(payload.exp_flow_report_submission)).toBe(34);

    // Reset again
    await page.getByRole(GradeWeightSelectors.resetBtn.role, { name: GradeWeightSelectors.resetBtn.name }).click();
    await expectSuccessMessage(page, SuccessMessages.weightsReset);
    
    savePromise = page.waitForResponse(
      (r) => r.request().method() === "PUT" && API.gradingPolicy.test(r.url()),
    );
    await page.getByRole(GradeWeightSelectors.saveBtn.role, { name: GradeWeightSelectors.saveBtn.name }).click();
    expect((await savePromise).ok()).toBeTruthy();
  });

  test("成绩总览", async ({ page }) => {
    await loginAsAssistant(page);
    
    const summaryPromise = page.waitForResponse(
      (r) => r.request().method() === "GET" && API.assistantGradeSummaries.test(r.url()),
    );
    await openSubMenuPage(page, "考核管理", "成绩总览", "成绩总览");
    
    const summaryResponse = await summaryPromise;
    expect(summaryResponse.ok()).toBeTruthy();

    // Verify charts
    await expect(page.getByText("各班级平均分对比")).toBeVisible();
    
    const classCard = page
      .locator(CommonSelectors.card)
      .filter({ hasText: TEST_DATA.defaultClassName })
      .filter({ hasText: GradeOverviewSelectors.classCardClickHint })
      .first();
    await expect(classCard).toBeVisible();

    // View class details
    const detailPromise = page.waitForResponse(
      (r) => r.request().method() === "GET" && API.classGradeSummaries.test(r.url()),
    );
    await classCard.click();
    
    const detailResponse = await detailPromise;
    expect(detailResponse.ok()).toBeTruthy();
    const gradesData = unwrapDataEnvelope<Array<{ report_status?: string | null }>>(await detailResponse.json());
    const gradedCount = gradesData.filter((row) => row.report_status === "graded").length;
    
    const gradedCardValue = await getStatisticValue(page, GradeOverviewSelectors.gradedCountStat);
    expect(gradedCardValue).toBe(gradedCount);

    // Export grades
    await page.getByRole("button", { name: "导出成绩" }).click();
    await expectSuccessMessage(page, SuccessMessages.gradesExported);
    
    const exportAlert = page.locator(CommonSelectors.alertMessage).filter({ hasText: SuccessMessages.gradesExported }).last();
    await expect(exportAlert).toBeVisible();
    await expect(exportAlert.getByRole("link").first()).toBeVisible();

    // Search
    await page.getByPlaceholder(GradeOverviewSelectors.searchInput.placeholder).fill(TEST_DATA.students.pendingReview1);
    await expect(tableRowByText(page, TEST_DATA.students.pendingReview1)).toBeVisible();
  });
});

test.describe("@assistant 个人信息", () => {
  test("编辑个人信息", async ({ page }) => {
    await loginAsAssistant(page);
    await openPersonalInfoPage(page);

    await page.getByRole(PersonalInfoSelectors.editBtn.role, { name: PersonalInfoSelectors.editBtn.name }).click();
    const editModal = await getVisibleModal(page, ModalTitles.editPersonalInfo);
    
    await fillFormField(editModal, PersonalInfoSelectors.fullNameInput, `助教${makeLetters(4)}`);
    await fillFormField(editModal, PersonalInfoSelectors.phoneInput, makePhone(51));
    await fillFormField(editModal, PersonalInfoSelectors.emailInput, `assistant2+${Date.now()}@e2e.test`);
    await editModal.getByRole(PersonalInfoSelectors.saveBtn.role, { name: PersonalInfoSelectors.saveBtn.name }).click();
    
    await expectSuccessMessage(page, SuccessMessages.personalInfoSaved);
  });

  test("修改密码并回滚", async ({ page }) => {
    await loginAsAssistant(page);
    await openPersonalInfoPage(page);

    // Change password
    const passwordCard = page.locator(CommonSelectors.card).filter({ hasText: PersonalInfoSelectors.passwordCard }).first();
    await passwordCard.getByPlaceholder(PersonalInfoSelectors.currentPasswordInput.placeholder).fill(ACCOUNTS.assistant.password);
    await passwordCard.getByPlaceholder(PersonalInfoSelectors.newPasswordInput.placeholder).fill(ACCOUNTS.assistant.tempPassword);
    await passwordCard.getByPlaceholder(PersonalInfoSelectors.confirmPasswordInput.placeholder).fill(ACCOUNTS.assistant.tempPassword);
    await passwordCard.getByRole(PersonalInfoSelectors.savePasswordBtn.role, { name: PersonalInfoSelectors.savePasswordBtn.name }).click();
    await expectSuccessMessage(page, SuccessMessages.passwordChanged);

    // Logout and login with new password
    await logout(page);
    await loginAsAssistant(page, ACCOUNTS.assistant.tempPassword);
    await openPersonalInfoPage(page);

    // Rollback password
    const rollbackCard = page.locator(CommonSelectors.card).filter({ hasText: PersonalInfoSelectors.passwordCard }).first();
    await rollbackCard.getByPlaceholder(PersonalInfoSelectors.currentPasswordInput.placeholder).fill(ACCOUNTS.assistant.tempPassword);
    await rollbackCard.getByPlaceholder(PersonalInfoSelectors.newPasswordInput.placeholder).fill(ACCOUNTS.assistant.password);
    await rollbackCard.getByPlaceholder(PersonalInfoSelectors.confirmPasswordInput.placeholder).fill(ACCOUNTS.assistant.password);
    await rollbackCard.getByRole(PersonalInfoSelectors.savePasswordBtn.role, { name: PersonalInfoSelectors.savePasswordBtn.name }).click();
    await expectSuccessMessage(page, SuccessMessages.passwordChanged);
  });
});


test.describe("@assistant 实验进度", () => {
  test("列表与统计", async ({ page }) => {
    await loginAsAssistant(page);
    await openSubMenuPage(page, "实验管理", "实验进度", "实验进度");

    // Verify statistics cards (use Statistic title selector)
    await expect(page.locator(".ant-statistic-title").filter({ hasText: ExperimentProgressSelectors.totalStudentsStat })).toBeVisible();
    await expect(page.locator(".ant-statistic-title").filter({ hasText: ExperimentProgressSelectors.completedStat })).toBeVisible();
    await expect(page.locator(".ant-statistic-title").filter({ hasText: ExperimentProgressSelectors.inProgressStat })).toBeVisible();
    await expect(page.locator(".ant-statistic-title").filter({ hasText: ExperimentProgressSelectors.avgCompletionStat })).toBeVisible();

    // Verify table columns
    await expect(page.getByText("学号")).toBeVisible();
    await expect(page.getByText("姓名")).toBeVisible();
    await expect(page.getByText("状态")).toBeVisible();
    await expect(page.getByText("完成进度")).toBeVisible();

    // Search for a student
    const searchInput = page.getByPlaceholder(ExperimentProgressSelectors.searchInput.placeholder);
    await searchInput.fill(TEST_DATA.students.pendingReview1);
    
    const studentRow = tableRowByText(page, TEST_DATA.students.pendingReview1);
    await expect(studentRow).toBeVisible();
  });

  test("展开行详情", async ({ page }) => {
    await loginAsAssistant(page);
    await openSubMenuPage(page, "实验管理", "实验进度", "实验进度");

    // Search for a student
    const searchInput = page.getByPlaceholder(ExperimentProgressSelectors.searchInput.placeholder);
    await searchInput.fill(TEST_DATA.students.pendingReview1);

    // Find and expand the row
    const expandIcon = page.locator(".ant-table-row-expand-icon").first();
    await expect(expandIcon).toBeVisible();
    await expandIcon.click();

    // Verify expanded content
    await expect(page.getByText(ExperimentProgressSelectors.stepCompletionText)).toBeVisible();
    await expect(page.getByText(ExperimentProgressSelectors.timelineText)).toBeVisible();
    await expect(page.getByText("实验状态")).toBeVisible();
    await expect(page.getByText("开始时间")).toBeVisible();
  });
});

test.describe("@assistant 实验日志", () => {
  test("列表与统计", async ({ page }) => {
    await loginAsAssistant(page);
    await openSubMenuPage(page, "实验管理", "实验日志", "实验日志");

    // Verify statistics cards (use Statistic title selector)
    await expect(page.locator(".ant-statistic-title").filter({ hasText: ExperimentLogSelectors.totalStudentsStat })).toBeVisible();
    await expect(page.locator(".ant-statistic-title").filter({ hasText: ExperimentLogSelectors.totalExperimentsStat })).toBeVisible();
    await expect(page.locator(".ant-statistic-title").filter({ hasText: ExperimentLogSelectors.totalDurationStat })).toBeVisible();
    await expect(page.locator(".ant-statistic-title").filter({ hasText: ExperimentLogSelectors.avgDurationStat })).toBeVisible();

    // Verify table columns (use table header locator to avoid matching statistic titles)
    const table = page.locator(CommonSelectors.table).first();
    await expect(table.getByText("学号")).toBeVisible();
    await expect(table.getByText("姓名")).toBeVisible();
    await expect(table.getByText("实验次数")).toBeVisible();
    await expect(table.getByText("总时长")).toBeVisible();

    // Search for a student
    const searchInput = page.getByPlaceholder(ExperimentLogSelectors.searchInput.placeholder);
    await searchInput.fill(TEST_DATA.students.pendingReview1);
    
    const studentRow = tableRowByText(page, TEST_DATA.students.pendingReview1);
    await expect(studentRow).toBeVisible();
  });

  test("展开行查看实验详情", async ({ page }) => {
    await loginAsAssistant(page);
    await openSubMenuPage(page, "实验管理", "实验日志", "实验日志");

    // Search for a student
    const searchInput = page.getByPlaceholder(ExperimentLogSelectors.searchInput.placeholder);
    await searchInput.fill(TEST_DATA.students.pendingReview1);

    // Find and expand the row
    const expandIcon = page.locator(".ant-table-row-expand-icon").first();
    await expect(expandIcon).toBeVisible();
    await expandIcon.click();

    // Verify expanded content shows experiment details
    await expect(page.getByText("实验ID")).toBeVisible();
    await expect(page.getByText("状态")).toBeVisible();
    await expect(page.getByText("行业")).toBeVisible();
    await expect(page.getByText("公司")).toBeVisible();
    await expect(page.getByText("产品")).toBeVisible();
  });
});

test.describe("@assistant 评阅边缘测试", () => {
  test("评阅分数边界值", async ({ page }) => {
    await loginAsAssistant(page);
    await openSubMenuPage(page, "实验管理", "实验报告", "实验报告");

    // Find a pending review student
    const searchInput = page.getByPlaceholder(ExperimentReportSelectors.searchInput.placeholder);
    await searchInput.fill(TEST_DATA.students.pendingReview3);
    
    const reportRow = tableRowByText(page, TEST_DATA.students.pendingReview3);
    await reportRow.getByRole(ExperimentReportSelectors.reviewBtn.role, { name: ExperimentReportSelectors.reviewBtn.name }).click();
    
    const reviewModal = await getVisibleModal(page, ModalTitles.reviewReport);

    // Test boundary values
    // Test 0 score (minimum)
    await reviewModal.getByPlaceholder(ExperimentReportSelectors.reportScoreInput.placeholder).fill("0");
    await reviewModal.getByPlaceholder(ExperimentReportSelectors.modelScoreInput.placeholder).fill("0");
    await reviewModal.getByPlaceholder(ExperimentReportSelectors.feedbackInput.placeholder).fill("边界测试：0分");
    await reviewModal.getByRole(ExperimentReportSelectors.saveReviewBtn.role, { name: ExperimentReportSelectors.saveReviewBtn.name }).click();
    
    await expectSuccessMessage(page, SuccessMessages.reviewSaved);
    await expect(tableRowByText(page, TEST_DATA.students.pendingReview3).getByText(ExperimentReportSelectors.statusGraded)).toBeVisible();
  });

  test("评阅100分", async ({ page }) => {
    await loginAsAssistant(page);
    await openSubMenuPage(page, "实验管理", "实验报告", "实验报告");

    // Find another pending review student
    const searchInput = page.getByPlaceholder(ExperimentReportSelectors.searchInput.placeholder);
    await searchInput.fill(TEST_DATA.students.pendingReview4);
    
    const reportRow = tableRowByText(page, TEST_DATA.students.pendingReview4);
    await reportRow.getByRole(ExperimentReportSelectors.reviewBtn.role, { name: ExperimentReportSelectors.reviewBtn.name }).click();
    
    const reviewModal = await getVisibleModal(page, ModalTitles.reviewReport);

    // Test 100 score (maximum)
    await reviewModal.getByPlaceholder(ExperimentReportSelectors.reportScoreInput.placeholder).fill("100");
    await reviewModal.getByPlaceholder(ExperimentReportSelectors.modelScoreInput.placeholder).fill("100");
    await reviewModal.getByPlaceholder(ExperimentReportSelectors.feedbackInput.placeholder).fill("边界测试：满分100");
    await reviewModal.getByRole(ExperimentReportSelectors.saveReviewBtn.role, { name: ExperimentReportSelectors.saveReviewBtn.name }).click();
    
    await expectSuccessMessage(page, SuccessMessages.reviewSaved);
    await expect(tableRowByText(page, TEST_DATA.students.pendingReview4).getByText(ExperimentReportSelectors.statusGraded)).toBeVisible();
  });
});
