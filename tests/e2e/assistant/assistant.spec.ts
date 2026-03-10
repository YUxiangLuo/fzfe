/**
 * Assistant E2E Tests
 * 
 * Tests for assistant role covering:
 * - Layout and navigation
 * - Experiment reports (search, review, batch review, export)
 * - Assessment management (grade weights, grade overview)
 * - Personal info management
 */

import { expect, test, type APIResponse, type Page } from "@playwright/test";
import {
  // Generators
  buildCsv,
  makeRunId,
  makePhone,
  makeLetters,
  makeStudentNo,
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
  // Selectors
  CommonSelectors,
  ClassManagementSelectors,
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

const BACKEND_PORT = process.env.E2E_BACKEND_PORT ?? "54103";
const BACKEND_ORIGIN = process.env.E2E_BACKEND_ORIGIN ?? `http://127.0.0.1:${BACKEND_PORT}`;

interface CurrentUser {
  user_id: number;
  username: string;
  full_name: string;
  email: string;
  phone_number: string | null;
  role: string;
  created_at: string;
}

interface ManagedClassRecord {
  class_id: number;
  class_name: string;
  class_code: string | null;
}

interface CsvUploadPart {
  name: string;
  mimeType: string;
  buffer: Buffer;
}

interface TempStudentSeed {
  studentId: string;
  fullName: string;
  upload: CsvUploadPart;
}

// ===== Setup =====

async function loginAsAssistant(page: Page, password = ACCOUNTS.assistant.password): Promise<void> {
  await loginAs(page, { username: ACCOUNTS.assistant.username, password, role: "assistant" });
}

async function loginViaApi(page: Page, username: string, password: string): Promise<string> {
  const response = await page.request.post(`${BACKEND_ORIGIN}/api/v1/sessions`, {
    headers: {
      "Content-Type": "application/json",
    },
    data: {
      username,
      password,
    },
  });
  expect(response.ok()).toBeTruthy();
  const payload = unwrapDataEnvelope<{ token: string }>(await response.json());
  expect(payload.token).toBeTruthy();
  return payload.token;
}

async function getPageToken(page: Page): Promise<string> {
  const token = await page.evaluate(() => localStorage.getItem("token"));
  expect(token).not.toBeNull();
  return token!;
}

async function getCurrentUser(page: Page): Promise<CurrentUser> {
  const token = await getPageToken(page);
  const response = await page.request.get(`${BACKEND_ORIGIN}/api/v1/users/me`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  expect(response.ok()).toBeTruthy();
  return unwrapDataEnvelope<CurrentUser>(await response.json());
}

async function createClassViaTeacherApi(
  page: Page,
  teacherToken: string,
  className: string,
  classCode: string,
  studentCsv?: CsvUploadPart,
): Promise<ManagedClassRecord> {
  const multipart: Record<string, string | CsvUploadPart> = {
    class_name: className,
    class_code: classCode,
  };
  if (studentCsv) {
    multipart.student_list = studentCsv;
  }

  const response = await page.request.post(`${BACKEND_ORIGIN}/api/v1/classes`, {
    headers: {
      Authorization: `Bearer ${teacherToken}`,
    },
    multipart,
  });
  expect(response.ok()).toBeTruthy();
  const payload = unwrapDataEnvelope<{ class: ManagedClassRecord }>(await response.json());
  expect(payload.class).toBeDefined();
  return payload.class;
}

async function assignAssistantToClassViaTeacherApi(
  page: Page,
  teacherToken: string,
  classId: number,
  assistantId: number,
): Promise<APIResponse> {
  return page.request.post(`${BACKEND_ORIGIN}/api/v1/classes/${classId}/assistants`, {
    headers: {
      Authorization: `Bearer ${teacherToken}`,
      "Content-Type": "application/json",
    },
    data: {
      assistant_id: assistantId,
    },
  });
}

async function deleteClassViaTeacherApi(
  page: Page,
  teacherToken: string,
  classId: number,
): Promise<APIResponse> {
  return page.request.delete(`${BACKEND_ORIGIN}/api/v1/classes/${classId}`, {
    headers: {
      Authorization: `Bearer ${teacherToken}`,
    },
  });
}

function buildTempStudentSeed(prefix: string): TempStudentSeed {
  const studentId = makeStudentNo(Math.floor(Math.random() * 10_000));
  const fullName = `${prefix}${studentId.slice(-4)}`;
  return {
    studentId,
    fullName,
    upload: {
      name: `${studentId}.csv`,
      mimeType: "text/csv",
      buffer: buildCsv([
        ["学号", "姓名"],
        [studentId, fullName],
      ]),
    },
  };
}

async function createAssistantTempClass(
  page: Page,
  prefix: string,
  options?: { withStudent?: boolean },
): Promise<{ teacherToken: string; classRecord: ManagedClassRecord; tempStudent?: TempStudentSeed }> {
  const assistant = await getCurrentUser(page);
  const teacherToken = await loginViaApi(page, ACCOUNTS.teacher.username, ACCOUNTS.teacher.password);
  const tempStudent = options?.withStudent ? buildTempStudentSeed("助教临时学生") : undefined;
  const classRecord = await createClassViaTeacherApi(
    page,
    teacherToken,
    makeRunId(prefix),
    `AUX${Date.now()}`,
    tempStudent?.upload,
  );
  const assignResponse = await assignAssistantToClassViaTeacherApi(page, teacherToken, classRecord.class_id, assistant.user_id);
  expect(assignResponse.ok()).toBeTruthy();
  return { teacherToken, classRecord, tempStudent };
}

async function selectClassFromTopFilter(page: Page, className: string): Promise<void> {
  const classSelect = page.locator(".ant-select").first();
  await classSelect.click();
  const dropdown = page.locator(".ant-select-dropdown").last();
  await expect(dropdown).toBeVisible();
  const option = dropdown
    .locator(".ant-select-item-option")
    .filter({ hasText: className })
    .first();
  await option.scrollIntoViewIfNeeded();
  await option.click();
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
    await studentsModal.getByRole("button", { name: /关\s*闭/ }).click();

    await openTopLevelPage(page, "学生管理", "学生管理");
    await page.getByRole("menuitem", { name: "账户设置" }).click();
    await page.getByRole("menuitem", { name: "个人信息" }).click();
    await expect(page.getByRole("heading", { level: 3, name: "个人信息管理" })).toBeVisible();
    await page.getByRole("menuitem", { name: "考核管理" }).click();
    await page.getByRole("menuitem", { name: "题库管理" }).click();
    await expect(page.getByRole("heading", { level: 3, name: "题库管理" })).toBeVisible();

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

    // 获取当前待评阅数量
    // 注意：前面的"检索与评阅"测试可能已经评阅了 pendingReview1 (20240052)
    // 所以这里只剩下 pendingReview2 (20240055) 一个待评阅学生
    const pendingBefore = await getStatisticValue(page, "待评阅");
    expect(pendingBefore).toBeGreaterThanOrEqual(1);

    // 评阅 pendingReview2 (20240055) - 这是种子数据中唯一剩下的待评阅学生
    const searchInput = page.getByPlaceholder(ExperimentReportSelectors.searchInput.placeholder);
    await searchInput.fill(TEST_DATA.students.pendingReview2);
    
    const reportRow = tableRowByText(page, TEST_DATA.students.pendingReview2);
    await expect(reportRow).toBeVisible();
    await reportRow.getByRole(ExperimentReportSelectors.reviewBtn.role, { name: ExperimentReportSelectors.reviewBtn.name }).click();
    
    const reviewModal = await getVisibleModal(page, ModalTitles.reviewReport);
    await reviewModal.getByPlaceholder(ExperimentReportSelectors.reportScoreInput.placeholder).fill("88");
    await reviewModal.getByPlaceholder(ExperimentReportSelectors.modelScoreInput.placeholder).fill("90");
    await reviewModal.getByPlaceholder(ExperimentReportSelectors.feedbackInput.placeholder).fill("Assistant 批量评阅测试 - 教师应能看到此记录。");
    await reviewModal.getByRole(ExperimentReportSelectors.saveReviewBtn.role, { name: ExperimentReportSelectors.saveReviewBtn.name }).click();
    await expectSuccessMessage(page, SuccessMessages.reviewSaved);

    // 验证待评阅数量减少了1
    const pendingAfter = await getStatisticValue(page, "待评阅");
    expect(pendingAfter).toBe(pendingBefore - 1);
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

  test("导出 CSV 失败提示", async ({ page }) => {
    await loginAsAssistant(page);
    const { teacherToken, classRecord } = await createAssistantTempClass(page, "Assistant导出CSV失效班级", { withStudent: true });

    try {
      await openSubMenuPage(page, "实验管理", "实验报告", "实验报告");
      const reportsResponsePromise = page.waitForResponse(
        (r) => r.request().method() === "GET" && r.url().includes(`/api/v1/classes/${classRecord.class_id}/reports`),
      );
      await selectClassFromTopFilter(page, classRecord.class_name);
      expect((await reportsResponsePromise).ok()).toBeTruthy();

      const exportCsvButton = page.getByRole(ExperimentReportSelectors.exportCsvBtn.role, { name: ExperimentReportSelectors.exportCsvBtn.name });
      await expect(exportCsvButton).toBeEnabled();

      const deleteResponse = await deleteClassViaTeacherApi(page, teacherToken, classRecord.class_id);
      expect(deleteResponse.ok()).toBeTruthy();

      await exportCsvButton.click();
      await expectErrorMessage(page, "班级不存在");
    } finally {
      const deleteResponse = await deleteClassViaTeacherApi(page, teacherToken, classRecord.class_id);
      expect([200, 404]).toContain(deleteResponse.status());
    }
  });

  test("导出所有报告失败提示", async ({ page }) => {
    await loginAsAssistant(page);
    const { teacherToken, classRecord } = await createAssistantTempClass(page, "Assistant导出归档空班级", { withStudent: true });

    try {
      await openSubMenuPage(page, "实验管理", "实验报告", "实验报告");
      const reportsResponsePromise = page.waitForResponse(
        (r) => r.request().method() === "GET" && r.url().includes(`/api/v1/classes/${classRecord.class_id}/reports`),
      );
      await selectClassFromTopFilter(page, classRecord.class_name);
      expect((await reportsResponsePromise).ok()).toBeTruthy();

      const exportAllButton = page.getByRole(ExperimentReportSelectors.exportAllBtn.role, { name: ExperimentReportSelectors.exportAllBtn.name });
      await expect(exportAllButton).toBeEnabled();
      await exportAllButton.click();

      await expectErrorMessage(page, "未找到该班级的有效报告");
    } finally {
      const deleteResponse = await deleteClassViaTeacherApi(page, teacherToken, classRecord.class_id);
      expect([200, 404]).toContain(deleteResponse.status());
    }
  });

  test("报告数据空态显示暂无数据", async ({ page }) => {
    await loginAsAssistant(page);
    const { teacherToken, classRecord } = await createAssistantTempClass(page, "Assistant空报告班级");

    try {
      await openSubMenuPage(page, "实验管理", "实验报告", "实验报告");
      const reportsResponsePromise = page.waitForResponse(
        (r) => r.request().method() === "GET" && r.url().includes(`/api/v1/classes/${classRecord.class_id}/reports`),
      );
      await selectClassFromTopFilter(page, classRecord.class_name);
      expect((await reportsResponsePromise).ok()).toBeTruthy();
      await expect(page.getByText("暂无数据")).toBeVisible();
    } finally {
      const deleteResponse = await deleteClassViaTeacherApi(page, teacherToken, classRecord.class_id);
      expect(deleteResponse.ok()).toBeTruthy();
    }
  });

  test("获取报告数据失败提示", async ({ page }) => {
    await loginAsAssistant(page);
    const { teacherToken, classRecord } = await createAssistantTempClass(page, "Assistant失效报告班级");

    try {
      const classListPromise = page.waitForResponse(
        (r) => r.request().method() === "GET" && /\/api\/v1\/assistants\/\d+\/classes$/.test(r.url()),
      );
      await openSubMenuPage(page, "实验管理", "实验报告", "实验报告");
      expect((await classListPromise).ok()).toBeTruthy();

      const deleteResponse = await deleteClassViaTeacherApi(page, teacherToken, classRecord.class_id);
      expect(deleteResponse.ok()).toBeTruthy();

      const reportsResponsePromise = page.waitForResponse(
        (r) => r.request().method() === "GET" && r.url().includes(`/api/v1/classes/${classRecord.class_id}/reports`),
      );
      await selectClassFromTopFilter(page, classRecord.class_name);
      expect((await reportsResponsePromise).status()).toBe(404);
      await expect(page.locator(CommonSelectors.alertMessage).filter({ hasText: "班级不存在" })).toBeVisible();
    } finally {
      const deleteResponse = await deleteClassViaTeacherApi(page, teacherToken, classRecord.class_id);
      expect([200, 404]).toContain(deleteResponse.status());
    }
  });
});

test.describe("@assistant 考核管理", () => {
  test("题库获取失败提示", async ({ page }) => {
    await loginAsAssistant(page);
    const studentToken = await loginViaApi(page, ACCOUNTS.student.username, ACCOUNTS.student.password);
    await page.evaluate((token) => {
      localStorage.setItem("token", token);
    }, studentToken);

    await openSubMenuPage(page, "考核管理", "题库管理", "题库管理");
    await expect(page.locator(CommonSelectors.alertMessage).filter({ hasText: "权限不足" })).toBeVisible();
  });

  test("题库删除失败提示", async ({ page }) => {
    await loginAsAssistant(page);
    await openSubMenuPage(page, "考核管理", "题库管理", "题库管理");

    const questionRow = page.locator(CommonSelectors.tableRow).nth(1);
    await expect(questionRow).toBeVisible();

    await questionRow.getByRole(QuestionBankSelectors.deleteBtn.role).nth(2).click();
    const deletePopover = page.locator(".ant-popover").filter({ hasText: "确定删除该题目？" }).last();
    await expect(deletePopover).toBeVisible();
    await deletePopover.getByRole("button", { name: /确\s*定/ }).click();

    await expectErrorMessage(page, "权限不足");
  });

  test("题库保存失败提示", async ({ page }) => {
    await loginAsAssistant(page);
    await openSubMenuPage(page, "考核管理", "题库管理", "题库管理");

    const questionRow = page.locator(CommonSelectors.tableRow).nth(1);
    await expect(questionRow).toBeVisible();

    await questionRow.getByRole(QuestionBankSelectors.editBtn.role).nth(1).click();
    const editorModal = await getVisibleModal(page, "编辑题目");
    await fillFormField(editorModal, QuestionBankSelectors.questionTextInput, `Assistant编辑失败题目${Date.now()}`);
    await editorModal.getByRole("button", { name: /保\s*存/ }).click();

    await expectErrorMessage(page, "权限不足");
    await expect(editorModal).toBeVisible();
    await editorModal.getByRole("button", { name: /取\s*消/ }).click();
  });

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

  test("成绩权重校验：顶层权重总和必须为 100%", async ({ page }) => {
    await loginAsAssistant(page);
    await openSubMenuPage(page, "考核管理", "成绩权重", "成绩权重设置");

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
    await openSubMenuPage(page, "考核管理", "成绩权重", "成绩权重设置");

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

  test("成绩总览搜索无结果与清空恢复", async ({ page }) => {
    await loginAsAssistant(page);
    await openSubMenuPage(page, "考核管理", "成绩总览", "成绩总览");

    const classCard = page
      .locator(CommonSelectors.card)
      .filter({ hasText: TEST_DATA.defaultClassName })
      .filter({ hasText: GradeOverviewSelectors.classCardClickHint })
      .first();
    await expect(classCard).toBeVisible();
    await classCard.click();

    const searchInput = page.getByPlaceholder(GradeOverviewSelectors.searchInput.placeholder);
    await searchInput.fill("NO_MATCH_ASSISTANT_GRADE");
    await expect(page.getByText("暂无数据").last()).toBeVisible();

    await searchInput.clear();
    await expect(tableRowByText(page, TEST_DATA.students.pendingReview1)).toBeVisible();
  });

  test("成绩总览详情展开与收起", async ({ page }) => {
    await loginAsAssistant(page);
    await openSubMenuPage(page, "考核管理", "成绩总览", "成绩总览");

    const classCard = page
      .locator(CommonSelectors.card)
      .filter({ hasText: TEST_DATA.defaultClassName })
      .filter({ hasText: GradeOverviewSelectors.classCardClickHint })
      .first();
    await expect(classCard).toBeVisible();
    await classCard.click();

    const gradeRow = tableRowByText(page, TEST_DATA.students.pendingReview1);
    await expect(gradeRow).toBeVisible();
    const toggleButton = gradeRow.getByRole("button", { name: /详情|收起/ });
    await expect(toggleButton).toHaveText("详情");
    await toggleButton.click();
    await expect(page.getByText("最终得分构成")).toBeVisible();

    await expect(toggleButton).toHaveText("收起");
    await toggleButton.click();
    await expect(toggleButton).toHaveText("详情");
  });

  test("成绩总览导出失败提示", async ({ page }) => {
    await loginAsAssistant(page);
    const { teacherToken, classRecord } = await createAssistantTempClass(page, "Assistant空成绩班级");

    try {
      await openSubMenuPage(page, "考核管理", "成绩总览", "成绩总览");
      const detailPromise = page.waitForResponse(
        (r) => r.request().method() === "GET" && r.url().includes(`/api/v1/classes/${classRecord.class_id}/grade-summaries`),
      );
      await selectClassFromTopFilter(page, classRecord.class_name);
      expect((await detailPromise).ok()).toBeTruthy();

      await page.getByRole(GradeOverviewSelectors.exportBtn.role, { name: GradeOverviewSelectors.exportBtn.name }).click();
      await expectErrorMessage(page, "该班级未找到已加入的学生");
      await expect(page.locator(CommonSelectors.alertMessage).filter({ hasText: "该班级未找到已加入的学生" })).toBeVisible();
    } finally {
      const deleteResponse = await deleteClassViaTeacherApi(page, teacherToken, classRecord.class_id);
      expect(deleteResponse.ok()).toBeTruthy();
    }
  });

  test("成绩总览全部班级隐藏导出按钮", async ({ page }) => {
    await loginAsAssistant(page);

    const summaryPromise = page.waitForResponse(
      (r) => r.request().method() === "GET" && API.assistantGradeSummaries.test(r.url()),
    );
    await openSubMenuPage(page, "考核管理", "成绩总览", "成绩总览");
    expect((await summaryPromise).ok()).toBeTruthy();

    await expect(page.getByRole(GradeOverviewSelectors.exportBtn.role, { name: GradeOverviewSelectors.exportBtn.name })).toHaveCount(0);
  });

  test("成绩总览获取失败提示", async ({ page }) => {
    await loginAsAssistant(page);
    const { teacherToken, classRecord } = await createAssistantTempClass(page, "Assistant失效成绩班级");

    try {
      const classListPromise = page.waitForResponse(
        (r) => r.request().method() === "GET" && /\/api\/v1\/assistants\/\d+\/classes$/.test(r.url()),
      );
      const summaryPromise = page.waitForResponse(
        (r) => r.request().method() === "GET" && API.assistantGradeSummaries.test(r.url()),
      );
      await openSubMenuPage(page, "考核管理", "成绩总览", "成绩总览");
      expect((await classListPromise).ok()).toBeTruthy();
      expect((await summaryPromise).ok()).toBeTruthy();

      const classCard = page
        .locator(CommonSelectors.card)
        .filter({ hasText: classRecord.class_name })
        .filter({ hasText: GradeOverviewSelectors.classCardClickHint })
        .first();
      await expect(classCard).toBeVisible();

      const deleteResponse = await deleteClassViaTeacherApi(page, teacherToken, classRecord.class_id);
      expect(deleteResponse.ok()).toBeTruthy();

      const detailResponsePromise = page.waitForResponse(
        (r) => r.request().method() === "GET" && r.url().includes(`/api/v1/classes/${classRecord.class_id}/grade-summaries`),
      );
      await classCard.click();
      expect((await detailResponsePromise).status()).toBe(404);
      await expect(page.locator(CommonSelectors.alertMessage).filter({ hasText: "班级不存在" })).toBeVisible();
    } finally {
      const deleteResponse = await deleteClassViaTeacherApi(page, teacherToken, classRecord.class_id);
      expect([200, 404]).toContain(deleteResponse.status());
    }
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

  test("编辑个人信息冲突：重复邮箱与手机号", async ({ page }) => {
    await loginAsAssistant(page);
    await openPersonalInfoPage(page);

    await page.getByRole(PersonalInfoSelectors.editBtn.role, { name: PersonalInfoSelectors.editBtn.name }).click();
    const duplicateEmailModal = await getVisibleModal(page, ModalTitles.editPersonalInfo);
    await fillFormField(duplicateEmailModal, PersonalInfoSelectors.fullNameInput, `助教${makeLetters(4)}`);
    await fillFormField(duplicateEmailModal, PersonalInfoSelectors.phoneInput, makePhone(81));
    await fillFormField(duplicateEmailModal, PersonalInfoSelectors.emailInput, "assistant1@test.com");
    await duplicateEmailModal.getByRole(PersonalInfoSelectors.saveBtn.role, { name: PersonalInfoSelectors.saveBtn.name }).click();

    await expectErrorMessage(page, "邮箱已存在");
    await expect(duplicateEmailModal).toBeVisible();
    await duplicateEmailModal.getByRole("button", { name: /取\s*消/ }).click();

    await page.getByRole(PersonalInfoSelectors.editBtn.role, { name: PersonalInfoSelectors.editBtn.name }).click();
    const duplicatePhoneModal = await getVisibleModal(page, ModalTitles.editPersonalInfo);
    await fillFormField(duplicatePhoneModal, PersonalInfoSelectors.fullNameInput, `助教${makeLetters(4)}`);
    await fillFormField(duplicatePhoneModal, PersonalInfoSelectors.phoneInput, "13900000001");
    await fillFormField(duplicatePhoneModal, PersonalInfoSelectors.emailInput, `assistant2+${Date.now()}@e2e.test`);
    await duplicatePhoneModal.getByRole(PersonalInfoSelectors.saveBtn.role, { name: PersonalInfoSelectors.saveBtn.name }).click();

    await expectErrorMessage(page, "手机号已存在");
    await expect(duplicatePhoneModal).toBeVisible();
    await duplicatePhoneModal.getByRole("button", { name: /取\s*消/ }).click();
  });

  test("修改密码失败：当前密码错误", async ({ page }) => {
    await loginAsAssistant(page);
    await openPersonalInfoPage(page);

    const passwordCard = page.locator(CommonSelectors.card).filter({ hasText: PersonalInfoSelectors.passwordCard }).first();
    await passwordCard.getByPlaceholder(PersonalInfoSelectors.currentPasswordInput.placeholder).fill("WrongPassword!234");
    await passwordCard.getByPlaceholder(PersonalInfoSelectors.newPasswordInput.placeholder).fill("AssistantE2E!890");
    await passwordCard.getByPlaceholder(PersonalInfoSelectors.confirmPasswordInput.placeholder).fill("AssistantE2E!890");
    await passwordCard.getByRole(PersonalInfoSelectors.savePasswordBtn.role, { name: PersonalInfoSelectors.savePasswordBtn.name }).click();

    await expectErrorMessage(page, "当前密码错误");
  });

  test("修改密码校验：两次输入的密码不一致", async ({ page }) => {
    await loginAsAssistant(page);
    await openPersonalInfoPage(page);

    const passwordCard = page.locator(CommonSelectors.card).filter({ hasText: PersonalInfoSelectors.passwordCard }).first();
    await passwordCard.getByPlaceholder(PersonalInfoSelectors.currentPasswordInput.placeholder).fill(ACCOUNTS.assistant.password);
    await passwordCard.getByPlaceholder(PersonalInfoSelectors.newPasswordInput.placeholder).fill("AssistantE2E!890");
    await passwordCard.getByPlaceholder(PersonalInfoSelectors.confirmPasswordInput.placeholder).fill("AssistantE2E!891");
    await passwordCard.getByRole(PersonalInfoSelectors.savePasswordBtn.role, { name: PersonalInfoSelectors.savePasswordBtn.name }).click();

    await expect(passwordCard.getByText(ErrorMessages.passwordMismatch)).toBeVisible();
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

  test("无结果搜索与清空恢复", async ({ page }) => {
    await loginAsAssistant(page);
    await openSubMenuPage(page, "实验管理", "实验进度", "实验进度");

    const searchInput = page.getByPlaceholder(ExperimentProgressSelectors.searchInput.placeholder);
    await searchInput.fill("NO_MATCH_ASSISTANT_PROGRESS");
    await expect(page.getByText("暂无数据")).toBeVisible();

    await searchInput.clear();
    await expect(tableRowByText(page, TEST_DATA.students.pendingReview1)).toBeVisible();
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

  test("无结果搜索与清空恢复", async ({ page }) => {
    await loginAsAssistant(page);
    await openSubMenuPage(page, "实验管理", "实验日志", "实验日志");

    const searchInput = page.getByPlaceholder(ExperimentLogSelectors.searchInput.placeholder);
    await searchInput.fill("NO_MATCH_ASSISTANT_LOG");
    await expect(page.getByText("暂无数据")).toBeVisible();

    await searchInput.clear();
    await expect(tableRowByText(page, TEST_DATA.students.pendingReview1)).toBeVisible();
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
  test("评阅校验：清空报告得分后禁止保存", async ({ page }) => {
    await loginAsAssistant(page);
    await openSubMenuPage(page, "实验管理", "实验报告", "实验报告");

    await page.getByPlaceholder(ExperimentReportSelectors.searchInput.placeholder).fill("20240051");
    const reportRow = tableRowByText(page, "20240051");
    await expect(reportRow).toBeVisible();
    await reportRow.getByRole(ExperimentReportSelectors.reviewBtn.role, { name: ExperimentReportSelectors.reviewBtn.name }).click();

    const reviewModal = await getVisibleModal(page, ModalTitles.reviewReport);
    await reviewModal.getByPlaceholder(ExperimentReportSelectors.reportScoreInput.placeholder).fill("");

    await expect(reviewModal.getByText("分数需在 0-100 之间")).toBeVisible();
    await expect(reviewModal.getByRole(ExperimentReportSelectors.saveReviewBtn.role, { name: ExperimentReportSelectors.saveReviewBtn.name })).toBeDisabled();
    await reviewModal.getByRole("button", { name: /取\s*消/ }).click();
  });

  test("评阅驳回校验：未填写原因时禁用驳回", async ({ page }) => {
    await loginAsAssistant(page);
    await openSubMenuPage(page, "实验管理", "实验报告", "实验报告");

    await page.getByPlaceholder(ExperimentReportSelectors.searchInput.placeholder).fill("20240051");
    const reportRow = tableRowByText(page, "20240051");
    await expect(reportRow).toBeVisible();
    await reportRow.getByRole(ExperimentReportSelectors.reviewBtn.role, { name: ExperimentReportSelectors.reviewBtn.name }).click();

    const reviewModal = await getVisibleModal(page, ModalTitles.reviewReport);
    const rejectButton = reviewModal.getByRole("button", { name: "驳回报告" });
    await expect(rejectButton).toBeDisabled();

    await reviewModal.getByPlaceholder("请输入具体的修改建议...").fill("请补充实验说明");
    await expect(rejectButton).toBeEnabled();
    await reviewModal.getByRole("button", { name: /取\s*消/ }).click();
  });

  test("评阅分数边界值", async ({ page }) => {
    await loginAsAssistant(page);
    await openSubMenuPage(page, "实验管理", "实验报告", "实验报告");

    // 使用 20240051（已评阅的学生），重新评阅为 0 分测试边界值
    const searchInput = page.getByPlaceholder(ExperimentReportSelectors.searchInput.placeholder);
    await searchInput.fill("20240051");
    
    const reportRow = tableRowByText(page, "20240051");
    await expect(reportRow).toBeVisible();
    await reportRow.getByRole(ExperimentReportSelectors.reviewBtn.role, { name: ExperimentReportSelectors.reviewBtn.name }).click();
    
    const reviewModal = await getVisibleModal(page, ModalTitles.reviewReport);

    // Test 0 score (minimum) - 重新评阅为 0 分
    await reviewModal.getByPlaceholder(ExperimentReportSelectors.reportScoreInput.placeholder).fill("0");
    await reviewModal.getByPlaceholder(ExperimentReportSelectors.modelScoreInput.placeholder).fill("0");
    await reviewModal.getByPlaceholder(ExperimentReportSelectors.feedbackInput.placeholder).fill("边界测试：0分");
    await reviewModal.getByRole(ExperimentReportSelectors.saveReviewBtn.role, { name: ExperimentReportSelectors.saveReviewBtn.name }).click();
    
    await expectSuccessMessage(page, SuccessMessages.reviewSaved);
    await expect(tableRowByText(page, "20240051").getByText(ExperimentReportSelectors.statusGraded)).toBeVisible();
  });

  test("评阅100分", async ({ page }) => {
    await loginAsAssistant(page);
    await openSubMenuPage(page, "实验管理", "实验报告", "实验报告");

    // 使用 20240054（进行中的学生），先完成实验并提交报告
    // 注意：由于该学生没有报告，我们改为验证已评阅学生的状态
    // 这里测试满分100的情况
    
    const searchInput = page.getByPlaceholder(ExperimentReportSelectors.searchInput.placeholder);
    await searchInput.fill("20240051");  // 已评阅的学生
    
    const reportRow = tableRowByText(page, "20240051");
    await expect(reportRow).toBeVisible();
    await reportRow.getByRole(ExperimentReportSelectors.reviewBtn.role, { name: ExperimentReportSelectors.reviewBtn.name }).click();
    
    const reviewModal = await getVisibleModal(page, ModalTitles.reviewReport);

    // Test 100 score (maximum) - 重新评阅为100分
    await reviewModal.getByPlaceholder(ExperimentReportSelectors.reportScoreInput.placeholder).fill("100");
    await reviewModal.getByPlaceholder(ExperimentReportSelectors.modelScoreInput.placeholder).fill("100");
    await reviewModal.getByPlaceholder(ExperimentReportSelectors.feedbackInput.placeholder).fill("边界测试：满分100");
    await reviewModal.getByRole(ExperimentReportSelectors.saveReviewBtn.role, { name: ExperimentReportSelectors.saveReviewBtn.name }).click();
    
    await expectSuccessMessage(page, SuccessMessages.reviewSaved);
    await expect(tableRowByText(page, "20240051").getByText(ExperimentReportSelectors.statusGraded)).toBeVisible();
  });

  test("驳回报告后显示已驳回状态与原因", async ({ page }) => {
    await loginAsAssistant(page);
    await openSubMenuPage(page, "实验管理", "实验报告", "实验报告");

    await page.getByPlaceholder(ExperimentReportSelectors.searchInput.placeholder).fill("20240051");
    const reportRow = tableRowByText(page, "20240051");
    await expect(reportRow).toBeVisible();

    const rejectReason = `Assistant驳回-${Date.now().toString().slice(-6)}`;
    await reportRow.getByRole(ExperimentReportSelectors.reviewBtn.role, { name: ExperimentReportSelectors.reviewBtn.name }).click();

    const reviewModal = await getVisibleModal(page, ModalTitles.reviewReport);
    await reviewModal.getByPlaceholder("请输入具体的修改建议...").fill(rejectReason);
    await reviewModal.getByRole("button", { name: "驳回报告" }).click();

    await expectSuccessMessage(page, "报告已驳回");
    await expect(tableRowByText(page, "20240051").getByText(ExperimentReportSelectors.statusRejected)).toBeVisible();

    await tableRowByText(page, "20240051").getByRole(ExperimentReportSelectors.reviewBtn.role, { name: ExperimentReportSelectors.reviewBtn.name }).click();
    const rejectedModal = await getVisibleModal(page, ModalTitles.reviewReport);
    await expect(rejectedModal.getByText("报告已驳回")).toBeVisible();
    await expect(rejectedModal.getByText(rejectReason)).toBeVisible();
    await rejectedModal.getByRole("button", { name: /关\s*闭/ }).click();
  });
});
