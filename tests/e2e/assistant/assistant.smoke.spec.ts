import { expect, test } from "@playwright/test";
import {
  expectGuestRedirect,
  loginAsAssistantAccount,
  logout,
  openOperationManualAndAssert,
  openTopLevelPage,
  togglePortalMenuAndAssert,
} from "../helpers";

test.describe("@assistant @smoke 核心路径", () => {
  test("未登录时助教端路由会重定向到登录页", async ({ page }) => {
    await expectGuestRedirect(page, "/teacher.html#/assessment-grades");
  });

  test("助教可以完成登录、受限跳转和退出", async ({ page }) => {
    await loginAsAssistantAccount(page);

    await expect(page).toHaveURL(/\/teacher\.html#\/experiment-progress$/);
    await expect(page.getByRole("heading", { level: 4, name: "助教端" })).toBeVisible();
    await openOperationManualAndAssert(page, /\/operation-manuals\/assistant\.html$/, "助教端操作手册");
    await expect(page.getByRole("menuitem", { name: "助教管理" })).toHaveCount(0);
    await togglePortalMenuAndAssert(page, "assistant");

    await page.goto("/teacher.html#/account-assistant");
    await expect(page).toHaveURL(/\/teacher\.html#\/account-personal$/);
    await expect(page.getByRole("heading", { level: 3, name: "个人信息管理" })).toBeVisible();

    await openTopLevelPage(page, "班级管理", "班级管理");
    await expect(page).toHaveURL(/\/teacher\.html#\/class-management$/);

    await logout(page);
  });
});
