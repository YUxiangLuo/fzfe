import { defineConfig } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildE2EBackendEnv } from "./tests/e2e/helpers/e2e-env";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE_DIR = __dirname;
const E2E_BACKEND_PORT = Number(process.env.E2E_BACKEND_PORT ?? "54128");
const E2E_BACKEND_ORIGIN = process.env.E2E_BACKEND_ORIGIN ?? `http://127.0.0.1:${E2E_BACKEND_PORT}`;

process.env.E2E_BACKEND_PORT ??= String(E2E_BACKEND_PORT);
process.env.E2E_BACKEND_ORIGIN ??= E2E_BACKEND_ORIGIN;

export default defineConfig({
  testDir: path.resolve(FE_DIR, "tests/e2e/runtime-cleanup"),
  testMatch: "runtime-cleanup.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report/runtime-cleanup" }]],
  outputDir: "test-results/runtime-cleanup",
  use: {
    baseURL: E2E_BACKEND_ORIGIN,
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "bun run tests/e2e/runtime-cleanup/start-backend-with-cleanup-fixtures.ts",
      cwd: FE_DIR,
      url: `${E2E_BACKEND_ORIGIN}/api/v1/runtime-info`,
      timeout: 120_000,
      reuseExistingServer: false,
      env: buildE2EBackendEnv({
        PORT: String(E2E_BACKEND_PORT),
        DISABLE_RUNTIME_DISK_CLEANUP_TIMER: "1",
        EXPORT_FILE_RETENTION_DAYS: "1",
        TEMP_FILE_RETENTION_HOURS: "24",
        GUIDED_TRAINING_ORPHAN_RETENTION_HOURS: "24",
        MODEL_ARTIFACT_RETENTION_DAYS: "1",
      }),
    },
  ],
});
