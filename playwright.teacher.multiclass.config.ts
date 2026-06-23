import { defineConfig } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE_DIR = __dirname;
const BE_DIR = path.resolve(__dirname, "../fangzhen-be");
const E2E_BACKEND_PORT = Number(process.env.E2E_BACKEND_PORT ?? "54106");
const E2E_BACKEND_ORIGIN =
  process.env.E2E_BACKEND_ORIGIN ?? `http://127.0.0.1:${E2E_BACKEND_PORT}`;
const E2E_FRONTEND_PORT = Number(process.env.E2E_FRONTEND_PORT ?? "55106");
const E2E_FRONTEND_ORIGIN =
  process.env.E2E_FRONTEND_ORIGIN ?? `http://127.0.0.1:${E2E_FRONTEND_PORT}`;

process.env.E2E_BACKEND_PORT ??= String(E2E_BACKEND_PORT);
process.env.E2E_BACKEND_ORIGIN ??= E2E_BACKEND_ORIGIN;
process.env.E2E_FRONTEND_PORT ??= String(E2E_FRONTEND_PORT);
process.env.E2E_FRONTEND_ORIGIN ??= E2E_FRONTEND_ORIGIN;

const MULTICLASS_ENV = {
  E2E_TEACHER_USERNAME:
    process.env.E2E_TEACHER_USERNAME ?? "teacher_multiclass",
  E2E_TEACHER_PASSWORD:
    process.env.E2E_TEACHER_PASSWORD ?? "TeacherMulti!234",
  E2E_ASSISTANT_USERNAME:
    process.env.E2E_ASSISTANT_USERNAME ?? "assistant_multiclass",
  E2E_ASSISTANT_PASSWORD:
    process.env.E2E_ASSISTANT_PASSWORD ?? "AssistantMulti!234",
  E2E_STUDENT_USERNAME:
    process.env.E2E_STUDENT_USERNAME ?? "20247001",
  E2E_STUDENT_PASSWORD:
    process.env.E2E_STUDENT_PASSWORD ?? "StudentMulti!234",
};

export default defineConfig({
  testDir: path.resolve(FE_DIR, "tests/e2e/teacher"),
  testMatch: "**/*.multiclass.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 20 * 60 * 1000,
  expect: {
    timeout: 30_000,
  },
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report/teacher-multiclass" }],
  ],
  outputDir: "test-results/teacher-multiclass",
  globalSetup: path.resolve(
    FE_DIR,
    "tests/e2e/setup/global-setup.teacher-multiclass.ts",
  ),
  use: {
    baseURL: E2E_FRONTEND_ORIGIN,
    headless: true,
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
    navigationTimeout: 60_000,
    actionTimeout: 30_000,
    contextOptions: {
      viewport: { width: 1440, height: 900 },
    },
  },
  projects: [
    {
      name: "teacher-multiclass-chromium",
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
      timeout: 300_000,
      reuseExistingServer: false,
      env: {
        ...process.env,
        ...MULTICLASS_ENV,
        PORT: String(E2E_BACKEND_PORT),
      },
    },
    {
      command: `VITE_API_URL=${E2E_BACKEND_ORIGIN}/api/v1 bunx vite --host 127.0.0.1 --port ${E2E_FRONTEND_PORT}`,
      cwd: FE_DIR,
      url: `${E2E_FRONTEND_ORIGIN}/__runtime_info__`,
      timeout: 300_000,
      reuseExistingServer: false,
      env: {
        ...process.env,
        ...MULTICLASS_ENV,
        VITE_API_URL: `${E2E_BACKEND_ORIGIN}/api/v1`,
      },
    },
  ],
});
