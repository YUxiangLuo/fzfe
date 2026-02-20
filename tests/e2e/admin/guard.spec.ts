import { expect, test } from "@playwright/test";
import { clearTokenBeforeNavigation, createFakeJwt, setTokenBeforeNavigation } from "../helpers/auth";

test.describe("Admin Guard", () => {
  test("redirects to login when token is missing", async ({ page }) => {
    await clearTokenBeforeNavigation(page);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login\.html$/);
  });

  test("redirects to login when role is not admin", async ({ page }) => {
    const teacherToken = createFakeJwt({
      sub: 3001,
      username: "teacher_forbidden",
      role: "Teacher",
    });
    await setTokenBeforeNavigation(page, teacherToken);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login\.html$/);
  });
});

