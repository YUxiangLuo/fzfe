import process from "node:process";
import { chromium, expect } from "@playwright/test";
import { acquireAllModelSlots } from "../tests/e2e/shiyan/support/model-slot-locks.ts";
import {
  createStudentApiClient,
  loginStudentViaApi,
} from "../tests/e2e/shiyan/support/backend.ts";
import { StudentApp } from "../tests/e2e/shiyan/support/student-app.ts";

const FRONTEND_ORIGIN =
  process.env.E2E_FRONTEND_ORIGIN ??
  `http://127.0.0.1:${process.env.E2E_FRONTEND_PORT ?? "55104"}`;

const STUDENT_USERNAME =
  process.env.E2E_SLOT_LOCK_STUDENT_USERNAME ?? "20246001";
const STUDENT_PASSWORD =
  process.env.E2E_SLOT_LOCK_STUDENT_PASSWORD ?? "StudentParallel!123";

const INDUSTRY_NAME =
  process.env.E2E_SLOT_LOCK_INDUSTRY ?? "CONC_并发制造业";
const COMPANY_NAME =
  process.env.E2E_SLOT_LOCK_COMPANY ?? "CONC_样本企业A";
const PRODUCT_NAME =
  process.env.E2E_SLOT_LOCK_PRODUCT ?? "CONC_标准件A";

const TRAIN_START = parseNonNegativeInteger(
  process.env.E2E_SLOT_LOCK_TRAIN_START ?? "0",
  "E2E_SLOT_LOCK_TRAIN_START",
);
const TRAIN_END = parseNonNegativeInteger(
  process.env.E2E_SLOT_LOCK_TRAIN_END ?? "35",
  "E2E_SLOT_LOCK_TRAIN_END",
);
const EVALUATE_START = parseNonNegativeInteger(
  process.env.E2E_SLOT_LOCK_EVALUATE_START ?? "36",
  "E2E_SLOT_LOCK_EVALUATE_START",
);
const EVALUATE_END = parseNonNegativeInteger(
  process.env.E2E_SLOT_LOCK_EVALUATE_END ?? "41",
  "E2E_SLOT_LOCK_EVALUATE_END",
);
const MOVING_AVERAGE_WINDOW = parsePositiveInteger(
  process.env.E2E_SLOT_LOCK_MA_WINDOW ?? "6",
  "E2E_SLOT_LOCK_MA_WINDOW",
);
const SLOT_COUNT = parsePositiveInteger(
  process.env.E2E_SLOT_LOCK_COUNT ?? "16",
  "E2E_SLOT_LOCK_COUNT",
);
const CDP_PORT = parsePositiveInteger(
  process.env.E2E_AGENT_BROWSER_CDP_PORT ?? "9222",
  "E2E_AGENT_BROWSER_CDP_PORT",
);
const HEADLESS = process.env.PW_HEADLESS === "true";
const HOLD_AFTER_429 = process.env.E2E_SLOT_LOCK_HOLD_AFTER_429 === "1";
const RECOVERY_RETRY = process.env.E2E_SLOT_LOCK_RECOVERY_RETRY !== "0";
const ATTACH_WAIT_MS = parseNonNegativeInteger(
  process.env.E2E_AGENT_BROWSER_ATTACH_WAIT_MS ?? "0",
  "E2E_AGENT_BROWSER_ATTACH_WAIT_MS",
);
const WAIT_FOR_ATTACH =
  process.env.E2E_AGENT_BROWSER_WAIT_FOR_ATTACH === "1" || ATTACH_WAIT_MS > 0;

function parsePositiveInteger(value: string, envName: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${envName} must be a positive integer, got: ${value}`);
  }
  return parsed;
}

function parseNonNegativeInteger(value: string, envName: string): number {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${envName} must be a non-negative integer, got: ${value}`);
  }
  return parsed;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForInspector() {
  console.log(`[slot-lock] agent-browser attach available via CDP port ${CDP_PORT}`);
  console.log(`[slot-lock] suggested commands:`);
  console.log(`  agent-browser connect ${CDP_PORT}`);
  console.log(`  agent-browser snapshot -i`);
  console.log(`  agent-browser network requests --clear`);
  console.log(`  agent-browser console --clear`);

  if (ATTACH_WAIT_MS > 0) {
    console.log(`[slot-lock] waiting ${ATTACH_WAIT_MS}ms for agent-browser attach`);
    await delay(ATTACH_WAIT_MS);
    return;
  }

  if (!process.stdin.isTTY) {
    console.log("[slot-lock] stdin is not interactive, skipping attach pause");
    return;
  }

  console.log("[slot-lock] press Enter after agent-browser is attached");
  process.stdin.resume();
  await new Promise<void>((resolve) => {
    process.stdin.once("data", () => resolve());
  });
}

async function prepareModelStageExperiment() {
  const token = await loginStudentViaApi(STUDENT_USERNAME, STUDENT_PASSWORD);
  const studentApi = createStudentApiClient(token);
  const experiment = await studentApi.ensureFreshExperiment();

  const updatedExperiment = await studentApi.updateExperiment(experiment.experiment_id, {
    selected_industry: INDUSTRY_NAME,
    selected_company: COMPANY_NAME,
    selected_product: PRODUCT_NAME,
    data_window_train_start_index: TRAIN_START,
    data_window_train_end_index: TRAIN_END,
    data_window_evaluate_start_index: EVALUATE_START,
    data_window_evaluate_end_index: EVALUATE_END,
    current_step: 5,
    highest_completed_step: 4,
    moving_average_window: MOVING_AVERAGE_WINDOW,
  });

  return { token, experimentId: updatedExperiment.experiment_id };
}

async function main() {
  console.log(`[slot-lock] frontend=${FRONTEND_ORIGIN}`);
  console.log(`[slot-lock] student=${STUDENT_USERNAME}`);
  console.log(`[slot-lock] slotCount=${SLOT_COUNT}`);
  console.log(`[slot-lock] cdpPort=${CDP_PORT}`);
  console.log(`[slot-lock] headless=${HEADLESS}`);

  const { token, experimentId } = await prepareModelStageExperiment();
  console.log(`[slot-lock] prepared experiment_id=${experimentId}`);

  const slotLocks = await acquireAllModelSlots(SLOT_COUNT);
  console.log("[slot-lock] all model slots acquired");

  const browser = await chromium.launch({
    headless: HEADLESS,
    args: [`--remote-debugging-port=${CDP_PORT}`],
  });

  try {
    const context = await browser.newContext({
      baseURL: FRONTEND_ORIGIN,
    });
    const page = await context.newPage();
    const studentApp = new StudentApp(page, token);

    await studentApp.open("/model/moving-average/params");
    await studentApp.expectHash("/model/moving-average/params");

    await page.locator("#window-size").fill(String(MOVING_AVERAGE_WINDOW));
    await studentApp.clickEnabledButton("下一步");
    await studentApp.expectHash("/model/moving-average/validation");

    if (WAIT_FOR_ATTACH) {
      await waitForInspector();
    }

    await studentApp.clickEnabledButton("下一步");
    await studentApp.expectHash("/model/moving-average/results");

    await expect(page.getByText(/模型服务繁忙，请稍后再试/)).toBeVisible({
      timeout: 30_000,
    });
    console.log("[slot-lock] observed 429 busy message in UI");

    if (HOLD_AFTER_429) {
      console.log("[slot-lock] holding browser open after 429 for manual inspection");
      await waitForInspector();
    }

    await slotLocks.release();
    console.log("[slot-lock] released pre-acquired model slots");

    if (!RECOVERY_RETRY) {
      return;
    }

    await page.getByRole("button", { name: "重试" }).click();
    await expect(
      page.getByRole("heading", { name: "移动平均法 - 计算结果" }),
    ).toBeVisible({ timeout: 60_000 });
    console.log("[slot-lock] retry succeeded after releasing slots");
  } finally {
    await browser.close();
  }
}

await main().catch((error) => {
  console.error("[slot-lock] failed", error);
  process.exit(1);
});
