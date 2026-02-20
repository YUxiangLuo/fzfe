import { expect, test } from "@playwright/test";
import { clearTokenBeforeNavigation, createFakeJwt, setTokenBeforeNavigation } from "../helpers/auth";
import { installTeacherApiMock } from "../helpers/teacherApiMock";

test.describe("Teacher Guard", () => {
  test("redirects to login when token is missing", async ({ page }) => {
    await clearTokenBeforeNavigation(page);
    await page.goto("/teacher");
    await expect(page).toHaveURL(/\/login\.html$/);
  });

  test("redirects to login when role is not teacher/assistant", async ({ page }) => {
    const adminToken = createFakeJwt({
      sub: 1,
      username: "admin_forbidden",
      role: "Admin",
    });
    await setTokenBeforeNavigation(page, adminToken);
    await page.goto("/teacher");
    await expect(page).toHaveURL(/\/login\.html$/);
  });

  test("assistant cannot access assistant-management route directly", async ({ page }) => {
    await installTeacherApiMock(page);
    const assistantToken = createFakeJwt({
      sub: 3,
      username: "assistant_beta",
      full_name: "王助教",
      role: "Assistant",
    });
    await setTokenBeforeNavigation(page, assistantToken);

    await page.goto("/teacher#/account-assistant");
    await expect(page).toHaveURL(/\/teacher#\/account-personal$/);
    await expect(page.getByRole("heading", { name: "个人信息管理" })).toBeVisible();
  });
});
