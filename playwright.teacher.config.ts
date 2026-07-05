import { defineConfig } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveE2EBackendDir } from "./tests/e2e/helpers/backend-dir";
import { buildE2EBackendEnv } from "./tests/e2e/helpers/e2e-env";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE_DIR = __dirname;
const BE_DIR = resolveE2EBackendDir(FE_DIR);
const E2E_BACKEND_PORT = Number(process.env.E2E_BACKEND_PORT ?? "54102");
const E2E_BACKEND_ORIGIN = process.env.E2E_BACKEND_ORIGIN ?? `http://127.0.0.1:${E2E_BACKEND_PORT}`;
const E2E_FRONTEND_PORT = Number(process.env.E2E_FRONTEND_PORT ?? "55102");
const E2E_FRONTEND_ORIGIN = process.env.E2E_FRONTEND_ORIGIN ?? `http://127.0.0.1:${E2E_FRONTEND_PORT}`;

process.env.E2E_BACKEND_PORT ??= String(E2E_BACKEND_PORT);
process.env.E2E_BACKEND_ORIGIN ??= E2E_BACKEND_ORIGIN;
process.env.E2E_FRONTEND_PORT ??= String(E2E_FRONTEND_PORT);
process.env.E2E_FRONTEND_ORIGIN ??= E2E_FRONTEND_ORIGIN;

export default defineConfig({
  testDir: path.resolve(FE_DIR, "tests/e2e/teacher"),
  testMatch: "**/*.spec.ts",
  testIgnore: "**/*.multiclass.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  expect: {
    timeout: 15_000,
  },
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report/teacher" }]],
  outputDir: "test-results/teacher",
  globalSetup: path.resolve(FE_DIR, "tests/e2e/setup/global-setup.teacher.ts"),
  use: {
    baseURL: E2E_FRONTEND_ORIGIN,
    headless: true,
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "teacher-suite-chromium",
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
      timeout: 120_000,
      reuseExistingServer: false,
      env: buildE2EBackendEnv({
        PORT: String(E2E_BACKEND_PORT),
      }),
    },
    {
      command: `VITE_API_URL=${E2E_BACKEND_ORIGIN}/api/v1 bunx vite --host 127.0.0.1 --port ${E2E_FRONTEND_PORT}`,
      cwd: FE_DIR,
      url: `${E2E_FRONTEND_ORIGIN}/__runtime_info__`,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
