import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";
import {
  BACKEND_ORIGIN,
  REPORT_ANALYSES,
} from "../shiyan/support/constants";
import {
  loginStudentViaApi,
} from "../shiyan/support/backend";
import { resolveE2EBackendDir } from "../helpers/backend-dir";
import { acquireAllModelSlots } from "../shiyan/support/model-slot-locks";
import { StudentApp } from "../shiyan/support/student-app";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE_DIR = path.resolve(__dirname, "../../..");
const BE_DIR = resolveE2EBackendDir(FE_DIR);
const PARALLEL_PASSWORD =
  process.env.E2E_PARALLEL_STUDENT_PASSWORD ?? "StudentParallel!123";
const REPORT_STUDENT_A = "20246001";
const PRODUCTION_STUDENT = "20246031";

function runBackendCommand(args: string[], env: Record<string, string> = {}) {
  execFileSync("bun", args, {
    cwd: BE_DIR,
    env: {
      ...process.env,
      ...env,
    },
    stdio: "inherit",
  });
}

async function openAsStudent(page: Page, username: string, hashPath: string) {
  const token = await loginStudentViaApi(username, PARALLEL_PASSWORD);
  const app = new StudentApp(page, token);
  await app.open(hashPath);
  return app;
}

async function fillReportAnalyses(page: Page) {
  const textareas = page.locator('textarea[placeholder*="请根据上述实验结果"]');
  await expect(textareas).toHaveCount(5);
  for (let index = 0; index < REPORT_ANALYSES.length; index += 1) {
    await textareas.nth(index).fill(REPORT_ANALYSES[index]!);
  }
}

async function openReportPreview(page: Page) {
  const previewButton = page.getByRole("button", { name: /预览报告/ });
  await previewButton.scrollIntoViewIfNeeded();
  await expect(previewButton).toBeEnabled();
  await previewButton.click();
  await expect(page.getByRole("dialog", { name: "报告预览" })).toBeVisible();
}

async function confirmReportSubmission(page: Page) {
  const previewDialog = page.getByRole("dialog", { name: "报告预览" });
  await expect(previewDialog).toBeVisible();

  const confirmButton = previewDialog.getByRole("button", { name: /确认无误，提交报告/ });
  await confirmButton.scrollIntoViewIfNeeded();
  await expect(confirmButton).toBeEnabled();
  await confirmButton.click();
}

async function waitForPdfActiveJobs(page: Page, expected: number) {
  await expect
    .poll(
      async () => {
        const response = await page.request.get(`${BACKEND_ORIGIN}/api/v1/runtime-info`);
        const payload = await response.json() as {
          data?: { pdfQueue?: { activeJobs?: unknown } };
          pdfQueue?: { activeJobs?: unknown };
        };
        return Number((payload.data ?? payload).pdfQueue?.activeJobs ?? 0);
      },
      { timeout: 10_000, intervals: [50, 100, 250, 500] },
    )
    .toBe(expected);
}

async function holdPdfSlot(page: Page, holdMs = 5_000) {
  return page.request.post(`${BACKEND_ORIGIN}/api/v1/e2e/pdf-slot/hold`, {
    data: { hold_ms: holdMs },
    timeout: holdMs + 10_000,
  });
}

test.describe("@shiyan concurrency ui", () => {
  test.beforeAll(async () => {
    const response = await fetch(`${BACKEND_ORIGIN}/api/v1/runtime-info`);
    expect(response.ok).toBe(true);
    const payload = await response.json() as {
      data?: {
        concurrency?: Record<string, unknown>;
        timeouts?: Record<string, unknown>;
      };
      concurrency?: Record<string, unknown>;
      timeouts?: Record<string, unknown>;
    };
    const runtime = payload.data ?? payload;

    expect(Number(runtime.concurrency?.maxConcurrentModelJobs)).toBe(2);
    expect(Number(runtime.concurrency?.maxConcurrentPdfJobs)).toBe(1);
    expect(Number(runtime.concurrency?.dbConnectionLimit)).toBe(48);
    expect(Number(runtime.timeouts?.pdfQueueMs)).toBe(1);
  });

  test("production prediction shows the real 429 busy state and re-enables retry", async ({
    page,
  }) => {
    runBackendCommand(["run", "scripts/prepare-parallel.ts", "mixed-load", "--force"]);

    const slotLocks = await acquireAllModelSlots(2);
    try {
      const app = await openAsStudent(page, PRODUCTION_STUDENT, "/production/steps");
      await app.expectHash("/production/steps");

      await app.clickEnabledButton(/预测第一期需求/);

      await expect(
        page.getByText("模型服务当前繁忙，请稍后再次点击“重试”。"),
      ).toBeVisible({ timeout: 30_000 });
      await expect(page.getByText("第一期数据生成成功")).toHaveCount(0);
      await expect(page.getByRole("button", { name: /预测第一期需求/ })).toBeEnabled();
    } finally {
      await slotLocks.release();
    }
  });

  test("report submission shows the real PDF 503 message and succeeds after retry", async ({
    page,
  }) => {
    runBackendCommand(["run", "scripts/prepare-parallel.ts", "start-only", "--force"]);
    runBackendCommand(["run", "seed:parallel:report-burst", "--force"], {
      E2E_PDF_BURST_STUDENT_COUNT: "4",
    });

    const app = await openAsStudent(page, REPORT_STUDENT_A, "/report");
    await app.expectHash("/report");
    await fillReportAnalyses(page);

    const blockerPromise = holdPdfSlot(page);

    await waitForPdfActiveJobs(page, 1);
    try {
      await openReportPreview(page);
      await confirmReportSubmission(page);
      await expect(
        page.getByText("PDF 生成服务当前繁忙，排队等待超时。请稍后重新提交报告。").first(),
      ).toBeVisible({ timeout: 30_000 });

      const blockerResponse = await blockerPromise;
      expect(blockerResponse.status()).toBeLessThan(300);
      await waitForPdfActiveJobs(page, 0);

      await confirmReportSubmission(page);
      await expect(page.getByText("恭喜！实验完成")).toBeVisible({
        timeout: 90_000,
      });
    } finally {
      await blockerPromise.catch(() => undefined);
    }
  });
});
