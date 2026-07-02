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
  openClassStudentListModal,
  openEditPersonalInfoModal,
  openExperimentLogsPage,
  openExperimentProgressPage,
  openExperimentReportsPage,
  openGradeOverviewClassDetail,
  openGradeOverviewPage,
  openGradeWeightsPage,
  openPersonalInfoPage,
  openQuestionEditModal,
  openQuestionBankPage,
  selectTopFilterOption,
  // Locators
  collapseGradeOverviewRowDetail,
  confirmQuestionDelete,
  expandGradeOverviewRowDetail,
  fillPersonalInfoForm,
  fillPasswordChangeForm,
  getPasswordCard,
  tableRowByText,
  fillFormField,
  fillReportRejectReason,
  fillReportReviewForm,
  // Stats & API
  getStatisticValue,
  unwrapDataEnvelope,
  createAssistantManagedTempClass,
  deleteClassWithTeacherToken,
  getCurrentUserProfile,
  requestSessionToken,
  // Assertions
  expectStoredTokenCleared,
  expectSuccessMessage,
  expectErrorMessage,
  // Grade Weights
  setWeightByLabel,
  // Portal
  loginAsAssistantAccount,
  logout,
  openReportReviewModal,
  submitPasswordChange,
  togglePortalMenuAndAssert,
  // Fixtures & Constants
  ACCOUNTS,
  TEST_DATA,
  API,
  // Types
  type ManagedClassRecord,
  type GradeSummaryRow,
  // Selectors
  CommonSelectors,
  ExperimentReportSelectors,
  ExperimentProgressSelectors,
  ExperimentLogSelectors,
  QuestionBankSelectors,
  GradeWeightSelectors,
  GradeOverviewSelectors,
  PersonalInfoSelectors,
  SuccessMessages,
  ErrorMessages,
} from "../helpers";

const BACKEND_PORT = process.env.E2E_BACKEND_PORT ?? "54103";
const BACKEND_ORIGIN = process.env.E2E_BACKEND_ORIGIN ?? `http://127.0.0.1:${BACKEND_PORT}`;

// ===== Setup =====

async function loginAsAssistant(page: Page, password = ACCOUNTS.assistant.password): Promise<void> {
  await loginAsAssistantAccount(page, password);
}

async function createAssistantTempClass(
  page: Page,
  prefix: string,
  options?: { withStudent?: boolean },
): Promise<{ teacherToken: string; classRecord: ManagedClassRecord }> {
  const assistant = await getCurrentUserProfile(page, BACKEND_ORIGIN);
  return createAssistantManagedTempClass(
    page,
    BACKEND_ORIGIN,
    assistant.user_id,
    {
      classPrefix: prefix,
      withStudent: options?.withStudent,
    },
  );
}

// ===== Test Suite =====

test.describe("@assistant 布局与导航", () => {
  test("菜单与权限限制", async ({ page }) => {
    await loginAsAssistant(page);
    
    // Verify role indicator
    await expect(page.getByText("助教", { exact: true })).toBeVisible();
    
    // Verify no assistant management menu
    await expect(page.getByRole("menuitem", { name: "助教管理" })).toHaveCount(0);

    // Toggle menu
    await togglePortalMenuAndAssert(page, "assistant");

    // Navigate allowed pages
    await openTopLevelPage(page, "班级管理", "班级管理");
    
    const classRow = tableRowByText(page, TEST_DATA.defaultClassName);
    await expect(classRow).toBeVisible();
    const studentsModal = await openClassStudentListModal(classRow, TEST_DATA.defaultClassName);
    await expect(studentsModal.locator(CommonSelectors.table)).toBeVisible();
    await studentsModal.getByRole("button", { name: /关\s*闭/ }).click();

    await openTopLevelPage(page, "学生管理", "学生管理");
    await openPersonalInfoPage(page);
    await page.getByRole("menuitem", { name: "考核管理" }).click();
    await page.getByRole("menuitem", { name: "题库管理" }).click();
    await expect(page.getByRole("heading", { level: 3, name: "题库管理" })).toBeVisible();

    // Logout
    await logout(page);
    await expectStoredTokenCleared(page);
  });
});

test.describe("@assistant 实验报告", () => {
  test("检索与评阅", async ({ page }) => {
    await loginAsAssistant(page);
    await openExperimentReportsPage(page);

    await expect(page.getByText("报告平均得分")).toBeVisible();
    
    const searchInput = page.getByPlaceholder(ExperimentReportSelectors.searchInput.placeholder);
    await searchInput.fill(TEST_DATA.students.pendingReview1);
    
    const reportRow = tableRowByText(page, TEST_DATA.students.pendingReview1);
    await expect(reportRow).toBeVisible();
    await expect(reportRow.getByText(ExperimentReportSelectors.statusSubmitted)).toBeVisible();
    
    const pendingBefore = await getStatisticValue(page, "待评分");

    // Review
    const reviewModal = await openReportReviewModal(reportRow);
    await fillReportReviewForm(reviewModal, {
      reportScore: "89",
      modelScore: "91",
      feedback: "Assistant E2E 自动评阅。",
    });
    await reviewModal.getByRole(ExperimentReportSelectors.saveReviewBtn.role, { name: ExperimentReportSelectors.saveReviewBtn.name }).click();
    
    await expectSuccessMessage(page, SuccessMessages.reviewSaved);
    await expect(tableRowByText(page, TEST_DATA.students.pendingReview1).getByText(ExperimentReportSelectors.statusGraded)).toBeVisible();
    
    const pendingAfter = await getStatisticValue(page, "待评分");
    expect(pendingAfter).toBe(Math.max(pendingBefore - 1, 0));
  });

  test("批量评阅", async ({ page }) => {
    await loginAsAssistant(page);
    await openExperimentReportsPage(page);

    // 获取当前待评分数量
    // 注意：前面的"检索与评阅"测试可能已经评阅了 pendingReview1 (20240052)
    // 所以这里只剩下 pendingReview2 (20240055) 一个待评分学生
    const pendingBefore = await getStatisticValue(page, "待评分");
    expect(pendingBefore).toBeGreaterThanOrEqual(1);

    // 评阅 pendingReview2 (20240055) - 这是种子数据中唯一剩下的待评分学生
    const searchInput = page.getByPlaceholder(ExperimentReportSelectors.searchInput.placeholder);
    await searchInput.fill(TEST_DATA.students.pendingReview2);
    
    const reportRow = tableRowByText(page, TEST_DATA.students.pendingReview2);
    await expect(reportRow).toBeVisible();
    const reviewModal = await openReportReviewModal(reportRow);
    await fillReportReviewForm(reviewModal, {
      reportScore: "88",
      modelScore: "90",
      feedback: "Assistant 批量评阅测试 - 教师应能看到此记录。",
    });
    await reviewModal.getByRole(ExperimentReportSelectors.saveReviewBtn.role, { name: ExperimentReportSelectors.saveReviewBtn.name }).click();
    await expectSuccessMessage(page, SuccessMessages.reviewSaved);

    // 验证待评分数量减少了1
    const pendingAfter = await getStatisticValue(page, "待评分");
    expect(pendingAfter).toBe(pendingBefore - 1);
  });

  test("导出功能", async ({ page }) => {
    await loginAsAssistant(page);
    await openExperimentReportsPage(page);

    // Export CSV
    await page.getByRole(ExperimentReportSelectors.exportCsvBtn.role, { name: ExperimentReportSelectors.exportCsvBtn.name }).click();
    await expectSuccessMessage(page, SuccessMessages.csvExported);
    await expect(page.getByRole(ExperimentReportSelectors.downloadCsvLink.role, { name: ExperimentReportSelectors.downloadCsvLink.name })).toBeVisible();

    // Export all reports
    await page.getByRole(ExperimentReportSelectors.exportAllBtn.role, { name: ExperimentReportSelectors.exportAllBtn.name }).click();
    await expectSuccessMessage(page, SuccessMessages.reportsExported);
    await expect(page.getByRole(ExperimentReportSelectors.downloadReportLink.role, { name: ExperimentReportSelectors.downloadReportLink.name })).toBeVisible();
  });

  test("导出 CSV 失败提示", async ({ page }) => {
    await loginAsAssistant(page);
    const { teacherToken, classRecord } = await createAssistantTempClass(page, "Assistant导出CSV失效班级", { withStudent: true });

    try {
      await openExperimentReportsPage(page);
      const reportsResponsePromise = page.waitForResponse(
        (r) => r.request().method() === "GET" && r.url().includes(`/api/v1/classes/${classRecord.class_id}/reports`),
      );
      await selectTopFilterOption(page, classRecord.class_name);
      expect((await reportsResponsePromise).ok()).toBeTruthy();

      const exportCsvButton = page.getByRole(ExperimentReportSelectors.exportCsvBtn.role, { name: ExperimentReportSelectors.exportCsvBtn.name });
      await expect(exportCsvButton).toBeEnabled();

      const deleteResponse = await deleteClassWithTeacherToken(page, BACKEND_ORIGIN, teacherToken, classRecord.class_id);
      expect(deleteResponse.ok()).toBeTruthy();

      await exportCsvButton.click();
      await expectErrorMessage(page, "班级不存在");
    } finally {
      const deleteResponse = await deleteClassWithTeacherToken(page, BACKEND_ORIGIN, teacherToken, classRecord.class_id);
      expect([200, 404]).toContain(deleteResponse.status());
    }
  });

  test("导出所有报告失败提示", async ({ page }) => {
    await loginAsAssistant(page);
    const { teacherToken, classRecord } = await createAssistantTempClass(page, "Assistant导出归档空班级", { withStudent: true });

    try {
      await openExperimentReportsPage(page);
      const reportsResponsePromise = page.waitForResponse(
        (r) => r.request().method() === "GET" && r.url().includes(`/api/v1/classes/${classRecord.class_id}/reports`),
      );
      await selectTopFilterOption(page, classRecord.class_name);
      expect((await reportsResponsePromise).ok()).toBeTruthy();

      const exportAllButton = page.getByRole(ExperimentReportSelectors.exportAllBtn.role, { name: ExperimentReportSelectors.exportAllBtn.name });
      await expect(exportAllButton).toBeEnabled();
      await exportAllButton.click();

      await expectErrorMessage(page, "未找到该班级的有效报告");
    } finally {
      const deleteResponse = await deleteClassWithTeacherToken(page, BACKEND_ORIGIN, teacherToken, classRecord.class_id);
      expect([200, 404]).toContain(deleteResponse.status());
    }
  });

  test("报告数据空态显示暂无数据", async ({ page }) => {
    await loginAsAssistant(page);
    const { teacherToken, classRecord } = await createAssistantTempClass(page, "Assistant空报告班级");

    try {
      await openExperimentReportsPage(page);
      const reportsResponsePromise = page.waitForResponse(
        (r) => r.request().method() === "GET" && r.url().includes(`/api/v1/classes/${classRecord.class_id}/reports`),
      );
      await selectTopFilterOption(page, classRecord.class_name);
      expect((await reportsResponsePromise).ok()).toBeTruthy();
      await expect(page.getByText("暂无数据")).toBeVisible();
    } finally {
      const deleteResponse = await deleteClassWithTeacherToken(page, BACKEND_ORIGIN, teacherToken, classRecord.class_id);
      expect(deleteResponse.ok()).toBeTruthy();
    }
  });

  test("获取报告数据失败提示", async ({ page }) => {
    await loginAsAssistant(page);
    const { teacherToken, classRecord } = await createAssistantTempClass(page, "Assistant失效报告班级");

    try {
      const classListPromise = page.waitForResponse(
        (r) => r.request().method() === "GET" && /\/api\/v1\/assistants\/\d+\/classes(?:\?|$)/.test(r.url()),
      );
      await openExperimentReportsPage(page);
      expect((await classListPromise).ok()).toBeTruthy();

      const deleteResponse = await deleteClassWithTeacherToken(page, BACKEND_ORIGIN, teacherToken, classRecord.class_id);
      expect(deleteResponse.ok()).toBeTruthy();

      const reportsResponsePromise = page.waitForResponse(
        (r) => r.request().method() === "GET" && r.url().includes(`/api/v1/classes/${classRecord.class_id}/reports`),
      );
      await selectTopFilterOption(page, classRecord.class_name);
      expect((await reportsResponsePromise).status()).toBe(404);
      await expect(page.locator(CommonSelectors.alertMessage).filter({ hasText: "班级不存在" })).toBeVisible();
    } finally {
      const deleteResponse = await deleteClassWithTeacherToken(page, BACKEND_ORIGIN, teacherToken, classRecord.class_id);
      expect([200, 404]).toContain(deleteResponse.status());
    }
  });
});

test.describe("@assistant 考核管理", () => {
  test("题库获取失败提示", async ({ page }) => {
    await loginAsAssistant(page);
    const studentToken = await requestSessionToken(page, BACKEND_ORIGIN, {
      username: ACCOUNTS.student.username,
      password: ACCOUNTS.student.password,
    });
    await page.evaluate((token) => {
      localStorage.setItem("teacherToken", token);
    }, studentToken);

    await openQuestionBankPage(page);
    await expect(page.locator(CommonSelectors.alertMessage).filter({ hasText: "权限不足" })).toBeVisible();
  });

  test("题库删除失败提示", async ({ page }) => {
    await loginAsAssistant(page);
    await openQuestionBankPage(page);

    const questionRow = page.locator(CommonSelectors.tableRow).nth(1);
    await expect(questionRow).toBeVisible();

    await confirmQuestionDelete(questionRow);

    await expectErrorMessage(page, "权限不足");
  });

  test("题库保存失败提示", async ({ page }) => {
    await loginAsAssistant(page);
    await openQuestionBankPage(page);

    const questionRow = page.locator(CommonSelectors.tableRow).nth(1);
    await expect(questionRow).toBeVisible();

    const editorModal = await openQuestionEditModal(questionRow);
    await fillFormField(editorModal, QuestionBankSelectors.questionTextInput, `Assistant编辑失败题目${Date.now()}`);
    await editorModal.getByRole("button", { name: /保\s*存/ }).click();

    await expectErrorMessage(page, "权限不足");
    await expect(editorModal).toBeVisible();
    await editorModal.getByRole("button", { name: /取\s*消/ }).click();
  });

  test("成绩权重设置", async ({ page }) => {
    await loginAsAssistant(page);
    await openGradeWeightsPage(page);

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

  test("成绩权重校验：顶层权重总和必须为 100%", async ({ page }) => {
    await loginAsAssistant(page);
    await openGradeWeightsPage(page);

    const topLevelCard = page.locator(CommonSelectors.card).filter({ hasText: "顶层权重" }).first();
    const topLevelInputs = topLevelCard.locator("input.ant-input-number-input");
    await expect(topLevelInputs).toHaveCount(4);

    for (const [index, value] of [50, 20, 20, 20].entries()) {
      const input = topLevelInputs.nth(index);
      await input.click();
      await input.press("ControlOrMeta+A");
      await input.fill(String(value));
      await input.press("Enter");
      await expect(input).toHaveValue(String(value));
    }

    await page.getByRole(GradeWeightSelectors.saveBtn.role, { name: GradeWeightSelectors.saveBtn.name }).click();
    await expectErrorMessage(page, "顶层权重总和必须为 100%");
  });

  test("成绩权重校验：流程细节权重总和必须为 100%", async ({ page }) => {
    await loginAsAssistant(page);
    await openGradeWeightsPage(page);

    await setWeightByLabel(page, "需求预测 - 数据准备", 10);
    await setWeightByLabel(page, "需求预测 - 描述性统计", 10);
    await setWeightByLabel(page, "需求预测 - 模型选择", 10);
    await setWeightByLabel(page, "需求预测 - 结果生成", 10);
    await setWeightByLabel(page, "生产计划 - 库存计算", 10);
    await setWeightByLabel(page, "生产计划 - 服务水平", 10);
    await setWeightByLabel(page, "生产计划 - 变量计算", 10);
    await setWeightByLabel(page, "生产计划 - 计划创建", 10);
    await setWeightByLabel(page, "报告提交", 10);

    await page.getByRole(GradeWeightSelectors.saveBtn.role, { name: GradeWeightSelectors.saveBtn.name }).click();
    await expectErrorMessage(page, "流程细节权重总和必须为 100%");
  });

  test("成绩总览", async ({ page }) => {
    await loginAsAssistant(page);
    
    const summaryPromise = page.waitForResponse(
      (r) => r.request().method() === "GET" && API.assistantGradeSummaries.test(r.url()),
    );
    await openGradeOverviewPage(page);
    
    const summaryResponse = await summaryPromise;
    expect(summaryResponse.ok()).toBeTruthy();

    // Verify charts
    await expect(page.getByText("各班级平均分对比")).toBeVisible();
    
    // View class details
    const detailPromise = page.waitForResponse(
      (r) => r.request().method() === "GET" && API.classGradeSummaries.test(r.url()),
    );
    await openGradeOverviewClassDetail(page, TEST_DATA.defaultClassName);
    
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

  test("成绩总览搜索无结果与清空恢复", async ({ page }) => {
    await loginAsAssistant(page);
    await openGradeOverviewPage(page);

    await openGradeOverviewClassDetail(page, TEST_DATA.defaultClassName);

    const searchInput = page.getByPlaceholder(GradeOverviewSelectors.searchInput.placeholder);
    await searchInput.fill("NO_MATCH_ASSISTANT_GRADE");
    await expect(page.getByText("暂无数据").last()).toBeVisible();

    await searchInput.clear();
    await expect(tableRowByText(page, TEST_DATA.students.pendingReview1)).toBeVisible();
  });

  test("成绩总览详情展开与收起", async ({ page }) => {
    await loginAsAssistant(page);
    await openGradeOverviewPage(page);

    await openGradeOverviewClassDetail(page, TEST_DATA.defaultClassName);
    const gradeRow = tableRowByText(page, TEST_DATA.students.pendingReview1);
    await expect(gradeRow).toBeVisible();
    const toggleButton = await expandGradeOverviewRowDetail(gradeRow);
    await expect(page.getByText("最终得分构成")).toBeVisible();

    await collapseGradeOverviewRowDetail(gradeRow);
    await expect(toggleButton).toContainText("详情");
  });

  test("成绩总览导出失败提示", async ({ page }) => {
    await loginAsAssistant(page);
    const { teacherToken, classRecord } = await createAssistantTempClass(page, "Assistant空成绩班级");

    try {
      await openGradeOverviewPage(page);
      const detailPromise = page.waitForResponse(
        (r) => r.request().method() === "GET" && r.url().includes(`/api/v1/classes/${classRecord.class_id}/grade-summaries`),
      );
      await selectTopFilterOption(page, classRecord.class_name);
      expect((await detailPromise).ok()).toBeTruthy();

      await page.getByRole(GradeOverviewSelectors.exportBtn.role, { name: GradeOverviewSelectors.exportBtn.name }).click();
      await expectErrorMessage(page, "该班级未找到已加入的学生");
      await expect(page.locator(CommonSelectors.alertMessage).filter({ hasText: "该班级未找到已加入的学生" })).toBeVisible();
    } finally {
      const deleteResponse = await deleteClassWithTeacherToken(page, BACKEND_ORIGIN, teacherToken, classRecord.class_id);
      expect(deleteResponse.ok()).toBeTruthy();
    }
  });

  test("成绩总览全部班级隐藏导出按钮", async ({ page }) => {
    await loginAsAssistant(page);

    const summaryPromise = page.waitForResponse(
      (r) => r.request().method() === "GET" && API.assistantGradeSummaries.test(r.url()),
    );
    await openGradeOverviewPage(page);
    expect((await summaryPromise).ok()).toBeTruthy();

    await expect(page.getByRole(GradeOverviewSelectors.exportBtn.role, { name: GradeOverviewSelectors.exportBtn.name })).toHaveCount(0);
  });

  test("成绩总览获取失败提示", async ({ page }) => {
    await loginAsAssistant(page);
    const { teacherToken, classRecord } = await createAssistantTempClass(page, "Assistant失效成绩班级");

    try {
      const classListPromise = page.waitForResponse(
        (r) => r.request().method() === "GET" && /\/api\/v1\/assistants\/\d+\/classes(?:\?|$)/.test(r.url()),
      );
      const summaryPromise = page.waitForResponse(
        (r) => r.request().method() === "GET" && API.assistantGradeSummaries.test(r.url()),
      );
      await openGradeOverviewPage(page);
      expect((await classListPromise).ok()).toBeTruthy();
      expect((await summaryPromise).ok()).toBeTruthy();

      const deleteResponse = await deleteClassWithTeacherToken(page, BACKEND_ORIGIN, teacherToken, classRecord.class_id);
      expect(deleteResponse.ok()).toBeTruthy();

      const detailResponsePromise = page.waitForResponse(
        (r) => r.request().method() === "GET" && r.url().includes(`/api/v1/classes/${classRecord.class_id}/grade-summaries`),
      );
      await openGradeOverviewClassDetail(page, classRecord.class_name);
      expect((await detailResponsePromise).status()).toBe(404);
      await expect(page.locator(CommonSelectors.alertMessage).filter({ hasText: "班级不存在" })).toBeVisible();
    } finally {
      const deleteResponse = await deleteClassWithTeacherToken(page, BACKEND_ORIGIN, teacherToken, classRecord.class_id);
      expect([200, 404]).toContain(deleteResponse.status());
    }
  });
});

test.describe("@assistant 个人信息", () => {
  test("编辑个人信息", async ({ page }) => {
    await loginAsAssistant(page);
    await openPersonalInfoPage(page);

    const editModal = await openEditPersonalInfoModal(page);
    await fillPersonalInfoForm(editModal, {
      fullName: `助教${makeLetters(4)}`,
      phone: makePhone(51),
      email: `assistant2+${Date.now()}@e2e.test`,
    });
    await editModal.getByRole(PersonalInfoSelectors.saveBtn.role, { name: PersonalInfoSelectors.saveBtn.name }).click();
    
    await expectSuccessMessage(page, SuccessMessages.personalInfoSaved);
  });

  test("编辑个人信息冲突：重复邮箱与手机号", async ({ page }) => {
    await loginAsAssistant(page);
    await openPersonalInfoPage(page);

    const duplicateEmailModal = await openEditPersonalInfoModal(page);
    await fillPersonalInfoForm(duplicateEmailModal, {
      fullName: `助教${makeLetters(4)}`,
      phone: makePhone(81),
      email: "assistant1@test.com",
    });
    await duplicateEmailModal.getByRole(PersonalInfoSelectors.saveBtn.role, { name: PersonalInfoSelectors.saveBtn.name }).click();

    await expectErrorMessage(page, "邮箱已存在");
    await expect(duplicateEmailModal).toBeVisible();
    await duplicateEmailModal.getByRole("button", { name: /取\s*消/ }).click();

    const duplicatePhoneModal = await openEditPersonalInfoModal(page);
    await fillPersonalInfoForm(duplicatePhoneModal, {
      fullName: `助教${makeLetters(4)}`,
      phone: "13900000001",
      email: `assistant2+${Date.now()}@e2e.test`,
    });
    await duplicatePhoneModal.getByRole(PersonalInfoSelectors.saveBtn.role, { name: PersonalInfoSelectors.saveBtn.name }).click();

    await expectErrorMessage(page, "手机号已存在");
    await expect(duplicatePhoneModal).toBeVisible();
    await duplicatePhoneModal.getByRole("button", { name: /取\s*消/ }).click();
  });

  test("修改密码失败：当前密码错误", async ({ page }) => {
    await loginAsAssistant(page);
    await openPersonalInfoPage(page);

    const passwordCard = await getPasswordCard(page);
    await fillPasswordChangeForm(passwordCard, {
      currentPassword: "WrongPassword!234",
      newPassword: "AssistantE2E!890",
      confirmPassword: "AssistantE2E!890",
    });
    await submitPasswordChange(passwordCard);

    await expectErrorMessage(page, "当前密码错误");
  });

  test("修改密码校验：两次输入的密码不一致", async ({ page }) => {
    await loginAsAssistant(page);
    await openPersonalInfoPage(page);

    const passwordCard = await getPasswordCard(page);
    await fillPasswordChangeForm(passwordCard, {
      currentPassword: ACCOUNTS.assistant.password,
      newPassword: "AssistantE2E!890",
      confirmPassword: "AssistantE2E!891",
    });
    await submitPasswordChange(passwordCard);

    await expect(passwordCard.getByText(ErrorMessages.passwordMismatch)).toBeVisible();
  });

  test("修改密码并回滚", async ({ page }) => {
    await loginAsAssistant(page);
    await openPersonalInfoPage(page);

    // Change password
    const passwordCard = await getPasswordCard(page);
    await fillPasswordChangeForm(passwordCard, {
      currentPassword: ACCOUNTS.assistant.password,
      newPassword: ACCOUNTS.assistant.tempPassword,
      confirmPassword: ACCOUNTS.assistant.tempPassword,
    });
    await submitPasswordChange(passwordCard);
    await expectSuccessMessage(page, SuccessMessages.passwordChanged);

    // Logout and login with new password
    await logout(page);
    await loginAsAssistant(page, ACCOUNTS.assistant.tempPassword);
    await openPersonalInfoPage(page);

    // Rollback password
    const rollbackCard = await getPasswordCard(page);
    await fillPasswordChangeForm(rollbackCard, {
      currentPassword: ACCOUNTS.assistant.tempPassword,
      newPassword: ACCOUNTS.assistant.password,
      confirmPassword: ACCOUNTS.assistant.password,
    });
    await submitPasswordChange(rollbackCard);
    await expectSuccessMessage(page, SuccessMessages.passwordChanged);
  });
});


test.describe("@assistant 实验进度", () => {
  test("列表与统计", async ({ page }) => {
    await loginAsAssistant(page);
    await openExperimentProgressPage(page);

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

  test("无结果搜索与清空恢复", async ({ page }) => {
    await loginAsAssistant(page);
    await openExperimentProgressPage(page);

    const searchInput = page.getByPlaceholder(ExperimentProgressSelectors.searchInput.placeholder);
    await searchInput.fill("NO_MATCH_ASSISTANT_PROGRESS");
    await expect(page.getByText("暂无数据")).toBeVisible();

    await searchInput.clear();
    await expect(tableRowByText(page, TEST_DATA.students.pendingReview1)).toBeVisible();
  });

  test("展开行详情", async ({ page }) => {
    await loginAsAssistant(page);
    await openExperimentProgressPage(page);

    // Search for a student
    const searchInput = page.getByPlaceholder(ExperimentProgressSelectors.searchInput.placeholder);
    await searchInput.fill(TEST_DATA.students.pendingReview1);

    // Find and expand the filtered row after the table has refreshed.
    const studentRow = tableRowByText(page, TEST_DATA.students.pendingReview1);
    await expect(studentRow).toBeVisible();
    await studentRow.getByRole("button", { name: "展开行" }).click();

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
    await openExperimentLogsPage(page);

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

  test("无结果搜索与清空恢复", async ({ page }) => {
    await loginAsAssistant(page);
    await openExperimentLogsPage(page);

    const searchInput = page.getByPlaceholder(ExperimentLogSelectors.searchInput.placeholder);
    await searchInput.fill("NO_MATCH_ASSISTANT_LOG");
    await expect(page.getByText("暂无数据")).toBeVisible();

    await searchInput.clear();
    await expect(tableRowByText(page, TEST_DATA.students.pendingReview1)).toBeVisible();
  });

  test("展开行查看实验详情", async ({ page }) => {
    await loginAsAssistant(page);
    await openExperimentLogsPage(page);

    // Search for a student
    const searchInput = page.getByPlaceholder(ExperimentLogSelectors.searchInput.placeholder);
    await searchInput.fill(TEST_DATA.students.pendingReview1);

    // Find and expand the filtered row after the table has refreshed.
    const studentRow = tableRowByText(page, TEST_DATA.students.pendingReview1);
    await expect(studentRow).toBeVisible();
    await studentRow.getByRole("button", { name: "展开行" }).click();

    // Verify expanded content shows experiment details
    await expect(page.getByText("实验ID")).toBeVisible();
    await expect(page.getByText("状态")).toBeVisible();
    await expect(page.getByText("行业")).toBeVisible();
    await expect(page.getByText("公司")).toBeVisible();
    await expect(page.getByText("产品")).toBeVisible();
  });
});

test.describe("@assistant 评阅边缘测试", () => {
  test("评阅校验：清空报告得分后禁止保存", async ({ page }) => {
    await loginAsAssistant(page);
    await openExperimentReportsPage(page);

    await page.getByPlaceholder(ExperimentReportSelectors.searchInput.placeholder).fill("20240051");
    const reportRow = tableRowByText(page, "20240051");
    await expect(reportRow).toBeVisible();
    const reviewModal = await openReportReviewModal(reportRow);
    await reviewModal.getByPlaceholder(ExperimentReportSelectors.reportScoreInput.placeholder).fill("");

    await expect(reviewModal.getByText("分数需在 0-100 之间")).toBeVisible();
    await expect(reviewModal.getByRole(ExperimentReportSelectors.saveReviewBtn.role, { name: ExperimentReportSelectors.saveReviewBtn.name })).toBeDisabled();
    await reviewModal.getByRole("button", { name: /取\s*消/ }).click();
  });

  test("评阅驳回校验：未填写原因时禁用驳回", async ({ page }) => {
    await loginAsAssistant(page);
    await openExperimentReportsPage(page);

    await page.getByPlaceholder(ExperimentReportSelectors.searchInput.placeholder).fill("20240051");
    const reportRow = tableRowByText(page, "20240051");
    await expect(reportRow).toBeVisible();
    const reviewModal = await openReportReviewModal(reportRow);
    const rejectButton = reviewModal.getByRole("button", { name: "驳回报告" });
    await expect(rejectButton).toBeDisabled();

    await fillReportRejectReason(reviewModal, "请补充实验说明");
    await expect(rejectButton).toBeEnabled();
    await reviewModal.getByRole("button", { name: /取\s*消/ }).click();
  });

  test("评阅分数边界值", async ({ page }) => {
    await loginAsAssistant(page);
    await openExperimentReportsPage(page);

    // 使用 20240051（已评分的学生），重新评阅为 0 分测试边界值
    const searchInput = page.getByPlaceholder(ExperimentReportSelectors.searchInput.placeholder);
    await searchInput.fill("20240051");
    
    const reportRow = tableRowByText(page, "20240051");
    await expect(reportRow).toBeVisible();
    const reviewModal = await openReportReviewModal(reportRow);

    // Test 0 score (minimum) - 重新评阅为 0 分
    await fillReportReviewForm(reviewModal, {
      reportScore: "0",
      modelScore: "0",
      feedback: "边界测试：0分",
    });
    await reviewModal.getByRole(ExperimentReportSelectors.saveReviewBtn.role, { name: ExperimentReportSelectors.saveReviewBtn.name }).click();
    
    await expectSuccessMessage(page, SuccessMessages.reviewSaved);
    await expect(tableRowByText(page, "20240051").getByText(ExperimentReportSelectors.statusGraded)).toBeVisible();
  });

  test("评阅100分", async ({ page }) => {
    await loginAsAssistant(page);
    await openExperimentReportsPage(page);

    // 使用 20240054（进行中的学生），先完成实验并提交报告
    // 注意：由于该学生没有报告，我们改为验证已评分学生的状态
    // 这里测试满分100的情况
    
    const searchInput = page.getByPlaceholder(ExperimentReportSelectors.searchInput.placeholder);
    await searchInput.fill("20240051");  // 已评分的学生
    
    const reportRow = tableRowByText(page, "20240051");
    await expect(reportRow).toBeVisible();
    const reviewModal = await openReportReviewModal(reportRow);

    // Test 100 score (maximum) - 重新评阅为100分
    await fillReportReviewForm(reviewModal, {
      reportScore: "100",
      modelScore: "100",
      feedback: "边界测试：满分100",
    });
    await reviewModal.getByRole(ExperimentReportSelectors.saveReviewBtn.role, { name: ExperimentReportSelectors.saveReviewBtn.name }).click();
    
    await expectSuccessMessage(page, SuccessMessages.reviewSaved);
    await expect(tableRowByText(page, "20240051").getByText(ExperimentReportSelectors.statusGraded)).toBeVisible();
  });

  test("驳回报告后显示已驳回状态与原因", async ({ page }) => {
    await loginAsAssistant(page);
    await openExperimentReportsPage(page);

    await page.getByPlaceholder(ExperimentReportSelectors.searchInput.placeholder).fill("20240051");
    const reportRow = tableRowByText(page, "20240051");
    await expect(reportRow).toBeVisible();

    const rejectReason = `Assistant驳回-${Date.now().toString().slice(-6)}`;
    const reviewModal = await openReportReviewModal(reportRow);
    await fillReportRejectReason(reviewModal, rejectReason);
    await reviewModal.getByRole("button", { name: "驳回报告" }).click();

    await expectSuccessMessage(page, "报告已驳回");
    await expect(tableRowByText(page, "20240051").getByText(ExperimentReportSelectors.statusRejected)).toBeVisible();

    const rejectedModal = await openReportReviewModal(tableRowByText(page, "20240051"));
    await expect(rejectedModal.getByText("报告已驳回")).toBeVisible();
    await expect(rejectedModal.getByText(rejectReason)).toBeVisible();
    await rejectedModal.getByRole("button", { name: /关\s*闭/ }).click();
  });
});
