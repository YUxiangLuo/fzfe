import { defineConfig } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveE2EBackendDir } from "./tests/e2e/helpers/backend-dir";
import { buildE2EBackendEnv } from "./tests/e2e/helpers/e2e-env";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE_DIR = __dirname;
const BE_DIR = resolveE2EBackendDir(FE_DIR);
const E2E_BACKEND_PORT = Number(process.env.E2E_BACKEND_PORT ?? "54127");
const E2E_BACKEND_ORIGIN = process.env.E2E_BACKEND_ORIGIN ?? `http://127.0.0.1:${E2E_BACKEND_PORT}`;

process.env.E2E_BACKEND_PORT ??= String(E2E_BACKEND_PORT);
process.env.E2E_BACKEND_ORIGIN ??= E2E_BACKEND_ORIGIN;

export default defineConfig({
  testDir: path.resolve(FE_DIR, "tests/e2e/auth"),
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: {
    timeout: 10_000,
  },
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report/auth" }]],
  outputDir: "test-results/auth",
  globalSetup: path.resolve(FE_DIR, "tests/e2e/setup/global-setup.session.ts"),
  use: {
    baseURL: E2E_BACKEND_ORIGIN,
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "bun run src/e2e-server.ts",
      cwd: BE_DIR,
      url: `${E2E_BACKEND_ORIGIN}/api/v1/runtime-info`,
      timeout: 120_000,
      reuseExistingServer: false,
      env: buildE2EBackendEnv({
        PORT: String(E2E_BACKEND_PORT),
        AUTH_LOGIN_RATE_LIMIT_WINDOW_MS: "60000",
        AUTH_LOGIN_RATE_LIMIT_MAX_PER_ACCOUNT: "2",
        AUTH_LOGIN_RATE_LIMIT_MAX_PER_IP: "100",
        AUTH_REGISTER_RATE_LIMIT_WINDOW_MS: "60000",
        AUTH_REGISTER_RATE_LIMIT_MAX_PER_ACCOUNT: "2",
        AUTH_REGISTER_RATE_LIMIT_MAX_PER_IP: "100",
      }),
    },
  ],
});
