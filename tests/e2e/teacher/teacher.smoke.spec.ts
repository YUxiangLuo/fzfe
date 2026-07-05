import { expect, test } from "@playwright/test";
import {
  expectGuestRedirect,
  loginAsTeacherAccount,
  logout,
  openOperationManualAndAssert,
  openSubMenuPage,
  openTopLevelPage,
  togglePortalMenuAndAssert,
} from "../helpers";

test.describe("@teacher @smoke 核心路径", () => {
  test("未登录时教师端路由会重定向到登录页", async ({ page }) => {
    await expectGuestRedirect(page, "/teacher.html#/student-management");
  });

  test("教师可以完成登录、主导航、教师专属页面和退出", async ({ page }) => {
    await loginAsTeacherAccount(page);

    await expect(page).toHaveURL(/\/teacher\.html#\/experiment-progress$/);
    await expect(page.getByRole("heading", { level: 4, name: "教师端" })).toBeVisible();
    await openOperationManualAndAssert(page, /\/operation-manuals\/teacher\.html$/, "教师端操作手册");
    await togglePortalMenuAndAssert(page, "teacher");

    await openTopLevelPage(page, "班级管理", "班级管理");
    await expect(page).toHaveURL(/\/teacher\.html#\/class-management$/);

    await openSubMenuPage(page, "账户设置", "助教管理", "助教管理");
    await expect(page).toHaveURL(/\/teacher\.html#\/account-assistant$/);

    await logout(page);
  });
});
