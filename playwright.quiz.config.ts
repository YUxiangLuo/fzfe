import { defineConfig } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE_DIR = __dirname;
const BE_DIR = path.resolve(__dirname, "../fangzhen-be");
const E2E_BACKEND_PORT = Number(process.env.E2E_BACKEND_PORT ?? "54126");
const E2E_BACKEND_ORIGIN = process.env.E2E_BACKEND_ORIGIN ?? `http://127.0.0.1:${E2E_BACKEND_PORT}`;
const E2E_FRONTEND_PORT = Number(process.env.E2E_FRONTEND_PORT ?? "55126");
const E2E_FRONTEND_ORIGIN = process.env.E2E_FRONTEND_ORIGIN ?? `http://127.0.0.1:${E2E_FRONTEND_PORT}`;

process.env.E2E_BACKEND_PORT ??= String(E2E_BACKEND_PORT);
process.env.E2E_BACKEND_ORIGIN ??= E2E_BACKEND_ORIGIN;
process.env.E2E_FRONTEND_PORT ??= String(E2E_FRONTEND_PORT);
process.env.E2E_FRONTEND_ORIGIN ??= E2E_FRONTEND_ORIGIN;

export default defineConfig({
  testDir: path.resolve(FE_DIR, "tests/e2e/quiz"),
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 120_000,
  expect: {
    timeout: 20_000,
  },
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report/quiz" }]],
  outputDir: "test-results/quiz",
  globalSetup: path.resolve(FE_DIR, "tests/e2e/setup/global-setup.quiz.ts"),
  use: {
    baseURL: E2E_FRONTEND_ORIGIN,
    headless: true,
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
    navigationTimeout: 60_000,
    actionTimeout: 30_000,
  },
  projects: [
    {
      name: "quiz-suite-chromium",
      use: {
        browserName: "chromium",
      },
    },
  ],
  webServer: [
    {
      command: "bun run src/e2e-server.ts",
      cwd: BE_DIR,
      url: `${E2E_BACKEND_ORIGIN}/api/v1/runtime-info`,
      timeout: 180_000,
      reuseExistingServer: false,
      env: {
        ...process.env,
        PORT: String(E2E_BACKEND_PORT),
      },
    },
    {
      command: `VITE_API_URL=${E2E_BACKEND_ORIGIN}/api/v1 bunx vite --host 127.0.0.1 --port ${E2E_FRONTEND_PORT}`,
      cwd: FE_DIR,
      url: `${E2E_FRONTEND_ORIGIN}/__runtime_info__`,
      timeout: 180_000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
