/**
 * Shiyan Playwright Fixtures
 * 
 * 增强版 fixtures，包含：
 * - 自动登录和状态恢复
 * - 实验进度管理
 * - 错误恢复机制
 */

import { test as base, expect, type Page, type BrowserContext } from "@playwright/test";
import { ACCOUNTS, SHIYAN } from "../fixtures";

// ===== Types =====

export interface ShiyanContext {
  /** 学生用户名 */
  username: string;
  /** 数据集信息 */
  dataset: typeof SHIYAN.dataset;
  /** 是否需要新实验（否则继续已有进度） */
  forceNewExperiment: boolean;
}

export interface ExperimentState {
  currentStep: number;
  industry?: string;
  company?: string;
  product?: string;
}

// ===== Page Objects =====

export class ShiyanLoginPage {
  constructor(protected _page: Page) {}

  get page() {
    return this._page;
  }

  async goto() {
    await this._page.goto("/login.html", { timeout: 60_000 });
  }

  async selectStudentRole() {
    await this._page.locator('[data-role="student"]').click();
  }

  async fillCredentials(username: string, password: string) {
    await this._page.locator("#login-username").fill(username);
    await this._page.locator("#login-password").fill(password);
  }

  async submit() {
    await this._page.getByRole("button", { name: /登录系统|登录/ }).click();
  }

  async login(username = SHIYAN.student.username, password = "StudentE2E!234") {
    await this.goto();
    await this.selectStudentRole();
    await this.fillCredentials(username, password);
    await this.submit();
    // 等待跳转到实验页面
    await this._page.waitForURL(/\/exp\.html/, { timeout: 30_000 });
  }
}

export class ShiyanExperimentPage {
  constructor(protected _page: Page) {}

  get page() {
    return this._page;
  }

  /**
   * 处理实验介绍页，选择开始新实验或继续
   */
  async handleIntroduction(options: { forceNew?: boolean } = {}) {
    // 等待页面加载
    await this._page.waitForLoadState("networkidle");
    
    // 检查是否有历史进度弹窗
    const resumeModal = this._page.locator('[role="dialog"]').filter({ hasText: /继续|恢复/ });
    const hasResumeModal = await resumeModal.isVisible({ timeout: 5_000 }).catch(() => false);
    
    if (hasResumeModal) {
      if (options.forceNew) {
        // 点击"开始新的实验"
        await resumeModal.getByRole("button", { name: /开始新的实验|重新开始/ }).click();
      } else {
        // 点击"继续实验"
        await resumeModal.getByRole("button", { name: /继续实验|回到实验/ }).click();
      }
    }
    
    // 等待介绍页或跳转到行业选择页
    await this._page.waitForURL(/\/(introduction|industry)/, { timeout: 30_000 });
  }

  /**
   * 完成介绍页并进入实验
   */
  async startExperiment() {
    // 如果是介绍页，点击下一步
    if (this._page.url().includes("/introduction")) {
      await this._page.getByRole("button", { name: /下一步|开始/ }).click();
      await this._page.getByRole("button", { name: /下一步|开始/ }).click();
      
      // 点击开始实验
      const startBtn = this._page.getByRole("button", { name: /开始实验|进入实验/ });
      if (await startBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await startBtn.click();
      }
    }
    
    // 等待跳转到行业选择
    await this._page.waitForURL(/\/industry/, { timeout: 30_000 });
  }

  /**
   * 检查页面是否健康（用于错误恢复）
   */
  async isHealthy(): Promise<boolean> {
    try {
      // 检查页面是否可以访问
      await this._page.evaluate(() => document.readyState);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 刷新页面并恢复状态
   */
  async refreshAndRecover() {
    await this._page.reload({ timeout: 30_000 });
    await this._page.waitForLoadState("networkidle");
    
    // 如果需要重新登录
    if (this._page.url().includes("/login")) {
      const login = new ShiyanLoginPage(this._page);
      await login.login();
    }
  }
}

// ===== Test Fixtures =====

interface ShiyanFixtures {
  /** 登录页面 */
  shiyanLoginPage: ShiyanLoginPage;
  
  /** 实验页面对象 */
  experimentPage: ShiyanExperimentPage;
  
  /** 已登录的学生页面（带自动恢复） */
  studentPage: Page;
  
  /** Shiyan 数据上下文 */
  shiyanContext: ShiyanContext;
  
  /** 浏览器上下文（用于清理） */
  context: BrowserContext;
}

export const test = base.extend<ShiyanFixtures>({
  // 使用默认的 context fixture
  context: async ({ browser }, use) => {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    await use(context);
    await context.close();
  },

  // 从 context 创建 page
  page: async ({ context }, use) => {
    const page = await context.newPage();
    await use(page);
    await page.close();
  },

  // Login Page（未登录）
  shiyanLoginPage: async ({ page }, use) => {
    await use(new ShiyanLoginPage(page));
  },

  // Experiment Page
  experimentPage: async ({ page }, use) => {
    await use(new ShiyanExperimentPage(page));
  },

  // Student Page（自动登录）
  studentPage: async ({ page }, use) => {
    const login = new ShiyanLoginPage(page);
    await login.login();
    
    // 验证登录成功
    await expect(page).toHaveURL(/\/exp\.html/, { timeout: 30_000 });
    
    // 使用 page 进行测试
    await use(page);
    
    // 测试结束后清理
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  },

  // Shiyan 上下文
  shiyanContext: async ({}, use) => {
    await use({
      username: SHIYAN.student.username,  // 使用 Shiyan 专用学生账号
      dataset: SHIYAN.dataset,
      forceNewExperiment: false,
    });
  },
});

export { expect };

// 注意：beforeEach/afterEach 不能在 fixtures 文件中定义
// 请在测试文件中使用 test.beforeEach() / test.afterEach()
