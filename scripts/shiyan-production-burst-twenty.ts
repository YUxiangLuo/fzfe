import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import process from "node:process";
import {
  chromium,
  expect,
  type Browser,
  type BrowserContext,
  type Page,
  type Response,
  type Route,
} from "@playwright/test";
import {
  createStudentApiClient,
  loginStudentViaApi,
  type ExperimentRecord,
} from "../tests/e2e/shiyan/support/backend.ts";
import { StudentApp } from "../tests/e2e/shiyan/support/student-app.ts";
import { ensureParallelRuntime } from "./parallel-runtime.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE_DIR = path.resolve(__dirname, "..");
const BE_DIR = path.resolve(FE_DIR, "..", "fangzhen-be");

const FRONTEND_ORIGIN =
  process.env.E2E_FRONTEND_ORIGIN ??
  `http://127.0.0.1:${process.env.E2E_FRONTEND_PORT ?? "55104"}`;
const BACKEND_ORIGIN =
  process.env.E2E_BACKEND_ORIGIN ??
  `http://127.0.0.1:${process.env.E2E_BACKEND_PORT ?? "54104"}`;

const STUDENT_PASSWORD =
  process.env.E2E_PARALLEL20_PRODUCTION_STUDENT_PASSWORD ??
  process.env.E2E_PARALLEL_STUDENT_PASSWORD ??
  "StudentParallel!123";

const DEFAULT_STUDENT_USERNAMES = Array.from(
  { length: 20 },
  (_, index) => String(20246001 + index),
);
const STUDENT_USERNAMES =
  parseCsv(
    process.env.E2E_PARALLEL20_PRODUCTION_STUDENTS ??
      process.env.E2E_PARALLEL20_STUDENTS ??
      process.env.E2E_PARALLEL_STUDENTS,
  ) ?? DEFAULT_STUDENT_USERNAMES;

const BEST_MODEL = "ma" as const;
const SLOT_COUNT = parsePositiveInteger(
  process.env.E2E_PARALLEL20_PRODUCTION_SLOT_COUNT ?? "16",
  "E2E_PARALLEL20_PRODUCTION_SLOT_COUNT",
);
const MIN_INITIAL_BUSY_429 = parseNonNegativeInteger(
  process.env.E2E_PARALLEL20_PRODUCTION_MIN_BUSY_429 ??
    String(Math.max(0, STUDENT_USERNAMES.length - SLOT_COUNT)),
  "E2E_PARALLEL20_PRODUCTION_MIN_BUSY_429",
);
const PREPARE_SCENARIO =
  process.env.E2E_PARALLEL20_PRODUCTION_PREPARE_SCENARIO === "1";
const PREPARE_TRAINING =
  process.env.E2E_PARALLEL20_PRODUCTION_PREPARE_TRAINING !== "0";
const RETRY_BUSY_429 =
  process.env.E2E_PARALLEL20_PRODUCTION_RETRY_BUSY_429 !== "0";
const MAX_RETRY_ROUNDS = parseNonNegativeInteger(
  process.env.E2E_PARALLEL20_PRODUCTION_MAX_RETRY_ROUNDS ?? "8",
  "E2E_PARALLEL20_PRODUCTION_MAX_RETRY_ROUNDS",
);
const RETRY_ROUND_DELAY_MS = parseNonNegativeInteger(
  process.env.E2E_PARALLEL20_PRODUCTION_RETRY_ROUND_DELAY_MS ?? "250",
  "E2E_PARALLEL20_PRODUCTION_RETRY_ROUND_DELAY_MS",
);
const HEADLESS = process.env.PW_HEADLESS !== "false";
const SLOW_MO = parseNonNegativeInteger(
  process.env.PW_SLOWMO ?? "0",
  "PW_SLOWMO",
);
const CDP_PORT = parsePositiveInteger(
  process.env.E2E_AGENT_BROWSER_CDP_PORT ?? "9222",
  "E2E_AGENT_BROWSER_CDP_PORT",
);
const ATTACH_WAIT_MS = parseNonNegativeInteger(
  process.env.E2E_AGENT_BROWSER_ATTACH_WAIT_MS ?? "0",
  "E2E_AGENT_BROWSER_ATTACH_WAIT_MS",
);
const HOLD_AFTER_RESULTS_MS = parseNonNegativeInteger(
  process.env.E2E_AGENT_BROWSER_HOLD_AFTER_RESULTS_MS ?? "0",
  "E2E_AGENT_BROWSER_HOLD_AFTER_RESULTS_MS",
);
const WAIT_FOR_ATTACH =
  process.env.E2E_AGENT_BROWSER_WAIT_FOR_ATTACH === "1" || ATTACH_WAIT_MS > 0;

const PREPARE_PRODUCTION_TIMEOUT_MS = 180_000;
const PREDICT_TIMEOUT_MS = 180_000;
const BARRIER_TIMEOUT_MS = 120_000;
const PREPARE_PRODUCTION_PATHNAME = "/api/v1/models/ma/prepare-production";
const PREDICT_PATHNAME = "/api/v1/models/ma/predict";
const ARTIFACTS_DIR = path.resolve(
  process.cwd(),
  "test-results",
  "shiyan-production-burst-twenty",
);

type OutcomeKind = "success" | "busy429" | "unexpected";
type ProductionRequestStage = "prepare" | "predict";

interface ProductionOutcome {
  username: string;
  experimentId: number;
  currentStep: number | null;
  product: string | null;
  stage: ProductionRequestStage;
  httpStatus: number;
  outcome: OutcomeKind;
  elapsedMs: number;
  attempt: number;
  preparePayload: unknown;
  predictPayload: unknown;
}

interface SummaryFile {
  generatedAt: string;
  frontendOrigin: string;
  students: string[];
  bestModel: typeof BEST_MODEL;
  slotCount: number;
  minInitialBusy429: number;
  barrier: {
    expectedCount: number;
    arrivalCount: number;
    arrivals: Array<{ username: string; arrivedAt: string }>;
  };
  preparation: {
    scenarioPrepared: boolean;
    trainingPrepared: boolean;
  };
  retry: {
    enabled: boolean;
    maxRetryRounds: number;
    retryRoundDelayMs: number;
    attemptedRounds: number;
  };
  counts: {
    initialSuccess: number;
    initialBusy429: number;
    initialUnexpected: number;
    success: number;
    busy429: number;
    unexpected: number;
  };
  outcomes: ProductionOutcome[];
}

function parseCsv(value: string | undefined): string[] | null {
  const parts = value
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return parts?.length ? parts : null;
}

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

function ensure(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function stageSlug(stage: string): string {
  return stage.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function formatDurationMs(durationMs: number): string {
  return `${(durationMs / 1000).toFixed(1)}s`;
}

function tryParseJson(rawText: string): unknown {
  if (!rawText) {
    return null;
  }

  try {
    return JSON.parse(rawText) as unknown;
  } catch {
    return rawText;
  }
}

function isResponseFor(pathname: string) {
  return (response: Response) => {
    const url = new URL(response.url());
    return url.pathname === pathname && response.request().method() === "POST";
  };
}

async function runSubcommand(input: {
  label: string;
  cwd: string;
  args: string[];
  env?: Record<string, string>;
}) {
  console.log(
    `[parallel20-production] ${input.label}: bun ${input.args.join(" ")} (cwd=${input.cwd})`,
  );

  const child = spawn("bun", input.args, {
    cwd: input.cwd,
    env: {
      ...process.env,
      ...input.env,
    },
    stdio: "inherit",
  });

  await new Promise<void>((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(
        new Error(
          `${input.label} failed (code=${String(code)}, signal=${String(signal)})`,
        ),
      );
    });
  });
}

async function waitForInspector() {
  console.log(
    `[parallel20-production] agent-browser attach available via CDP port ${CDP_PORT}`,
  );
  console.log("[parallel20-production] suggested commands:");
  console.log(`  agent-browser connect ${CDP_PORT}`);
  console.log("  agent-browser tab list");
  console.log("  agent-browser tab 3");
  console.log("  agent-browser snapshot -i");
  console.log("  agent-browser console --clear");

  if (ATTACH_WAIT_MS > 0) {
    console.log(
      `[parallel20-production] waiting ${ATTACH_WAIT_MS}ms for agent-browser attach`,
    );
    await delay(ATTACH_WAIT_MS);
    return;
  }

  if (!process.stdin.isTTY) {
    console.log(
      "[parallel20-production] stdin is not interactive, skipping attach pause",
    );
    return;
  }

  console.log("[parallel20-production] press Enter after agent-browser is attached");
  process.stdin.resume();
  await new Promise<void>((resolve) => {
    process.stdin.once("data", () => resolve());
  });
}

class RequestBarrier {
  private readonly arrivals: Array<{
    username: string;
    arrivedAt: string;
  }> = [];

  private accepting = true;
  private releaseResolver!: () => void;
  private allArrivedResolver!: () => void;
  private allArrivedRejecter!: (error: Error) => void;
  private readonly released = new Promise<void>((resolve) => {
    this.releaseResolver = resolve;
  });
  private readonly allArrived = new Promise<void>((resolve, reject) => {
    this.allArrivedResolver = resolve;
    this.allArrivedRejecter = reject;
  });
  private readonly timeoutHandle: Timer;

  constructor(private readonly expectedCount: number) {
    this.timeoutHandle = setTimeout(() => {
      const arrivedUsernames = this.arrivals.map((arrival) => arrival.username);
      this.allArrivedRejecter(
        new Error(
          `Production barrier timed out waiting for ${this.expectedCount} requests; arrived=${this.arrivals.length}; usernames=${arrivedUsernames.join(",")}`,
        ),
      );
    }, BARRIER_TIMEOUT_MS);
  }

  async intercept(username: string, route: Route) {
    if (!this.accepting) {
      await route.continue();
      return;
    }

    const request = route.request();
    if (request.method() !== "POST") {
      await route.continue();
      return;
    }

    this.arrivals.push({
      username,
      arrivedAt: new Date().toISOString(),
    });
    console.log(
      `[parallel20-production] barrier arrival ${this.arrivals.length}/${this.expectedCount} username=${username}`,
    );

    if (this.arrivals.length === this.expectedCount) {
      this.accepting = false;
      clearTimeout(this.timeoutHandle);
      this.allArrivedResolver();
    }

    await this.released;
    await route.continue();
  }

  async waitForAll() {
    await this.allArrived;
  }

  releaseAll() {
    this.releaseResolver();
  }

  getArrivals() {
    return [...this.arrivals];
  }
}

class StudentRunner {
  private readonly studentApp: StudentApp;
  private experiment: ExperimentRecord | null = null;
  private prepareResponsePromise: Promise<Response> | null = null;
  private attemptStartedAtMs: number | null = null;
  private currentAttempt = 0;

  constructor(
    readonly username: string,
    private readonly context: BrowserContext,
    readonly page: Page,
    private readonly token: string,
  ) {
    this.studentApp = new StudentApp(page, token);
  }

  async loadExperiment() {
    const api = createStudentApiClient(this.token);
    this.experiment = await api.getActiveExperiment();
    ensure(
      this.experiment,
      `${this.username} has no active experiment; seed training-burst first or enable scenario preparation`,
    );
    return this.experiment;
  }

  async promoteToProduction() {
    const api = createStudentApiClient(this.token);
    const experiment = await this.loadExperiment();

    this.experiment = await api.updateExperiment(experiment.experiment_id, {
      moving_average_completed: true,
      selected_best_model: BEST_MODEL,
      current_step: 7,
      highest_completed_step: 6,
      production_plan_completed: false,
      production_forecast_results: null,
      production_mps_table: null,
      production_forecast_periods: null,
      production_initial_inventory: null,
      production_target_service_level: null,
      production_safety_stock_z_score: null,
      production_capacity_mode: null,
      production_capacity_scenario: null,
      production_capacity: null,
      production_custom_capacity: null,
    });
  }

  async openProductionSteps() {
    if (!this.experiment) {
      await this.loadExperiment();
    }

    ensure(this.experiment, `${this.username} experiment not initialized`);
    ensure(
      this.experiment.current_step !== null && this.experiment.current_step >= 7,
      `${this.username} current_step must be >= 7, got ${String(this.experiment.current_step)}`,
    );
    ensure(
      this.experiment.selected_best_model === BEST_MODEL,
      `${this.username} selected_best_model must be ${BEST_MODEL}, got ${String(this.experiment.selected_best_model)}`,
    );

    await this.studentApp.open("/production/steps");
    await this.studentApp.expectHash("/production/steps");
    await expect(
      this.page.getByRole("button", { name: "预测第一期需求" }),
    ).toBeVisible({ timeout: 30_000 });
  }

  async installPrepareBarrier(barrier: RequestBarrier) {
    await this.page.route(`**${PREPARE_PRODUCTION_PATHNAME}`, async (route) => {
      await barrier.intercept(this.username, route);
    });
  }

  async triggerProductionPrediction() {
    this.currentAttempt = 1;
    this.attemptStartedAtMs = Date.now();
    this.prepareResponsePromise = this.page.waitForResponse(
      isResponseFor(PREPARE_PRODUCTION_PATHNAME),
      { timeout: PREPARE_PRODUCTION_TIMEOUT_MS },
    );

    await this.page.getByRole("button", { name: "预测第一期需求" }).click();
  }

  async triggerRetry() {
    this.currentAttempt += 1;
    this.attemptStartedAtMs = Date.now();
    this.prepareResponsePromise = this.page.waitForResponse(
      isResponseFor(PREPARE_PRODUCTION_PATHNAME),
      { timeout: PREPARE_PRODUCTION_TIMEOUT_MS },
    );

    await expect(
      this.page.getByRole("button", { name: "预测第一期需求" }),
    ).toBeVisible({ timeout: 15_000 });
    await this.page.getByRole("button", { name: "预测第一期需求" }).click();
  }

  async collectAttemptOutcome(): Promise<ProductionOutcome> {
    ensure(this.experiment, `${this.username} experiment not initialized`);
    ensure(
      this.prepareResponsePromise,
      `${this.username} prepare response promise not initialized`,
    );
    ensure(
      this.attemptStartedAtMs !== null,
      `${this.username} attempt not started`,
    );

    const prepareResponse = await this.prepareResponsePromise;
    const prepareStatus = prepareResponse.status();
    const preparePayload = tryParseJson(await prepareResponse.text());
    const elapsedMs = Date.now() - this.attemptStartedAtMs;

    if (prepareStatus === 429) {
      await expect(
        this.page.getByText(/模型服务当前繁忙，请稍后再次点击.*重试|模型服务繁忙，请稍后再试/),
      ).toBeVisible({ timeout: 30_000 });
      return {
        username: this.username,
        experimentId: this.experiment.experiment_id,
        currentStep: this.experiment.current_step,
        product: (this.experiment.selected_product as string | null) ?? null,
        stage: "prepare",
        httpStatus: prepareStatus,
        outcome: "busy429",
        elapsedMs,
        attempt: this.currentAttempt,
        preparePayload,
        predictPayload: null,
      };
    }

    if (prepareStatus !== 200) {
      return {
        username: this.username,
        experimentId: this.experiment.experiment_id,
        currentStep: this.experiment.current_step,
        product: (this.experiment.selected_product as string | null) ?? null,
        stage: "prepare",
        httpStatus: prepareStatus,
        outcome: "unexpected",
        elapsedMs,
        attempt: this.currentAttempt,
        preparePayload,
        predictPayload: null,
      };
    }

    const predictResponse = await this.page.waitForResponse(
      isResponseFor(PREDICT_PATHNAME),
      { timeout: PREDICT_TIMEOUT_MS },
    );
    const predictStatus = predictResponse.status();
    const predictPayload = tryParseJson(await predictResponse.text());
    const totalElapsedMs = Date.now() - this.attemptStartedAtMs;

    if (predictStatus === 429) {
      await expect(
        this.page.getByText(/模型服务当前繁忙，请稍后再次点击.*重试|模型服务繁忙，请稍后再试/),
      ).toBeVisible({ timeout: 30_000 });
      return {
        username: this.username,
        experimentId: this.experiment.experiment_id,
        currentStep: this.experiment.current_step,
        product: (this.experiment.selected_product as string | null) ?? null,
        stage: "predict",
        httpStatus: predictStatus,
        outcome: "busy429",
        elapsedMs: totalElapsedMs,
        attempt: this.currentAttempt,
        preparePayload,
        predictPayload,
      };
    }

    if (predictStatus === 200) {
      await expect(this.page.getByText("第一期数据生成成功")).toBeVisible({
        timeout: 120_000,
      });
      return {
        username: this.username,
        experimentId: this.experiment.experiment_id,
        currentStep: this.experiment.current_step,
        product: (this.experiment.selected_product as string | null) ?? null,
        stage: "predict",
        httpStatus: predictStatus,
        outcome: "success",
        elapsedMs: totalElapsedMs,
        attempt: this.currentAttempt,
        preparePayload,
        predictPayload,
      };
    }

    return {
      username: this.username,
      experimentId: this.experiment.experiment_id,
      currentStep: this.experiment.current_step,
      product: (this.experiment.selected_product as string | null) ?? null,
      stage: "predict",
      httpStatus: predictStatus,
      outcome: "unexpected",
      elapsedMs: totalElapsedMs,
      attempt: this.currentAttempt,
      preparePayload,
      predictPayload,
    };
  }

  async captureFailure(stage: string) {
    const targetPath = path.join(
      ARTIFACTS_DIR,
      `${this.username}-${stageSlug(stage)}.png`,
    );
    await this.page.screenshot({ path: targetPath, fullPage: true }).catch(
      () => undefined,
    );
  }

  async close() {
    await this.context.close().catch(() => undefined);
  }
}

async function createStudentRunners(browser: Browser) {
  const credentials = await Promise.all(
    STUDENT_USERNAMES.map(async (username) => ({
      username,
      token: await loginStudentViaApi(username, STUDENT_PASSWORD),
    })),
  );

  return await Promise.all(
    credentials.map(async ({ username, token }) => {
      const context = await browser.newContext({
        baseURL: FRONTEND_ORIGIN,
        viewport: { width: 1440, height: 1100 },
        locale: "zh-CN",
      });
      const page = await context.newPage();
      return new StudentRunner(username, context, page, token);
    }),
  );
}

async function runStage(
  stage: string,
  runners: StudentRunner[],
  action: (runner: StudentRunner, index: number) => Promise<void>,
) {
  const startedAt = Date.now();
  console.log(`[parallel20-production] stage=${stage} students=${runners.length}`);

  const results = await Promise.allSettled(
    runners.map(async (runner, index) => {
      try {
        await action(runner, index);
      } catch (error) {
        await runner.captureFailure(stage);
        throw error;
      }
    }),
  );

  const failures = results.flatMap((result, index) => {
    if (result.status === "fulfilled") {
      return [];
    }
    const reason =
      result.reason instanceof Error
        ? result.reason.message
        : String(result.reason);
    return [`${runners[index]!.username}: ${reason}`];
  });

  if (failures.length > 0) {
    throw new Error(
      `Stage ${stage} failed after ${formatDurationMs(Date.now() - startedAt)}\n${failures.join("\n")}`,
    );
  }

  console.log(
    `[parallel20-production] stage=${stage} completed in ${formatDurationMs(Date.now() - startedAt)}`,
  );
}

async function collectOutcomes(runners: StudentRunner[]) {
  const results = await Promise.allSettled(
    runners.map(async (runner) => {
      try {
        return await runner.collectAttemptOutcome();
      } catch (error) {
        await runner.captureFailure("collect-results");
        throw error;
      }
    }),
  );

  const failures = results.flatMap((result, index) => {
    if (result.status === "fulfilled") {
      return [];
    }
    const reason =
      result.reason instanceof Error
        ? result.reason.message
        : String(result.reason);
    return [`${runners[index]!.username}: ${reason}`];
  });

  if (failures.length > 0) {
    throw new Error(`Collect results failed\n${failures.join("\n")}`);
  }

  return results.map(
    (result) => (result as PromiseFulfilledResult<ProductionOutcome>).value,
  );
}

async function retryBusy429Students(
  runners: StudentRunner[],
  initialOutcomes: ProductionOutcome[],
) {
  let attemptedRounds = 0;
  const latestByUsername = new Map(
    initialOutcomes.map((outcome) => [outcome.username, outcome]),
  );
  let pending = runners.filter(
    (runner) => latestByUsername.get(runner.username)?.outcome === "busy429",
  );

  while (
    RETRY_BUSY_429 &&
    pending.length > 0 &&
    attemptedRounds < MAX_RETRY_ROUNDS
  ) {
    attemptedRounds += 1;
    console.log(
      `[parallel20-production] retry-round=${attemptedRounds} pending=${pending.map((runner) => runner.username).join(",")}`,
    );

    const retryResults = await Promise.allSettled(
      pending.map(async (runner) => {
        try {
          await runner.triggerRetry();
          return await runner.collectAttemptOutcome();
        } catch (error) {
          await runner.captureFailure(`retry-round-${attemptedRounds}`);
          throw error;
        }
      }),
    );

    const failures = retryResults.flatMap((result, index) => {
      if (result.status === "fulfilled") {
        return [];
      }
      const reason =
        result.reason instanceof Error
          ? result.reason.message
          : String(result.reason);
      return [`${pending[index]!.username}: ${reason}`];
    });

    if (failures.length > 0) {
      throw new Error(
        `Retry round ${attemptedRounds} failed\n${failures.join("\n")}`,
      );
    }

    for (const result of retryResults) {
      const outcome = (result as PromiseFulfilledResult<ProductionOutcome>).value;
      latestByUsername.set(outcome.username, outcome);
      console.log(
        `[parallel20-production] retry-round=${attemptedRounds} ${outcome.username} stage=${outcome.stage} status=${outcome.httpStatus} outcome=${outcome.outcome} attempt=${outcome.attempt} elapsed=${formatDurationMs(outcome.elapsedMs)}`,
      );
    }

    pending = runners.filter(
      (runner) => latestByUsername.get(runner.username)?.outcome === "busy429",
    );

    if (pending.length > 0 && RETRY_ROUND_DELAY_MS > 0) {
      await delay(RETRY_ROUND_DELAY_MS);
    }
  }

  return {
    attemptedRounds,
    outcomes: runners.map((runner) => latestByUsername.get(runner.username)!),
  };
}

async function writeSummary(summary: SummaryFile) {
  const targetPath = path.join(ARTIFACTS_DIR, "summary.json");
  await writeFile(targetPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  console.log(`[parallel20-production] wrote summary to ${targetPath}`);
}

async function prepareScenarioAndTraining() {
  if (PREPARE_SCENARIO && !PREPARE_TRAINING) {
    throw new Error(
      "E2E_PARALLEL20_PRODUCTION_PREPARE_SCENARIO=1 requires E2E_PARALLEL20_PRODUCTION_PREPARE_TRAINING=1. Scenario reset clears experiments back to training-burst and leaves no trained model artifacts to reuse.",
    );
  }

  if (PREPARE_SCENARIO) {
    await runSubcommand({
      label: "prepare-scenario",
      cwd: BE_DIR,
      args: ["run", "seed:parallel:scenario", "training-burst", "--force"],
    });
  }

  if (!PREPARE_TRAINING) {
    return;
  }

  await runSubcommand({
    label: "prepare-training",
    cwd: FE_DIR,
    args: ["run", "scripts/shiyan-training-burst-twenty.ts"],
    env: {
      PW_HEADLESS: "true",
      E2E_PARALLEL20_RETRY_BUSY_429: "1",
      E2E_PARALLEL20_MAX_RETRY_ROUNDS: "8",
      E2E_PARALLEL20_RETRY_ROUND_DELAY_MS: "250",
      E2E_AGENT_BROWSER_WAIT_FOR_ATTACH: "0",
      E2E_AGENT_BROWSER_ATTACH_WAIT_MS: "0",
      E2E_AGENT_BROWSER_HOLD_AFTER_RESULTS_MS: "0",
    },
  });
}

async function main() {
  if (process.argv.includes("--help")) {
    console.log(`Usage: bun run scripts/shiyan-production-burst-twenty.ts

Default behavior:
  Automatically prepares the parallel database baseline
  Automatically starts frontend/backend on the configured origins when needed
  Automatically runs the 20-student training prep first

Optional environment:
  E2E_FRONTEND_ORIGIN=http://127.0.0.1:55104
  E2E_BACKEND_ORIGIN=http://127.0.0.1:54104
  E2E_PARALLEL20_PRODUCTION_STUDENTS=20246001,...,20246020
  E2E_PARALLEL20_PRODUCTION_PREPARE_SCENARIO=0
  E2E_PARALLEL20_PRODUCTION_PREPARE_TRAINING=1
  E2E_PARALLEL20_PRODUCTION_RETRY_BUSY_429=1
  E2E_PARALLEL20_PRODUCTION_MAX_RETRY_ROUNDS=8
  E2E_PARALLEL20_PRODUCTION_RETRY_ROUND_DELAY_MS=250
  E2E_PARALLEL20_PRODUCTION_MIN_BUSY_429=4
  E2E_PARALLEL_AUTO_PREPARE=0
  E2E_PARALLEL_AUTO_START_SERVERS=0
  PW_HEADLESS=false
  PW_SLOWMO=100
  E2E_AGENT_BROWSER_WAIT_FOR_ATTACH=1
  E2E_AGENT_BROWSER_ATTACH_WAIT_MS=30000
  E2E_AGENT_BROWSER_HOLD_AFTER_RESULTS_MS=15000
  E2E_AGENT_BROWSER_CDP_PORT=9222
`);
    return;
  }

  const runtime = await ensureParallelRuntime({
    scriptLabel: "parallel20-production",
    frontendOrigin: FRONTEND_ORIGIN,
    backendOrigin: BACKEND_ORIGIN,
  });
  await mkdir(ARTIFACTS_DIR, { recursive: true });

  console.log(`[parallel20-production] frontend=${FRONTEND_ORIGIN}`);
  console.log(`[parallel20-production] students=${STUDENT_USERNAMES.join(",")}`);
  console.log(`[parallel20-production] bestModel=${BEST_MODEL}`);
  console.log(`[parallel20-production] slotCount=${SLOT_COUNT}`);
  console.log(`[parallel20-production] minInitialBusy429=${MIN_INITIAL_BUSY_429}`);
  console.log(`[parallel20-production] prepareScenario=${PREPARE_SCENARIO}`);
  console.log(`[parallel20-production] prepareTraining=${PREPARE_TRAINING}`);
  console.log(`[parallel20-production] retryBusy429=${RETRY_BUSY_429}`);
  console.log(`[parallel20-production] maxRetryRounds=${MAX_RETRY_ROUNDS}`);
  console.log(`[parallel20-production] retryRoundDelayMs=${RETRY_ROUND_DELAY_MS}`);
  console.log(`[parallel20-production] cdpPort=${CDP_PORT}`);
  console.log(`[parallel20-production] headless=${HEADLESS}`);
  console.log(`[parallel20-production] holdAfterResultsMs=${HOLD_AFTER_RESULTS_MS}`);

  try {
    await prepareScenarioAndTraining();

    const browser = await chromium.launch({
      headless: HEADLESS,
      slowMo: SLOW_MO,
      args: [`--remote-debugging-port=${CDP_PORT}`],
    });

    const runners = await createStudentRunners(browser);
    const barrier = new RequestBarrier(STUDENT_USERNAMES.length);

    try {
      await runStage("promote-to-production", runners, (runner) =>
        runner.promoteToProduction(),
      );
      await runStage("open-production-steps", runners, (runner) =>
        runner.openProductionSteps(),
      );
      await runStage("install-prepare-barrier", runners, (runner) =>
        runner.installPrepareBarrier(barrier),
      );

      if (WAIT_FOR_ATTACH) {
        await waitForInspector();
      }

      await runStage("trigger-production-prediction", runners, (runner) =>
        runner.triggerProductionPrediction(),
      );
      await barrier.waitForAll();
      console.log(
        "[parallel20-production] barrier reached by all students; releasing prepare-production requests",
      );
      barrier.releaseAll();

      const initialOutcomes = await collectOutcomes(runners);
      const initialCounts = {
        success: initialOutcomes.filter((outcome) => outcome.outcome === "success").length,
        busy429: initialOutcomes.filter((outcome) => outcome.outcome === "busy429").length,
        unexpected: initialOutcomes.filter((outcome) => outcome.outcome === "unexpected").length,
      };

      const retryResult = await retryBusy429Students(runners, initialOutcomes);
      const outcomes = retryResult.outcomes;
      const counts = {
        initialSuccess: initialCounts.success,
        initialBusy429: initialCounts.busy429,
        initialUnexpected: initialCounts.unexpected,
        success: outcomes.filter((outcome) => outcome.outcome === "success").length,
        busy429: outcomes.filter((outcome) => outcome.outcome === "busy429").length,
        unexpected: outcomes.filter((outcome) => outcome.outcome === "unexpected").length,
      };

      const summary: SummaryFile = {
        generatedAt: new Date().toISOString(),
        frontendOrigin: FRONTEND_ORIGIN,
        students: [...STUDENT_USERNAMES],
        bestModel: BEST_MODEL,
        slotCount: SLOT_COUNT,
        minInitialBusy429: MIN_INITIAL_BUSY_429,
        barrier: {
          expectedCount: STUDENT_USERNAMES.length,
          arrivalCount: barrier.getArrivals().length,
          arrivals: barrier.getArrivals(),
        },
        preparation: {
          scenarioPrepared: PREPARE_SCENARIO,
          trainingPrepared: PREPARE_TRAINING,
        },
        retry: {
          enabled: RETRY_BUSY_429,
          maxRetryRounds: MAX_RETRY_ROUNDS,
          retryRoundDelayMs: RETRY_ROUND_DELAY_MS,
          attemptedRounds: retryResult.attemptedRounds,
        },
        counts,
        outcomes,
      };
      await writeSummary(summary);

      for (const outcome of outcomes) {
        console.log(
          `[parallel20-production] ${outcome.username} experiment_id=${outcome.experimentId} stage=${outcome.stage} status=${outcome.httpStatus} outcome=${outcome.outcome} attempt=${outcome.attempt} elapsed=${formatDurationMs(outcome.elapsedMs)}`,
        );
      }

      ensure(
        counts.initialUnexpected === 0,
        `Unexpected initial production responses detected: ${counts.initialUnexpected}`,
      );
      ensure(
        counts.initialBusy429 >= MIN_INITIAL_BUSY_429,
        `Expected at least ${MIN_INITIAL_BUSY_429} initial busy 429 responses, got ${counts.initialBusy429}`,
      );
      ensure(
        counts.unexpected === 0,
        `Unexpected production responses detected after retries: ${counts.unexpected}`,
      );
      ensure(
        counts.success === STUDENT_USERNAMES.length,
        `Expected all students to succeed after retries, got success=${counts.success}, busy429=${counts.busy429}, unexpected=${counts.unexpected}`,
      );

      if (HOLD_AFTER_RESULTS_MS > 0) {
        console.log(
          `[parallel20-production] holding browser open for ${HOLD_AFTER_RESULTS_MS}ms after results`,
        );
        await delay(HOLD_AFTER_RESULTS_MS);
      }

      console.log("[parallel20-production] production burst verification passed");
    } finally {
      await Promise.allSettled(runners.map((runner) => runner.close()));
      await browser.close().catch(() => undefined);
    }
  } finally {
    await runtime.cleanup();
  }
}

await main().catch((error) => {
  console.error("[parallel20-production] failed", error);
  process.exit(1);
});
