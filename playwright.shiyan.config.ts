import { defineConfig } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE_DIR = __dirname;
const BE_DIR = path.resolve(__dirname, "../be");
const E2E_BACKEND_PORT = Number(process.env.E2E_BACKEND_PORT ?? "54104");
const E2E_BACKEND_ORIGIN =
  process.env.E2E_BACKEND_ORIGIN ?? `http://127.0.0.1:${E2E_BACKEND_PORT}`;
const E2E_FRONTEND_PORT = Number(process.env.E2E_FRONTEND_PORT ?? "55104");
const E2E_FRONTEND_ORIGIN =
  process.env.E2E_FRONTEND_ORIGIN ?? `http://127.0.0.1:${E2E_FRONTEND_PORT}`;

export default defineConfig({
  testDir: path.resolve(FE_DIR, "tests/e2e/shiyan"),
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  timeout: 15 * 60 * 1000,
  expect: {
    timeout: 30_000,
  },
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report/shiyan" }],
  ],
  outputDir: "test-results/shiyan",
  globalSetup: path.resolve(FE_DIR, "tests/e2e/setup/global-setup.shiyan.ts"),
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
      name: "shiyan-chromium",
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
      timeout: 300_000,
      reuseExistingServer: true,
      env: {
        ...process.env,
        PORT: String(E2E_BACKEND_PORT),
      },
    },
    {
      command: `bun run dev -- --host 127.0.0.1 --port ${E2E_FRONTEND_PORT}`,
      cwd: FE_DIR,
      port: E2E_FRONTEND_PORT,
      timeout: 300_000,
      reuseExistingServer: true,
      env: {
        ...process.env,
        VITE_API_URL: `${E2E_BACKEND_ORIGIN}/api/v1`,
      },
    },
  ],
});
