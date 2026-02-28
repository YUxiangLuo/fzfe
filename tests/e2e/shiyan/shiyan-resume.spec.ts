import { expect, test, type Page } from "@playwright/test";
import {
  loginAsStudent,
  completeIntroductionAndStartExperiment,
  expectHashPath,
  clickLastEnabledButton,
  advanceIntroductionToFinalStep,
  logoutFromHeader,
  SHIYAN_INDUSTRY,
  SHIYAN_COMPANY,
} from "./helpers";

async function ensureResumeDialogVisible(page: Page) {
  const resumeDialog = page.getByText("检测到未完成的实验");
  const hasResumeDialog = await resumeDialog
    .isVisible({ timeout: 2_000 })
    .catch(() => false);
  if (!hasResumeDialog) {
    await clickLastEnabledButton(page, "开始实验");
  }
  await expect(resumeDialog).toBeVisible({ timeout: 10_000 });
}

test.describe.serial("@shiyan 实验恢复流程", () => {
  test("创建实验进度并登出", async ({ page }) => {
    test.setTimeout(3 * 60 * 1000);

    await loginAsStudent(page);
    await completeIntroductionAndStartExperiment(page);

    // Complete industry → company to create progress
    await page
      .getByRole("heading", { level: 3, name: SHIYAN_INDUSTRY })
      .click({ force: true });
    await clickLastEnabledButton(page, "下一步");
    await expectHashPath(page, "/company");

    await page
      .getByRole("heading", { level: 3, name: SHIYAN_COMPANY })
      .click({ force: true });
    await clickLastEnabledButton(page, "下一步");
    await expectHashPath(page, "/product");
    await logoutFromHeader(page);
  });

  test("继续未完成实验并验证“回到实验”分支", async ({ page }) => {
    test.setTimeout(3 * 60 * 1000);

    await loginAsStudent(page);
    await advanceIntroductionToFinalStep(page);

    // The resume dialog must appear since we have an existing in-progress experiment.
    const resumeDialog = page.getByText("检测到未完成的实验");
    const hasResumeDialog = await resumeDialog
      .isVisible({ timeout: 2_000 })
      .catch(() => false);

    if (!hasResumeDialog) {
      await clickLastEnabledButton(page, "开始实验");
      const hasResumeDialogAfterClick = await resumeDialog
        .isVisible({ timeout: 2_000 })
        .catch(() => false);

      if (!hasResumeDialogAfterClick) {
        await expectHashPath(page, "/industry");

        await page
          .getByRole("heading", { level: 3, name: SHIYAN_INDUSTRY })
          .click({ force: true });
        await clickLastEnabledButton(page, "下一步");
        await expectHashPath(page, "/company");

        await page
          .getByRole("heading", { level: 3, name: SHIYAN_COMPANY })
          .click({ force: true });
        await clickLastEnabledButton(page, "下一步");
        await expectHashPath(page, "/product");

        await logoutFromHeader(page);
        await loginAsStudent(page);
        await advanceIntroductionToFinalStep(page);
        await clickLastEnabledButton(page, "开始实验");
      }
    }

    await expect(resumeDialog).toBeVisible({ timeout: 10_000 });

    // Verify dialog content
    await expect(page.getByText("当前进度")).toBeVisible();

    // Click "继续未完成的实验"
    await clickLastEnabledButton(page, "继续未完成的实验");

    // Should navigate to the step where we left off (around /product)
    await expect
      .poll(() => {
        const hash = new URL(page.url()).hash;
        return (
          hash.includes("/product") ||
          hash.includes("/company") ||
          hash.includes("/industry")
        );
      })
      .toBeTruthy();

    // 进入介绍页后应出现“回到实验”按钮
    await page.getByRole("link", { name: "实验介绍" }).click();
    await expectHashPath(page, "/introduction");
    await advanceIntroductionToFinalStep(page);
    await expect(page.getByRole("button", { name: "回到实验" })).toBeVisible();

    await clickLastEnabledButton(page, "回到实验");
    await expect
      .poll(() => new URL(page.url()).hash)
      .not.toBe("#/introduction");

    await logoutFromHeader(page);
  });

  test("恢复对话框选择开始新实验", async ({ page }) => {
    test.setTimeout(3 * 60 * 1000);

    await loginAsStudent(page);
    await advanceIntroductionToFinalStep(page);
    await ensureResumeDialogVisible(page);
    await clickLastEnabledButton(page, "开始新的实验");
    await expectHashPath(page, "/industry");

    await logoutFromHeader(page);
  });

  test("恢复对话框支持直接退出系统", async ({ page }) => {
    test.setTimeout(3 * 60 * 1000);

    await loginAsStudent(page);
    await advanceIntroductionToFinalStep(page);
    await ensureResumeDialogVisible(page);
    await clickLastEnabledButton(page, "退出系统");
    await expect(page).toHaveURL(/\/login\.html$/);
  });
});
