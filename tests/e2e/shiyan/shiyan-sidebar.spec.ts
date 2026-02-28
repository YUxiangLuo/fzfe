import { expect, test } from "@playwright/test";
import {
  loginAsStudent,
  completeIntroductionAndStartExperiment,
  expectHashPath,
  clickLastEnabledButton,
  SHIYAN_INDUSTRY,
  SHIYAN_COMPANY,
  SHIYAN_PRIMARY_PRODUCT,
} from "./helpers";

test("@shiyan 侧边栏导航（前进后退 + 锁定验证）", async ({ page }) => {
  test.setTimeout(5 * 60 * 1000);

  await loginAsStudent(page);
  await completeIntroductionAndStartExperiment(page);

  // ── Complete 3 steps: industry → company → product ────────────────

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

  await page
    .getByRole("heading", { level: 3, name: SHIYAN_PRIMARY_PRODUCT })
    .click({ force: true });
  await clickLastEnabledButton(page, "下一步");
  await expectHashPath(page, "/data");

  // ── Sidebar: navigate backwards to industry ───────────────────────

  const sidebar = page.locator("aside, nav").first();
  const industryLink = sidebar.getByRole("link", { name: /选择行业/ });
  await expect(industryLink).toBeVisible();
  await industryLink.click();
  await expectHashPath(page, "/industry");

  // ── Sidebar: navigate forward to product ──────────────────────────

  const productLink = sidebar.getByRole("link", { name: /选择产品/ });
  await expect(productLink).toBeVisible();
  await productLink.click();
  await expectHashPath(page, "/product");

  // ── Sidebar: navigate to data ─────────────────────────────────────

  const dataLink = sidebar.getByRole("link", { name: /历史数据/ });
  await expect(dataLink).toBeVisible();
  await dataLink.click();
  await expectHashPath(page, "/data");

  // ── Sidebar: verify locked steps are not links ────────────────────

  // "需求预测" (step 5) should be locked — no <a> tag
  const modelItem = sidebar.getByText("需求预测");
  await expect(modelItem).toBeVisible();
  // Verify this is NOT a link (locked items are rendered without <Link>)
  const modelLink = sidebar.getByRole("link", { name: /需求预测/ });
  await expect(modelLink).toHaveCount(0);

  // "结果评估" and "生产计划" also locked
  const evalLink = sidebar.getByRole("link", { name: /结果评估/ });
  await expect(evalLink).toHaveCount(0);

  const prodLink = sidebar.getByRole("link", { name: /生产计划/ });
  await expect(prodLink).toHaveCount(0);
});
