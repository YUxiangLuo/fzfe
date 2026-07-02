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

import { expect, test, type APIResponse, type Page } from "@playwright/test";
import {
  // Generators
  makeRunId,
  makePhone,
  makeLetters,
  makeStudentNo,
  buildCsv,
  buildWindowsExcelCsv,
  // Navigation
  createManagedClassViaUi,
  getFirstManagedClassName,
  openClassManagementPage,
  openExperimentLogsPage,
  openExperimentProgressPage,
  openGradeOverviewPage,
  openGradeOverviewClassDetail,
  openGradeWeightsPage,
  openQuestionEditModal,
  openQuestionBankPage,
  openQuestionPreviewModal,
  openTopLevelPage,
  openSubMenuPage,
  openEditPersonalInfoModal,
  openExperimentReportsPage,
  openPersonalInfoPage,
  openTeacherAssistantManagementPage,
  openStudentManagementPage,
  // Locators
  fillPersonalInfoForm,
  fillPasswordChangeForm,
  getPasswordCard,
  tableRowByText,
  getVisibleModal,
  fillFormField,
  fillClassForm,
  closeModalWithCloseButton,
  confirmQuestionDelete,
  fillReportRejectReason,
  fillReportReviewForm,
  openCreateClassModal,
  openCreateAssistantModal,
  openDeleteClassModal,
  openEditClassModal,
  expandFirstTableRow,
  fillAssistantCreationForm,
  openAssistantLibrarySelectionModal,
  openAddStudentModal,
  fillStudentCreationForm,
  openStudentLibrarySelectionModal,
  assignAssistantFromLibrary,
  openClassStudentListModal,
  openAssistantReassignModal,
  openReportReviewModal,
  replaceAssistantAssignments,
  submitPasswordChange,
  // Stats & API
  getStatisticValue,
  unwrapDataEnvelope,
  computeClassGradeStats,
  computeScoreDistribution,
  getAuthedJson,
  getCurrentUserProfile,
  getStoredToken,
  deleteAuthed,
  postAuthedJson,
  // Assertions
  expectStoredTokenCleared,
  expectSuccessMessage,
  expectErrorMessage,
  // Grade Weights
  setWeightByLabel,
  // Portal
  loginAs,
  loginAsTeacherAccount,
  logout,
  togglePortalMenuAndAssert,
  // Fixtures & Constants
  ACCOUNTS,
  TEST_DATA,
  API,
  // Types
  type ManagedClassRecord,
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
const EMPTY_TEACHER = {
  username: process.env.E2E_EMPTY_TEACHER_USERNAME ?? "teacher_empty",
  password: process.env.E2E_EMPTY_TEACHER_PASSWORD ?? "TeacherE2E!234",
} as const;

// ===== Setup =====

async function loginAsTeacher(page: Page, password = ACCOUNTS.teacher.password): Promise<void> {
  await loginAsTeacherAccount(page, password);
}

async function loginAsTeacherWithNoClasses(page: Page): Promise<void> {
  await loginAs(page, { username: EMPTY_TEACHER.username, password: EMPTY_TEACHER.password, role: "teacher" });
}

async function getManagedClasses(page: Page): Promise<ManagedClassRecord[]> {
  const currentUser = await getCurrentUserProfile(page, BACKEND_ORIGIN);
  return getAuthedJson<ManagedClassRecord[]>(
    page,
    BACKEND_ORIGIN,
    `/api/v1/teachers/${currentUser.user_id}/classes`,
  );
}

async function getManagedClassByName(page: Page, className: string): Promise<ManagedClassRecord> {
  const classes = await getManagedClasses(page);
  const classRecord = classes.find((item) => item.class_name === className);
  expect(classRecord).toBeDefined();
  return classRecord!;
}

async function deleteClassViaApi(page: Page, classId: number): Promise<APIResponse> {
  return deleteAuthed(page, BACKEND_ORIGIN, `/api/v1/classes/${classId}`);
}

async function removeAssistantAssignmentViaApi(
  page: Page,
  classId: number,
  assistantId: number,
): Promise<APIResponse> {
  return deleteAuthed(page, BACKEND_ORIGIN, `/api/v1/classes/${classId}/assistants/${assistantId}`);
}

async function addAssistantAssignmentViaApi(
  page: Page,
  classId: number,
  assistantId: number,
): Promise<APIResponse> {
  return postAuthedJson(page, BACKEND_ORIGIN, `/api/v1/classes/${classId}/assistants`, {
    assistant_id: assistantId,
  });
}

// ===== Test Suite =====

test.describe("@teacher 布局与导航", () => {
  test("菜单与退出登录覆盖", async ({ page }) => {
    await loginAsTeacher(page);

    // Toggle menu
    await togglePortalMenuAndAssert(page, "teacher");

    // Navigate through menus
    await openTopLevelPage(page, "班级管理", "班级管理");
    await openTopLevelPage(page, "学生管理", "学生管理");
    await openSubMenuPage(page, "账户设置", "助教管理", "助教管理");
    await openSubMenuPage(page, "账户设置", "个人信息", "个人信息管理");
    await openSubMenuPage(page, "考核管理", "题库管理", "题库管理");

    // Logout flow
    await logout(page);
    
    // Verify token cleared
    await expectStoredTokenCleared(page);
  });
});

test.describe("@teacher 班级管理", () => {
  test("创建班级", async ({ page }) => {
    await loginAsTeacher(page);
    await openClassManagementPage(page);

    const className = makeRunId("E2E班级");
    const classCode = `TC${Date.now()}`;

    const createModal = await openCreateClassModal(page);

    // Download template
    const [templateDownload] = await Promise.all([
      page.waitForEvent("download"),
      page.getByRole(ClassManagementSelectors.downloadTemplateBtn.role, { name: ClassManagementSelectors.downloadTemplateBtn.name }).click(),
    ]);
    expect(templateDownload.suggestedFilename()).toContain("学生名单导入模板");

    // Fill form and upload
    await fillClassForm(createModal, {
      className,
      classCode,
      studentCsv: {
        name: `students-${Date.now()}.csv`,
        mimeType: "text/csv",
        buffer: buildCsv([
          ["学号", "姓名"],
          [makeStudentNo(11), "班级导入学生"],
        ]),
      },
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
    const deleteModal = await openDeleteClassModal(classRow);
    await deleteModal.getByRole("button", { name: /删\s*除/ }).click();
    await expectSuccessMessage(page, SuccessMessages.classDeleted);
  });

  test("创建班级支持 Excel 保存的学生名单 CSV", async ({ page }) => {
    await loginAsTeacher(page);
    await openClassManagementPage(page);

    const className = makeRunId("ExcelCSV班级");
    const classCode = `EC${Date.now()}`;
    const studentNo = makeStudentNo(41);
    const studentName = `张三${studentNo.slice(-4)}`;

    const createModal = await openCreateClassModal(page);
    await fillClassForm(createModal, {
      className,
      classCode,
      studentCsv: {
        name: `excel-students-${Date.now()}.csv`,
        mimeType: "application/vnd.ms-excel",
        buffer: buildWindowsExcelCsv([
          ["学号", "姓名"],
          [studentNo, studentName],
        ]),
      },
    });
    await createModal.getByRole("button", { name: /创\s*建/ }).click();

    await expectSuccessMessage(page, SuccessMessages.classCreated);
    const resultModal = await getVisibleModal(page, "创建结果");
    await expect(resultModal.getByText("新建学生数")).toBeVisible();
    await resultModal.getByRole("button", { name: /确\s*定/ }).click();

    const classRow = tableRowByText(page, className);
    await expect(classRow).toBeVisible();

    const deleteModal = await openDeleteClassModal(classRow);
    await deleteModal.getByRole("button", { name: /删\s*除/ }).click();
    await expectSuccessMessage(page, SuccessMessages.classDeleted);
  });

  test("编辑班级", async ({ page }) => {
    await loginAsTeacher(page);
    await openClassManagementPage(page);

    const firstRow = page.locator(CommonSelectors.tableRow).nth(1);
    const originalClassName = await firstRow.locator("td").first().innerText();
    const originalClassCode = await firstRow.locator("td").nth(1).innerText();

    const updatedClassName = `E2E编辑班级-${Date.now()}`;
    const updatedClassCode = `EDIT${Date.now()}`;

    // Edit first class
    const editModal = await openEditClassModal(firstRow);
    await fillClassForm(editModal, {
      className: updatedClassName,
      classCode: updatedClassCode,
    });
    await editModal.getByRole("button", { name: /保\s*存/ }).click();
    
    await expectSuccessMessage(page, SuccessMessages.classUpdated);
    await expect(tableRowByText(page, updatedClassName)).toBeVisible();

    // Cleanup: restore original class name
    const updatedRow = tableRowByText(page, updatedClassName);
    const restoreModal = await openEditClassModal(updatedRow);
    await fillClassForm(restoreModal, {
      className: originalClassName,
      classCode: originalClassCode,
    });
    await restoreModal.getByRole("button", { name: /保\s*存/ }).click();
    await expectSuccessMessage(page, SuccessMessages.classUpdated);
  });

  test("查看班级学生列表", async ({ page }) => {
    await loginAsTeacher(page);
    await openClassManagementPage(page);

    const firstRow = page.locator(CommonSelectors.tableRow).nth(1);
    const className = await firstRow.locator("td").first().innerText();
    const studentsModal = await openClassStudentListModal(firstRow, className);
    await expect(studentsModal.locator(CommonSelectors.table)).toBeVisible();
    await studentsModal.getByRole("button", { name: /关\s*闭/ }).click();
  });

  test("创建班级失败提示", async ({ page }) => {
    await loginAsTeacher(page);
    await openClassManagementPage(page);

    const existingClassName = await createManagedClassViaUi(page);
    const existingRow = tableRowByText(page, existingClassName);
    await expect(existingRow).toBeVisible();
    const duplicateClassCode = (await existingRow.locator("td").nth(1).innerText()).trim();

    const className = makeRunId("E2E失败班级");

    const createModal = await openCreateClassModal(page);
    await fillClassForm(createModal, {
      className,
      classCode: duplicateClassCode,
      studentCsv: {
        name: `students-fail-${Date.now()}.csv`,
        mimeType: "text/csv",
        buffer: buildCsv([
          ["学号", "姓名"],
          [makeStudentNo(81), "创建失败学生"],
        ]),
      },
    });
    await createModal.getByRole("button", { name: /创\s*建/ }).click();

    await expectErrorMessage(page, "班级代码已存在");
    await expect(createModal).toBeVisible();
    await createModal.getByRole("button", { name: /取\s*消/ }).click();

    const cleanupModal = await openDeleteClassModal(existingRow);
    await cleanupModal.getByRole("button", { name: /删\s*除/ }).click();
    await expectSuccessMessage(page, SuccessMessages.classDeleted);
  });

  test("查看班级学生列表失败提示", async ({ page }) => {
    await loginAsTeacher(page);
    await openClassManagementPage(page);

    const className = await createManagedClassViaUi(page);
    const classRow = tableRowByText(page, className);
    await expect(classRow).toBeVisible();
    const classRecord = await getManagedClassByName(page, className);
    const deleteResponse = await deleteClassViaApi(page, classRecord.class_id);
    expect(deleteResponse.ok()).toBeTruthy();

    const studentsModal = await openClassStudentListModal(classRow, className);
    await expectErrorMessage(page, "班级不存在");
    await expect(studentsModal.getByText("暂无学生")).toBeVisible();
    await studentsModal.getByRole("button", { name: /关\s*闭/ }).click();
  });

  test("删除班级失败提示", async ({ page }) => {
    await loginAsTeacher(page);
    await openClassManagementPage(page);

    const className = await createManagedClassViaUi(page);
    const classRow = tableRowByText(page, className);
    await expect(classRow).toBeVisible();
    const classRecord = await getManagedClassByName(page, className);
    const deleteResponse = await deleteClassViaApi(page, classRecord.class_id);
    expect(deleteResponse.ok()).toBeTruthy();

    const deleteModal = await openDeleteClassModal(classRow);
    await deleteModal.getByRole("button", { name: /删\s*除/ }).click();

    await expectErrorMessage(page, "班级不存在");
    await expect(tableRowByText(page, className)).toBeVisible();
  });

  test("空班级显示暂无班级", async ({ page }) => {
    await loginAsTeacherWithNoClasses(page);

    await openClassManagementPage(page);
    await expect(page.getByText("暂无班级")).toBeVisible();
  });
});

test.describe("@teacher 学生管理", () => {
  test("添加新学生", async ({ page }) => {
    await loginAsTeacher(page);
    await openStudentManagementPage(page);

    const studentNo = makeStudentNo(21);
    const studentName = `Student${makeLetters(6)}`;

    const addModal = await openAddStudentModal(page);
    await fillStudentCreationForm(addModal, {
      studentNo,
      studentName,
      password: "Student@123",
    });
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
    await openStudentManagementPage(page);

    const studentNo = makeStudentNo(22);
    const studentName = `Dup${makeLetters(5)}`;
    const studentEmail = `${studentNo}@dup.e2e.test`;

    const addModal = await openAddStudentModal(page);
    await fillStudentCreationForm(addModal, {
      studentNo,
      studentName,
      password: "Student@123",
      email: studentEmail,
    });
    await addModal.getByRole("button", { name: /添\s*加/ }).click();
    await expectSuccessMessage(page, SuccessMessages.studentAdded);

    const searchInput = page.getByPlaceholder(StudentManagementSelectors.searchInput.placeholder);
    await searchInput.fill(studentName);
    const studentRow = tableRowByText(page, studentName);
    await expect(studentRow).toBeVisible();

    const duplicateNoModal = await openAddStudentModal(page);
    await fillStudentCreationForm(duplicateNoModal, {
      studentNo,
      studentName: `${studentName}重复学号`,
      password: "Student@123",
      email: `${studentNo}+dup@e2e.test`,
    });
    await duplicateNoModal.getByRole("button", { name: /添\s*加/ }).click();
    await expectErrorMessage(page, "学号或邮箱已存在");
    await expect(duplicateNoModal).toBeVisible();
    await duplicateNoModal.getByRole("button", { name: /取\s*消/ }).click();

    const duplicateEmailModal = await openAddStudentModal(page);
    await fillStudentCreationForm(duplicateEmailModal, {
      studentNo: makeStudentNo(23),
      studentName: `${studentName}重复邮箱`,
      password: "Student@123",
      email: studentEmail,
    });
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
    await openStudentManagementPage(page);

    // Add a student first
    const studentNo = makeStudentNo(31);
    const studentName = `Library${makeLetters(4)}`;
    
    const addModal = await openAddStudentModal(page);
    await fillStudentCreationForm(addModal, {
      studentNo,
      studentName,
      password: "Student@123",
    });
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
    const selectModal = await openStudentLibrarySelectionModal(page);
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
    await openStudentManagementPage(page);

    const selectModal = await openStudentLibrarySelectionModal(page);

    await selectModal.locator("input[placeholder='按学号或姓名搜索']").fill("NO_MATCH_E2E_STUDENT");
    await expect(selectModal.getByText("暂无可加入的学生")).toBeVisible();

    await selectModal.getByRole("button", { name: /关\s*闭/ }).click();
    await expect(selectModal).not.toBeVisible();
  });

  test("重置学生密码", async ({ page }) => {
    await loginAsTeacher(page);
    await openStudentManagementPage(page);

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
    await openStudentManagementPage(page);

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

test.describe("@teacher 助教管理", () => {
  test("创建助教", async ({ page }) => {
    await loginAsTeacher(page);
    const firstClassName = await getFirstManagedClassName(page);
    await openTeacherAssistantManagementPage(page);

    const assistantUsername = `ta${Date.now().toString().slice(-8)}`;
    const assistantName = `Assistant${makeLetters(6)}`;
    const assistantEmail = `${assistantUsername}@e2e.test`;

    const createModal = await openCreateAssistantModal(page);
    await fillAssistantCreationForm(page, createModal, {
      username: assistantUsername,
      fullName: assistantName,
      email: assistantEmail,
      phone: makePhone(31),
      password: "Assistant@123",
      classNames: [firstClassName],
    });
    await createModal.getByRole("button", { name: /创\s*建/ }).click();

    await expectSuccessMessage(page, SuccessMessages.assistantCreated);
    await expect(tableRowByText(page, assistantName)).toBeVisible();
  });

  test("重新分配助教班级", async ({ page }) => {
    await loginAsTeacher(page);
    await openTeacherAssistantManagementPage(page);

    // Find first assistant
    const firstRow = page.locator(CommonSelectors.tableRow).nth(1);
    const reassignModal = await openAssistantReassignModal(firstRow);
    await replaceAssistantAssignments(page, reassignModal, []);
    await reassignModal.getByRole("button", { name: /保\s*存/ }).click();
    
    await expectSuccessMessage(page, SuccessMessages.assistantUnassigned);
  });

  test("从库中选择助教", async ({ page }) => {
    await loginAsTeacher(page);
    const firstClassName = await getFirstManagedClassName(page);
    await openTeacherAssistantManagementPage(page);

    const selectModal = await openAssistantLibrarySelectionModal(page);
    await assignAssistantFromLibrary(page, selectModal, "助教小赵", [firstClassName]);
    await selectModal.getByRole("button", { name: /分\s*配/ }).click();

    await expectSuccessMessage(page, SuccessMessages.assistantAssigned);
    await expect(tableRowByText(page, "助教小赵")).toBeVisible();
  });

  test("从库中选择助教时部分班级分配失败会提示 warning", async ({ page }) => {
    await loginAsTeacher(page);
    const managedClasses = await getManagedClasses(page);
    const existingAssignmentClass = managedClasses.find((item) => item.class_id === TEST_DATA.teacherClassId);
    const additionalClass = managedClasses.find((item) => item.class_id !== existingAssignmentClass?.class_id);
    expect(existingAssignmentClass).toBeDefined();
    expect(additionalClass).toBeDefined();
    await openTeacherAssistantManagementPage(page);

    const selectModal = await openAssistantLibrarySelectionModal(page);
    await assignAssistantFromLibrary(page, selectModal, "助教小孙", [
      existingAssignmentClass!.class_name,
      additionalClass!.class_name,
    ]);
    const injectDuplicateAssignment = await addAssistantAssignmentViaApi(page, existingAssignmentClass!.class_id, 203);
    expect([201, 409]).toContain(injectDuplicateAssignment.status());
    await selectModal.getByRole("button", { name: /分\s*配/ }).click();

    await expect(page.locator(CommonSelectors.warningMessage).filter({ hasText: "1 个班级分配失败" }).last()).toBeVisible();
    await expectSuccessMessage(page, SuccessMessages.assistantAssigned);
    await expect(tableRowByText(page, "助教小孙")).toBeVisible();
  });

  test("重新分配助教班级时部分操作失败会提示 warning", async ({ page }) => {
    await loginAsTeacher(page);
    const extraClassName = await createManagedClassViaUi(page);
    const extraClassRecord = await getManagedClassByName(page, extraClassName);
    const ensureAssignmentResponse = await addAssistantAssignmentViaApi(page, TEST_DATA.teacherClassId, 203);
    expect([201, 409]).toContain(ensureAssignmentResponse.status());
    await openTeacherAssistantManagementPage(page);

    const assistantRow = tableRowByText(page, "助教小孙");
    await expect(assistantRow).toBeVisible();
    const reassignModal = await openAssistantReassignModal(assistantRow);
    await replaceAssistantAssignments(page, reassignModal, [extraClassName]);
    const removeResponse = await removeAssistantAssignmentViaApi(page, TEST_DATA.teacherClassId, 203);
    expect(removeResponse.ok()).toBeTruthy();

    await reassignModal.getByRole("button", { name: /保\s*存/ }).click();
    await expect(page.locator(CommonSelectors.warningMessage).filter({ hasText: "班级分配已更新，但 1 个操作失败" }).last()).toBeVisible();

    const deleteResponse = await deleteClassViaApi(page, extraClassRecord.class_id);
    expect(deleteResponse.ok()).toBeTruthy();
  });

  test("创建助教冲突校验：重复用户名与邮箱", async ({ page }) => {
    await loginAsTeacher(page);
    await openTeacherAssistantManagementPage(page);

    const firstRow = page.locator(CommonSelectors.tableRow).nth(1);
    const existingUsername = await firstRow.locator("td").nth(1).innerText();
    const existingEmail = await firstRow.locator("td").nth(3).innerText();
    const firstClassName = await getFirstManagedClassName(page);
    await openTeacherAssistantManagementPage(page);

    const duplicateUsernameModal = await openCreateAssistantModal(page);
    const duplicateUsername = `ta${Date.now().toString().slice(-8)}`;
    await fillAssistantCreationForm(page, duplicateUsernameModal, {
      username: existingUsername,
      fullName: `重复助教${makeLetters(4)}`,
      email: `${duplicateUsername}@e2e.test`,
      phone: makePhone(61),
      password: "Assistant@123",
      classNames: [firstClassName],
    });
    await duplicateUsernameModal.getByRole("button", { name: /创\s*建/ }).click();
    await expectErrorMessage(page, "用户名已存在");
    await expect(duplicateUsernameModal).toBeVisible();
    await duplicateUsernameModal.getByRole("button", { name: /取\s*消/ }).click();

    const duplicateEmailModal = await openCreateAssistantModal(page);
    await fillAssistantCreationForm(page, duplicateEmailModal, {
      username: `ta${(Date.now() + 1).toString().slice(-8)}`,
      fullName: `重复邮箱助教${makeLetters(4)}`,
      email: existingEmail,
      phone: makePhone(62),
      password: "Assistant@123",
      classNames: [firstClassName],
    });
    await duplicateEmailModal.getByRole("button", { name: /创\s*建/ }).click();
    await expectErrorMessage(page, "邮箱已存在");
    await expect(duplicateEmailModal).toBeVisible();
    await duplicateEmailModal.getByRole("button", { name: /取\s*消/ }).click();
  });
});

test.describe("@teacher 实验管理", () => {
  test("实验进度查看", async ({ page }) => {
    await loginAsTeacher(page);
    await openExperimentProgressPage(page);
    
    // Verify page loaded with statistics
    await expect(page.getByText(ExperimentProgressSelectors.avgCompletionStat)).toBeVisible();

    // Search and expand
    const searchInput = page.getByPlaceholder(ExperimentProgressSelectors.searchInput.placeholder);
    await searchInput.fill(TEST_DATA.students.pendingTeacher);
    await expect(tableRowByText(page, TEST_DATA.students.pendingTeacher)).toBeVisible();

    // Expand row to see step completion
    await expandFirstTableRow(page);
    await expect(page.getByText(ExperimentProgressSelectors.stepCompletionText)).toBeVisible();
  });

  test("实验日志查看", async ({ page }) => {
    await loginAsTeacher(page);
    await openExperimentLogsPage(page);
    
    await expect(page.getByText(ExperimentLogSelectors.totalExperimentsStat)).toBeVisible();
    
    const searchInput = page.getByPlaceholder(ExperimentLogSelectors.searchInput.placeholder);
    await searchInput.fill(TEST_DATA.students.pendingTeacher);
    await expect(tableRowByText(page, TEST_DATA.students.pendingTeacher)).toBeVisible();
  });

  test("实验报告评阅", async ({ page }) => {
    await loginAsTeacher(page);
    await openExperimentReportsPage(page);
    
    await expect(page.getByText("报告平均得分")).toBeVisible();

    // Find pending report
    const searchInput = page.getByPlaceholder(ExperimentReportSelectors.searchInput.placeholder);
    await searchInput.fill(TEST_DATA.students.pendingTeacher);
    const reportRow = tableRowByText(page, TEST_DATA.students.pendingTeacher);
    await expect(reportRow.getByText(ExperimentReportSelectors.statusSubmitted)).toBeVisible();

    // Review
    const reviewModal = await openReportReviewModal(reportRow);
    await fillReportReviewForm(reviewModal, {
      reportScore: "88",
      modelScore: "92",
      feedback: "E2E 自动评阅通过。",
    });
    await reviewModal.getByRole(ExperimentReportSelectors.saveReviewBtn.role, { name: ExperimentReportSelectors.saveReviewBtn.name }).click();
    
    await expectSuccessMessage(page, SuccessMessages.reviewSaved);
    await expect(tableRowByText(page, TEST_DATA.students.pendingTeacher).getByText(ExperimentReportSelectors.statusGraded)).toBeVisible();
  });

  test("实验报告评阅校验：未填报告得分时禁止仅提交实验步骤分数", async ({ page }) => {
    await loginAsTeacher(page);
    await openExperimentReportsPage(page);

    const reportRow = page
      .locator(CommonSelectors.tableRow)
      .filter({ hasText: ExperimentReportSelectors.statusSubmitted })
      .first();
    await expect(reportRow).toBeVisible();
    const reviewModal = await openReportReviewModal(reportRow);
    await reviewModal.getByText("实验步骤评分（可选)").or(reviewModal.getByText("实验步骤评分（可选）")).click();
    await reviewModal.getByPlaceholder("0-100").first().fill("85");

    await expect(reviewModal.getByText("填写实验成绩时必须同时填写报告得分")).toBeVisible();
    await expect(reviewModal.getByRole(ExperimentReportSelectors.saveReviewBtn.role, { name: ExperimentReportSelectors.saveReviewBtn.name })).toBeDisabled();
    await reviewModal.getByRole("button", { name: /取\s*消/ }).click();
  });

  test("实验报告驳回后显示已驳回状态与原因", async ({ page }) => {
    await loginAsTeacher(page);
    await openExperimentReportsPage(page);

    const pendingRow = page
      .locator(CommonSelectors.tableRow)
      .filter({ hasText: ExperimentReportSelectors.statusSubmitted })
      .first();
    await expect(pendingRow).toBeVisible();

    const studentId = (await pendingRow.locator("td").nth(3).innerText()).trim();
    const rejectReason = `E2E驳回原因-${Date.now().toString().slice(-6)}`;

    const reviewModal = await openReportReviewModal(pendingRow);
    await fillReportRejectReason(reviewModal, rejectReason);
    await reviewModal.getByRole("button", { name: "驳回报告" }).click();

    await expectSuccessMessage(page, "报告已驳回");

    const rejectedRow = tableRowByText(page, studentId);
    await expect(rejectedRow.getByText(ExperimentReportSelectors.statusRejected)).toBeVisible();

    const rejectedModal = await openReportReviewModal(rejectedRow);
    await expect(rejectedModal.getByText("报告已驳回")).toBeVisible();
    await expect(rejectedModal.getByText(rejectReason)).toBeVisible();
    await rejectedModal.getByRole("button", { name: /关\s*闭/ }).click();
  });

  test("实验报告驳回校验：未填写原因时禁用驳回", async ({ page }) => {
    await loginAsTeacher(page);
    await openExperimentReportsPage(page);

    await page.getByPlaceholder(ExperimentReportSelectors.searchInput.placeholder).fill(TEST_DATA.students.perfectScore);
    const reviewableRow = tableRowByText(page, TEST_DATA.students.perfectScore);
    await expect(reviewableRow).toBeVisible();
    const reviewModal = await openReportReviewModal(reviewableRow);
    const rejectButton = reviewModal.getByRole("button", { name: "驳回报告" });
    await expect(rejectButton).toBeDisabled();

    await fillReportRejectReason(reviewModal, "需要补充实验结论");
    await expect(rejectButton).toBeEnabled();
    await reviewModal.getByRole("button", { name: /取\s*消/ }).click();
  });

  test("导出 CSV 和报告归档", async ({ page }) => {
    await loginAsTeacher(page);
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

  test("搜索无匹配结果时仍允许导出整班报告", async ({ page }) => {
    await loginAsTeacher(page);
    await openExperimentReportsPage(page);

    const exportCsvButton = page.getByRole(
      ExperimentReportSelectors.exportCsvBtn.role,
      { name: ExperimentReportSelectors.exportCsvBtn.name },
    );
    const exportReportsButton = page.getByRole(
      ExperimentReportSelectors.exportAllBtn.role,
      { name: ExperimentReportSelectors.exportAllBtn.name },
    );
    await expect(exportCsvButton).toBeEnabled();
    await expect(exportReportsButton).toBeEnabled();

    const searchInput = page.getByPlaceholder(ExperimentReportSelectors.searchInput.placeholder);
    await searchInput.fill("ZZZ_NO_MATCH_REPORT_EXPORT");

    await expect(page.getByText("暂无数据")).toBeVisible();
    await expect(exportCsvButton).toBeEnabled();
    await expect(exportReportsButton).toBeEnabled();
  });

  test("实验报告分页", async ({ page }) => {
    await loginAsTeacher(page);
    await openExperimentReportsPage(page);

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
    await openQuestionBankPage(page);

    const createdQuestionText = `E2E题目${Date.now()}`;
    const updatedQuestionText = `${createdQuestionText}-更新`;

    // Create via API
    const token = await getStoredToken(page);
    const createResponse = await postAuthedJson(
      page,
      BACKEND_ORIGIN,
      "/api/v1/question-bank/questions",
      {
        question_text: createdQuestionText,
        question_type: "Single Choice",
        knowledge_point: "时间序列基础",
        options: ["选项A", "选项B"],
        correct_answers: ["选项A"],
      },
      token,
    );
    expect(createResponse.ok()).toBeTruthy();

    // Verify and edit
    await page.getByRole(QuestionBankSelectors.refreshBtn.role, { name: QuestionBankSelectors.refreshBtn.name }).click();
    const questionSearchInput = page.locator('input[placeholder="输入题目内容"]').first();
    await questionSearchInput.fill(createdQuestionText);
    const createdRow = tableRowByText(page, createdQuestionText);
    await expect(createdRow).toBeVisible();

    // Edit
    const editQuestionModal = await openQuestionEditModal(createdRow);
    await fillFormField(editQuestionModal, QuestionBankSelectors.questionTextInput, updatedQuestionText);
    await editQuestionModal.getByRole("button", { name: /保\s*存/ }).click();
    await expectSuccessMessage(page, SuccessMessages.questionUpdated);

    // Preview
    await questionSearchInput.fill(updatedQuestionText);
    const updatedRow = tableRowByText(page, updatedQuestionText);
    const previewModal = await openQuestionPreviewModal(updatedRow);
    await expect(previewModal.getByText(updatedQuestionText)).toBeVisible();
    await closeModalWithCloseButton(previewModal);

    // Delete
    await confirmQuestionDelete(updatedRow);
    await expectSuccessMessage(page, SuccessMessages.questionDeleted);
  });

  test("成绩权重设置", async ({ page }) => {
    await loginAsTeacher(page);
    await openGradeWeightsPage(page);
    
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
    await openGradeOverviewPage(page);
    
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
    const detailPromise = page.waitForResponse(
      (r) => r.request().method() === "GET" && r.url().includes(`/api/v1/classes/${firstClassId}/grade-summaries`),
    );
    await openGradeOverviewClassDetail(page, firstClassName);
    expect((await detailPromise).ok()).toBeTruthy();

    // Verify statistics
    expect(await getStatisticValue(page, GradeOverviewSelectors.totalStudentsStat)).toBe(firstClass?.total_students ?? 0);

    // Search student
    await page.getByPlaceholder(GradeOverviewSelectors.searchInput.placeholder).fill(TEST_DATA.students.perfectScore);
    await expect(tableRowByText(page, TEST_DATA.students.perfectScore)).toBeVisible();
  });

  test("成绩总览搜索仅过滤表格", async ({ page }) => {
    await loginAsTeacher(page);
    await openGradeOverviewPage(page);
    await openGradeOverviewClassDetail(page, TEST_DATA.teacherClassName);

    const getChartSnapshot = async () => {
      return await page.evaluate(() => ({
        lineDots: document.querySelectorAll(".recharts-line-dots circle").length,
        histogramBars: document.querySelectorAll(".recharts-bar-rectangles path, .recharts-bar-rectangles rect").length,
        distributionText: Array.from(document.querySelectorAll(".ant-card .mt-2.text-xs .flex.justify-between"))
          .map((node) => (node.textContent ?? "").trim())
          .join("|"),
      }));
    };

    const statsBefore = {
      total: await getStatisticValue(page, GradeOverviewSelectors.totalStudentsStat),
      graded: await getStatisticValue(page, GradeOverviewSelectors.gradedCountStat),
      avg: await getStatisticValue(page, GradeOverviewSelectors.averageScoreStat),
      max: await getStatisticValue(page, GradeOverviewSelectors.maxScoreStat),
      min: await getStatisticValue(page, GradeOverviewSelectors.minScoreStat),
    };
    const chartsBefore = await getChartSnapshot();

    await page.getByPlaceholder(GradeOverviewSelectors.searchInput.placeholder).fill(TEST_DATA.students.perfectScore);
    await expect(tableRowByText(page, TEST_DATA.students.perfectScore)).toBeVisible();
    await expect(tableRowByText(page, TEST_DATA.students.zeroScore)).toHaveCount(0);

    expect(await getStatisticValue(page, GradeOverviewSelectors.totalStudentsStat)).toBe(statsBefore.total);
    expect(await getStatisticValue(page, GradeOverviewSelectors.gradedCountStat)).toBe(statsBefore.graded);
    expect(await getStatisticValue(page, GradeOverviewSelectors.averageScoreStat)).toBe(statsBefore.avg);
    expect(await getStatisticValue(page, GradeOverviewSelectors.maxScoreStat)).toBe(statsBefore.max);
    expect(await getStatisticValue(page, GradeOverviewSelectors.minScoreStat)).toBe(statsBefore.min);
    expect(await getChartSnapshot()).toEqual(chartsBefore);
  });

  test("成绩总览排序时升降序都能让已评分排在未评分之前", async ({ page }) => {
    await loginAsTeacher(page);
    await openGradeOverviewPage(page);
    await openGradeOverviewClassDetail(page, TEST_DATA.teacherClassName);

    await page.getByRole("columnheader", { name: "最终成绩" }).click();

    const usernamesAsc = await page.evaluate(() =>
      Array.from(document.querySelectorAll(".ant-table-tbody > tr")).map((tr) => {
        const cells = Array.from(tr.querySelectorAll("td"));
        return (cells[1]?.textContent ?? "").trim();
      }),
    );

    expect(usernamesAsc.indexOf(TEST_DATA.students.zeroScore)).toBeGreaterThanOrEqual(0);
    expect(usernamesAsc.indexOf(TEST_DATA.students.pendingTeacher)).toBeGreaterThanOrEqual(0);
    expect(usernamesAsc.indexOf(TEST_DATA.students.zeroScore)).toBeLessThan(
      usernamesAsc.indexOf(TEST_DATA.students.pendingTeacher),
    );

    await page.getByRole("columnheader", { name: "最终成绩" }).click();

    const usernamesDesc = await page.evaluate(() =>
      Array.from(document.querySelectorAll(".ant-table-tbody > tr")).map((tr) => {
        const cells = Array.from(tr.querySelectorAll("td"));
        return (cells[1]?.textContent ?? "").trim();
      }),
    );

    expect(usernamesDesc.indexOf(TEST_DATA.students.perfectScore)).toBeGreaterThanOrEqual(0);
    expect(usernamesDesc.indexOf(TEST_DATA.students.pendingTeacher)).toBeGreaterThanOrEqual(0);
    expect(usernamesDesc.indexOf(TEST_DATA.students.perfectScore)).toBeLessThan(
      usernamesDesc.indexOf(TEST_DATA.students.pendingTeacher),
    );
  });

  test("成绩总览导出失败提示", async ({ page }) => {
    await loginAsTeacher(page);
    await openTopLevelPage(page, "班级管理", "班级管理");

    const emptyClassName = await createManagedClassViaUi(page, {
      withStudents: false,
      prefix: "E2E空导出班级",
      codePrefix: "EMPTY",
    });
    const emptyClassRecord = await getManagedClassByName(page, emptyClassName);

    const summaryPromise = page.waitForResponse(
      (r) => r.request().method() === "GET" && API.teacherGradeSummaries.test(r.url()),
    );
    await openGradeOverviewPage(page);
    const summaryResponse = await summaryPromise;
    expect(summaryResponse.ok()).toBeTruthy();

    const detailPromise = page.waitForResponse(
      (r) => r.request().method() === "GET" && r.url().includes(`/api/v1/classes/${emptyClassRecord.class_id}/grade-summaries`),
    );
    await openGradeOverviewClassDetail(page, emptyClassName);
    expect((await detailPromise).ok()).toBeTruthy();

    await page.getByRole(GradeOverviewSelectors.exportBtn.role, { name: GradeOverviewSelectors.exportBtn.name }).click();
    await expectErrorMessage(page, "该班级未找到已加入的学生");
    await expect(page.locator(CommonSelectors.alertMessage).filter({ hasText: "该班级未找到已加入的学生" })).toBeVisible();

    const deleteResponse = await deleteClassViaApi(page, emptyClassRecord.class_id);
    expect(deleteResponse.ok()).toBeTruthy();
  });

  test("成绩总览全部班级隐藏导出按钮", async ({ page }) => {
    await loginAsTeacher(page);

    const summaryPromise = page.waitForResponse(
      (r) => r.request().method() === "GET" && API.teacherGradeSummaries.test(r.url()),
    );
    await openGradeOverviewPage(page);
    expect((await summaryPromise).ok()).toBeTruthy();

    await expect(page.getByRole(GradeOverviewSelectors.exportBtn.role, { name: GradeOverviewSelectors.exportBtn.name })).toHaveCount(0);
  });
});

test.describe("@teacher 边缘情况", () => {
  test("成绩边缘值", async ({ page }) => {
    await loginAsTeacher(page);
    await openGradeOverviewPage(page);

    await openGradeOverviewClassDetail(page, TEST_DATA.teacherClassName);

    // Perfect score - verify student exists with 100 score
    await page.getByPlaceholder(GradeOverviewSelectors.searchInput.placeholder).fill(TEST_DATA.students.perfectScore);
    const perfectRow = tableRowByText(page, TEST_DATA.students.perfectScore);
    await expect(perfectRow).toBeVisible();
    await expect(perfectRow.getByText("已评分")).toBeVisible();

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
    await openExperimentReportsPage(page);

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
    const reviewModal = await openReportReviewModal(longRow);
    await fillReportReviewForm(reviewModal, {
      reportScore: "75",
      modelScore: "78",
    });
    await reviewModal.getByRole(ExperimentReportSelectors.saveReviewBtn.role, { name: ExperimentReportSelectors.saveReviewBtn.name }).click();
    await expectSuccessMessage(page, SuccessMessages.reviewSaved);
  });
});

test.describe("@teacher 个人信息", () => {
  test("编辑个人信息", async ({ page }) => {
    await loginAsTeacher(page);
    await openPersonalInfoPage(page);

    const editModal = await openEditPersonalInfoModal(page);
    await fillPersonalInfoForm(editModal, {
      fullName: `张教授${Date.now().toString().slice(-4)}`,
      phone: makePhone(41),
      email: `teacher1+${Date.now()}@e2e.test`,
    });
    await editModal.getByRole(PersonalInfoSelectors.saveBtn.role, { name: PersonalInfoSelectors.saveBtn.name }).click();
    
    await expectSuccessMessage(page, SuccessMessages.personalInfoSaved);
  });

  test("编辑个人信息冲突：重复邮箱与手机号", async ({ page }) => {
    await loginAsTeacher(page);
    await openPersonalInfoPage(page);

    const duplicateEmailModal = await openEditPersonalInfoModal(page);
    await fillPersonalInfoForm(duplicateEmailModal, {
      fullName: `教师${makeLetters(4)}`,
      phone: makePhone(71),
      email: "teacher2@test.com",
    });
    await duplicateEmailModal.getByRole(PersonalInfoSelectors.saveBtn.role, { name: PersonalInfoSelectors.saveBtn.name }).click();

    await expectErrorMessage(page, "邮箱已存在");
    await expect(duplicateEmailModal).toBeVisible();
    await duplicateEmailModal.getByRole("button", { name: /取\s*消/ }).click();

    const duplicatePhoneModal = await openEditPersonalInfoModal(page);
    await fillPersonalInfoForm(duplicatePhoneModal, {
      fullName: `教师${makeLetters(4)}`,
      phone: "13800000002",
      email: `teacher1+${Date.now()}@e2e.test`,
    });
    await duplicatePhoneModal.getByRole(PersonalInfoSelectors.saveBtn.role, { name: PersonalInfoSelectors.saveBtn.name }).click();

    await expectErrorMessage(page, "手机号已存在");
    await expect(duplicatePhoneModal).toBeVisible();
    await duplicatePhoneModal.getByRole("button", { name: /取\s*消/ }).click();
  });

  test("修改密码失败：当前密码错误", async ({ page }) => {
    await loginAsTeacher(page);
    await openPersonalInfoPage(page);

    const passwordCard = await getPasswordCard(page);
    await fillPasswordChangeForm(passwordCard, {
      currentPassword: "WrongPassword!234",
      newPassword: "TeacherE2E!890",
      confirmPassword: "TeacherE2E!890",
    });
    await submitPasswordChange(passwordCard);

    await expectErrorMessage(page, "当前密码错误");
  });

  test("修改密码校验：两次输入的密码不一致", async ({ page }) => {
    await loginAsTeacher(page);
    await openPersonalInfoPage(page);

    const passwordCard = await getPasswordCard(page);
    await fillPasswordChangeForm(passwordCard, {
      currentPassword: ACCOUNTS.teacher.password,
      newPassword: "TeacherE2E!890",
      confirmPassword: "TeacherE2E!891",
    });
    await submitPasswordChange(passwordCard);

    await expect(passwordCard.getByText(ErrorMessages.passwordMismatch)).toBeVisible();
  });

  test("修改密码并回滚", async ({ page }) => {
    await loginAsTeacher(page);
    await openPersonalInfoPage(page);

    // Change password
    const passwordCard = await getPasswordCard(page);
    await fillPasswordChangeForm(passwordCard, {
      currentPassword: ACCOUNTS.teacher.password,
      newPassword: ACCOUNTS.teacher.tempPassword,
      confirmPassword: ACCOUNTS.teacher.tempPassword,
    });
    await submitPasswordChange(passwordCard);
    await expectSuccessMessage(page, SuccessMessages.passwordChanged);

    // Logout and login with new password
    await logout(page);
    await loginAsTeacher(page, ACCOUNTS.teacher.tempPassword);
    await openPersonalInfoPage(page);

    // Rollback password
    const rollbackCard = await getPasswordCard(page);
    await fillPasswordChangeForm(rollbackCard, {
      currentPassword: ACCOUNTS.teacher.tempPassword,
      newPassword: ACCOUNTS.teacher.password,
      confirmPassword: ACCOUNTS.teacher.password,
    });
    await submitPasswordChange(rollbackCard);
    await expectSuccessMessage(page, SuccessMessages.passwordChanged);
  });
});
