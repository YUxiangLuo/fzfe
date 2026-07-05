import { expect, test, type Page } from "@playwright/test";
import {
  expectGuestRedirect,
  loginAsAdminAccount,
  logout,
  openOperationManualAndAssert,
  openTopLevelPage,
  togglePortalMenuAndAssert,
} from "../helpers";

test.describe("@admin @smoke 核心路径", () => {
  test("未登录时后台路由会重定向到登录页", async ({ page }) => {
    await expectGuestRedirect(page, "/admin.html#/user-management");
  });

  test("管理员可以完成登录、主导航和退出", async ({ page }) => {
    await loginAsAdminAccount(page);

    await expect(page).toHaveURL(/\/admin\.html#\/experiment-data$/);
    await expect(page.getByRole("heading", { level: 4, name: "管理员端" })).toBeVisible();
    await openOperationManualAndAssert(page, /\/operation-manuals\/admin\.html$/, "管理员端操作手册");
    await togglePortalMenuAndAssert(page, "admin");

    await openTopLevelPage(page, "实验手册管理", "实验手册管理");
    await expect(page).toHaveURL(/\/admin\.html#\/experiment-manual$/);

    await openTopLevelPage(page, "用户管理", "用户列表");
    await expect(page).toHaveURL(/\/admin\.html#\/user-management$/);

    await openTopLevelPage(page, "班级管理", "班级管理");
    await expect(page).toHaveURL(/\/admin\.html#\/class-management$/);

    await logout(page);
  });
});
