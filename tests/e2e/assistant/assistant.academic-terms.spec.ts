import { expect, test, type Page } from "@playwright/test";
import {
  ACCOUNTS,
  TEST_DATA,
  createAcademicTermWithToken,
  createAssistantManagedTempClass,
  deleteAcademicTermWithToken,
  deleteClassWithTeacherToken,
  getAuthedJson,
  getCurrentUserProfile,
  getGradeOverviewClassCard,
  listAcademicTermsWithToken,
  loginAsAssistantAccount,
  openClassManagementPage,
  openGradeOverviewPage,
  requestSessionToken,
  tableRowByText,
  type AcademicTermRecord,
  type ManagedClassRecord,
} from "../helpers";

const BACKEND_PORT = process.env.E2E_BACKEND_PORT ?? "54103";
const BACKEND_ORIGIN = process.env.E2E_BACKEND_ORIGIN ?? `http://127.0.0.1:${BACKEND_PORT}`;

test.describe("@assistant @academic 跨学期数据隔离", () => {
  test("助教端班级列表和全部班级成绩汇总按学期隔离", async ({ page }) => {
    const adminToken = await requestSessionToken(page, BACKEND_ORIGIN, {
      username: ACCOUNTS.admin.username,
      password: ACCOUNTS.admin.password,
    });
    const assistantToken = await requestSessionToken(page, BACKEND_ORIGIN, {
      username: ACCOUNTS.assistant.username,
      password: ACCOUNTS.assistant.password,
    });
    const assistant = await getCurrentUserProfile(page, BACKEND_ORIGIN, assistantToken);
    const originalActiveTerm = (await listAcademicTermsWithToken(page, BACKEND_ORIGIN, adminToken))
      .find((term) => term.is_active);
    expect(originalActiveTerm).toBeDefined();

    const academicYear = `A-E2E-${Date.now().toString().slice(-8)}`;
    const historicalTerm = await createAcademicTermWithToken(page, BACKEND_ORIGIN, adminToken, {
      academic_year: academicYear,
      semester: 1,
      is_active: false,
    });
    let teacherToken: string | undefined;
    let createdClass: ManagedClassRecord | undefined;

    try {
      const fixture = await createAssistantManagedTempClass(
        page,
        BACKEND_ORIGIN,
        assistant.user_id,
        {
          classPrefix: "跨学期助教班级",
          classCodePrefix: "ATERM",
          termId: historicalTerm.term_id,
        },
      );
      teacherToken = fixture.teacherToken;
      createdClass = fixture.classRecord;

      await loginAsAssistantAccount(page);
      await openClassManagementPage(page);
      await expect(page.locator("tr").filter({ hasText: createdClass.class_name })).toHaveCount(0);

      const historicalClassesResponse = page.waitForResponse((response) =>
        response.request().method() === "GET"
        && response.url().includes(`/api/v1/assistants/${assistant.user_id}/classes`)
        && response.url().includes(`term_id=${historicalTerm.term_id}`),
      );
      await selectTermFilter(page, historicalTerm);
      expect((await historicalClassesResponse).ok()).toBeTruthy();

      await expect(tableRowByText(page, createdClass.class_name)).toBeVisible();
      await expect(page.locator("tr").filter({ hasText: TEST_DATA.defaultClassName })).toHaveCount(0);

      const scopedClasses = await getAuthedJson<ManagedClassRecord[]>(
        page,
        BACKEND_ORIGIN,
        `/api/v1/assistants/${assistant.user_id}/classes?term_id=${historicalTerm.term_id}`,
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
      if (teacherToken && createdClass) {
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
