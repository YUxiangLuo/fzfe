import { defineConfig } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE_DIR = __dirname;
const BE_DIR = path.resolve(__dirname, "../be");
const E2E_BACKEND_PORT = Number(process.env.E2E_BACKEND_PORT ?? "54101");
const E2E_BACKEND_ORIGIN = process.env.E2E_BACKEND_ORIGIN ?? `http://127.0.0.1:${E2E_BACKEND_PORT}`;
const E2E_FRONTEND_PORT = Number(process.env.E2E_FRONTEND_PORT ?? "55101");
const E2E_FRONTEND_ORIGIN = process.env.E2E_FRONTEND_ORIGIN ?? `http://127.0.0.1:${E2E_FRONTEND_PORT}`;

export default defineConfig({
  testDir: path.resolve(FE_DIR, "tests/e2e/admin"),
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  expect: {
    timeout: 15_000,
  },
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report/admin" }]],
  outputDir: "test-results/admin",
  globalSetup: path.resolve(FE_DIR, "tests/e2e/setup/global-setup.admin.ts"),
  use: {
    baseURL: E2E_FRONTEND_ORIGIN,
    headless: true,
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "admin-suite-chromium",
      use: {
        browserName: "chromium",
      },
    },
  ],
  webServer: [
    {
      command: "bun run src/e2e-server.ts",
      cwd: BE_DIR,
      port: E2E_BACKEND_PORT,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      env: {
        ...process.env,
        PORT: String(E2E_BACKEND_PORT),
      },
    },
    {
      command: `bun run dev -- --host 127.0.0.1 --port ${E2E_FRONTEND_PORT}`,
      cwd: FE_DIR,
      port: E2E_FRONTEND_PORT,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
      env: {
        ...process.env,
        VITE_API_URL: `${E2E_BACKEND_ORIGIN}/api/v1`,
      },
    },
  ],
});
