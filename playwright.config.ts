import { defineConfig, devices } from "@playwright/test";

const host = process.env.E2E_HOST || "127.0.0.1";
const port = process.env.E2E_PORT || "3000";
const baseURL = process.env.E2E_BASE_URL || `http://${host}:${port}`;
const reuseExistingServer = process.env.CI ? false : true;
const skipWebServer = process.env.E2E_SKIP_WEBSERVER === "1";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: skipWebServer
    ? undefined
    : {
        command: `npm run dev -- --host ${host} --port ${port}`,
        url: `${baseURL}/login.html`,
        reuseExistingServer,
        timeout: 120 * 1000,
      },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
