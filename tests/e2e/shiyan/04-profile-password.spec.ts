import path from "node:path";
import { fileURLToPath } from "node:url";
import { test, expect } from "./fixtures";
import { resetUserPassword } from "../setup/setup-utils";
import { STUDENT_PASSWORD, STUDENT_USERNAME } from "./support/constants";
import { loginStudentViaApi } from "./support/backend";

const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const BE_DIR = path.resolve(CURRENT_DIR, "../../../../be");

test("@shiyan profile page shows real user info and supports password rotation", async ({
  studentApp,
}) => {
  const temporaryPassword = `StudentE2E!${Date.now().toString().slice(-6)}`;

  try {
    await studentApp.open("/profile");
    await studentApp.expectHash("/profile");

    await expect(
      studentApp.currentPage.getByRole("heading", { name: "个人信息", level: 1 }),
    ).toBeVisible();
    await expect(studentApp.currentPage.getByText(STUDENT_USERNAME, { exact: true })).toBeVisible();
    await expect(
      studentApp.currentPage.getByRole("heading", { name: "实验进度概览", level: 3 }),
    ).toBeVisible();
    await expect(
      studentApp.currentPage.getByRole("heading", { name: "修改密码", level: 3 }),
    ).toBeVisible();

    const currentPwInput = studentApp.currentPage.locator('input[name="currentPassword"]');
    const newPwInput = studentApp.currentPage.locator('input[name="newPassword"]');
    const confirmPwInput = studentApp.currentPage.locator('input[name="confirmPassword"]');
    const submitBtn = studentApp.currentPage.getByRole("button", { name: /保存新密码/ });

    await currentPwInput.fill("anything");
    await newPwInput.fill("newpass123");
    await confirmPwInput.fill("different123");
    await submitBtn.click();
    await expect(studentApp.currentPage.getByText("新密码和确认密码不匹配")).toBeVisible();

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

    await currentPwInput.fill("wrongpassword");
    await newPwInput.fill("validpass123");
    await confirmPwInput.fill("validpass123");
    await submitBtn.click();
    await expect(
      studentApp.currentPage.getByText(/当前密码(错误|不正确)/),
    ).toBeVisible();

    await currentPwInput.fill(STUDENT_PASSWORD);
    await newPwInput.fill(temporaryPassword);
    await confirmPwInput.fill(temporaryPassword);
    await submitBtn.click();

    await expect(studentApp.currentPage.getByText("密码修改成功")).toBeVisible();
    const newToken = await loginStudentViaApi(STUDENT_USERNAME, temporaryPassword);
    expect(typeof newToken).toBe("string");
  } finally {
    await resetUserPassword(BE_DIR, STUDENT_USERNAME, STUDENT_PASSWORD);
  }
});
