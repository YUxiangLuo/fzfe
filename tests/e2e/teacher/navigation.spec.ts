import { expect, test } from "@playwright/test";
import { installTeacherApiMock } from "../helpers/teacherApiMock";
import { createFakeJwt, setTokenBeforeNavigation } from "../helpers/auth";
import { writeTempCsv } from "../helpers/csvFile";

test.describe("Teacher Smoke", () => {
  test.beforeEach(async ({ page }) => {
    await installTeacherApiMock(page);
    const teacherToken = createFakeJwt({
      sub: 2,
      username: "teacher_e2e",
      full_name: "李老师",
      role: "Teacher",
    });
    await setTokenBeforeNavigation(page, teacherToken);
    await page.goto("/teacher");
  });

  test("can navigate all core teacher views", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "实验进度" })).toBeVisible();
    await expect(page.getByText("20260001")).toBeVisible();

    await page.getByRole("menuitem", { name: "实验报告" }).click();
    await expect(page.getByRole("heading", { name: "实验报告" })).toBeVisible();
    await expect(page.getByText("张三")).toBeVisible();

    await page.getByRole("menuitem", { name: "实验日志" }).click();
    await expect(page.getByRole("heading", { name: "实验日志" })).toBeVisible();
    await expect(page.getByText("华东工厂")).toBeVisible();

    await page.getByRole("menuitem", { name: "班级管理" }).click();
    await expect(page.getByRole("heading", { name: "班级管理" })).toBeVisible();
    await expect(page.getByText("2026 春季一班")).toBeVisible();

    await page.getByRole("menuitem", { name: "学生管理" }).click();
    await expect(page.getByRole("heading", { name: "学生管理" })).toBeVisible();
    await expect(page.getByText("20260001")).toBeVisible();

    await page.getByRole("menuitem", { name: "考核管理" }).click();
    await page.getByRole("menuitem", { name: "题库管理" }).click();
    await expect(page.getByRole("heading", { name: "题库管理" })).toBeVisible();
    await expect(page.getByText("E2E 示例题目")).toBeVisible();

    await page.getByRole("menuitem", { name: "账户设置" }).click();
    await page.getByRole("menuitem", { name: "个人信息" }).click();
    await expect(page.getByRole("heading", { name: "个人信息管理" })).toBeVisible();
    await expect(page.getByText("李老师")).toBeVisible();

    await page.getByRole("menuitem", { name: "助教管理" }).click();
    await expect(page.getByRole("heading", { name: "助教管理" })).toBeVisible();
    await expect(page.getByText("王助教")).toBeVisible();
  });

  test("can create class with csv students file and refresh class table", async ({ page }, testInfo) => {
    await page.getByRole("menuitem", { name: "班级管理" }).click();
    await expect(page.getByRole("heading", { name: "班级管理" })).toBeVisible();

    const csvPath = await writeTempCsv(
      testInfo,
      "teacher-class-students.csv",
      [
        "学号,姓名,邮箱",
        "20269901,测试学生甲,student.a@example.com",
        "20269902,测试学生乙,student.b@example.com",
      ].join("\n"),
    );

    await page.getByRole("button", { name: "新增班级" }).click();

    const createModal = page.locator(".ant-modal").filter({ hasText: "新增班级" });
    await expect(createModal).toBeVisible();

    await createModal.getByLabel("班级名称").fill("E2E 自动化班级");
    await createModal.getByLabel("班级编号").fill("CLS-E2E-001");
    await createModal.locator('input[type="file"]').setInputFiles(csvPath);
    await createModal.locator(".ant-modal-footer .ant-btn-primary").click();

    const resultModal = page.locator(".ant-modal").filter({ hasText: "创建结果" });
    await expect(resultModal).toBeVisible();
    await expect(resultModal.getByText("班级创建成功")).toBeVisible();
    await expect(resultModal).toContainText("新建学生数：");
    await expect(resultModal).toContainText("注册学生数：");

    await resultModal.getByRole("button", { name: "确定" }).click();
    await expect(page.getByText("E2E 自动化班级")).toBeVisible();

    const newClassRow = page.locator("tr").filter({ hasText: "E2E 自动化班级" });
    await newClassRow.getByRole("button", { name: "学生列表" }).click();
    const studentsModal = page.locator(".ant-modal").filter({ hasText: "学生列表 - E2E 自动化班级" });
    await expect(studentsModal).toBeVisible();
    await expect(studentsModal).toContainText("20269901");
    await expect(studentsModal).toContainText("测试学生甲");
  });
});
