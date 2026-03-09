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
  expectErrorMessage,
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
  ErrorMessages,
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
    
    const studentsModal = await getVisibleModal(page, new RegExp(`学生列表\\s*-\\s*${className}`));
    await expect(studentsModal.locator(CommonSelectors.table)).toBeVisible();
    await studentsModal.getByRole("button", { name: /关\s*闭/ }).click();
  });

  test("创建班级失败提示", async ({ page }) => {
    await loginAsTeacher(page);
    await openTopLevelPage(page, "班级管理", "班级管理");

    const className = makeRunId("E2E失败班级");
    const classCode = `FAIL${Date.now()}`;

    await page.route("**/api/v1/classes", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "模拟创建失败" }),
      });
    });

    await page.getByRole(ClassManagementSelectors.addClassBtn.role, { name: ClassManagementSelectors.addClassBtn.name }).click();
    const createModal = await getVisibleModal(page, ModalTitles.createClass);
    await fillFormField(createModal, ClassManagementSelectors.classNameInput, className);
    await fillFormField(createModal, ClassManagementSelectors.classCodeInput, classCode);
    await createModal.locator(ClassManagementSelectors.fileInput).setInputFiles({
      name: `students-fail-${Date.now()}.csv`,
      mimeType: "text/csv",
      buffer: buildCsv([
        ["学号", "姓名"],
        [makeStudentNo(81), "创建失败学生"],
      ]),
    });
    await createModal.getByRole("button", { name: /创\s*建/ }).click();

    await expectErrorMessage(page, "模拟创建失败");
    await expect(createModal).toBeVisible();
    await page.unroute("**/api/v1/classes");
    await createModal.getByRole("button", { name: /取\s*消/ }).click();
  });

  test("查看班级学生列表失败提示", async ({ page }) => {
    await loginAsTeacher(page);
    await openTopLevelPage(page, "班级管理", "班级管理");

    const firstRow = page.locator(CommonSelectors.tableRow).nth(1);
    const className = await firstRow.locator("td").first().innerText();

    await page.route("**/api/v1/classes/*", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "模拟学生列表失败" }),
        });
        return;
      }
      await route.continue();
    });

    await firstRow.getByRole(ClassManagementSelectors.studentListBtn.role, { name: ClassManagementSelectors.studentListBtn.name }).click();

    const studentsModal = await getVisibleModal(page, new RegExp(`学生列表\\s*-\\s*${className}`));
    await expectErrorMessage(page, "模拟学生列表失败");
    await expect(studentsModal.getByText("暂无学生")).toBeVisible();
    await page.unroute("**/api/v1/classes/*");
    await studentsModal.getByRole("button", { name: /关\s*闭/ }).click();
  });

  test("删除班级失败提示", async ({ page }) => {
    await loginAsTeacher(page);
    await openTopLevelPage(page, "班级管理", "班级管理");

    const className = await createTempClass(page);
    const classRow = tableRowByText(page, className);
    await expect(classRow).toBeVisible();

    await page.route("**/api/v1/classes/*", async (route) => {
      if (route.request().method() === "DELETE") {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "模拟删除失败" }),
        });
        return;
      }
      await route.continue();
    });

    await classRow.getByRole(ClassManagementSelectors.deleteClassBtn.role, { name: ClassManagementSelectors.deleteClassBtn.name }).click();
    const deleteModal = await getVisibleModal(page, ModalTitles.deleteClass);
    await deleteModal.getByRole("button", { name: /删\s*除/ }).click();

    await expectErrorMessage(page, "模拟删除失败");
    await expect(tableRowByText(page, className)).toBeVisible();
    await page.unroute("**/api/v1/classes/*");

    await classRow.getByRole(ClassManagementSelectors.deleteClassBtn.role, { name: ClassManagementSelectors.deleteClassBtn.name }).click();
    const cleanupModal = await getVisibleModal(page, ModalTitles.deleteClass);
    await cleanupModal.getByRole("button", { name: /删\s*除/ }).click();
    await expectSuccessMessage(page, SuccessMessages.classDeleted);
  });

  test("空班级显示暂无班级", async ({ page }) => {
    await loginAsTeacher(page);

    await page.route("**/api/v1/teachers/*/classes", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [] }),
      });
    });

    await openTopLevelPage(page, "班级管理", "班级管理");
    await expect(page.getByText("暂无班级")).toBeVisible();
    await page.unroute("**/api/v1/teachers/*/classes");
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

  test("添加学生冲突校验：重复学号与邮箱", async ({ page }) => {
    await loginAsTeacher(page);
    await openTopLevelPage(page, "学生管理", "学生管理");

    const studentNo = makeStudentNo(22);
    const studentName = `Dup${makeLetters(5)}`;
    const studentEmail = `${studentNo}@dup.e2e.test`;

    await page.getByRole(StudentManagementSelectors.addStudentBtn.role, { name: StudentManagementSelectors.addStudentBtn.name }).click();
    const addModal = await getVisibleModal(page, StudentManagementSelectors.addStudentBtn.name);
    await fillFormField(addModal, StudentManagementSelectors.studentNoInput, studentNo);
    await fillFormField(addModal, StudentManagementSelectors.studentNameInput, studentName);
    await fillFormField(addModal, StudentManagementSelectors.passwordInput, "Student@123");
    await fillFormField(addModal, "邮箱（可选）", studentEmail);
    await addModal.getByRole("button", { name: /添\s*加/ }).click();
    await expectSuccessMessage(page, SuccessMessages.studentAdded);

    const searchInput = page.getByPlaceholder(StudentManagementSelectors.searchInput.placeholder);
    await searchInput.fill(studentName);
    const studentRow = tableRowByText(page, studentName);
    await expect(studentRow).toBeVisible();

    await page.getByRole(StudentManagementSelectors.addStudentBtn.role, { name: StudentManagementSelectors.addStudentBtn.name }).click();
    const duplicateNoModal = await getVisibleModal(page, StudentManagementSelectors.addStudentBtn.name);
    await fillFormField(duplicateNoModal, StudentManagementSelectors.studentNoInput, studentNo);
    await fillFormField(duplicateNoModal, StudentManagementSelectors.studentNameInput, `${studentName}重复学号`);
    await fillFormField(duplicateNoModal, StudentManagementSelectors.passwordInput, "Student@123");
    await fillFormField(duplicateNoModal, "邮箱（可选）", `${studentNo}+dup@e2e.test`);
    await duplicateNoModal.getByRole("button", { name: /添\s*加/ }).click();
    await expectErrorMessage(page, "学号或邮箱已存在");
    await expect(duplicateNoModal).toBeVisible();
    await duplicateNoModal.getByRole("button", { name: /取\s*消/ }).click();

    await page.getByRole(StudentManagementSelectors.addStudentBtn.role, { name: StudentManagementSelectors.addStudentBtn.name }).click();
    const duplicateEmailModal = await getVisibleModal(page, StudentManagementSelectors.addStudentBtn.name);
    await fillFormField(duplicateEmailModal, StudentManagementSelectors.studentNoInput, makeStudentNo(23));
    await fillFormField(duplicateEmailModal, StudentManagementSelectors.studentNameInput, `${studentName}重复邮箱`);
    await fillFormField(duplicateEmailModal, StudentManagementSelectors.passwordInput, "Student@123");
    await fillFormField(duplicateEmailModal, "邮箱（可选）", studentEmail);
    await duplicateEmailModal.getByRole("button", { name: /添\s*加/ }).click();
    await expectErrorMessage(page, "学号或邮箱已存在");
    await expect(duplicateEmailModal).toBeVisible();
    await duplicateEmailModal.getByRole("button", { name: /取\s*消/ }).click();

    await searchInput.fill(studentName);
    await expect(page.locator("tr").filter({ hasText: studentName })).toHaveCount(1);

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

  test("从学生库添加空搜索态", async ({ page }) => {
    await loginAsTeacher(page);
    await openTopLevelPage(page, "学生管理", "学生管理");

    await page.getByRole(StudentManagementSelectors.addFromLibraryBtn.role, { name: StudentManagementSelectors.addFromLibraryBtn.name }).click();
    const selectModal = await getVisibleModal(page, "从学生库中添加");

    await selectModal.locator("input[placeholder='按学号或姓名搜索']").fill("NO_MATCH_E2E_STUDENT");
    await expect(selectModal.getByText("暂无可加入的学生")).toBeVisible();

    await selectModal.getByRole("button", { name: /关\s*闭/ }).click();
    await expect(selectModal).not.toBeVisible();
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
    
    await expectSuccessMessage(page, "密码更新成功");
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

async function createTempClass(page: Page): Promise<string> {
  await openTopLevelPage(page, "班级管理", "班级管理");

  const className = makeRunId("E2E助教班级");
  const classCode = `TA${Date.now()}`;

  await page.getByRole(ClassManagementSelectors.addClassBtn.role, { name: ClassManagementSelectors.addClassBtn.name }).click();
  const createModal = await getVisibleModal(page, ModalTitles.createClass);
  await fillFormField(createModal, ClassManagementSelectors.classNameInput, className);
  await fillFormField(createModal, ClassManagementSelectors.classCodeInput, classCode);
  await createModal.locator(ClassManagementSelectors.fileInput).setInputFiles({
    name: `assistant-class-${Date.now()}.csv`,
    mimeType: "text/csv",
    buffer: buildCsv([
      ["学号", "姓名"],
      [makeStudentNo(91), "助教分配学生"],
    ]),
  });
  await createModal.getByRole("button", { name: /创\s*建/ }).click();
  await expectSuccessMessage(page, SuccessMessages.classCreated);

  const resultModal = await getVisibleModal(page, "创建结果");
  await resultModal.getByRole("button", { name: /确\s*定/ }).click();
  await expect(tableRowByText(page, className)).toBeVisible();
  return className;
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

  test("从库中选择助教时部分班级分配失败会提示 warning", async ({ page }) => {
    await loginAsTeacher(page);
    const firstClassName = await getFirstClassName(page);
    await openSubMenuPage(page, "账户设置", "助教管理", "助教管理");

    let postCount = 0;
    await page.route("**/api/v1/classes/*/assistants", async (route) => {
      postCount += 1;
      if (postCount === 1) {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "模拟分配失败" }),
        });
        return;
      }
      await route.continue();
    });

    await page.getByRole(AssistantManagementSelectors.selectFromLibraryBtn.role, { name: AssistantManagementSelectors.selectFromLibraryBtn.name }).click();
    const selectModal = await getVisibleModal(page, ModalTitles.selectAssistant);
    const assistantFormItem = selectModal.locator(CommonSelectors.formItem).filter({ hasText: "选择助教" }).first();
    await assistantFormItem.getByRole("combobox").click();
    const assistantDropdown = page.locator(".ant-select-dropdown").last();
    await expect(assistantDropdown).toBeVisible();
    const firstAvailableAssistant = assistantDropdown.locator(".ant-select-item-option-content").first();
    const assistantOptionText = (await firstAvailableAssistant.innerText()).trim();
    await firstAvailableAssistant.click();
    await page.keyboard.press("Escape");

    await selectOptionByLabel(page, selectModal, AssistantManagementSelectors.classSelectLabel, firstClassName);
    await selectModal.getByRole("button", { name: /分\s*配/ }).click();

    await expect(page.locator(CommonSelectors.warningMessage).filter({ hasText: "1 个班级分配失败" }).last()).toBeVisible();
    await expectSuccessMessage(page, SuccessMessages.assistantAssigned);
    await expect(page.locator(CommonSelectors.tableRow).filter({ hasText: assistantOptionText.split(" ")[0] ?? assistantOptionText })).toBeVisible();
    await page.unroute("**/api/v1/classes/*/assistants");
  });

  test("重新分配助教班级时部分操作失败会提示 warning", async ({ page }) => {
    await loginAsTeacher(page);
    const extraClassName = await createTempClass(page);
    await openSubMenuPage(page, "账户设置", "助教管理", "助教管理");

    const firstRow = page.locator(CommonSelectors.tableRow).nth(1);
    await firstRow.getByRole(AssistantManagementSelectors.reassignBtn.role, { name: AssistantManagementSelectors.reassignBtn.name }).click();
    const reassignModal = await getVisibleModal(page, ModalTitles.reassignAssistant);

    await clearMultiSelectByLabel(reassignModal, AssistantManagementSelectors.classSelectLabel);
    await selectOptionByLabel(page, reassignModal, AssistantManagementSelectors.classSelectLabel, extraClassName);

    let failureInjected = false;
    await page.route("**/api/v1/classes/*/assistants", async (route) => {
      if (!failureInjected) {
        failureInjected = true;
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "模拟更新失败" }),
        });
        return;
      }
      await route.continue();
    });

    await reassignModal.getByRole("button", { name: /保\s*存/ }).click();
    await expect(page.locator(CommonSelectors.warningMessage).filter({ hasText: "班级分配已更新，但 1 个操作失败" }).last()).toBeVisible();
    await page.unroute("**/api/v1/classes/*/assistants");

    await openTopLevelPage(page, "班级管理", "班级管理");
    const extraClassRow = tableRowByText(page, extraClassName);
    await extraClassRow.getByRole(ClassManagementSelectors.deleteClassBtn.role, { name: ClassManagementSelectors.deleteClassBtn.name }).click();
    const deleteModal = await getVisibleModal(page, ModalTitles.deleteClass);
    await deleteModal.getByRole("button", { name: /删\s*除/ }).click();
    await expectSuccessMessage(page, SuccessMessages.classDeleted);
  });

  test("创建助教冲突校验：重复用户名与邮箱", async ({ page }) => {
    await loginAsTeacher(page);
    await openSubMenuPage(page, "账户设置", "助教管理", "助教管理");

    const firstRow = page.locator(CommonSelectors.tableRow).nth(1);
    const existingUsername = await firstRow.locator("td").nth(1).innerText();
    const existingEmail = await firstRow.locator("td").nth(3).innerText();
    const firstClassName = await getFirstClassName(page);

    await openSubMenuPage(page, "账户设置", "助教管理", "助教管理");
    await page.getByRole(AssistantManagementSelectors.createAssistantBtn.role, { name: AssistantManagementSelectors.createAssistantBtn.name }).click();
    const duplicateUsernameModal = await getVisibleModal(page, ModalTitles.createAssistant);
    const duplicateUsername = `ta${Date.now().toString().slice(-8)}`;
    await fillFormField(duplicateUsernameModal, AssistantManagementSelectors.usernameInput, existingUsername);
    await fillFormField(duplicateUsernameModal, AssistantManagementSelectors.fullNameInput, `重复助教${makeLetters(4)}`);
    await fillFormField(duplicateUsernameModal, AssistantManagementSelectors.emailInput, `${duplicateUsername}@e2e.test`);
    await fillFormField(duplicateUsernameModal, AssistantManagementSelectors.phoneInput, makePhone(61));
    await fillFormField(duplicateUsernameModal, AssistantManagementSelectors.passwordInput, "Assistant@123");
    await selectOptionByLabel(page, duplicateUsernameModal, AssistantManagementSelectors.classSelectLabel, firstClassName);
    await duplicateUsernameModal.getByRole("button", { name: /创\s*建/ }).click();
    await expectErrorMessage(page, "用户名已存在");
    await expect(duplicateUsernameModal).toBeVisible();
    await duplicateUsernameModal.getByRole("button", { name: /取\s*消/ }).click();

    await page.getByRole(AssistantManagementSelectors.createAssistantBtn.role, { name: AssistantManagementSelectors.createAssistantBtn.name }).click();
    const duplicateEmailModal = await getVisibleModal(page, ModalTitles.createAssistant);
    await fillFormField(duplicateEmailModal, AssistantManagementSelectors.usernameInput, `ta${(Date.now() + 1).toString().slice(-8)}`);
    await fillFormField(duplicateEmailModal, AssistantManagementSelectors.fullNameInput, `重复邮箱助教${makeLetters(4)}`);
    await fillFormField(duplicateEmailModal, AssistantManagementSelectors.emailInput, existingEmail);
    await fillFormField(duplicateEmailModal, AssistantManagementSelectors.phoneInput, makePhone(62));
    await fillFormField(duplicateEmailModal, AssistantManagementSelectors.passwordInput, "Assistant@123");
    await selectOptionByLabel(page, duplicateEmailModal, AssistantManagementSelectors.classSelectLabel, firstClassName);
    await duplicateEmailModal.getByRole("button", { name: /创\s*建/ }).click();
    await expectErrorMessage(page, "邮箱已存在");
    await expect(duplicateEmailModal).toBeVisible();
    await duplicateEmailModal.getByRole("button", { name: /取\s*消/ }).click();
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

  test("实验报告评阅校验：未填报告得分时禁止仅提交实验步骤分数", async ({ page }) => {
    await loginAsTeacher(page);
    await openSubMenuPage(page, "实验管理", "实验报告", "实验报告");

    const reportRow = page
      .locator(CommonSelectors.tableRow)
      .filter({ hasText: ExperimentReportSelectors.statusSubmitted })
      .first();
    await expect(reportRow).toBeVisible();
    await reportRow.getByRole(ExperimentReportSelectors.reviewBtn.role, { name: ExperimentReportSelectors.reviewBtn.name }).click();

    const reviewModal = await getVisibleModal(page, ModalTitles.reviewReport);
    await reviewModal.getByText("实验步骤评分（可选)").or(reviewModal.getByText("实验步骤评分（可选）")).click();
    await reviewModal.getByPlaceholder("0-100").first().fill("85");

    await expect(reviewModal.getByText("填写实验成绩时必须同时填写报告得分")).toBeVisible();
    await expect(reviewModal.getByRole(ExperimentReportSelectors.saveReviewBtn.role, { name: ExperimentReportSelectors.saveReviewBtn.name })).toBeDisabled();
    await reviewModal.getByRole("button", { name: /取\s*消/ }).click();
  });

  test("实验报告驳回后显示已驳回状态与原因", async ({ page }) => {
    await loginAsTeacher(page);
    await openSubMenuPage(page, "实验管理", "实验报告", "实验报告");

    const pendingRow = page
      .locator(CommonSelectors.tableRow)
      .filter({ hasText: ExperimentReportSelectors.statusSubmitted })
      .first();
    await expect(pendingRow).toBeVisible();

    const studentId = (await pendingRow.locator("td").nth(3).innerText()).trim();
    const rejectReason = `E2E驳回原因-${Date.now().toString().slice(-6)}`;

    await pendingRow.getByRole(ExperimentReportSelectors.reviewBtn.role, { name: ExperimentReportSelectors.reviewBtn.name }).click();
    const reviewModal = await getVisibleModal(page, ModalTitles.reviewReport);
    await reviewModal.getByPlaceholder("请输入具体的修改建议...").fill(rejectReason);
    await reviewModal.getByRole("button", { name: "驳回报告" }).click();

    await expectSuccessMessage(page, "报告已驳回");

    const rejectedRow = tableRowByText(page, studentId);
    await expect(rejectedRow.getByText(ExperimentReportSelectors.statusRejected)).toBeVisible();

    await rejectedRow.getByRole(ExperimentReportSelectors.reviewBtn.role, { name: ExperimentReportSelectors.reviewBtn.name }).click();
    const rejectedModal = await getVisibleModal(page, ModalTitles.reviewReport);
    await expect(rejectedModal.getByText("报告已驳回")).toBeVisible();
    await expect(rejectedModal.getByText(rejectReason)).toBeVisible();
    await rejectedModal.getByRole("button", { name: /关\s*闭/ }).click();
  });

  test("实验报告驳回校验：未填写原因时禁用驳回", async ({ page }) => {
    await loginAsTeacher(page);
    await openSubMenuPage(page, "实验管理", "实验报告", "实验报告");

    await page.getByPlaceholder(ExperimentReportSelectors.searchInput.placeholder).fill(TEST_DATA.students.perfectScore);
    const reviewableRow = tableRowByText(page, TEST_DATA.students.perfectScore);
    await expect(reviewableRow).toBeVisible();
    await reviewableRow.getByRole(ExperimentReportSelectors.reviewBtn.role, { name: ExperimentReportSelectors.reviewBtn.name }).click();

    const reviewModal = await getVisibleModal(page, ModalTitles.reviewReport);
    const rejectButton = reviewModal.getByRole("button", { name: "驳回报告" });
    await expect(rejectButton).toBeDisabled();

    await reviewModal.getByPlaceholder("请输入具体的修改建议...").fill("需要补充实验结论");
    await expect(rejectButton).toBeEnabled();
    await reviewModal.getByRole("button", { name: /取\s*消/ }).click();
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

  test("成绩总览导出失败提示", async ({ page }) => {
    await loginAsTeacher(page);

    const summaryPromise = page.waitForResponse(
      (r) => r.request().method() === "GET" && API.teacherGradeSummaries.test(r.url()),
    );
    await openSubMenuPage(page, "考核管理", "成绩总览", "成绩总览");
    const summaryResponse = await summaryPromise;
    expect(summaryResponse.ok()).toBeTruthy();

    const allClassSummaries = unwrapDataEnvelope<TeacherClassSummary[]>(await summaryResponse.json());
    expect(allClassSummaries.length).toBeGreaterThan(0);
    const firstClass = allClassSummaries[0];

    const classCard = page
      .locator(CommonSelectors.card)
      .filter({ hasText: firstClass.class_name })
      .filter({ hasText: GradeOverviewSelectors.classCardClickHint })
      .first();
    await expect(classCard).toBeVisible();

    const detailPromise = page.waitForResponse(
      (r) => r.request().method() === "GET" && r.url().includes(`/api/v1/classes/${firstClass.class_id}/grade-summaries`),
    );
    await classCard.click();
    expect((await detailPromise).ok()).toBeTruthy();

    await page.route("**/api/v1/classes/*/grade-export.csv", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "导出服务暂时不可用" }),
      });
    });

    await page.getByRole(GradeOverviewSelectors.exportBtn.role, { name: GradeOverviewSelectors.exportBtn.name }).click();
    await expectErrorMessage(page, "导出服务暂时不可用");
    await expect(page.locator(CommonSelectors.alertMessage).filter({ hasText: "导出服务暂时不可用" })).toBeVisible();
    await page.unroute("**/api/v1/classes/*/grade-export.csv");
  });

  test("成绩总览全部班级隐藏导出按钮", async ({ page }) => {
    await loginAsTeacher(page);

    const summaryPromise = page.waitForResponse(
      (r) => r.request().method() === "GET" && API.teacherGradeSummaries.test(r.url()),
    );
    await openSubMenuPage(page, "考核管理", "成绩总览", "成绩总览");
    expect((await summaryPromise).ok()).toBeTruthy();

    await expect(page.getByRole(GradeOverviewSelectors.exportBtn.role, { name: GradeOverviewSelectors.exportBtn.name })).toHaveCount(0);
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

  test("编辑个人信息冲突：重复邮箱与手机号", async ({ page }) => {
    await loginAsTeacher(page);
    await openPersonalInfoPage(page);

    await page.getByRole(PersonalInfoSelectors.editBtn.role, { name: PersonalInfoSelectors.editBtn.name }).click();
    const duplicateEmailModal = await getVisibleModal(page, ModalTitles.editPersonalInfo);
    await fillFormField(duplicateEmailModal, PersonalInfoSelectors.fullNameInput, `教师${makeLetters(4)}`);
    await fillFormField(duplicateEmailModal, PersonalInfoSelectors.phoneInput, makePhone(71));
    await fillFormField(duplicateEmailModal, PersonalInfoSelectors.emailInput, "teacher2@test.com");
    await duplicateEmailModal.getByRole(PersonalInfoSelectors.saveBtn.role, { name: PersonalInfoSelectors.saveBtn.name }).click();

    await expectErrorMessage(page, "邮箱已存在");
    await expect(duplicateEmailModal).toBeVisible();
    await duplicateEmailModal.getByRole("button", { name: /取\s*消/ }).click();

    await page.getByRole(PersonalInfoSelectors.editBtn.role, { name: PersonalInfoSelectors.editBtn.name }).click();
    const duplicatePhoneModal = await getVisibleModal(page, ModalTitles.editPersonalInfo);
    await fillFormField(duplicatePhoneModal, PersonalInfoSelectors.fullNameInput, `教师${makeLetters(4)}`);
    await fillFormField(duplicatePhoneModal, PersonalInfoSelectors.phoneInput, "13800000002");
    await fillFormField(duplicatePhoneModal, PersonalInfoSelectors.emailInput, `teacher1+${Date.now()}@e2e.test`);
    await duplicatePhoneModal.getByRole(PersonalInfoSelectors.saveBtn.role, { name: PersonalInfoSelectors.saveBtn.name }).click();

    await expectErrorMessage(page, "手机号已存在");
    await expect(duplicatePhoneModal).toBeVisible();
    await duplicatePhoneModal.getByRole("button", { name: /取\s*消/ }).click();
  });

  test("修改密码失败：当前密码错误", async ({ page }) => {
    await loginAsTeacher(page);
    await openPersonalInfoPage(page);

    const passwordCard = page.locator(CommonSelectors.card).filter({ hasText: PersonalInfoSelectors.passwordCard }).first();
    await passwordCard.getByPlaceholder(PersonalInfoSelectors.currentPasswordInput.placeholder).fill("WrongPassword!234");
    await passwordCard.getByPlaceholder(PersonalInfoSelectors.newPasswordInput.placeholder).fill("TeacherE2E!890");
    await passwordCard.getByPlaceholder(PersonalInfoSelectors.confirmPasswordInput.placeholder).fill("TeacherE2E!890");
    await passwordCard.getByRole(PersonalInfoSelectors.savePasswordBtn.role, { name: PersonalInfoSelectors.savePasswordBtn.name }).click();

    await expectErrorMessage(page, "当前密码错误");
  });

  test("修改密码校验：两次输入的密码不一致", async ({ page }) => {
    await loginAsTeacher(page);
    await openPersonalInfoPage(page);

    const passwordCard = page.locator(CommonSelectors.card).filter({ hasText: PersonalInfoSelectors.passwordCard }).first();
    await passwordCard.getByPlaceholder(PersonalInfoSelectors.currentPasswordInput.placeholder).fill(ACCOUNTS.teacher.password);
    await passwordCard.getByPlaceholder(PersonalInfoSelectors.newPasswordInput.placeholder).fill("TeacherE2E!890");
    await passwordCard.getByPlaceholder(PersonalInfoSelectors.confirmPasswordInput.placeholder).fill("TeacherE2E!891");
    await passwordCard.getByRole(PersonalInfoSelectors.savePasswordBtn.role, { name: PersonalInfoSelectors.savePasswordBtn.name }).click();

    await expect(passwordCard.getByText(ErrorMessages.passwordMismatch)).toBeVisible();
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
