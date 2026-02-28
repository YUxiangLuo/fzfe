import { expect, test } from "@playwright/test";
import {
  loginAsStudent,
  completeIntroductionAndStartExperiment,
  expectHashPath,
  clickLastEnabledButton,
  SHIYAN_INDUSTRY,
  SHIYAN_COMPANY,
  SHIYAN_PRIMARY_PRODUCT,
  SHIYAN_SECONDARY_PRODUCT,
} from "./helpers";

test("@shiyan 选择变更确认与级联重置（产品变更）", async ({ page }) => {
  test.setTimeout(5 * 60 * 1000);

  await loginAsStudent(page);
  await completeIntroductionAndStartExperiment(page);

  // ── Complete through industry → company → product → data ──────────

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

  // ── Navigate back to product via sidebar ──────────────────────────

  const sidebar = page.locator("aside, nav").first();
  const productLink = sidebar.getByRole("link", { name: /选择产品/ });
  await expect(productLink).toBeVisible();
  await productLink.click();
  await expectHashPath(page, "/product");

  // ── Select a different product ────────────────────────────────────

  await page
    .getByRole("heading", { level: 3, name: SHIYAN_SECONDARY_PRODUCT })
    .click({ force: true });

  // ── Click "下一步" → confirmation dialog should appear ─────────────

  await clickLastEnabledButton(page, "下一步");

  await expect(page.getByText("确认更改产品")).toBeVisible({ timeout: 5_000 });
  await expect(
    page.getByText("更改产品将重置您在后续步骤中所有的选择和进度"),
  ).toBeVisible();

  // ── Cancel → should stay on product page ──────────────────────────

  await page.getByRole("button", { name: "取消" }).click();
  await expectHashPath(page, "/product");

  // ── Try again with confirm → cascade reset ────────────────────────

  await clickLastEnabledButton(page, "下一步");
  await expect(page.getByText("确认更改产品")).toBeVisible({ timeout: 5_000 });
  await page.getByRole("button", { name: "确认更改" }).click();

  // Should navigate to /data after confirming product change
  await expectHashPath(page, "/data");

  // ── Navigate back to product and verify the new selection stuck ────

  await productLink.click();
  await expectHashPath(page, "/product");

  // The secondary product card should now have the selected/active state
  const secondaryHeading = page.getByRole("heading", {
    level: 3,
    name: SHIYAN_SECONDARY_PRODUCT,
  });
  const secondaryCard = page
    .locator("div.cursor-pointer")
    .filter({ has: secondaryHeading })
    .first();
  await expect(secondaryCard).toBeVisible();
  await expect(secondaryCard).toHaveClass(/border-blue-500/);
  await expect(secondaryCard.locator(".lucide-arrow-right")).toBeVisible();
});
