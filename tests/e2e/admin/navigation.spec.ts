import { expect, test } from "@playwright/test";
import { installAdminApiMock } from "../helpers/adminApiMock";
import { useAdminToken } from "../helpers/auth";

test.describe("Admin Smoke", () => {
  test.beforeEach(async ({ page }) => {
    await installAdminApiMock(page);
    await useAdminToken(page, {
      sub: 1,
      username: "admin_e2e",
      full_name: "系统管理员",
    });
    await page.goto("/admin");
  });

  test("can navigate all core admin views", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "实验数据管理" })).toBeVisible();
    await expect(page.getByText("示例销售数据")).toBeVisible();

    await page.getByRole("menuitem", { name: "实验手册管理" }).click();
    await expect(page.getByRole("heading", { name: "实验手册管理" })).toBeVisible();
    await expect(page.getByText("实验手册-2026春.pdf")).toBeVisible();

    await page.getByRole("menuitem", { name: "用户管理" }).click();
    await expect(page.getByRole("heading", { name: "用户列表" })).toBeVisible();
    await expect(page.getByText("teacher_alpha")).toBeVisible();

    await page.getByRole("menuitem", { name: "班级管理" }).click();
    await expect(page.getByRole("heading", { name: "班级管理" })).toBeVisible();
    await expect(page.getByText("2026 春季一班")).toBeVisible();
  });

  test("can create teacher user and refresh table", async ({ page }) => {
    await page.getByRole("menuitem", { name: "用户管理" }).click();
    await expect(page.getByRole("heading", { name: "用户列表" })).toBeVisible();

    await page.getByRole("button", { name: "添加教师" }).click();

    const modal = page.locator(".ant-modal").filter({ hasText: "添加教师" });
    await expect(modal).toBeVisible();

    await modal.getByLabel("用户名").fill("e2e_teacher_new");
    await modal.getByLabel("姓名").fill("E2E 新教师");
    await modal.getByLabel("邮箱").fill("e2e.teacher.new@example.com");
    await modal.getByLabel("手机号").fill("13911112222");
    await modal.getByLabel("密码").fill("abc12345");

    await modal.locator(".ant-modal-footer .ant-btn-primary").click();

    await expect(page.getByText("教师添加成功")).toBeVisible();
    await expect(page.getByText("e2e_teacher_new")).toBeVisible();
  });
});

