/**
 * Common E2E test helpers
 * 
 * This module provides reusable helper functions for Playwright E2E tests
 * to reduce code duplication and improve maintainability.
 */

import { expect, type APIResponse as PlaywrightAPIResponse, type Locator, type Page } from "@playwright/test";
import { ACCOUNTS } from "../fixtures";
import {
  AssistantManagementSelectors,
  ClassManagementSelectors,
  CommonSelectors,
  ExperimentReportSelectors,
  GradeOverviewSelectors,
  LoginSelectors,
  LayoutSelectors,
  ModalTitles,
  PersonalInfoSelectors,
  QuestionBankSelectors,
  StudentManagementSelectors,
  SuccessMessages,
} from "./selectors";
import type {
  ApiResponse,
  AcademicTermRecord,
  CsvUploadPart,
  CurrentUserProfile,
  ManagedClassRecord,
  TeacherClassSummary,
  GradeSummaryRow,
  TempStudentSeed,
  TestCredentials,
} from "./types";

// ===== Re-exports =====

export * from "./types";
export * from "./selectors";
export * from "../fixtures";

// ===== Data Generators =====

/**
 * Generate a unique run ID with prefix and timestamp
 */
export function makeRunId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

/**
 * Generate a phone number with optional offset
 */
export function makePhone(offset: number = 0): string {
  const num = (Date.now() + offset) % 1_000_000_000;
  return `13${num.toString().padStart(9, "0")}`;
}

/**
 * Generate random letters
 */
export function makeLetters(length: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyz";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

/**
 * Generate a student number
 */
export function makeStudentNo(offset: number = 0): string {
  const num = (Date.now() + offset) % 1_000_000_000;
  return `9${num.toString().padStart(9, "0")}`;
}

/**
 * Build CSV buffer from rows
 */
export function buildCsv(rows: string[][]): Buffer {
  return Buffer.from(rows.map((row) => row.join(",")).join("\n"), "utf8");
}

const GBK_CHAR_BYTES: Record<string, number[]> = {
  姓: [0xd0, 0xd5],
  名: [0xc3, 0xfb],
  手: [0xca, 0xd6],
  机: [0xbb, 0xfa],
  号: [0xba, 0xc5],
  学: [0xd1, 0xa7],
  张: [0xd5, 0xc5],
  三: [0xc8, 0xfd],
  李: [0xc0, 0xee],
  四: [0xcb, 0xc4],
};

/**
 * Build a GBK/Excel-style CSV buffer for upload compatibility tests.
 */
export function buildWindowsExcelCsv(rows: string[][]): Buffer {
  const bytes: number[] = [];
  const csvText = rows.map((row) => row.join(",")).join("\n");

  for (const char of csvText) {
    const code = char.charCodeAt(0);
    if (code <= 0x7f) {
      bytes.push(code);
      continue;
    }

    const mapped = GBK_CHAR_BYTES[char];
    if (!mapped) {
      throw new Error(`No GBK test mapping for character: ${char}`);
    }
    bytes.push(...mapped);
  }

  return Buffer.from(bytes);
}

export function buildCsvUploadPart(
  name: string,
  rows: string[][],
  mimeType = "text/csv",
): CsvUploadPart {
  return {
    name,
    mimeType,
    buffer: buildCsv(rows),
  };
}

export function buildTempStudentSeed(prefix: string): TempStudentSeed {
  const studentId = makeStudentNo(Math.floor(Math.random() * 10_000));
  return {
    studentId,
    fullName: `${prefix}${studentId.slice(-4)}`,
    upload: buildCsvUploadPart(`${studentId}.csv`, [
      ["学号", "姓名"],
      [studentId, `${prefix}${studentId.slice(-4)}`],
    ]),
  };
}

// ===== Page Navigation =====

/**
 * Navigate to a top-level menu page
 */
export async function openTopLevelPage(
  page: Page,
  menuLabel: string,
  headingText: string,
): Promise<void> {
  await page.getByRole("menuitem", { name: menuLabel }).first().click();
  await expect(page.getByRole("heading", { name: headingText, level: 3 })).toBeVisible();
}

export async function openOperationManualAndAssert(
  page: Page,
  expectedPath: RegExp,
  expectedHeading: string,
): Promise<void> {
  const [manualPage] = await Promise.all([
    page.waitForEvent("popup"),
    page.getByRole("link", { name: "操作手册" }).click(),
  ]);

  await manualPage.waitForLoadState("domcontentloaded");
  await expect(manualPage).toHaveURL(expectedPath);
  await expect(manualPage.getByRole("heading", { level: 1, name: expectedHeading })).toBeVisible();
  await manualPage.close();
}

/**
 * Navigate to a submenu page with retry logic
 */
export async function openSubMenuPage(
  page: Page,
  parent: string,
  child: string,
  headingText: string,
): Promise<void> {
  const heading = page.getByRole("heading", { name: headingText, level: 3 });
  
  // Already on the page
  if (await heading.isVisible({ timeout: 2_000 }).catch(() => false)) {
    return;
  }

  const parentMenu = page.getByRole("menuitem", { name: parent }).first();
  await expect(parentMenu).toBeVisible();

  // Try up to 3 times
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await parentMenu.click({ force: attempt > 0, timeout: 5_000 });

    if (await heading.isVisible({ timeout: 1_500 }).catch(() => false)) {
      return;
    }

    const childMenu = page.getByRole("menuitem", { name: child }).first();
    if ((await childMenu.count()) === 0) continue;
    
    await childMenu.waitFor({ state: "visible", timeout: 3_000 }).catch(() => undefined);
    if (!(await childMenu.isVisible().catch(() => false))) {
      if (await heading.isVisible({ timeout: 1_500 }).catch(() => false)) return;
      continue;
    }

    try {
      await childMenu.click({ timeout: 5_000 });
    } catch {
      if (await heading.isVisible({ timeout: 1_500 }).catch(() => false)) return;
      await childMenu.click({ force: true, timeout: 3_000 }).catch(() => undefined);
    }

    if (await heading.isVisible({ timeout: 5_000 }).catch(() => false)) {
      return;
    }
  }

  await expect(heading).toBeVisible();
}

export async function getFirstManagedClassName(page: Page): Promise<string> {
  await openTopLevelPage(page, "班级管理", "班级管理");
  const firstRow = page.locator(CommonSelectors.tableRow).nth(1);
  return firstRow.locator("td").first().innerText();
}

export async function createManagedClassViaUi(
  page: Page,
  options?: {
    withStudents?: boolean;
    prefix?: string;
    codePrefix?: string;
    studentPrefix?: string;
  },
): Promise<string> {
  await openClassManagementPage(page);

  const className = makeRunId(options?.prefix ?? "E2E助教班级");
  const classCode = `${options?.codePrefix ?? "TA"}${Date.now()}`;
  const withStudents = options?.withStudents ?? true;

  const createModal = await openCreateClassModal(page);
  const studentCsv = withStudents
    ? buildTempStudentSeed(options?.studentPrefix ?? "助教分配学生").upload
    : undefined;
  await fillClassForm(createModal, {
    className,
    classCode,
    studentCsv,
  });

  await createModal.getByRole("button", { name: /创\s*建/ }).click();
  await expectSuccessMessage(page, SuccessMessages.classCreated);

  const resultModal = await getVisibleModal(page, "创建结果");
  await resultModal.getByRole("button", { name: /确\s*定/ }).click();
  await expect(tableRowByText(page, className)).toBeVisible();

  return className;
}

export async function openClassManagementPage(page: Page): Promise<void> {
  const heading = page.getByRole("heading", { name: "班级管理", level: 3 });
  if (await heading.isVisible({ timeout: 2_000 }).catch(() => false)) {
    return;
  }

  await page.goto("/teacher.html#/class-management");
  await expect(page).toHaveURL(/\/teacher\.html#\/class-management/);
  await expect(heading).toBeVisible({ timeout: 20_000 });
}

export async function openTeacherAssistantManagementPage(page: Page): Promise<void> {
  const heading = page.getByRole("heading", { name: "助教管理", level: 3 });
  if (await heading.isVisible({ timeout: 2_000 }).catch(() => false)) {
    return;
  }

  await page.goto("/teacher.html#/account-assistant");
  await expect(page).toHaveURL(/\/teacher\.html#\/account-assistant/);
  await expect(heading).toBeVisible({ timeout: 20_000 });
}

export async function openStudentManagementPage(page: Page): Promise<void> {
  const heading = page.getByRole("heading", { name: "学生管理", level: 3 });
  if (await heading.isVisible({ timeout: 2_000 }).catch(() => false)) {
    return;
  }

  await page.goto("/teacher.html#/student-management");
  await expect(page).toHaveURL(/\/teacher\.html#\/student-management/);
  await expect(heading).toBeVisible({ timeout: 20_000 });
}

export async function openExperimentReportsPage(page: Page): Promise<void> {
  const heading = page.getByRole("heading", { name: "实验报告", level: 3 });
  if (await heading.isVisible({ timeout: 2_000 }).catch(() => false)) {
    return;
  }

  await page.goto("/teacher.html#/experiment-reports");
  await expect(page).toHaveURL(/\/teacher\.html#\/experiment-reports/);
  await expect(heading).toBeVisible({ timeout: 20_000 });
}

export async function openExperimentProgressPage(page: Page): Promise<void> {
  const heading = page.getByRole("heading", { name: "实验进度", level: 3 });
  if (await heading.isVisible({ timeout: 2_000 }).catch(() => false)) {
    return;
  }

  await page.goto("/teacher.html#/experiment-progress");
  await expect(page).toHaveURL(/\/teacher\.html#\/experiment-progress/);
  await expect(heading).toBeVisible({ timeout: 20_000 });
}

export async function openExperimentLogsPage(page: Page): Promise<void> {
  const heading = page.getByRole("heading", { name: "实验日志", level: 3 });
  if (await heading.isVisible({ timeout: 2_000 }).catch(() => false)) {
    return;
  }

  await page.goto("/teacher.html#/experiment-logs");
  await expect(page).toHaveURL(/\/teacher\.html#\/experiment-logs/);
  await expect(heading).toBeVisible({ timeout: 20_000 });
}

export async function openQuestionBankPage(page: Page): Promise<void> {
  const heading = page.getByRole("heading", { name: "题库管理", level: 3 });
  if (await heading.isVisible({ timeout: 2_000 }).catch(() => false)) {
    return;
  }

  await page.goto("/teacher.html#/assessment-questions");
  await expect(page).toHaveURL(/\/teacher\.html#\/assessment-questions/);
  await expect(heading).toBeVisible({ timeout: 20_000 });
}

export async function openGradeWeightsPage(page: Page): Promise<void> {
  const heading = page.getByRole("heading", { name: "成绩权重设置", level: 3 });
  if (await heading.isVisible({ timeout: 2_000 }).catch(() => false)) {
    return;
  }

  await page.goto("/teacher.html#/assessment-weights");
  await expect(page).toHaveURL(/\/teacher\.html#\/assessment-weights/);
  await expect(heading).toBeVisible({ timeout: 20_000 });
}

export async function openGradeOverviewPage(page: Page): Promise<void> {
  const heading = page.getByRole("heading", { name: "成绩总览", level: 3 });
  if (await heading.isVisible({ timeout: 2_000 }).catch(() => false)) {
    return;
  }

  await page.goto("/teacher.html#/assessment-grades");
  await expect(page).toHaveURL(/\/teacher\.html#\/assessment-grades/);
  await expect(heading).toBeVisible({ timeout: 20_000 });
}

export async function selectTopFilterOption(page: Page, optionText: string): Promise<void> {
  const selects = page.locator(".ant-select");
  const count = await selects.count();

  for (let index = 0; index < count; index += 1) {
    const select = selects.nth(index);
    if (!(await select.isVisible().catch(() => false))) continue;

    await select.click();
    const visibleDropdowns = page.locator(".ant-select-dropdown:not(.ant-select-dropdown-hidden)");
    const hasVisibleDropdown = await visibleDropdowns.first().isVisible({ timeout: 2_000 }).catch(() => false);
    if (!hasVisibleDropdown) continue;

    const option = visibleDropdowns
      .getByText(optionText, { exact: false })
      .last();

    if ((await option.count()) > 0) {
      await option.scrollIntoViewIfNeeded();
      await option.click();
      return;
    }

    await page.keyboard.press("Escape");
    await page.locator("body").click({ position: { x: 1, y: 1 } }).catch(() => undefined);
  }

  throw new Error(`Cannot find top filter option: ${optionText}`);
}

// ===== Locator Helpers =====

/**
 * Get a table row by its text content
 */
export function tableRowByText(page: Page, text: string): Locator {
  return page.locator(CommonSelectors.tableRow).filter({ hasText: text }).first();
}

export function getGradeOverviewClassCard(page: Page, className: string): Locator {
  return page
    .locator(CommonSelectors.card)
    .filter({ hasText: className })
    .filter({ hasText: GradeOverviewSelectors.classCardClickHint })
    .first();
}

export async function openGradeOverviewClassDetail(page: Page, className: string): Promise<Locator> {
  const classCard = getGradeOverviewClassCard(page, className);
  await expect(classCard).toBeVisible();
  await classCard.click();
  return classCard;
}

export function getGradeOverviewDetailToggle(row: Locator): Locator {
  return row.getByRole("button", { name: /详情|收起/ }).first();
}

export async function expandGradeOverviewRowDetail(row: Locator): Promise<Locator> {
  const toggle = getGradeOverviewDetailToggle(row);
  await expect(toggle).toBeVisible();

  if ((await toggle.textContent())?.includes(GradeOverviewSelectors.detailBtn.name)) {
    await toggle.click();
  }

  await expect(toggle).toContainText(GradeOverviewSelectors.collapseBtn.name);
  return toggle;
}

export async function collapseGradeOverviewRowDetail(row: Locator): Promise<Locator> {
  const toggle = getGradeOverviewDetailToggle(row);
  await expect(toggle).toBeVisible();

  if ((await toggle.textContent())?.includes(GradeOverviewSelectors.collapseBtn.name)) {
    await toggle.click();
  }

  await expect(toggle).toContainText(GradeOverviewSelectors.detailBtn.name);
  return toggle;
}

/**
 * Get a visible modal by its title
 */
export async function getVisibleModal(page: Page, title: RegExp | string): Promise<Locator> {
  const modal = page.getByRole("dialog", { name: title }).first();
  await expect(modal).toBeVisible();
  return modal;
}

async function getVisibleActionTrigger(actions: Locator, preferredIndex?: number): Promise<Locator> {
  const count = await actions.count();
  if (count === 0) {
    throw new Error("No matching action trigger found");
  }

  if (preferredIndex !== undefined && preferredIndex < count) {
    const preferred = actions.nth(preferredIndex);
    if (await preferred.isVisible().catch(() => false)) {
      return preferred;
    }
  }

  for (let index = 0; index < count; index += 1) {
    const candidate = actions.nth(index);
    if (await candidate.isVisible().catch(() => false)) {
      return candidate;
    }
  }

  return actions.first();
}

/**
 * Fill a form field by its label
 */
export async function fillFormField(modal: Locator, label: string, value: string): Promise<void> {
  const formItem = modal.locator(CommonSelectors.formItem).filter({ hasText: label }).first();
  await expect(formItem).toBeVisible();
  await formItem.locator(CommonSelectors.formInput).first().fill(value);
}

/**
 * Select an option from a dropdown by label
 */
export async function selectOptionByLabel(
  page: Page,
  modal: Locator,
  label: string,
  optionText: string,
): Promise<void> {
  const formItem = modal.locator(CommonSelectors.formItem).filter({ hasText: label }).first();
  await expect(formItem).toBeVisible();

  const combobox = formItem.getByRole("combobox").first();
  await combobox.click();

  const dropdown = page.locator(".ant-select-dropdown").filter({ hasText: optionText }).last();
  await expect(dropdown).toBeVisible();
  const option = dropdown.getByText(optionText, { exact: false }).first();
  await option.scrollIntoViewIfNeeded();
  await option.click({ force: true });
  await page.keyboard.press("Escape");
}

export async function selectMultiOptionsByLabel(
  page: Page,
  modal: Locator,
  label: string,
  optionTexts: string[],
): Promise<void> {
  if (optionTexts.length === 0) {
    return;
  }

  if (optionTexts.length === 1) {
    await selectOptionByLabel(page, modal, label, optionTexts[0]);
    return;
  }

  await selectOptionByLabel(page, modal, label, optionTexts[0]);

  const formItem = modal.locator(CommonSelectors.formItem).filter({ hasText: label }).first();
  await expect(formItem).toBeVisible();

  for (const optionText of optionTexts.slice(1)) {
    await formItem.getByRole("combobox").first().click();
    const dropdown = page.locator(".ant-select-dropdown").last();
    await expect(dropdown).toBeVisible();

    const option = dropdown
      .locator(".ant-select-item-option")
      .filter({ hasText: optionText })
      .first();
    await option.evaluate((element) => {
      element.scrollIntoView({ block: "center" });
    });
    await option.click();
    await page.keyboard.press("Escape");
  }
}

/**
 * Clear a multi-select field
 */
export async function clearMultiSelectByLabel(modal: Locator, label: string): Promise<void> {
  const formItem = modal.locator(CommonSelectors.formItem).filter({ hasText: label }).first();
  await expect(formItem).toBeVisible();

  const select = formItem.locator(".ant-select").first();
  await select.hover();

  const clear = select.locator(".ant-select-clear");
  if (await clear.count()) {
    await clear.first().click();
    return;
  }

  const removeButtons = select.locator(".ant-select-selection-item-remove");
  let count = await removeButtons.count();
  while (count > 0) {
    await removeButtons.first().click();
    count = await removeButtons.count();
  }
}

export async function openCreateAssistantModal(page: Page): Promise<Locator> {
  await page.getByRole(AssistantManagementSelectors.createAssistantBtn.role, {
    name: AssistantManagementSelectors.createAssistantBtn.name,
  }).click();
  return getVisibleModal(page, ModalTitles.createAssistant);
}

export async function openCreateClassModal(page: Page): Promise<Locator> {
  await page.getByRole(ClassManagementSelectors.addClassBtn.role, {
    name: ClassManagementSelectors.addClassBtn.name,
  }).click();
  return getVisibleModal(page, ModalTitles.createClass);
}

export async function openAddStudentModal(page: Page): Promise<Locator> {
  await page.getByRole(StudentManagementSelectors.addStudentBtn.role, {
    name: StudentManagementSelectors.addStudentBtn.name,
  }).click();
  return getVisibleModal(page, StudentManagementSelectors.addStudentBtn.name);
}

export async function openEditClassModal(classRow: Locator): Promise<Locator> {
  await classRow.getByRole(ClassManagementSelectors.editClassBtn.role, {
    name: ClassManagementSelectors.editClassBtn.name,
  }).click();
  return getVisibleModal(classRow.page(), ModalTitles.editClass);
}

export async function openClassStudentListModal(
  classRow: Locator,
  className: string,
): Promise<Locator> {
  await classRow.getByRole(ClassManagementSelectors.studentListBtn.role, {
    name: ClassManagementSelectors.studentListBtn.name,
  }).click();
  return getVisibleModal(classRow.page(), new RegExp(`学生列表\\s*-\\s*${className}`));
}

export async function openDeleteClassModal(classRow: Locator): Promise<Locator> {
  await classRow.getByRole(ClassManagementSelectors.deleteClassBtn.role, {
    name: ClassManagementSelectors.deleteClassBtn.name,
  }).click();
  return getVisibleModal(classRow.page(), ModalTitles.deleteClass);
}

export async function openReportReviewModal(reportRow: Locator): Promise<Locator> {
  await reportRow.getByRole(ExperimentReportSelectors.reviewBtn.role, {
    name: ExperimentReportSelectors.reviewBtn.name,
  }).click();
  return getVisibleModal(reportRow.page(), ModalTitles.reviewReport);
}

export async function openQuestionEditModal(questionRow: Locator): Promise<Locator> {
  const trigger = await getVisibleActionTrigger(
    questionRow.getByRole(QuestionBankSelectors.editBtn.role, {
      name: QuestionBankSelectors.editBtn.name,
    }),
    1,
  );
  await trigger.click();
  return getVisibleModal(questionRow.page(), "编辑题目");
}

export async function openQuestionPreviewModal(questionRow: Locator): Promise<Locator> {
  const trigger = await getVisibleActionTrigger(
    questionRow.getByRole(QuestionBankSelectors.previewBtn.role, {
      name: QuestionBankSelectors.previewBtn.name,
    }),
    0,
  );
  await trigger.click();
  return getVisibleModal(questionRow.page(), "题目预览");
}

export async function confirmQuestionDelete(questionRow: Locator): Promise<void> {
  const trigger = await getVisibleActionTrigger(
    questionRow.getByRole(QuestionBankSelectors.deleteBtn.role, {
      name: QuestionBankSelectors.deleteBtn.name,
    }),
    2,
  );
  await trigger.click();

  const deletePopover = questionRow.page().locator(".ant-popover").filter({ hasText: "确定删除该题目？" }).last();
  await expect(deletePopover).toBeVisible();
  await deletePopover.getByRole("button", { name: /确\s*定/ }).click();
}

export async function openEditPersonalInfoModal(page: Page): Promise<Locator> {
  await page.getByRole(PersonalInfoSelectors.editBtn.role, {
    name: PersonalInfoSelectors.editBtn.name,
  }).click();
  return getVisibleModal(page, ModalTitles.editPersonalInfo);
}

export async function getPasswordCard(page: Page): Promise<Locator> {
  const card = page.locator(CommonSelectors.card).filter({ hasText: PersonalInfoSelectors.passwordCard }).first();
  await expect(card).toBeVisible();
  return card;
}

export async function fillAssistantCreationForm(
  page: Page,
  modal: Locator,
  values: {
    username: string;
    fullName: string;
    email: string;
    phone: string;
    password: string;
    classNames?: string[];
  },
): Promise<void> {
  await fillFormField(modal, AssistantManagementSelectors.usernameInput, values.username);
  await fillFormField(modal, AssistantManagementSelectors.fullNameInput, values.fullName);
  await fillFormField(modal, AssistantManagementSelectors.emailInput, values.email);
  await fillFormField(modal, AssistantManagementSelectors.phoneInput, values.phone);
  await fillFormField(modal, AssistantManagementSelectors.passwordInput, values.password);

  if (values.classNames?.length) {
    await selectMultiOptionsByLabel(page, modal, AssistantManagementSelectors.classSelectLabel, values.classNames);
  }
}

export async function fillStudentCreationForm(
  modal: Locator,
  values: {
    studentNo: string;
    studentName: string;
    password: string;
    email?: string;
  },
): Promise<void> {
  await fillFormField(modal, StudentManagementSelectors.studentNoInput, values.studentNo);
  await fillFormField(modal, StudentManagementSelectors.studentNameInput, values.studentName);
  await fillFormField(modal, StudentManagementSelectors.passwordInput, values.password);
  if (values.email) {
    await fillFormField(modal, "邮箱（可选）", values.email);
  }
}

export async function fillClassForm(
  modal: Locator,
  values: {
    className: string;
    classCode: string;
    studentCsv?: CsvUploadPart;
  },
): Promise<void> {
  await fillFormField(modal, ClassManagementSelectors.classNameInput, values.className);
  await fillFormField(modal, ClassManagementSelectors.classCodeInput, values.classCode);

  if (values.studentCsv) {
    await modal.locator(ClassManagementSelectors.fileInput).setInputFiles(values.studentCsv);
  }
}

export async function fillReportReviewForm(
  modal: Locator,
  values: {
    reportScore?: string;
    modelScore?: string;
    feedback?: string;
  },
): Promise<void> {
  if (values.reportScore !== undefined) {
    await modal.getByPlaceholder(ExperimentReportSelectors.reportScoreInput.placeholder).fill(values.reportScore);
  }
  if (values.modelScore !== undefined) {
    await modal.getByPlaceholder(ExperimentReportSelectors.modelScoreInput.placeholder).fill(values.modelScore);
  }
  if (values.feedback !== undefined) {
    await modal.getByPlaceholder(ExperimentReportSelectors.feedbackInput.placeholder).fill(values.feedback);
  }
}

export async function fillReportRejectReason(modal: Locator, reason: string): Promise<void> {
  await modal.getByPlaceholder("请输入具体的修改建议...").fill(reason);
}

export async function fillPersonalInfoForm(
  modal: Locator,
  values: {
    fullName: string;
    phone: string;
    email: string;
  },
): Promise<void> {
  await fillFormField(modal, PersonalInfoSelectors.fullNameInput, values.fullName);
  await fillFormField(modal, PersonalInfoSelectors.phoneInput, values.phone);
  await fillFormField(modal, PersonalInfoSelectors.emailInput, values.email);
}

export async function fillPasswordChangeForm(
  card: Locator,
  values: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  },
): Promise<void> {
  await card.getByPlaceholder(PersonalInfoSelectors.currentPasswordInput.placeholder).fill(values.currentPassword);
  await card.getByPlaceholder(PersonalInfoSelectors.newPasswordInput.placeholder).fill(values.newPassword);
  await card.getByPlaceholder(PersonalInfoSelectors.confirmPasswordInput.placeholder).fill(values.confirmPassword);
}

export async function submitPasswordChange(card: Locator): Promise<void> {
  await card.getByRole(PersonalInfoSelectors.savePasswordBtn.role, {
    name: PersonalInfoSelectors.savePasswordBtn.name,
  }).click();
}

export async function closeModalWithCloseButton(modal: Locator): Promise<void> {
  const namedCloseButton = modal.getByRole("button", { name: "Close" }).first();
  if (await namedCloseButton.isVisible().catch(() => false)) {
    await namedCloseButton.click();
    return;
  }

  await modal.locator(CommonSelectors.modalCloseBtn).first().click();
}

export async function expandFirstTableRow(page: Page): Promise<void> {
  const expandIcon = page.locator(".ant-table-row-expand-icon").first();
  await expect(expandIcon).toBeVisible();
  await expandIcon.click();
}

export async function openAssistantLibrarySelectionModal(page: Page): Promise<Locator> {
  await page.getByRole(AssistantManagementSelectors.selectFromLibraryBtn.role, {
    name: AssistantManagementSelectors.selectFromLibraryBtn.name,
  }).click();
  return getVisibleModal(page, ModalTitles.selectAssistant);
}

export async function openStudentLibrarySelectionModal(page: Page): Promise<Locator> {
  await page.getByRole(StudentManagementSelectors.addFromLibraryBtn.role, {
    name: StudentManagementSelectors.addFromLibraryBtn.name,
  }).click();
  return getVisibleModal(page, "从学生库中添加");
}

export async function assignAssistantFromLibrary(
  page: Page,
  modal: Locator,
  assistantName: string,
  classNames: string[],
): Promise<void> {
  await selectOptionByLabel(page, modal, "选择助教", assistantName);
  await selectMultiOptionsByLabel(page, modal, AssistantManagementSelectors.classSelectLabel, classNames);
}

export async function openAssistantReassignModal(assistantRow: Locator): Promise<Locator> {
  await assistantRow.getByRole(AssistantManagementSelectors.reassignBtn.role, {
    name: AssistantManagementSelectors.reassignBtn.name,
  }).click();
  const page = assistantRow.page();
  return getVisibleModal(page, ModalTitles.reassignAssistant);
}

export async function replaceAssistantAssignments(
  page: Page,
  modal: Locator,
  classNames: string[],
): Promise<void> {
  await clearMultiSelectByLabel(modal, AssistantManagementSelectors.classSelectLabel);
  await selectMultiOptionsByLabel(page, modal, AssistantManagementSelectors.classSelectLabel, classNames);
}

// ===== Modal Action Helpers =====

/**
 * Click the confirm/OK button in a modal
 */
export async function confirmModal(modal: Locator): Promise<void> {
  await modal.getByRole("button", { name: /确\s*定/ }).click();
}

/**
 * Click the cancel button in a modal
 */
export async function cancelModal(modal: Locator): Promise<void> {
  await modal.getByRole("button", { name: /取\s*消/ }).click();
}

/**
 * Confirm a delete dialog
 */
export async function confirmDelete(page: Page): Promise<void> {
  const deleteModal = await getVisibleModal(page, ModalTitles.deleteConfirm);
  await deleteModal.getByRole("button", { name: /删\s*除/ }).click();
}

// ===== Statistic Helpers =====

/**
 * Parse integer text (handles commas)
 */
export function parseIntegerText(raw: string): number {
  const normalized = raw.replace(/,/g, "").trim();
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Cannot parse integer from statistic value: "${raw}"`);
  }
  return parsed;
}

/**
 * Get a statistic value by its title
 */
export async function getStatisticValue(page: Page, title: string): Promise<number> {
  const stat = page
    .locator(CommonSelectors.statistic)
    .filter({ has: page.locator(CommonSelectors.statisticTitle, { hasText: title }) })
    .first();
  await expect(stat).toBeVisible();
  const valueText = await stat.locator(CommonSelectors.statisticValue).first().innerText();
  return parseIntegerText(valueText);
}

// ===== API Response Helpers =====

/**
 * Unwrap data envelope from API response
 */
export function unwrapDataEnvelope<T>(payload: unknown): T {
  if (payload !== null && typeof payload === "object" && "data" in payload) {
    return (payload as ApiResponse<T>).data;
  }
  return payload as T;
}

function buildApiUrl(backendOrigin: string, path: string): string {
  return new URL(path, backendOrigin).toString();
}

export async function getStoredToken(page: Page): Promise<string> {
  const token = await page.evaluate(() => {
    const path = window.location.pathname.toLowerCase();
    if (path.startsWith("/exp")) return localStorage.getItem("studentToken");
    if (path.startsWith("/teacher")) return localStorage.getItem("teacherToken");
    if (path.startsWith("/admin")) return localStorage.getItem("adminToken");
    return localStorage.getItem("studentToken")
      ?? localStorage.getItem("teacherToken")
      ?? localStorage.getItem("adminToken")
      ?? localStorage.getItem("token");
  });
  expect(token).not.toBeNull();
  return token!;
}

export async function expectStoredTokenCleared(page: Page): Promise<void> {
  const hasAnyToken = await page.evaluate(() => {
    return !!(
      localStorage.getItem("studentToken")
      || localStorage.getItem("teacherToken")
      || localStorage.getItem("adminToken")
      || localStorage.getItem("token")
    );
  });
  expect(hasAnyToken).toBe(false);
}

export async function requestSessionToken(
  page: Page,
  backendOrigin: string,
  credentials: TestCredentials,
): Promise<string> {
  const response = await page.request.post(buildApiUrl(backendOrigin, "/api/v1/sessions"), {
    headers: {
      "Content-Type": "application/json",
    },
    data: credentials,
  });
  expect(response.ok()).toBeTruthy();
  const payload = unwrapDataEnvelope<{ token: string }>(await response.json());
  expect(payload.token).toBeTruthy();
  return payload.token;
}

async function resolveAuthToken(page: Page, explicitToken?: string): Promise<string> {
  return explicitToken ?? getStoredToken(page);
}

export async function getAuthedJson<T>(
  page: Page,
  backendOrigin: string,
  path: string,
  token?: string,
): Promise<T> {
  const resolvedToken = await resolveAuthToken(page, token);
  const response = await page.request.get(buildApiUrl(backendOrigin, path), {
    headers: {
      Authorization: `Bearer ${resolvedToken}`,
    },
  });
  expect(response.ok()).toBeTruthy();
  return unwrapDataEnvelope<T>(await response.json());
}

export async function postAuthedJson(
  page: Page,
  backendOrigin: string,
  path: string,
  data: unknown,
  token?: string,
): Promise<PlaywrightAPIResponse> {
  const resolvedToken = await resolveAuthToken(page, token);
  return page.request.post(buildApiUrl(backendOrigin, path), {
    headers: {
      Authorization: `Bearer ${resolvedToken}`,
      "Content-Type": "application/json",
    },
    data,
  });
}

export async function putAuthedJson(
  page: Page,
  backendOrigin: string,
  path: string,
  data: unknown,
  token?: string,
): Promise<PlaywrightAPIResponse> {
  const resolvedToken = await resolveAuthToken(page, token);
  return page.request.put(buildApiUrl(backendOrigin, path), {
    headers: {
      Authorization: `Bearer ${resolvedToken}`,
      "Content-Type": "application/json",
    },
    data,
  });
}

export async function deleteAuthed(
  page: Page,
  backendOrigin: string,
  path: string,
  token?: string,
): Promise<PlaywrightAPIResponse> {
  const resolvedToken = await resolveAuthToken(page, token);
  return page.request.delete(buildApiUrl(backendOrigin, path), {
    headers: {
      Authorization: `Bearer ${resolvedToken}`,
    },
  });
}

export async function getCurrentUserProfile(
  page: Page,
  backendOrigin: string,
  token?: string,
): Promise<CurrentUserProfile> {
  return getAuthedJson<CurrentUserProfile>(page, backendOrigin, "/api/v1/users/me", token);
}

export async function listAcademicTermsWithToken(
  page: Page,
  backendOrigin: string,
  token?: string,
): Promise<AcademicTermRecord[]> {
  return getAuthedJson<AcademicTermRecord[]>(page, backendOrigin, "/api/v1/academic-terms", token);
}

export async function createAcademicTermWithToken(
  page: Page,
  backendOrigin: string,
  token: string,
  input: { academic_year: string; semester: 1 | 2; is_active?: boolean },
): Promise<AcademicTermRecord> {
  const response = await postAuthedJson(page, backendOrigin, "/api/v1/academic-terms", input, token);
  expect(response.ok()).toBeTruthy();
  return unwrapDataEnvelope<AcademicTermRecord>(await response.json());
}

export async function updateAcademicTermWithToken(
  page: Page,
  backendOrigin: string,
  token: string,
  termId: number,
  input: Partial<Pick<AcademicTermRecord, "academic_year" | "semester" | "is_active">>,
): Promise<AcademicTermRecord> {
  const response = await putAuthedJson(page, backendOrigin, `/api/v1/academic-terms/${termId}`, input, token);
  expect(response.ok()).toBeTruthy();
  return unwrapDataEnvelope<AcademicTermRecord>(await response.json());
}

export async function deleteAcademicTermWithToken(
  page: Page,
  backendOrigin: string,
  token: string,
  termId: number,
): Promise<PlaywrightAPIResponse> {
  return deleteAuthed(page, backendOrigin, `/api/v1/academic-terms/${termId}`, token);
}

export async function createClassWithTeacherToken(
  page: Page,
  backendOrigin: string,
  teacherToken: string,
  className: string,
  classCode: string,
  studentCsv?: CsvUploadPart,
  termId?: number,
): Promise<ManagedClassRecord> {
  const multipart: Record<string, string | CsvUploadPart> = {
    class_name: className,
    class_code: classCode,
  };
  if (termId !== undefined) {
    multipart.term_id = String(termId);
  }
  if (studentCsv) {
    multipart.student_list = studentCsv;
  }

  const response = await page.request.post(buildApiUrl(backendOrigin, "/api/v1/classes"), {
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

export async function assignAssistantToClassWithTeacherToken(
  page: Page,
  backendOrigin: string,
  teacherToken: string,
  classId: number,
  assistantId: number,
): Promise<PlaywrightAPIResponse> {
  return postAuthedJson(
    page,
    backendOrigin,
    `/api/v1/classes/${classId}/assistants`,
    { assistant_id: assistantId },
    teacherToken,
  );
}

export async function deleteClassWithTeacherToken(
  page: Page,
  backendOrigin: string,
  teacherToken: string,
  classId: number,
): Promise<PlaywrightAPIResponse> {
  return deleteAuthed(page, backendOrigin, `/api/v1/classes/${classId}`, teacherToken);
}

export async function createAssistantManagedTempClass(
  page: Page,
  backendOrigin: string,
  assistantId: number,
  options: {
    classPrefix: string;
    classCodePrefix?: string;
    withStudent?: boolean;
    studentPrefix?: string;
    termId?: number;
    teacherCredentials?: TestCredentials;
  },
): Promise<{ teacherToken: string; classRecord: ManagedClassRecord }> {
  const teacherCredentials = options.teacherCredentials ?? {
    username: ACCOUNTS.teacher.username,
    password: ACCOUNTS.teacher.password,
  };
  const teacherToken = await requestSessionToken(page, backendOrigin, teacherCredentials);
  const tempStudent = options.withStudent
    ? buildTempStudentSeed(options.studentPrefix ?? "助教临时学生")
    : undefined;
  const classRecord = await createClassWithTeacherToken(
    page,
    backendOrigin,
    teacherToken,
    makeRunId(options.classPrefix),
    `${options.classCodePrefix ?? "AUX"}${Date.now()}`,
    tempStudent?.upload,
    options.termId,
  );
  const assignResponse = await assignAssistantToClassWithTeacherToken(
    page,
    backendOrigin,
    teacherToken,
    classRecord.class_id,
    assistantId,
  );
  expect(assignResponse.ok()).toBeTruthy();
  return { teacherToken, classRecord };
}

// ===== Assertion Helpers =====

/**
 * Expect a success message to appear
 */
export async function expectSuccessMessage(page: Page, keyword: string): Promise<void> {
  const notice = page.locator(CommonSelectors.successMessage);
  await expect(notice.filter({ hasText: keyword }).last()).toBeVisible({ timeout: 20_000 });
}

/**
 * Expect an error message to appear
 */
export async function expectErrorMessage(page: Page, keyword: string): Promise<void> {
  const notice = page.locator(CommonSelectors.errorMessage);
  await expect(notice.filter({ hasText: keyword }).last()).toBeVisible({ timeout: 10_000 });
}

// ===== Grade Calculation Helpers =====

export interface ClassGradeStats {
  total: number;
  graded: number;
  avg: number;
  max: number;
  min: number;
}

export interface ScoreDistribution {
  excellent: number;
  good: number;
  average: number;
  pass: number;
  fail: number;
}

/**
 * Compute class grade statistics from rows
 */
export function computeClassGradeStats(rows: GradeSummaryRow[]): ClassGradeStats {
  const gradedRows = rows.filter((row) => row.report_status === "graded" && row.final_score !== null);
  const scored = gradedRows.map((row) => Number(row.final_score));
  const avg = scored.length > 0 ? scored.reduce((sum, val) => sum + val, 0) / scored.length : 0;
  const max = scored.length > 0 ? Math.max(...scored) : 0;
  const min = scored.length > 0 ? Math.min(...scored) : 0;
  return {
    total: rows.length,
    graded: scored.length,
    avg: Number(avg.toFixed(1)),
    max: Number(max.toFixed(1)),
    min: Number(min.toFixed(1)),
  };
}

/**
 * Compute score distribution from rows
 */
export function computeScoreDistribution(rows: GradeSummaryRow[]): ScoreDistribution {
  const distribution = {
    excellent: 0,
    good: 0,
    average: 0,
    pass: 0,
    fail: 0,
  };

  for (const row of rows) {
    if (row.report_status !== "graded" || row.final_score === null) continue;
    const score = Number(row.final_score);
    if (score >= 90) distribution.excellent += 1;
    else if (score >= 80) distribution.good += 1;
    else if (score >= 70) distribution.average += 1;
    else if (score >= 60) distribution.pass += 1;
    else distribution.fail += 1;
  }

  return distribution;
}

// ===== Grade Weight Helpers =====

/**
 * Set weight value by label
 */
export async function setWeightByLabel(page: Page, label: string, value: number): Promise<void> {
  const flowSection = page
    .locator(CommonSelectors.card)
    .filter({ has: page.getByText("实验流程细节权重", { exact: false }) })
    .first();
  await expect(flowSection).toBeVisible();

  const itemCard = flowSection
    .locator(".ant-row .ant-col .ant-card")
    .filter({ has: page.getByText(label, { exact: true }) })
    .first();
  await expect(itemCard).toBeVisible();

  const input = itemCard.locator("input.ant-input-number-input").first();
  await expect(input).toBeVisible();
  await input.click();
  await input.press("ControlOrMeta+A");
  await input.fill(String(value));
  await input.press("Enter");
  await expect(input).toHaveValue(String(value));
}

// ===== Login Helpers =====

export interface LoginOptions {
  username: string;
  password: string;
  role: "teacher" | "assistant" | "admin";
}

export type PortalRole = LoginOptions["role"];

export const PORTAL_UI = {
  teacher: {
    landingUrlPattern: /\/teacher\.html(?:#\/experiment-progress)?$/,
    landingHeading: "实验进度",
    expandedTitle: "教师端",
    collapsedTitle: "教",
    protectedPath: "/teacher.html#/student-management",
  },
  assistant: {
    landingUrlPattern: /\/teacher\.html(?:#\/experiment-progress)?$/,
    landingHeading: "实验进度",
    expandedTitle: "助教端",
    collapsedTitle: "助",
    protectedPath: "/teacher.html#/assessment-grades",
  },
  admin: {
    landingUrlPattern: /\/admin\.html(?:#\/experiment-data)?$/,
    landingHeading: "实验数据管理",
    expandedTitle: "管理员端",
    collapsedTitle: "管",
    protectedPath: "/admin.html#/user-management",
  },
} as const;

export async function expectPortalLanding(page: Page, role: PortalRole): Promise<void> {
  const portal = PORTAL_UI[role];
  await expect(page).toHaveURL(portal.landingUrlPattern);
  await expect(page.getByRole("heading", { name: portal.landingHeading, level: 3 })).toBeVisible();
  await expect(page.getByRole("heading", { name: portal.expandedTitle, level: 4 })).toBeVisible();
}

export async function togglePortalMenuAndAssert(page: Page, role: PortalRole): Promise<void> {
  const portal = PORTAL_UI[role];
  const menuToggle = page.locator(LayoutSelectors.menuToggleBtn).first();
  await menuToggle.click();
  await expect(page.getByRole("heading", { level: 4, name: portal.collapsedTitle })).toBeVisible();
  await menuToggle.click();
  await expect(page.getByRole("heading", { level: 4, name: portal.expandedTitle })).toBeVisible();
}

export async function expectGuestRedirect(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await expect(page).toHaveURL(/\/login\.html$/);
}

export async function loginAsTeacherAccount(
  page: Page,
  password = ACCOUNTS.teacher.password,
): Promise<void> {
  await loginAs(page, {
    username: ACCOUNTS.teacher.username,
    password,
    role: "teacher",
  });
}

export async function loginAsAssistantAccount(
  page: Page,
  password = ACCOUNTS.assistant.password,
): Promise<void> {
  await loginAs(page, {
    username: ACCOUNTS.assistant.username,
    password,
    role: "assistant",
  });
}

export async function loginAsAdminAccount(
  page: Page,
  password = ACCOUNTS.admin.password,
): Promise<void> {
  await loginAs(page, {
    username: ACCOUNTS.admin.username,
    password,
    role: "admin",
  });
}

/**
 * Login as a specific role
 */
export async function loginAs(page: Page, options: LoginOptions): Promise<void> {
  await page.goto("/login.html");

  const roleTabMap = {
    teacher: LoginSelectors.teacherTab,
    assistant: LoginSelectors.assistantTab,
    admin: LoginSelectors.adminTab,
  } as const;
  const tab = roleTabMap[options.role];
  await page.getByRole(tab.role, { name: tab.name }).click();

  await page.locator(LoginSelectors.usernameInput).fill(options.username);
  await page.locator(LoginSelectors.passwordInput).fill(options.password);
  await page.getByRole(LoginSelectors.loginBtn.role, { name: LoginSelectors.loginBtn.name }).click();
  await expectPortalLanding(page, options.role);
}

/**
 * Logout from the application
 */
export async function logout(page: Page): Promise<void> {
  await page.locator(LayoutSelectors.userAvatar).first().click();
  await page.getByRole(LayoutSelectors.logoutMenuItem.role, { name: LayoutSelectors.logoutMenuItem.name }).click();
  
  const logoutModal = await getVisibleModal(page, ModalTitles.logoutConfirm);
  await logoutModal.getByRole("button", { name: /退\s*出/ }).click();
  
  await expect(page).toHaveURL(/\/login\.html$/);
}

// ===== Personal Info Helpers =====

/**
 * Navigate to personal info page
 */
export async function openPersonalInfoPage(page: Page): Promise<void> {
  const heading = page.getByRole("heading", { name: "个人信息管理", level: 3 });
  if (await heading.isVisible({ timeout: 2_000 }).catch(() => false)) {
    return;
  }

  await page.goto("/teacher.html#/account-personal");
  await expect(page).toHaveURL(/\/teacher\.html#\/account-personal/);
  await expect(heading).toBeVisible({ timeout: 20_000 });
}


// ===== Re-exports from new architecture =====

// Export API helpers
export * from "./api-helpers";

// Export Student Factory
export { StudentFactory, type StudentData, type StudentQuery } from "../factories/StudentFactory";

// Export Playwright Fixtures (for new test style)
export { test, expect as playwrightExpect, type UserContext, type TestDataContext } from "../fixtures/index";
