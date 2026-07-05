import { defineConfig } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveE2EBackendDir } from "./tests/e2e/helpers/backend-dir";
import { buildE2EBackendEnv } from "./tests/e2e/helpers/e2e-env";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE_DIR = __dirname;
const BE_DIR = resolveE2EBackendDir(FE_DIR);
const E2E_BACKEND_PORT = Number(process.env.E2E_BACKEND_PORT ?? "54118");
const E2E_BACKEND_ORIGIN =
  process.env.E2E_BACKEND_ORIGIN ?? `http://127.0.0.1:${E2E_BACKEND_PORT}`;
const E2E_FRONTEND_PORT = Number(process.env.E2E_FRONTEND_PORT ?? "55118");
const E2E_FRONTEND_ORIGIN =
  process.env.E2E_FRONTEND_ORIGIN ?? `http://127.0.0.1:${E2E_FRONTEND_PORT}`;

process.env.E2E_BACKEND_PORT ??= String(E2E_BACKEND_PORT);
process.env.E2E_BACKEND_ORIGIN ??= E2E_BACKEND_ORIGIN;
process.env.E2E_FRONTEND_PORT ??= String(E2E_FRONTEND_PORT);
process.env.E2E_FRONTEND_ORIGIN ??= E2E_FRONTEND_ORIGIN;
process.env.E2E_PARALLEL_STUDENT_PASSWORD ??= "StudentParallel!123";

export default defineConfig({
  testDir: path.resolve(FE_DIR, "tests/e2e/shiyan-concurrency-ui"),
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 10 * 60 * 1000,
  expect: {
    timeout: 30_000,
  },
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report/shiyan-concurrency-ui" }],
  ],
  outputDir: "test-results/shiyan-concurrency-ui",
  use: {
    baseURL: E2E_FRONTEND_ORIGIN,
    headless: true,
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
    navigationTimeout: 60_000,
    actionTimeout: 30_000,
    contextOptions: {
      viewport: { width: 1280, height: 720 },
    },
  },
  projects: [
    {
      name: "shiyan-concurrency-ui-chromium",
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
      reuseExistingServer: true,
      env: buildE2EBackendEnv({
        PORT: String(E2E_BACKEND_PORT),
        MAX_CONCURRENT_MODEL_JOBS: "2",
        MAX_CONCURRENT_PDF_JOBS: "1",
        PDF_QUEUE_TIMEOUT_MS: "1",
        PDF_GENERATION_TIMEOUT_MS: "30000",
        DB_CONNECTION_LIMIT: "48",
        PYTHON_MODEL_THREADS: "1",
        TF_NUM_INTEROP_THREADS: "1",
      }),
    },
    {
      command: `bun run dev -- --host 127.0.0.1 --port ${E2E_FRONTEND_PORT}`,
      cwd: FE_DIR,
      url: `${E2E_FRONTEND_ORIGIN}/__runtime_info__`,
      timeout: 300_000,
      reuseExistingServer: true,
      env: {
        ...process.env,
        VITE_API_URL: `${E2E_BACKEND_ORIGIN}/api/v1`,
      },
    },
  ],
});
