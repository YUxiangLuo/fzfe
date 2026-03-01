/**
 * Teacher E2E Tests
 * 
 * Tests for teacher role covering:
 * - Layout and navigation
 * - Class management (create, edit, delete, student list)
 * - Student management (add, reset password, remove)
 * - Assistant management (create, reassign, select from library)
 * - Experiment management (progress, logs, reports, export)
 * - Assessment management (question bank, grade weights, grade overview)
 * - Personal info management
 * - Edge cases (perfect score, zero score, special content)
 */

import { expect, test, type Page } from "@playwright/test";
import {
  // Generators
  makeRunId,
  makePhone,
  makeLetters,
  makeStudentNo,
  buildCsv,
  // Navigation
  openTopLevelPage,
  openSubMenuPage,
  openPersonalInfoPage,
  // Locators
  tableRowByText,
  getVisibleModal,
  fillFormField,
  selectOptionByLabel,
  clearMultiSelectByLabel,
  // Stats & API
  getStatisticValue,
  unwrapDataEnvelope,
  computeClassGradeStats,
  computeScoreDistribution,
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
  type TeacherClassSummary,
  // Selectors
  CommonSelectors,
  ClassManagementSelectors,
  StudentManagementSelectors,
  AssistantManagementSelectors,
  ExperimentReportSelectors,
  ExperimentProgressSelectors,
  ExperimentLogSelectors,
  QuestionBankSelectors,
  GradeWeightSelectors,
  GradeOverviewSelectors,
  PersonalInfoSelectors,
  SuccessMessages,
  ModalTitles,
} from "../helpers";

// ===== Constants =====

const BACKEND_PORT = process.env.E2E_BACKEND_PORT ?? "54102";
const BACKEND_ORIGIN = process.env.E2E_BACKEND_ORIGIN ?? `http://127.0.0.1:${BACKEND_PORT}`;

// ===== Setup =====

async function loginAsTeacher(page: Page, password = ACCOUNTS.teacher.password): Promise<void> {
  await loginAs(page, { username: ACCOUNTS.teacher.username, password, role: "teacher" });
}

// ===== Test Suite =====

test.describe("@teacher 布局与导航", () => {
  test("菜单与退出登录覆盖", async ({ page }) => {
    await loginAsTeacher(page);

    // Toggle menu
    const menuToggle = page.locator("header button").first();
    await menuToggle.click();
    await expect(page.getByRole("heading", { level: 4, name: "T" })).toBeVisible();
    await menuToggle.click();
    await expect(page.getByRole("heading", { level: 4, name: "Teacher Portal" })).toBeVisible();

    // Navigate through menus
    await openTopLevelPage(page, "班级管理", "班级管理");
    await openTopLevelPage(page, "学生管理", "学生管理");
    await openSubMenuPage(page, "账户设置", "助教管理", "助教管理");
    await openSubMenuPage(page, "账户设置", "个人信息", "个人信息管理");
    await openSubMenuPage(page, "考核管理", "题库管理", "题库管理");

    // Logout flow
    await logout(page);
    
    // Verify token cleared
    const token = await page.evaluate(() => localStorage.getItem("token"));
    expect(token).toBeNull();
  });
});

test.describe("@teacher 班级管理", () => {
  test("创建班级", async ({ page }) => {
    await loginAsTeacher(page);
    await openTopLevelPage(page, "班级管理", "班级管理");

    const className = makeRunId("E2E班级");
    const classCode = `TC${Date.now()}`;

    await page.getByRole(ClassManagementSelectors.addClassBtn.role, { name: ClassManagementSelectors.addClassBtn.name }).click();
    const createModal = await getVisibleModal(page, ModalTitles.createClass);

    // Download template
    const [templateDownload] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole(ClassManagementSelectors.downloadTemplateBtn.role, { name: ClassManagementSelectors.downloadTemplateBtn.name }).click(),
    ]);
    expect(templateDownload.suggestedFilename()).toContain("学生名单导入模板");

    // Fill form and upload
    await fillFormField(createModal, ClassManagementSelectors.classNameInput, className);
    await fillFormField(createModal, ClassManagementSelectors.classCodeInput, classCode);
    await createModal.locator(ClassManagementSelectors.fileInput).setInputFiles({
      name: `students-${Date.now()}.csv`,
      mimeType: "text/csv",
      buffer: buildCsv([
        ["学号", "姓名"],
        [makeStudentNo(11), "班级导入学生"],
      ]),
    });
    await createModal.getByRole("button", { name: /创\s*建/ }).click();

    await expectSuccessMessage(page, SuccessMessages.classCreated);
    
    // Verify creation result
    const resultModal = await getVisibleModal(page, "创建结果");
    await expect(resultModal.getByText("新建学生数")).toBeVisible();
    await resultModal.getByRole("button", { name: /确\s*定/ }).click();

    // Verify class appears in list
    const classRow = tableRowByText(page, className);
    await expect(classRow).toBeVisible();

    // Cleanup: delete the created class
    await classRow.getByRole(ClassManagementSelectors.deleteClassBtn.role, { name: ClassManagementSelectors.deleteClassBtn.name }).click();
    const deleteModal = await getVisibleModal(page, ModalTitles.deleteClass);
    await deleteModal.getByRole("button", { name: /删\s*除/ }).click();
    await expectSuccessMessage(page, SuccessMessages.classDeleted);
  });

  test("编辑班级", async ({ page }) => {
    await loginAsTeacher(page);
    await openTopLevelPage(page, "班级管理", "班级管理");

    const firstRow = page.locator(CommonSelectors.tableRow).nth(1);
    const originalClassName = await firstRow.locator("td").first().innerText();
    const originalClassCode = await firstRow.locator("td").nth(1).innerText();

    const updatedClassName = `E2E编辑班级-${Date.now()}`;
    const updatedClassCode = `EDIT${Date.now()}`;

    // Edit first class
    await firstRow.getByRole(ClassManagementSelectors.editClassBtn.role, { name: ClassManagementSelectors.editClassBtn.name }).click();
    
    const editModal = await getVisibleModal(page, ModalTitles.editClass);
    await fillFormField(editModal, ClassManagementSelectors.classNameInput, updatedClassName);
    await fillFormField(editModal, ClassManagementSelectors.classCodeInput, updatedClassCode);
    await editModal.getByRole("button", { name: /保\s*存/ }).click();
    
    await expectSuccessMessage(page, SuccessMessages.classUpdated);
    await expect(tableRowByText(page, updatedClassName)).toBeVisible();

    // Cleanup: restore original class name
    const updatedRow = tableRowByText(page, updatedClassName);
    await updatedRow.getByRole(ClassManagementSelectors.editClassBtn.role, { name: ClassManagementSelectors.editClassBtn.name }).click();
    const restoreModal = await getVisibleModal(page, ModalTitles.editClass);
    await fillFormField(restoreModal, ClassManagementSelectors.classNameInput, originalClassName);
    await fillFormField(restoreModal, ClassManagementSelectors.classCodeInput, originalClassCode);
    await restoreModal.getByRole("button", { name: /保\s*存/ }).click();
    await expectSuccessMessage(page, SuccessMessages.classUpdated);
  });

  test("查看班级学生列表", async ({ page }) => {
    await loginAsTeacher(page);
    await openTopLevelPage(page, "班级管理", "班级管理");

    const firstRow = page.locator(CommonSelectors.tableRow).nth(1);
    const className = await firstRow.locator("td").first().innerText();
    
    await firstRow.getByRole(ClassManagementSelectors.studentListBtn.role, { name: ClassManagementSelectors.studentListBtn.name }).click();
    
    const studentsModal = await getVisibleModal(page, new RegExp(`学生列表\s*-\s*${className}`));
    await expect(studentsModal.locator(CommonSelectors.table)).toBeVisible();
    await studentsModal.getByRole("button", { name: /关\s*闭/ }).click();
  });
});

test.describe("@teacher 学生管理", () => {
  test("添加新学生", async ({ page }) => {
    await loginAsTeacher(page);
    await openTopLevelPage(page, "学生管理", "学生管理");

    const studentNo = makeStudentNo(21);
    const studentName = `Student${makeLetters(6)}`;

    await page.getByRole(StudentManagementSelectors.addStudentBtn.role, { name: StudentManagementSelectors.addStudentBtn.name }).click();
    const addModal = await getVisibleModal(page, StudentManagementSelectors.addStudentBtn.name);
    
    await fillFormField(addModal, StudentManagementSelectors.studentNoInput, studentNo);
    await fillFormField(addModal, StudentManagementSelectors.studentNameInput, studentName);
    await fillFormField(addModal, StudentManagementSelectors.passwordInput, "Student@123");
    await addModal.getByRole("button", { name: /添\s*加/ }).click();
    
    await expectSuccessMessage(page, SuccessMessages.studentAdded);

    // Verify student appears
    const searchInput = page.getByPlaceholder(StudentManagementSelectors.searchInput.placeholder);
    await searchInput.fill(studentName);
    await expect(tableRowByText(page, studentName)).toBeVisible();

    // Cleanup: remove student
    const studentRow = tableRowByText(page, studentName);
    await studentRow.getByRole(StudentManagementSelectors.removeStudentBtn.role, { name: StudentManagementSelectors.removeStudentBtn.name }).click();
    const removeModal = await getVisibleModal(page, ModalTitles.removeStudent);
    await removeModal.getByRole("button", { name: /移\s*除/ }).click();
    await expectSuccessMessage(page, SuccessMessages.studentRemoved);
  });

  test("从学生库添加", async ({ page }) => {
    await loginAsTeacher(page);
    await openTopLevelPage(page, "学生管理", "学生管理");

    // Add a student first
    const studentNo = makeStudentNo(31);
    const studentName = `Library${makeLetters(4)}`;
    
    await page.getByRole(StudentManagementSelectors.addStudentBtn.role, { name: StudentManagementSelectors.addStudentBtn.name }).click();
    const addModal = await getVisibleModal(page, StudentManagementSelectors.addStudentBtn.name);
    await fillFormField(addModal, StudentManagementSelectors.studentNoInput, studentNo);
    await fillFormField(addModal, StudentManagementSelectors.studentNameInput, studentName);
    await fillFormField(addModal, StudentManagementSelectors.passwordInput, "Student@123");
    await addModal.getByRole("button", { name: /添\s*加/ }).click();
    await expectSuccessMessage(page, SuccessMessages.studentAdded);
    // Modal auto-closes after success

    // Search for the student to ensure they're in the list
    const searchInput = page.locator("input[placeholder='学号或姓名']").first();
    await searchInput.fill(studentName);
    
    // Remove from class
    const studentRow = tableRowByText(page, studentName);
    await expect(studentRow).toBeVisible();
    await studentRow.getByRole(StudentManagementSelectors.removeStudentBtn.role, { name: StudentManagementSelectors.removeStudentBtn.name }).click();
    const removeModal = await getVisibleModal(page, ModalTitles.removeStudent);
    await removeModal.getByRole("button", { name: /移\s*除/ }).click();
    await expectSuccessMessage(page, SuccessMessages.studentRemoved);

    // Clear search to see the student is removed
    await searchInput.clear();
    await page.waitForTimeout(500);

    // Add back from library
    await page.getByRole(StudentManagementSelectors.addFromLibraryBtn.role, { name: StudentManagementSelectors.addFromLibraryBtn.name }).click();
    const selectModal = await getVisibleModal(page, "从学生库中添加");
    await selectModal.locator("input[placeholder='按学号或姓名搜索']").fill(studentNo);
    await expect(selectModal.getByText(studentName)).toBeVisible({ timeout: 10_000 });
    await selectModal.getByRole("button", { name: "添加到班级" }).click();
    await expectSuccessMessage(page, "添加成功");
    await selectModal.getByRole("button", { name: /关\s*闭/ }).click();

    // Verify added back
    await searchInput.fill(studentName);
    await expect(tableRowByText(page, studentName)).toBeVisible();
  });

  test("重置学生密码", async ({ page }) => {
    await loginAsTeacher(page);
    await openTopLevelPage(page, "学生管理", "学生管理");

    const firstRow = page.locator(CommonSelectors.tableRow).nth(1);
    const studentName = await firstRow.locator("td").nth(1).innerText();

    await firstRow.getByRole(StudentManagementSelectors.resetPasswordBtn.role, { name: StudentManagementSelectors.resetPasswordBtn.name }).click();
    const resetModal = await getVisibleModal(page, ModalTitles.resetPassword);
    
    await fillFormField(resetModal, "新密码", "Reset@123");
    await fillFormField(resetModal, "确认密码", "Reset@123");
    await resetModal.getByRole("button", { name: /确\s*认重置/ }).click();
    
    await expectSuccessMessage(page, SuccessMessages.passwordReset);
  });

  test("分页与搜索重置", async ({ page }) => {
    await loginAsTeacher(page);
    await openTopLevelPage(page, "学生管理", "学生管理");

    const pagination = page.locator(CommonSelectors.pagination).first();
    await expect(pagination).toBeVisible();
    await pagination.locator(CommonSelectors.paginationItem).nth(1).click();
    await expect(pagination.locator(CommonSelectors.paginationActive)).toHaveText("2");

    // Search should reset to page 1
    const searchInput = page.getByPlaceholder(StudentManagementSelectors.searchInput.placeholder);
    await searchInput.fill("20240001");
    const searchedRow = tableRowByText(page, "20240001");
    await expect(searchedRow).toBeVisible();
    await expect(pagination.locator(CommonSelectors.paginationActive)).toHaveText("1");
  });
});

/**
 * Get the first available class name from the class management page
 */
async function getFirstClassName(page: Page): Promise<string> {
  await openTopLevelPage(page, "班级管理", "班级管理");
  const firstRow = page.locator(CommonSelectors.tableRow).nth(1);
  return await firstRow.locator("td").first().innerText();
}

test.describe("@teacher 助教管理", () => {
  test("创建助教", async ({ page }) => {
    await loginAsTeacher(page);
    
    // Get the first available class name dynamically
    const firstClassName = await getFirstClassName(page);
    
    await openSubMenuPage(page, "账户设置", "助教管理", "助教管理");

    const assistantUsername = `ta${Date.now().toString().slice(-8)}`;
    const assistantName = `Assistant${makeLetters(6)}`;
    const assistantEmail = `${assistantUsername}@e2e.test`;

    await page.getByRole(AssistantManagementSelectors.createAssistantBtn.role, { name: AssistantManagementSelectors.createAssistantBtn.name }).click();
    const createModal = await getVisibleModal(page, ModalTitles.createAssistant);
    
    await fillFormField(createModal, AssistantManagementSelectors.usernameInput, assistantUsername);
    await fillFormField(createModal, AssistantManagementSelectors.fullNameInput, assistantName);
    await fillFormField(createModal, AssistantManagementSelectors.emailInput, assistantEmail);
    await fillFormField(createModal, AssistantManagementSelectors.phoneInput, makePhone(31));
    await fillFormField(createModal, AssistantManagementSelectors.passwordInput, "Assistant@123");
    await selectOptionByLabel(page, createModal, AssistantManagementSelectors.classSelectLabel, firstClassName);
    await createModal.getByRole("button", { name: /创\s*建/ }).click();

    await expectSuccessMessage(page, SuccessMessages.assistantCreated);
    await expect(tableRowByText(page, assistantName)).toBeVisible();
  });

  test("重新分配助教班级", async ({ page }) => {
    await loginAsTeacher(page);
    await openSubMenuPage(page, "账户设置", "助教管理", "助教管理");

    // Find first assistant
    const firstRow = page.locator(CommonSelectors.tableRow).nth(1);
    const assistantName = await firstRow.locator("td").first().innerText();

    await firstRow.getByRole(AssistantManagementSelectors.reassignBtn.role, { name: AssistantManagementSelectors.reassignBtn.name }).click();
    const reassignModal = await getVisibleModal(page, ModalTitles.reassignAssistant);
    await clearMultiSelectByLabel(reassignModal, AssistantManagementSelectors.classSelectLabel);
    await reassignModal.getByRole("button", { name: /保\s*存/ }).click();
    
    await expectSuccessMessage(page, SuccessMessages.assistantUnassigned);
  });

  test("从库中选择助教", async ({ page }) => {
    await loginAsTeacher(page);
    
    // Get the first available class name dynamically
    const firstClassName = await getFirstClassName(page);
    
    await openSubMenuPage(page, "账户设置", "助教管理", "助教管理");

    await page.getByRole(AssistantManagementSelectors.selectFromLibraryBtn.role, { name: AssistantManagementSelectors.selectFromLibraryBtn.name }).click();
    const selectModal = await getVisibleModal(page, ModalTitles.selectAssistant);
    
    await selectOptionByLabel(page, selectModal, "选择助教", "助教小赵");
    await selectOptionByLabel(page, selectModal, AssistantManagementSelectors.classSelectLabel, firstClassName);
    await selectModal.getByRole("button", { name: /分\s*配/ }).click();

    await expectSuccessMessage(page, SuccessMessages.assistantAssigned);
    await expect(tableRowByText(page, "助教小赵")).toBeVisible();
  });
});

test.describe("@teacher 实验管理", () => {
  test("实验进度查看", async ({ page }) => {
    await loginAsTeacher(page);
    await openSubMenuPage(page, "实验管理", "实验进度", "实验进度");
    
    // Verify page loaded with statistics
    await expect(page.getByText(ExperimentProgressSelectors.avgCompletionStat)).toBeVisible();

    // Search and expand
    const searchInput = page.getByPlaceholder(ExperimentProgressSelectors.searchInput.placeholder);
    await searchInput.fill(TEST_DATA.students.pendingTeacher);
    await expect(tableRowByText(page, TEST_DATA.students.pendingTeacher)).toBeVisible();

    // Expand row to see step completion
    await page.locator(ExperimentProgressSelectors.expandIcon).first().click();
    await expect(page.getByText(ExperimentProgressSelectors.stepCompletionText)).toBeVisible();
  });

  test("实验日志查看", async ({ page }) => {
    await loginAsTeacher(page);
    await openSubMenuPage(page, "实验管理", "实验日志", "实验日志");
    
    await expect(page.getByText(ExperimentLogSelectors.totalExperimentsStat)).toBeVisible();
    
    const searchInput = page.getByPlaceholder(ExperimentLogSelectors.searchInput.placeholder);
    await searchInput.fill(TEST_DATA.students.pendingTeacher);
    await expect(tableRowByText(page, TEST_DATA.students.pendingTeacher)).toBeVisible();
  });

  test("实验报告评阅", async ({ page }) => {
    await loginAsTeacher(page);
    await openSubMenuPage(page, "实验管理", "实验报告", "实验报告");
    
    await expect(page.getByText("报告平均得分")).toBeVisible();

    // Find pending report
    const searchInput = page.getByPlaceholder(ExperimentReportSelectors.searchInput.placeholder);
    await searchInput.fill(TEST_DATA.students.pendingTeacher);
    const reportRow = tableRowByText(page, TEST_DATA.students.pendingTeacher);
    await expect(reportRow.getByText(ExperimentReportSelectors.statusSubmitted)).toBeVisible();

    // Review
    await reportRow.getByRole(ExperimentReportSelectors.reviewBtn.role, { name: ExperimentReportSelectors.reviewBtn.name }).click();
    const reviewModal = await getVisibleModal(page, ModalTitles.reviewReport);
    
    await reviewModal.getByPlaceholder(ExperimentReportSelectors.reportScoreInput.placeholder).fill("88");
    await reviewModal.getByPlaceholder(ExperimentReportSelectors.modelScoreInput.placeholder).fill("92");
    await reviewModal.getByPlaceholder(ExperimentReportSelectors.feedbackInput.placeholder).fill("E2E 自动评阅通过。");
    await reviewModal.getByRole(ExperimentReportSelectors.saveReviewBtn.role, { name: ExperimentReportSelectors.saveReviewBtn.name }).click();
    
    await expectSuccessMessage(page, SuccessMessages.reviewSaved);
    await expect(tableRowByText(page, TEST_DATA.students.pendingTeacher).getByText(ExperimentReportSelectors.statusGraded)).toBeVisible();
  });

  test("导出 CSV 和报告归档", async ({ page }) => {
    await loginAsTeacher(page);
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

  test("实验报告分页", async ({ page }) => {
    await loginAsTeacher(page);
    await openSubMenuPage(page, "实验管理", "实验报告", "实验报告");

    const pagination = page.locator(CommonSelectors.pagination).first();
    await expect(pagination).toBeVisible();
    await pagination.locator(CommonSelectors.paginationItem).nth(1).click();
    await expect(pagination.locator(CommonSelectors.paginationActive)).toHaveText("2");

    // Search resets page
    const searchInput = page.getByPlaceholder(ExperimentReportSelectors.searchInput.placeholder);
    await searchInput.fill(TEST_DATA.students.perfectScore);
    const filteredRow = tableRowByText(page, TEST_DATA.students.perfectScore);
    await expect(filteredRow).toBeVisible();
    await expect(pagination.locator(CommonSelectors.paginationActive)).toHaveText("1");
  });
});

test.describe("@teacher 考核管理", () => {
  test("题库增改删", async ({ page }) => {
    await loginAsTeacher(page);
    await openSubMenuPage(page, "考核管理", "题库管理", "题库管理");

    const createdQuestionText = `E2E题目${Date.now()}`;
    const updatedQuestionText = `${createdQuestionText}-更新`;

    // Create via API
    const token = await page.evaluate(() => localStorage.getItem("token"));
    expect(token).not.toBeNull();

    const createResponse = await page.request.post(`${BACKEND_ORIGIN}/api/v1/question-bank/questions`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      data: {
        question_text: createdQuestionText,
        question_type: "Single Choice",
        knowledge_point: "时间序列基础",
        options: ["选项A", "选项B"],
        correct_answers: ["选项A"],
      },
    });
    expect(createResponse.ok()).toBeTruthy();

    // Verify and edit
    await page.getByRole(QuestionBankSelectors.refreshBtn.role, { name: QuestionBankSelectors.refreshBtn.name }).click();
    const questionSearchInput = page.locator('input[placeholder="输入题目内容"]').first();
    await questionSearchInput.fill(createdQuestionText);
    const createdRow = tableRowByText(page, createdQuestionText);
    await expect(createdRow).toBeVisible();

    // Edit
    await createdRow.getByRole(QuestionBankSelectors.editBtn.role).nth(1).click();
    const editQuestionModal = await getVisibleModal(page, "编辑题目");
    await fillFormField(editQuestionModal, QuestionBankSelectors.questionTextInput, updatedQuestionText);
    await editQuestionModal.getByRole("button", { name: /保\s*存/ }).click();
    await expectSuccessMessage(page, SuccessMessages.questionUpdated);

    // Preview
    await questionSearchInput.fill(updatedQuestionText);
    const updatedRow = tableRowByText(page, updatedQuestionText);
    await updatedRow.getByRole(QuestionBankSelectors.previewBtn.role).nth(0).click();
    const previewModal = await getVisibleModal(page, "题目预览");
    await expect(previewModal.getByText(updatedQuestionText)).toBeVisible();
    await previewModal.getByRole("button", { name: "Close" }).click();

    // Delete
    await updatedRow.getByRole(QuestionBankSelectors.deleteBtn.role).nth(2).click();
    const deletePopover = page.locator(".ant-popover").filter({ hasText: "确定删除该题目？" }).last();
    await expect(deletePopover).toBeVisible();
    await deletePopover.getByRole("button", { name: /确\s*定/ }).click();
    await expectSuccessMessage(page, SuccessMessages.questionDeleted);
  });

  test("成绩权重设置", async ({ page }) => {
    await loginAsTeacher(page);
    await openSubMenuPage(page, "考核管理", "成绩权重", "成绩权重设置");
    
    await expect(page.getByText(GradeWeightSelectors.topLevelWeightTitle)).toBeVisible();

    // Try invalid weights
    const expFlowTopCard = page.locator(CommonSelectors.card).filter({ hasText: /^实验流程/ }).first();
    await expFlowTopCard.getByRole("spinbutton").fill("50");
    await page.getByRole(GradeWeightSelectors.saveBtn.role, { name: GradeWeightSelectors.saveBtn.name }).click();
    await expect(page.getByText("顶层权重总和必须为 100%")).toBeVisible();

    // Reset and save default
    await page.getByRole(GradeWeightSelectors.resetBtn.role, { name: GradeWeightSelectors.resetBtn.name }).click();
    await expectSuccessMessage(page, SuccessMessages.weightsReset);

    const savePromise = page.waitForResponse(
      (r) => r.request().method() === "PUT" && API.gradingPolicy.test(r.url()),
    );
    await page.getByRole(GradeWeightSelectors.saveBtn.role, { name: GradeWeightSelectors.saveBtn.name }).click();
    expect((await savePromise).ok()).toBeTruthy();
    await expectSuccessMessage(page, SuccessMessages.weightsSaved);

    // Update specific weights
    await setWeightByLabel(page, "需求预测 - 数据准备", 6);
    await setWeightByLabel(page, "报告提交", 34);
    
    const updatePromise = page.waitForResponse(
      (r) => r.request().method() === "PUT" && API.gradingPolicy.test(r.url()),
    );
    await page.getByRole(GradeWeightSelectors.saveBtn.role, { name: GradeWeightSelectors.saveBtn.name }).click();
    const updateResponse = await updatePromise;
    expect(updateResponse.ok()).toBeTruthy();
    
    const payload = updateResponse.request().postDataJSON() as Record<string, unknown>;
    expect(Number(payload.exp_flow_demand_data_preparation)).toBe(6);
    expect(Number(payload.exp_flow_report_submission)).toBe(34);
  });

  test("成绩总览看板", async ({ page }) => {
    await loginAsTeacher(page);
    
    const summaryPromise = page.waitForResponse(
      (r) => r.request().method() === "GET" && API.teacherGradeSummaries.test(r.url()),
    );
    await openSubMenuPage(page, "考核管理", "成绩总览", "成绩总览");
    
    const summaryResponse = await summaryPromise;
    expect(summaryResponse.ok()).toBeTruthy();
    const allClassSummaries = unwrapDataEnvelope<TeacherClassSummary[]>(await summaryResponse.json());

    // Use the first available class from API response
    expect(allClassSummaries.length).toBeGreaterThan(0);
    const firstClass = allClassSummaries[0];
    const firstClassName = firstClass.class_name;
    const firstClassId = firstClass.class_id;

    // Verify charts
    await expect(page.getByText("各班级平均分对比")).toBeVisible();
    await expect(page.getByText("各班级完成情况")).toBeVisible();
    await expect(page.getByText("各班级提交率对比")).toBeVisible();

    // Click to view details
    const classCard = page
      .locator(CommonSelectors.card)
      .filter({ hasText: firstClassName })
      .filter({ hasText: GradeOverviewSelectors.classCardClickHint })
      .first();
    await expect(classCard).toBeVisible();

    const detailPromise = page.waitForResponse(
      (r) => r.request().method() === "GET" && r.url().includes(`/api/v1/classes/${firstClassId}/grade-summaries`),
    );
    await classCard.click();
    expect((await detailPromise).ok()).toBeTruthy();

    // Verify statistics
    expect(await getStatisticValue(page, GradeOverviewSelectors.totalStudentsStat)).toBe(firstClass?.total_students ?? 0);

    // Search student
    await page.getByPlaceholder(GradeOverviewSelectors.searchInput.placeholder).fill(TEST_DATA.students.perfectScore);
    await expect(tableRowByText(page, TEST_DATA.students.perfectScore)).toBeVisible();
  });
});

test.describe("@teacher 边缘情况", () => {
  test("成绩边缘值", async ({ page }) => {
    await loginAsTeacher(page);
    await openSubMenuPage(page, "考核管理", "成绩总览", "成绩总览");

    const classCard = page
      .locator(CommonSelectors.card)
      .filter({ hasText: TEST_DATA.teacherClassName })
      .filter({ hasText: GradeOverviewSelectors.classCardClickHint })
      .first();
    await classCard.click();

    // Perfect score - verify student exists with 100 score
    await page.getByPlaceholder(GradeOverviewSelectors.searchInput.placeholder).fill(TEST_DATA.students.perfectScore);
    const perfectRow = tableRowByText(page, TEST_DATA.students.perfectScore);
    await expect(perfectRow).toBeVisible();
    await expect(perfectRow.getByText("已完成评分")).toBeVisible();

    // Pass threshold
    await page.getByPlaceholder(GradeOverviewSelectors.searchInput.placeholder).clear();
    await page.getByPlaceholder(GradeOverviewSelectors.searchInput.placeholder).fill(TEST_DATA.students.passThreshold);
    const passRow = tableRowByText(page, TEST_DATA.students.passThreshold);
    await expect(passRow).toBeVisible();

    // Zero score
    await page.getByPlaceholder(GradeOverviewSelectors.searchInput.placeholder).clear();
    await page.getByPlaceholder(GradeOverviewSelectors.searchInput.placeholder).fill(TEST_DATA.students.zeroScore);
    const zeroRow = tableRowByText(page, TEST_DATA.students.zeroScore);
    await expect(zeroRow).toBeVisible();

    // Verify distribution
    const distributionCard = page
      .locator(CommonSelectors.card)
      .filter({ has: page.getByText(GradeOverviewSelectors.scoreDistributionTitle, { exact: true }) })
      .first();
    await expect(distributionCard).toContainText("优秀");
    await expect(distributionCard).toContainText("良好");
    await expect(distributionCard).toContainText("中等");
    await expect(distributionCard).toContainText("及格");
    await expect(distributionCard).toContainText("不及格");
  });

  test("特殊内容处理", async ({ page }) => {
    await loginAsTeacher(page);
    await openSubMenuPage(page, "实验管理", "实验报告", "实验报告");

    // XSS content
    await page.getByPlaceholder(ExperimentReportSelectors.searchInput.placeholder).fill(TEST_DATA.students.xssTest);
    const xssRow = tableRowByText(page, TEST_DATA.students.xssTest);
    await expect(xssRow).toBeVisible();

    // SQL injection content
    await page.getByPlaceholder(ExperimentReportSelectors.searchInput.placeholder).clear();
    await page.getByPlaceholder(ExperimentReportSelectors.searchInput.placeholder).fill(TEST_DATA.students.sqlInjection);
    await expect(tableRowByText(page, TEST_DATA.students.sqlInjection)).toBeVisible();

    // Long text content - review it
    await page.getByPlaceholder(ExperimentReportSelectors.searchInput.placeholder).clear();
    await page.getByPlaceholder(ExperimentReportSelectors.searchInput.placeholder).fill(TEST_DATA.students.longText);
    const longRow = tableRowByText(page, TEST_DATA.students.longText);
    await longRow.getByRole(ExperimentReportSelectors.reviewBtn.role, { name: ExperimentReportSelectors.reviewBtn.name }).click();
    const reviewModal = await getVisibleModal(page, ModalTitles.reviewReport);
    await reviewModal.getByPlaceholder(ExperimentReportSelectors.reportScoreInput.placeholder).fill("75");
    await reviewModal.getByPlaceholder(ExperimentReportSelectors.modelScoreInput.placeholder).fill("78");
    await reviewModal.getByRole(ExperimentReportSelectors.saveReviewBtn.role, { name: ExperimentReportSelectors.saveReviewBtn.name }).click();
    await expectSuccessMessage(page, SuccessMessages.reviewSaved);
  });
});

test.describe("@teacher 个人信息", () => {
  test("编辑个人信息", async ({ page }) => {
    await loginAsTeacher(page);
    await openPersonalInfoPage(page);

    await page.getByRole(PersonalInfoSelectors.editBtn.role, { name: PersonalInfoSelectors.editBtn.name }).click();
    const editModal = await getVisibleModal(page, ModalTitles.editPersonalInfo);
    
    await fillFormField(editModal, PersonalInfoSelectors.fullNameInput, `张教授${Date.now().toString().slice(-4)}`);
    await fillFormField(editModal, PersonalInfoSelectors.phoneInput, makePhone(41));
    await fillFormField(editModal, PersonalInfoSelectors.emailInput, `teacher1+${Date.now()}@e2e.test`);
    await editModal.getByRole(PersonalInfoSelectors.saveBtn.role, { name: PersonalInfoSelectors.saveBtn.name }).click();
    
    await expectSuccessMessage(page, SuccessMessages.personalInfoSaved);
  });

  test("修改密码并回滚", async ({ page }) => {
    await loginAsTeacher(page);
    await openPersonalInfoPage(page);

    // Change password
    const passwordCard = page.locator(CommonSelectors.card).filter({ hasText: PersonalInfoSelectors.passwordCard }).first();
    await passwordCard.getByPlaceholder(PersonalInfoSelectors.currentPasswordInput.placeholder).fill(ACCOUNTS.teacher.password);
    await passwordCard.getByPlaceholder(PersonalInfoSelectors.newPasswordInput.placeholder).fill(ACCOUNTS.teacher.tempPassword);
    await passwordCard.getByPlaceholder(PersonalInfoSelectors.confirmPasswordInput.placeholder).fill(ACCOUNTS.teacher.tempPassword);
    await passwordCard.getByRole(PersonalInfoSelectors.savePasswordBtn.role, { name: PersonalInfoSelectors.savePasswordBtn.name }).click();
    await expectSuccessMessage(page, SuccessMessages.passwordChanged);

    // Logout and login with new password
    await logout(page);
    await loginAsTeacher(page, ACCOUNTS.teacher.tempPassword);
    await openPersonalInfoPage(page);

    // Rollback password
    const rollbackCard = page.locator(CommonSelectors.card).filter({ hasText: PersonalInfoSelectors.passwordCard }).first();
    await rollbackCard.getByPlaceholder(PersonalInfoSelectors.currentPasswordInput.placeholder).fill(ACCOUNTS.teacher.tempPassword);
    await rollbackCard.getByPlaceholder(PersonalInfoSelectors.newPasswordInput.placeholder).fill(ACCOUNTS.teacher.password);
    await rollbackCard.getByPlaceholder(PersonalInfoSelectors.confirmPasswordInput.placeholder).fill(ACCOUNTS.teacher.password);
    await rollbackCard.getByRole(PersonalInfoSelectors.savePasswordBtn.role, { name: PersonalInfoSelectors.savePasswordBtn.name }).click();
    await expectSuccessMessage(page, SuccessMessages.passwordChanged);
  });
});
