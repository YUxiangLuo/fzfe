/**
 * Base Playwright Fixtures
 * 
 * Teacher/Assistant/Admin 角色的基础 fixtures
 */

import { test as base, expect, type Page } from "@playwright/test";
import { ACCOUNTS, CLASSES, STUDENTS } from "../fixtures";

// ===== Types =====

export interface UserContext {
  username: string;
  password: string;
  role: "teacher" | "assistant" | "student" | "admin";
  classId?: number;
}

export interface TestDataContext {
  classId: number;
  students: string[];
  testId: string;
}

// ===== Page Objects =====

export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto("/login.html");
  }

  async selectRole(role: "student" | "teacher" | "assistant" | "admin") {
    const roleNames: Record<string, string> = {
      student: "学生",
      teacher: "教师",
      assistant: "助教",
      admin: "管理员",
    };
    await this.page.getByRole("button", { name: new RegExp(roleNames[role]) }).click();
  }

  async fillCredentials(username: string, password: string) {
    await this.page.locator("#login-username").fill(username);
    await this.page.locator("#login-password").fill(password);
  }

  async submit() {
    await this.page.getByRole("button", { name: /登录系统|登录/ }).click();
  }

  async loginAs(role: "teacher" | "assistant" | "student" | "admin", credentials?: Partial<UserContext>) {
    const account = ACCOUNTS[role];
    await this.goto();
    await this.selectRole(role);
    await this.fillCredentials(
      credentials?.username ?? account.username,
      credentials?.password ?? account.password
    );
    await this.submit();
  }
}

// ===== Test Fixtures =====

interface TestFixtures {
  loginPage: LoginPage;
  teacherPage: Page;
  assistantPage: Page;
  adminPage: Page;
  testData: TestDataContext;
}

export const test = base.extend<TestFixtures>({
  loginPage: async ({ page }, use) => {
    await use(new LoginPage(page));
  },

  teacherPage: async ({ page }, use) => {
    const login = new LoginPage(page);
    await login.loginAs("teacher");
    await expect(page.getByRole("heading", { name: /班级管理|Teacher Portal/, level: 4 })).toBeVisible();
    await use(page);
    await page.evaluate(() => localStorage.clear());
  },

  assistantPage: async ({ page }, use) => {
    const login = new LoginPage(page);
    await login.loginAs("assistant");
    await expect(page.getByText("助教")).toBeVisible();
    await use(page);
    await page.evaluate(() => localStorage.clear());
  },

  adminPage: async ({ page }, use) => {
    const login = new LoginPage(page);
    await login.loginAs("admin");
    await expect(page.getByRole("heading", { name: "实验数据管理", level: 3 })).toBeVisible();
    await use(page);
    await page.evaluate(() => localStorage.clear());
  },

  testData: async ({}, use, testInfo) => {
    const testId = `${testInfo.title}-${Date.now()}`;
    
    const role = testInfo.file.includes("teacher")
      ? "teacher"
      : testInfo.file.includes("assistant")
      ? "assistant"
      : "student";
    
    const classId = role === "teacher" ? CLASSES.teacher.id : CLASSES.assistant.id;
    const students = role === "teacher" 
      ? Object.keys(STUDENTS.teacherClass)
      : Object.keys(STUDENTS.assistantClass);

    await use({ classId, students, testId });
  },
});

export { expect };
