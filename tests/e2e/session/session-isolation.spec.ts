import { expect, test, type Page } from "@playwright/test";
import { ACCOUNTS, LoginSelectors } from "../helpers";

// ===== Helpers =====

async function loginAsStudent(page: Page): Promise<void> {
  await page.goto("/login.html");
  // student is the default selected role, so no need to click a tab
  await page.locator(LoginSelectors.usernameInput).fill(ACCOUNTS.student.username);
  await page.locator(LoginSelectors.passwordInput).fill(ACCOUNTS.student.password);
  await page.getByRole(LoginSelectors.loginBtn.role, { name: LoginSelectors.loginBtn.name }).click();
  await expect(page).toHaveURL(/\/exp\.html/);
}

async function loginAsTeacher(page: Page): Promise<void> {
  await page.goto("/login.html");
  await page.getByRole(LoginSelectors.teacherTab.role, { name: LoginSelectors.teacherTab.name }).click();
  await page.locator(LoginSelectors.usernameInput).fill(ACCOUNTS.teacher.username);
  await page.locator(LoginSelectors.passwordInput).fill(ACCOUNTS.teacher.password);
  await page.getByRole(LoginSelectors.loginBtn.role, { name: LoginSelectors.loginBtn.name }).click();
  await expect(page).toHaveURL(/\/teacher\.html/);
}

async function getPortalTokens(page: Page) {
  return page.evaluate(() => ({
    studentToken: localStorage.getItem("studentToken"),
    teacherToken: localStorage.getItem("teacherToken"),
    legacyToken: localStorage.getItem("token"),
    teacherUserRole: localStorage.getItem("teacherUserRole"),
  }));
}

// ===== Tests =====

test.describe("@session 会话门户隔离", () => {
  test.afterEach(async ({ page }) => {
    await page.evaluate(() => localStorage.clear());
  });

  test("学生登录后 token 存储在 studentToken 而非旧 key", async ({ page }) => {
    await loginAsStudent(page);

    const tokens = await getPortalTokens(page);
    expect(tokens.studentToken).toBeTruthy();
    expect(tokens.legacyToken).toBeNull();
  });

  test("教师登录后 token 存储在 teacherToken 并记录角色", async ({ page }) => {
    await loginAsTeacher(page);

    const tokens = await getPortalTokens(page);
    expect(tokens.teacherToken).toBeTruthy();
    expect(tokens.teacherUserRole).toBe("teacher");
    expect(tokens.legacyToken).toBeNull();
  });

  test("同一浏览器先后登录学生和教师，两个 token 共存互不覆盖", async ({ page }) => {
    await loginAsStudent(page);
    const afterStudent = await getPortalTokens(page);
    const studentToken = afterStudent.studentToken;
    expect(studentToken).toBeTruthy();

    await loginAsTeacher(page);
    const afterTeacher = await getPortalTokens(page);
    expect(afterTeacher.teacherToken).toBeTruthy();
    // student token should survive teacher login
    expect(afterTeacher.studentToken).toBe(studentToken);
    // the two portals must use different tokens
    expect(afterTeacher.studentToken).not.toBe(afterTeacher.teacherToken);
  });

  test("教师登录后再登录学生，教师 session 不受影响", async ({ page }) => {
    await loginAsTeacher(page);
    const teacherToken = (await getPortalTokens(page)).teacherToken;
    expect(teacherToken).toBeTruthy();

    await loginAsStudent(page);

    // teacher token must still exist
    const afterStudent = await getPortalTokens(page);
    expect(afterStudent.teacherToken).toBe(teacherToken);

    // navigate to teacher portal — should NOT redirect to login
    await page.goto("/teacher.html");
    await expect(page).not.toHaveURL(/\/login\.html/);
    await expect(page).toHaveURL(/\/teacher\.html/);
  });

  test("学生登录后再登录教师，学生 session 不受影响", async ({ page }) => {
    await loginAsStudent(page);
    const studentToken = (await getPortalTokens(page)).studentToken;
    expect(studentToken).toBeTruthy();

    await loginAsTeacher(page);

    // student token must still exist
    const afterTeacher = await getPortalTokens(page);
    expect(afterTeacher.studentToken).toBe(studentToken);

    // navigate to student portal — should NOT redirect to login
    await page.goto("/exp.html");
    await expect(page).not.toHaveURL(/\/login\.html/);
    await expect(page).toHaveURL(/\/exp\.html/);
  });

  test("教师门户退出登录不影响学生 session", async ({ page }) => {
    // login both portals
    await loginAsStudent(page);
    const studentToken = (await getPortalTokens(page)).studentToken;
    await loginAsTeacher(page);

    // logout from teacher portal
    await page.goto("/teacher.html");
    await expect(page).toHaveURL(/\/teacher\.html/);
    await page.locator("header .ant-avatar").first().click();
    await page.getByRole("menuitem", { name: "退出登录" }).click();
    // confirm the logout modal
    const logoutModal = page.locator(".ant-modal").filter({
      has: page.getByText("确认退出"),
    });
    await logoutModal.getByRole("button", { name: /退\s*出/ }).click();
    await expect(page).toHaveURL(/\/login\.html/);

    // teacher token should be cleared
    const afterLogout = await getPortalTokens(page);
    expect(afterLogout.teacherToken).toBeNull();
    // student token must survive
    expect(afterLogout.studentToken).toBe(studentToken);

    // student portal should still work
    await page.goto("/exp.html");
    await expect(page).not.toHaveURL(/\/login\.html/);
    await expect(page).toHaveURL(/\/exp\.html/);
  });

  test("旧版 token (legacy) 中的教师 token 不会泄露到学生门户", async ({ page }) => {
    // simulate a legacy teacher token stored under the old key
    await page.goto("/login.html");
    await loginAsTeacher(page);
    const teacherToken = (await getPortalTokens(page)).teacherToken;
    expect(teacherToken).toBeTruthy();

    // move teacher token to legacy key and clear portal-specific keys
    await page.evaluate((token) => {
      localStorage.clear();
      localStorage.setItem("token", token!);
      localStorage.setItem("userRole", "teacher");
    }, teacherToken);

    // navigate to student portal — legacy teacher token must NOT be used
    await page.goto("/exp.html");
    await expect(page).toHaveURL(/\/login\.html/);
  });
});
