import { expect, test } from "@playwright/test";
import { clearTokenBeforeNavigation } from "../helpers/auth";
import { installExperimentApiMock } from "../helpers/expApiMock";

test.describe("Experiment Guard", () => {
  test("redirects to login when token is missing", async ({ page }) => {
    await installExperimentApiMock(page);
    await clearTokenBeforeNavigation(page);

    await page.goto("/exp");
    await expect(page).toHaveURL(/\/login\.html$/);
  });
});
