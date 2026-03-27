import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
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

const FRONTEND_ORIGIN =
  process.env.E2E_FRONTEND_ORIGIN ??
  `http://127.0.0.1:${process.env.E2E_FRONTEND_PORT ?? "55104"}`;
const BACKEND_ORIGIN =
  process.env.E2E_BACKEND_ORIGIN ??
  `http://127.0.0.1:${process.env.E2E_BACKEND_PORT ?? "54104"}`;

const STUDENT_PASSWORD =
  process.env.E2E_PARALLEL20_STUDENT_PASSWORD ??
  process.env.E2E_PARALLEL_STUDENT_PASSWORD ??
  "StudentParallel!123";

const DEFAULT_STUDENT_USERNAMES = Array.from(
  { length: 20 },
  (_, index) => String(20246001 + index),
);
const STUDENT_USERNAMES =
  parseCsv(
    process.env.E2E_PARALLEL20_STUDENTS ?? process.env.E2E_PARALLEL_STUDENTS,
  ) ?? DEFAULT_STUDENT_USERNAMES;

const MOVING_AVERAGE_WINDOW = parsePositiveInteger(
  process.env.E2E_PARALLEL20_MA_WINDOW ?? "6",
  "E2E_PARALLEL20_MA_WINDOW",
);
const SLOT_COUNT = parsePositiveInteger(
  process.env.E2E_PARALLEL20_SLOT_COUNT ?? "16",
  "E2E_PARALLEL20_SLOT_COUNT",
);
const RETRY_BUSY_429 = process.env.E2E_PARALLEL20_RETRY_BUSY_429 !== "0";
const MAX_RETRY_ROUNDS = parseNonNegativeInteger(
  process.env.E2E_PARALLEL20_MAX_RETRY_ROUNDS ?? "8",
  "E2E_PARALLEL20_MAX_RETRY_ROUNDS",
);
const RETRY_ROUND_DELAY_MS = parseNonNegativeInteger(
  process.env.E2E_PARALLEL20_RETRY_ROUND_DELAY_MS ?? "250",
  "E2E_PARALLEL20_RETRY_ROUND_DELAY_MS",
);
const MIN_BUSY_429 = parseNonNegativeInteger(
  process.env.E2E_PARALLEL20_MIN_BUSY_429 ??
    String(Math.max(0, STUDENT_USERNAMES.length - SLOT_COUNT)),
  "E2E_PARALLEL20_MIN_BUSY_429",
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

const TRAINING_REQUEST_PATHNAME = "/api/v1/models/ma/training";
const TRAINING_RESPONSE_TIMEOUT_MS = 180_000;
const BARRIER_TIMEOUT_MS = 120_000;
const ARTIFACTS_DIR = path.resolve(
  process.cwd(),
  "test-results",
  "shiyan-training-burst-twenty",
);

type OutcomeKind = "success" | "busy429" | "unexpected";

interface TrainingOutcome {
  username: string;
  experimentId: number;
  currentStep: number | null;
  product: string | null;
  httpStatus: number;
  outcome: OutcomeKind;
  elapsedMs: number;
  responsePayload: unknown;
  attempt: number;
}

interface SummaryFile {
  generatedAt: string;
  frontendOrigin: string;
  students: string[];
  movingAverageWindow: number;
  slotCount: number;
  minBusy429: number;
  barrier: {
    expectedCount: number;
    arrivalCount: number;
    arrivals: Array<{ username: string; arrivedAt: string }>;
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
  outcomes: TrainingOutcome[];
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

function isTrainingResponse(response: Response): boolean {
  const url = new URL(response.url());
  return (
    url.pathname === TRAINING_REQUEST_PATHNAME &&
    response.request().method() === "POST"
  );
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

async function waitForInspector() {
  console.log(`[parallel20] agent-browser attach available via CDP port ${CDP_PORT}`);
  console.log("[parallel20] suggested commands:");
  console.log(`  agent-browser connect ${CDP_PORT}`);
  console.log("  agent-browser snapshot -i");
  console.log("  agent-browser network requests --clear");
  console.log("  agent-browser console --clear");

  if (ATTACH_WAIT_MS > 0) {
    console.log(`[parallel20] waiting ${ATTACH_WAIT_MS}ms for agent-browser attach`);
    await delay(ATTACH_WAIT_MS);
    return;
  }

  if (!process.stdin.isTTY) {
    console.log("[parallel20] stdin is not interactive, skipping attach pause");
    return;
  }

  console.log("[parallel20] press Enter after agent-browser is attached");
  process.stdin.resume();
  await new Promise<void>((resolve) => {
    process.stdin.once("data", () => resolve());
  });
}

class TrainingBarrier {
  private readonly arrivals: Array<{
    username: string;
    route: Route;
    arrivedAt: string;
  }> = [];

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
  private accepting = true;

  private readonly timeoutHandle: Timer;

  constructor(private readonly expectedCount: number) {
    this.timeoutHandle = setTimeout(() => {
      const arrivedUsernames = this.arrivals.map((arrival) => arrival.username);
      this.allArrivedRejecter(
        new Error(
          `Training barrier timed out waiting for ${this.expectedCount} requests; arrived=${this.arrivals.length}; usernames=${arrivedUsernames.join(",")}`,
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
      route,
      arrivedAt: new Date().toISOString(),
    });
    console.log(
      `[parallel20] barrier arrival ${this.arrivals.length}/${this.expectedCount} username=${username}`,
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
    return this.arrivals.map((arrival) => ({
      username: arrival.username,
      arrivedAt: arrival.arrivedAt,
    }));
  }
}

class StudentRunner {
  private readonly studentApp: StudentApp;
  private experiment: ExperimentRecord | null = null;
  private trainingResponsePromise: Promise<Response> | null = null;
  private trainingStartedAtMs: number | null = null;
  private currentAttempt = 0;

  constructor(
    readonly username: string,
    private readonly password: string,
    private readonly context: BrowserContext,
    readonly page: Page,
    private readonly token: string,
  ) {
    this.studentApp = new StudentApp(page, token);
  }

  async openMovingAverageParams() {
    const api = createStudentApiClient(this.token);
    this.experiment = await api.getActiveExperiment();

    ensure(
      this.experiment,
      `${this.username} has no active experiment; run training-burst seed first`,
    );
    ensure(
      this.experiment.status === "In Progress",
      `${this.username} active experiment status is ${String(this.experiment.status)}`,
    );
    ensure(
      (this.experiment.current_step ?? 0) >= 5,
      `${this.username} current_step must be >= 5, got ${String(this.experiment.current_step)}`,
    );

    await this.studentApp.open("/model/moving-average/params");
    await this.studentApp.expectHash("/model/moving-average/params");
  }

  async prepareValidation() {
    await this.page.locator("#window-size").fill(String(MOVING_AVERAGE_WINDOW));
    await this.studentApp.clickEnabledButton("下一步");
    await this.studentApp.expectHash("/model/moving-average/validation");
  }

  async installTrainingBarrier(barrier: TrainingBarrier) {
    await this.page.route(`**${TRAINING_REQUEST_PATHNAME}`, async (route) => {
      await barrier.intercept(this.username, route);
    });
  }

  async triggerTraining() {
    this.currentAttempt = 1;
    this.trainingStartedAtMs = Date.now();
    this.trainingResponsePromise = this.page.waitForResponse(isTrainingResponse, {
      timeout: TRAINING_RESPONSE_TIMEOUT_MS,
    });

    await this.studentApp.clickEnabledButton("下一步");
    await this.studentApp.expectHash("/model/moving-average/results");
  }

  async triggerRetry() {
    this.currentAttempt += 1;
    this.trainingStartedAtMs = Date.now();
    this.trainingResponsePromise = this.page.waitForResponse(isTrainingResponse, {
      timeout: TRAINING_RESPONSE_TIMEOUT_MS,
    });

    await expect(this.page.getByRole("button", { name: "重试" })).toBeVisible({
      timeout: 15_000,
    });
    await this.page.getByRole("button", { name: "重试" }).click();
    await this.studentApp.expectHash("/model/moving-average/results");
  }

  async collectOutcome(): Promise<TrainingOutcome> {
    ensure(this.experiment, `${this.username} experiment was not initialized`);
    ensure(
      this.trainingResponsePromise,
      `${this.username} training response promise was not initialized`,
    );
    ensure(
      this.trainingStartedAtMs !== null,
      `${this.username} training was not started`,
    );

    const response = await this.trainingResponsePromise;
    const elapsedMs = Date.now() - this.trainingStartedAtMs;
    const rawText = await response.text();
    const responsePayload = tryParseJson(rawText);
    const status = response.status();

    if (status === 429) {
      await expect(this.page.getByText(/模型服务繁忙，请稍后再试/)).toBeVisible({
        timeout: 30_000,
      });
      return {
        username: this.username,
        experimentId: this.experiment.experiment_id,
        currentStep: this.experiment.current_step,
        product: (this.experiment.selected_product as string | null) ?? null,
        httpStatus: status,
        outcome: "busy429",
        elapsedMs,
        responsePayload,
        attempt: this.currentAttempt,
      };
    }

    if (status === 200) {
      await expect(this.page.getByRole("button", { name: "图表" })).toBeVisible({
        timeout: 120_000,
      });
      return {
        username: this.username,
        experimentId: this.experiment.experiment_id,
        currentStep: this.experiment.current_step,
        product: (this.experiment.selected_product as string | null) ?? null,
        httpStatus: status,
        outcome: "success",
        elapsedMs,
        responsePayload,
        attempt: this.currentAttempt,
      };
    }

    return {
      username: this.username,
      experimentId: this.experiment.experiment_id,
      currentStep: this.experiment.current_step,
      product: (this.experiment.selected_product as string | null) ?? null,
      httpStatus: status,
      outcome: "unexpected",
      elapsedMs,
      responsePayload,
      attempt: this.currentAttempt,
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

  const runners = await Promise.all(
    credentials.map(async ({ username, token }) => {
      const context = await browser.newContext({
        baseURL: FRONTEND_ORIGIN,
        viewport: { width: 1440, height: 1100 },
        locale: "zh-CN",
      });
      const page = await context.newPage();
      return new StudentRunner(username, STUDENT_PASSWORD, context, page, token);
    }),
  );

  return runners;
}

async function runStage(
  stage: string,
  runners: StudentRunner[],
  action: (runner: StudentRunner, index: number) => Promise<void>,
) {
  const startedAt = Date.now();
  console.log(`[parallel20] stage=${stage} students=${runners.length}`);

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
    `[parallel20] stage=${stage} completed in ${formatDurationMs(Date.now() - startedAt)}`,
  );
}

async function collectOutcomes(runners: StudentRunner[]) {
  const results = await Promise.allSettled(
    runners.map(async (runner) => {
      try {
        return await runner.collectOutcome();
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

  return results.map((result) => (result as PromiseFulfilledResult<TrainingOutcome>).value);
}

async function retryBusy429Students(
  runners: StudentRunner[],
  initialOutcomes: TrainingOutcome[],
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
      `[parallel20] retry-round=${attemptedRounds} pending=${pending.map((runner) => runner.username).join(",")}`,
    );

    const retryResults = await Promise.allSettled(
      pending.map(async (runner) => {
        try {
          await runner.triggerRetry();
          return await runner.collectOutcome();
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
      const outcome = (result as PromiseFulfilledResult<TrainingOutcome>).value;
      latestByUsername.set(outcome.username, outcome);
      console.log(
        `[parallel20] retry-round=${attemptedRounds} ${outcome.username} status=${outcome.httpStatus} outcome=${outcome.outcome} attempt=${outcome.attempt} elapsed=${formatDurationMs(outcome.elapsedMs)}`,
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
  console.log(`[parallel20] wrote summary to ${targetPath}`);
}

async function main() {
  if (process.argv.includes("--help")) {
    console.log(`Usage: bun run scripts/shiyan-training-burst-twenty.ts

Default behavior:
  Automatically prepares the parallel database baseline
  Automatically seeds the training-burst scenario
  Automatically starts frontend/backend on the configured origins when needed

Optional environment:
  E2E_FRONTEND_ORIGIN=http://127.0.0.1:55104
  E2E_BACKEND_ORIGIN=http://127.0.0.1:54104
  E2E_PARALLEL20_STUDENTS=20246001,20246002,...,20246020
  E2E_PARALLEL20_MA_WINDOW=6
  E2E_PARALLEL20_SLOT_COUNT=16
  E2E_PARALLEL20_RETRY_BUSY_429=1
  E2E_PARALLEL20_MAX_RETRY_ROUNDS=8
  E2E_PARALLEL20_RETRY_ROUND_DELAY_MS=250
  E2E_PARALLEL20_MIN_BUSY_429=4
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
    scriptLabel: "parallel20-training",
    frontendOrigin: FRONTEND_ORIGIN,
    backendOrigin: BACKEND_ORIGIN,
    scenario: "training-burst",
  });
  await mkdir(ARTIFACTS_DIR, { recursive: true });

  console.log(`[parallel20] frontend=${FRONTEND_ORIGIN}`);
  console.log(`[parallel20] students=${STUDENT_USERNAMES.join(",")}`);
  console.log(`[parallel20] movingAverageWindow=${MOVING_AVERAGE_WINDOW}`);
  console.log(`[parallel20] slotCount=${SLOT_COUNT}`);
  console.log(`[parallel20] retryBusy429=${RETRY_BUSY_429}`);
  console.log(`[parallel20] maxRetryRounds=${MAX_RETRY_ROUNDS}`);
  console.log(`[parallel20] retryRoundDelayMs=${RETRY_ROUND_DELAY_MS}`);
  console.log(`[parallel20] minBusy429=${MIN_BUSY_429}`);
  console.log(`[parallel20] cdpPort=${CDP_PORT}`);
  console.log(`[parallel20] headless=${HEADLESS}`);
  console.log(`[parallel20] holdAfterResultsMs=${HOLD_AFTER_RESULTS_MS}`);

  try {
    const browser = await chromium.launch({
      headless: HEADLESS,
      slowMo: SLOW_MO,
      args: [`--remote-debugging-port=${CDP_PORT}`],
    });

    const runners = await createStudentRunners(browser);
    const barrier = new TrainingBarrier(STUDENT_USERNAMES.length);

    try {
      await runStage("open-moving-average-params", runners, (runner) =>
        runner.openMovingAverageParams(),
      );
      await runStage("prepare-validation", runners, (runner) =>
        runner.prepareValidation(),
      );
      await runStage("install-training-barrier", runners, (runner) =>
        runner.installTrainingBarrier(barrier),
      );

      if (WAIT_FOR_ATTACH) {
        await waitForInspector();
      }

      await runStage("trigger-training", runners, (runner) => runner.triggerTraining());
      await barrier.waitForAll();
      console.log("[parallel20] barrier reached by all students; releasing requests");
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
        movingAverageWindow: MOVING_AVERAGE_WINDOW,
        slotCount: SLOT_COUNT,
        minBusy429: MIN_BUSY_429,
        barrier: {
          expectedCount: STUDENT_USERNAMES.length,
          arrivalCount: barrier.getArrivals().length,
          arrivals: barrier.getArrivals(),
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
          `[parallel20] ${outcome.username} experiment_id=${outcome.experimentId} product=${outcome.product ?? "-"} status=${outcome.httpStatus} outcome=${outcome.outcome} elapsed=${formatDurationMs(outcome.elapsedMs)}`,
        );
      }

      ensure(
        counts.unexpected === 0,
        `Unexpected training responses detected: ${counts.unexpected}`,
      );
      ensure(
        counts.initialBusy429 >= MIN_BUSY_429,
        `Expected at least ${MIN_BUSY_429} initial busy 429 responses, got ${counts.initialBusy429}`,
      );
      ensure(
        counts.success === STUDENT_USERNAMES.length,
        `Expected all students to succeed after retries, got success=${counts.success}, busy429=${counts.busy429}, unexpected=${counts.unexpected}`,
      );

      if (HOLD_AFTER_RESULTS_MS > 0) {
        console.log(
          `[parallel20] holding browser open for ${HOLD_AFTER_RESULTS_MS}ms after results`,
        );
        await delay(HOLD_AFTER_RESULTS_MS);
      }

      console.log("[parallel20] training burst verification passed");
    } finally {
      await Promise.allSettled(runners.map((runner) => runner.close()));
      await browser.close().catch(() => undefined);
    }
  } finally {
    await runtime.cleanup();
  }
}

await main().catch((error) => {
  console.error("[parallel20] failed", error);
  process.exit(1);
});
