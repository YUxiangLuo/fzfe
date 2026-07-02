import { expect, type Page } from "@playwright/test";
import {
  DEFAULT_DATA_WINDOW,
  SHIYAN_COMPANY,
  SHIYAN_INDUSTRY,
  SHIYAN_PRIMARY_PRODUCT,
  STUDENT_PASSWORD,
  STUDENT_USERNAME,
} from "./constants";

const normalizeHashPath = (hashPath: string) => {
  if (!hashPath || hashPath === "/") {
    return "";
  }
  return hashPath.startsWith("/") ? hashPath : `/${hashPath}`;
};

export class StudentApp {
  constructor(
    private readonly page: Page,
    private readonly token: string,
  ) {}

  get currentPage() {
    return this.page;
  }

  async open(hashPath = "/") {
    await this.page.goto("/login.html");
    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await this.page.evaluate((authToken) => {
      localStorage.setItem("studentToken", authToken);
    }, this.token);

    const normalizedPath = normalizeHashPath(hashPath);
    await this.page.goto(normalizedPath ? `/exp.html#${normalizedPath}` : "/exp.html");
    await this.page.waitForLoadState("networkidle");
  }

  async loginViaUi(
    username = STUDENT_USERNAME,
    password = STUDENT_PASSWORD,
  ) {
    await this.page.goto("/login.html");
    await this.page.locator('[data-role="student"]').click();
    await this.page.locator("#login-username").fill(username);
    await this.page.locator("#login-password").fill(password);
    await this.page.getByRole("button", { name: /登录系统|登录/ }).click();
    await expect(this.page).toHaveURL(/\/exp\.html/);
  }

  async expectHash(hashPath: string, timeout = 30_000) {
    const normalized = normalizeHashPath(hashPath);
    await expect
      .poll(
        () => new URL(this.page.url()).hash,
        { timeout },
      )
      .toBe(normalized ? `#${normalized}` : "");
  }

  async gotoHash(hashPath: string) {
    const normalized = normalizeHashPath(hashPath);
    await this.page.goto(`/exp.html#${normalized}`);
    await this.page.waitForLoadState("networkidle");
  }

  async clickEnabledButton(
    name: string | RegExp,
    timeout = 15_000,
  ) {
    const buttons = this.page.getByRole("button", { name });
    await expect
      .poll(
        async () => {
          const count = await buttons.count();
          for (let idx = count - 1; idx >= 0; idx -= 1) {
            const candidate = buttons.nth(idx);
            if (
              (await candidate.isVisible().catch(() => false)) &&
              (await candidate.isEnabled().catch(() => false))
            ) {
              return true;
            }
          }
          return false;
        },
        { timeout },
      )
      .toBeTruthy();

    const count = await buttons.count();
    for (let idx = count - 1; idx >= 0; idx -= 1) {
      const candidate = buttons.nth(idx);
      if (
        (await candidate.isVisible().catch(() => false)) &&
        (await candidate.isEnabled().catch(() => false))
      ) {
        await candidate.click();
        return;
      }
    }

    throw new Error(`未找到可点击按钮: ${String(name)}`);
  }

  async advanceIntroductionToFinalStep() {
    await this.expectHash("/introduction");
    await this.clickEnabledButton("下一步");
    await this.clickEnabledButton("下一步");
  }

  async startNewExperimentFromIntroduction() {
    await this.advanceIntroductionToFinalStep();

    const startButton = this.page.getByRole("button", { name: "开始实验" });
    if (await startButton.isVisible().catch(() => false)) {
      await startButton.click();
    }

    const restartButton = this.page.getByRole("button", {
      name: "开始新的实验",
    });
    if (await restartButton.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await restartButton.click();
    }

    const confirmCompletedRestartButton = this.page.getByRole("button", {
      name: "确认开始新实验",
    });
    if (await confirmCompletedRestartButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await confirmCompletedRestartButton.click();
    }

    await this.expectHash("/industry");
  }

  async continueExperimentFromIntroduction() {
    await this.advanceIntroductionToFinalStep();
    await this.clickEnabledButton("开始实验");
    await expect(this.page.getByText("检测到未完成的实验")).toBeVisible();
    await this.clickEnabledButton("继续未完成的实验");
  }

  async selectIndustry(name = SHIYAN_INDUSTRY) {
    await this.page
      .getByRole("heading", { level: 3, name })
      .click({ force: true });
    await this.clickEnabledButton("下一步");
    await this.expectHash("/company");
  }

  async selectCompany(name = SHIYAN_COMPANY) {
    await this.page
      .getByRole("heading", { level: 3, name })
      .click({ force: true });
    await this.clickEnabledButton("下一步");
    await this.expectHash("/product");
  }

  async selectProduct(name = SHIYAN_PRIMARY_PRODUCT) {
    await this.page
      .getByRole("heading", { level: 3, name })
      .click({ force: true });
    await this.clickEnabledButton("下一步");
    await this.expectHash("/data");
  }

  async completeDefaultSelectionPath() {
    await this.selectIndustry();
    await this.selectCompany();
    await this.selectProduct();
  }

  async configureDefaultDataWindow() {
    const nextButton = this.page.getByRole("button", {
      name: "下一步：需求预测",
    });

    await expect(nextButton).toBeVisible();
    await expect(nextButton).toBeEnabled();
    await nextButton.click();

    await expect
      .poll(() => new URL(this.page.url()).hash, { timeout: 20_000 })
      .toMatch(/^#\/model\/(window|scenario)/);

    if (new URL(this.page.url()).hash === "#/model/scenario") {
      await this.clickEnabledButton(/下一步/);
      await this.expectHash("/model/role-intro");
      await this.clickEnabledButton(/下一步|开始预测工作/);
      await this.expectHash("/model/window");
    }

    const selects = this.page.locator("select");
    await expect(selects).toHaveCount(4);
    await selects.nth(0).selectOption(DEFAULT_DATA_WINDOW.trainStart);
    await selects.nth(1).selectOption(DEFAULT_DATA_WINDOW.trainEnd);
    await selects.nth(2).selectOption(DEFAULT_DATA_WINDOW.evaluateStart);
    await selects.nth(3).selectOption(DEFAULT_DATA_WINDOW.evaluateEnd);
    await this.clickEnabledButton("下一步");
  }

  async logoutFromHeader() {
    const iconLogoutButton = this.page
      .locator("button:has(.lucide-log-out)")
      .first();

    if (await iconLogoutButton.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await iconLogoutButton.click();
    } else {
      await this.clickEnabledButton(/退出登录|退出系统|退出/);
    }

    const confirmButton = this.page.getByRole("button", { name: "退出" });
    if (await confirmButton.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await confirmButton.click();
    }

    await expect(this.page).toHaveURL(/\/login\.html$/);
  }
}
