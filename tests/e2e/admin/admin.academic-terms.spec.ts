import { expect, test } from "@playwright/test";
import {
  ACCOUNTS,
  deleteAcademicTermWithToken,
  expectErrorMessage,
  expectSuccessMessage,
  fillFormField,
  getStoredToken,
  getVisibleModal,
  listAcademicTermsWithToken,
  loginAsAdminAccount,
  openTopLevelPage,
  requestSessionToken,
  selectOptionByLabel,
  tableRowByText,
  updateAcademicTermWithToken,
  type AcademicTermRecord,
} from "../helpers";

const BACKEND_PORT = process.env.E2E_BACKEND_PORT ?? "54101";
const BACKEND_ORIGIN = process.env.E2E_BACKEND_ORIGIN ?? `http://127.0.0.1:${BACKEND_PORT}`;

test.describe("@admin @academic 学年学期管理", () => {
  test("管理员可以创建、去重、设为当前并删除空学期", async ({ page }) => {
    await loginAsAdminAccount(page);

    const adminToken = await getStoredToken(page);
    const originalTerms = await listAcademicTermsWithToken(page, BACKEND_ORIGIN, adminToken);
    const originalActiveTerm = originalTerms.find((term) => term.is_active) ?? null;
    const academicYear = `E2E-${Date.now().toString().slice(-8)}`;
    let createdTerm: AcademicTermRecord | undefined;

    try {
      await openTopLevelPage(page, "学年学期管理", "学年学期管理");

      await page.getByRole("button", { name: "新增学期" }).click();
      const createModal = await getVisibleModal(page, "新增学期");
      await fillFormField(createModal, "学年", academicYear);
      await selectOptionByLabel(page, createModal, "学期", "第二学期");
      await createModal.getByRole("button", { name: /创\s*建/ }).click();
      await expectSuccessMessage(page, "学期已创建");

      createdTerm = (await listAcademicTermsWithToken(page, BACKEND_ORIGIN, adminToken))
        .find((term) => term.academic_year === academicYear && term.semester === 2);
      expect(createdTerm).toBeDefined();

      const termRow = tableRowByText(page, `${academicYear} 第2学期`);
      await expect(termRow).toBeVisible();
      await expect(termRow).toContainText("历史学期");
      await expect(termRow).toContainText("0");

      await page.getByRole("button", { name: "新增学期" }).click();
      const duplicateModal = await getVisibleModal(page, "新增学期");
      await fillFormField(duplicateModal, "学年", academicYear);
      await selectOptionByLabel(page, duplicateModal, "学期", "第二学期");
      await duplicateModal.getByRole("button", { name: /创\s*建/ }).click();
      await expectErrorMessage(page, "该学年学期已存在");
      await duplicateModal.getByRole("button", { name: /取\s*消/ }).click();

      await tableRowByText(page, `${academicYear} 第2学期`)
        .getByRole("button", { name: "设为当前" })
        .click();
      await expectSuccessMessage(page, "当前学期已更新");

      const activeTerms = (await listAcademicTermsWithToken(page, BACKEND_ORIGIN, adminToken))
        .filter((term) => term.is_active);
      expect(activeTerms).toHaveLength(1);
      expect(activeTerms[0].term_id).toBe(createdTerm!.term_id);

      if (originalActiveTerm) {
        await updateAcademicTermWithToken(page, BACKEND_ORIGIN, adminToken, originalActiveTerm.term_id, { is_active: true });
        await page.reload();
        await expect(page.getByRole("heading", { name: "学年学期管理", level: 3 })).toBeVisible();
      }

      await tableRowByText(page, `${academicYear} 第2学期`)
        .getByRole("button", { name: "删除" })
        .click();
      const deleteModal = await getVisibleModal(page, /确定删除/);
      await deleteModal.getByRole("button", { name: /删\s*除/ }).click();
      await expectSuccessMessage(page, "学期已删除");
      await expect(page.locator("tr").filter({ hasText: `${academicYear} 第2学期` })).toHaveCount(0);
      createdTerm = undefined;
    } finally {
      const cleanupToken = adminToken || await requestSessionToken(page, BACKEND_ORIGIN, {
        username: ACCOUNTS.admin.username,
        password: ACCOUNTS.admin.password,
      });
      if (originalActiveTerm) {
        await updateAcademicTermWithToken(page, BACKEND_ORIGIN, cleanupToken, originalActiveTerm.term_id, { is_active: true })
          .catch(() => undefined);
      }
      if (createdTerm) {
        await deleteAcademicTermWithToken(page, BACKEND_ORIGIN, cleanupToken, createdTerm.term_id)
          .catch(() => undefined);
      }
    }
  });
});
