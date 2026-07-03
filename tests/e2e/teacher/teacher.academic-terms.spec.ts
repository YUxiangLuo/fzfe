import { expect, test, type Page } from "@playwright/test";
import {
  ACCOUNTS,
  TEST_DATA,
  createAcademicTermWithToken,
  createClassWithTeacherToken,
  deleteAcademicTermWithToken,
  deleteClassWithTeacherToken,
  getAuthedJson,
  getCurrentUserProfile,
  getGradeOverviewClassCard,
  listAcademicTermsWithToken,
  loginAsTeacherAccount,
  openClassManagementPage,
  openGradeOverviewPage,
  requestSessionToken,
  tableRowByText,
  type AcademicTermRecord,
  type ManagedClassRecord,
} from "../helpers";

const BACKEND_PORT = process.env.E2E_BACKEND_PORT ?? "54102";
const BACKEND_ORIGIN = process.env.E2E_BACKEND_ORIGIN ?? `http://127.0.0.1:${BACKEND_PORT}`;

test.describe("@teacher @academic 跨学期数据隔离", () => {
  test("教师端班级列表和全部班级成绩汇总随学期切换刷新", async ({ page }) => {
    const adminToken = await requestSessionToken(page, BACKEND_ORIGIN, {
      username: ACCOUNTS.admin.username,
      password: ACCOUNTS.admin.password,
    });
    const teacherToken = await requestSessionToken(page, BACKEND_ORIGIN, {
      username: ACCOUNTS.teacher.username,
      password: ACCOUNTS.teacher.password,
    });
    const originalActiveTerm = (await listAcademicTermsWithToken(page, BACKEND_ORIGIN, adminToken))
      .find((term) => term.is_active);
    expect(originalActiveTerm).toBeDefined();

    const academicYear = `T-E2E-${Date.now().toString().slice(-8)}`;
    const historicalTerm = await createAcademicTermWithToken(page, BACKEND_ORIGIN, adminToken, {
      academic_year: academicYear,
      semester: 1,
      is_active: false,
    });
    let createdClass: ManagedClassRecord | undefined;

    try {
      createdClass = await createClassWithTeacherToken(
        page,
        BACKEND_ORIGIN,
        teacherToken,
        `跨学期教师班级-${Date.now().toString().slice(-6)}`,
        `TTERM${Date.now().toString().slice(-6)}`,
        undefined,
        historicalTerm.term_id,
      );

      await loginAsTeacherAccount(page);
      const teacher = await getCurrentUserProfile(page, BACKEND_ORIGIN);

      await openClassManagementPage(page);
      await expect(page.locator("tr").filter({ hasText: createdClass.class_name })).toHaveCount(0);

      const historicalClassesResponse = page.waitForResponse((response) =>
        response.request().method() === "GET"
        && response.url().includes(`/api/v1/teachers/${teacher.user_id}/classes`)
        && response.url().includes(`term_id=${historicalTerm.term_id}`),
      );
      await selectTermFilter(page, historicalTerm);
      expect((await historicalClassesResponse).ok()).toBeTruthy();

      await expect(tableRowByText(page, createdClass.class_name)).toBeVisible();
      await expect(page.locator("tr").filter({ hasText: TEST_DATA.teacherClassName })).toHaveCount(0);

      const scopedClasses = await getAuthedJson<ManagedClassRecord[]>(
        page,
        BACKEND_ORIGIN,
        `/api/v1/teachers/${teacher.user_id}/classes?term_id=${historicalTerm.term_id}`,
      );
      expect(scopedClasses.some((classInfo) => classInfo.class_id === createdClass!.class_id)).toBe(true);
      expect(scopedClasses.every((classInfo) => classInfo.term_id === historicalTerm.term_id)).toBe(true);

      await openGradeOverviewPage(page);
      await selectGradeOverviewTerm(page, historicalTerm);
      await expect(getGradeOverviewClassCard(page, createdClass.class_name)).toBeVisible();

      await selectGradeOverviewTerm(page, originalActiveTerm!);
      await expect(getGradeOverviewClassCard(page, createdClass.class_name)).toHaveCount(0);

      await selectGradeOverviewTerm(page, historicalTerm);
      await expect(getGradeOverviewClassCard(page, createdClass.class_name)).toBeVisible();
    } finally {
      if (createdClass) {
        await deleteClassWithTeacherToken(page, BACKEND_ORIGIN, teacherToken, createdClass.class_id)
          .catch(() => undefined);
      }
      await deleteAcademicTermWithToken(page, BACKEND_ORIGIN, adminToken, historicalTerm.term_id)
        .catch(() => undefined);
    }
  });
});

async function selectGradeOverviewTerm(page: Page, term: AcademicTermRecord) {
  const responsePromise = page.waitForResponse((response) =>
    response.request().method() === "GET"
    && response.url().includes("/grade-summaries")
    && response.url().includes(`term_id=${term.term_id}`),
  );
  await selectTermFilter(page, term);
  expect((await responsePromise).ok()).toBeTruthy();
}

function getTermOptionLabel(term: AcademicTermRecord) {
  return term.is_active ? `${term.term_label}（当前）` : term.term_label;
}

async function selectTermFilter(page: Page, term: AcademicTermRecord) {
  await page.locator(".ant-select").first().click();
  const option = page.getByText(getTermOptionLabel(term), { exact: true }).last();
  await expect(option).toBeVisible();
  await option.click();
}
