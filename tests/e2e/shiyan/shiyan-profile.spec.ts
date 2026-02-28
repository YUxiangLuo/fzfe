import { expect, test } from "@playwright/test";
import {
  loginAsStudent,
  expectHashPath,
  STUDENT_USERNAME,
} from "./helpers";

test("@shiyan 个人信息页展示与密码修改校验", async ({ page }) => {
  test.setTimeout(2 * 60 * 1000);

  await loginAsStudent(page);

  // Navigate to profile via hash
  await page.goto("/exp.html#/profile");
  await expectHashPath(page, "/profile");

  // ── Verify info display ──────────────────────────────────────────

  await expect(page.getByRole("heading", { name: "个人信息", level: 1 })).toBeVisible();
  await expect(page.getByText(STUDENT_USERNAME, { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "实验进度概览", level: 3 })).toBeVisible();
  await expect(page.getByRole("heading", { name: "修改密码", level: 3 })).toBeVisible();

  // ── Password change: mismatch ────────────────────────────────────

  const currentPwInput = page.locator('input[name="currentPassword"]');
  const newPwInput = page.locator('input[name="newPassword"]');
  const confirmPwInput = page.locator('input[name="confirmPassword"]');
  const submitBtn = page.getByRole("button", { name: /保存新密码/ });

  await currentPwInput.fill("anything");
  await newPwInput.fill("newpass123");
  await confirmPwInput.fill("different123");
  await submitBtn.click();

  await expect(page.getByText("新密码和确认密码不匹配")).toBeVisible();

  // ── Password change: too short ───────────────────────────────────

  await newPwInput.fill("abc");
  await confirmPwInput.fill("abc");
  await submitBtn.click();

  await expect
    .poll(() =>
      newPwInput.evaluate(
        (node) => (node as HTMLInputElement).validity.tooShort,
      ),
    )
    .toBeTruthy();

  // ── Password change: wrong current password ──────────────────────

  await currentPwInput.fill("wrongpassword");
  await newPwInput.fill("validpass123");
  await confirmPwInput.fill("validpass123");
  await submitBtn.click();

  await expect(page.getByText(/当前密码(错误|不正确)/)).toBeVisible();

  // ── Navigate back ────────────────────────────────────────────────

  await page.getByRole("button", { name: /返回实验|进入实验/ }).click();
  // Should leave profile page
  await expect
    .poll(() => new URL(page.url()).hash)
    .not.toBe("#/profile");
});
