import { defineConfig } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE_DIR = __dirname;
const BE_DIR = path.resolve(__dirname, "../be");
const E2E_BACKEND_PORT = Number(process.env.E2E_BACKEND_PORT ?? "54104");
const E2E_BACKEND_ORIGIN = process.env.E2E_BACKEND_ORIGIN ?? `http://127.0.0.1:${E2E_BACKEND_PORT}`;
const E2E_FRONTEND_PORT = Number(process.env.E2E_FRONTEND_PORT ?? "55104");
const E2E_FRONTEND_ORIGIN = process.env.E2E_FRONTEND_ORIGIN ?? `http://127.0.0.1:${E2E_FRONTEND_PORT}`;

export default defineConfig({
  testDir: path.resolve(FE_DIR, "tests/e2e/shiyan"),
  testMatch: "**/*.spec.ts",
  fullyParallel: false,
  workers: 1,
  
  // Shiyan 测试需要更长的超时（完整实验流程可能 15 分钟）
  timeout: 15 * 60 * 1000, // 15 minutes
  expect: {
    timeout: 30_000, // 增加 expect 超时到 30 秒
  },
  
  // 失败时重试 1 次
  retries: process.env.CI ? 1 : 0,
  
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report/shiyan" }],
  ],
  outputDir: "test-results/shiyan",
  
  // 全局设置
  globalSetup: path.resolve(FE_DIR, "tests/e2e/setup/global-setup.shiyan.ts"),
  
  use: {
    baseURL: E2E_FRONTEND_ORIGIN,
    headless: true,
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
    
    // 增加导航超时
    navigationTimeout: 60_000,
    actionTimeout: 30_000,
    
    // 浏览器上下文选项
    contextOptions: {
      viewport: { width: 1280, height: 720 },
    },
  },
  
  projects: [
    {
      name: "shiyan-suite-chromium",
      use: {
        browserName: "chromium",
      },
    },
  ],
  
  // WebServer 配置 - 关键修复
  // 注意：Shiyan 测试运行时间长，需要保持服务器稳定
  webServer: [
    {
      // 后端服务器
      command: "bun run src/e2e-server.ts",
      cwd: BE_DIR,
      port: E2E_BACKEND_PORT,
      timeout: 300_000,  // 5 分钟启动超时
      reuseExistingServer: true,  // 复用已存在的服务器（关键修复）
      env: {
        ...process.env,
        PORT: String(E2E_BACKEND_PORT),
      },
    },
    {
      // 前端开发服务器
      command: `bun run dev -- --host 127.0.0.1 --port ${E2E_FRONTEND_PORT}`,
      cwd: FE_DIR,
      port: E2E_FRONTEND_PORT,
      timeout: 300_000,  // 5 分钟启动超时
      reuseExistingServer: true,  // 复用已存在的服务器（关键修复）
      env: {
        ...process.env,
        VITE_API_URL: `${E2E_BACKEND_ORIGIN}/api/v1`,
        VITE_DOWNLOAD_URL: E2E_BACKEND_ORIGIN,
      },
    },
  ],
});
