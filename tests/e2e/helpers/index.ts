/**
 * Common E2E test helpers
 * 
 * This module provides reusable helper functions for Playwright E2E tests
 * to reduce code duplication and improve maintainability.
 */

import { expect, type Locator, type Page } from "@playwright/test";
import { CommonSelectors, LoginSelectors, LayoutSelectors, ModalTitles } from "./selectors";
import type { ApiResponse, TeacherClassSummary, GradeSummaryRow } from "./types";

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
    await parentMenu.click({ force: attempt > 0 });

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
      await childMenu.click();
    } catch {
      await childMenu.click({ force: true });
    }

    if (await heading.isVisible({ timeout: 5_000 }).catch(() => false)) {
      return;
    }
  }

  await expect(heading).toBeVisible();
}

// ===== Locator Helpers =====

/**
 * Get a table row by its text content
 */
export function tableRowByText(page: Page, text: string): Locator {
  return page.locator(CommonSelectors.tableRow).filter({ hasText: text }).first();
}

/**
 * Get a visible modal by its title
 */
export async function getVisibleModal(page: Page, title: RegExp | string): Promise<Locator> {
  const modal = page.getByRole("dialog", { name: title }).first();
  await expect(modal).toBeVisible();
  return modal;
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
  role: "teacher" | "assistant";
}

/**
 * Login as a specific role
 */
export async function loginAs(page: Page, options: LoginOptions): Promise<void> {
  await page.goto("/login.html");
  
  const roleTab = options.role === "teacher" 
    ? page.getByRole(LoginSelectors.teacherTab.role, { name: LoginSelectors.teacherTab.name })
    : page.getByRole(LoginSelectors.assistantTab.role, { name: LoginSelectors.assistantTab.name });
  await roleTab.click();
  
  await page.locator(LoginSelectors.usernameInput).fill(options.username);
  await page.locator(LoginSelectors.passwordInput).fill(options.password);
  await page.getByRole(LoginSelectors.loginBtn.role, { name: LoginSelectors.loginBtn.name }).click();

  await expect(page).toHaveURL(/\/teacher\.html/);
  await expect(page.getByRole("heading", { name: "实验进度", level: 3 })).toBeVisible();
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
