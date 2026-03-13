import path from "node:path";
import { mkdir } from "node:fs/promises";
import process from "node:process";
import {
  chromium,
  expect,
  type BrowserContext,
  type Page,
} from "@playwright/test";
import {
  REPORT_ANALYSES,
  clickLastEnabledButton,
  completeBaseModelIntroAndSelectTwo,
  completeEnsembleIntroAndSelect,
  completeEvaluationAndModelQuiz,
  completeExponentialSmoothing,
  completeIntroductionAndStartExperiment,
  completeMovingAverage,
  completeProductionAndPlanQuiz,
  completeWeightedEnsemble,
  enterEvaluation,
  expectHashPath,
} from "../tests/e2e/shiyan/support/ui-flow.ts";

const FRONTEND_ORIGIN =
  process.env.E2E_FRONTEND_ORIGIN ??
  `http://127.0.0.1:${process.env.E2E_FRONTEND_PORT ?? "55104"}`;
const BACKEND_ORIGIN =
  process.env.E2E_BACKEND_ORIGIN ??
  `http://127.0.0.1:${process.env.E2E_BACKEND_PORT ?? "54104"}`;

const STUDENT_PASSWORD =
  process.env.E2E_PARALLEL_STUDENT_PASSWORD ?? "StudentParallel!123";
const TEACHER_USERNAME =
  process.env.E2E_PARALLEL_TEACHER_USERNAME ?? "parallel_teacher";
const TEACHER_PASSWORD =
  process.env.E2E_PARALLEL_TEACHER_PASSWORD ?? "TeacherParallel!123";

const CLASS_ID = parsePositiveInteger(
  process.env.E2E_PARALLEL_CLASS_ID ?? "8401",
  "E2E_PARALLEL_CLASS_ID",
);
const REPORT_STAGGER_MS = parseNonNegativeInteger(
  process.env.E2E_PARALLEL_REPORT_STAGGER_MS ?? "0",
  "E2E_PARALLEL_REPORT_STAGGER_MS",
);
const HEADLESS = process.env.PW_HEADLESS !== "false";
const SLOW_MO = parseNonNegativeInteger(
  process.env.PW_SLOWMO ?? "0",
  "PW_SLOWMO",
);

const INDUSTRY_NAME =
  process.env.E2E_PARALLEL_INDUSTRY ?? "CONC_并发制造业";
const COMPANY_NAME =
  process.env.E2E_PARALLEL_COMPANY ?? "CONC_样本企业A";
const PRODUCT_NAME =
  process.env.E2E_PARALLEL_PRODUCT ?? "CONC_标准件A";
const DATA_WINDOW = {
  trainStart: process.env.E2E_PARALLEL_TRAIN_START ?? "0",
  trainEnd: process.env.E2E_PARALLEL_TRAIN_END ?? "35",
  evaluateStart: process.env.E2E_PARALLEL_EVALUATE_START ?? "36",
  evaluateEnd: process.env.E2E_PARALLEL_EVALUATE_END ?? "41",
} as const;

const DEFAULT_STUDENT_USERNAMES = Array.from(
  { length: 5 },
  (_, index) => String(20246001 + index),
);
const STUDENT_USERNAMES =
  parseCsv(process.env.E2E_PARALLEL_STUDENTS) ?? DEFAULT_STUDENT_USERNAMES;

const ARTIFACTS_DIR = path.resolve(
  process.cwd(),
  "test-results",
  "shiyan-parallel5",
);

interface SessionLoginResponse {
  token?: string;
  user?: {
    user_id: number;
    username: string;
    role: string;
    full_name: string | null;
  };
  data?: {
    token: string;
    user?: {
      user_id: number;
      username: string;
      role: string;
      full_name: string | null;
    };
  };
}

interface TeacherReportRecord {
  username: string;
  report_id: number | null;
  experiment_id: number | null;
  status: string | null;
  pdf_file_path: string | null;
}

interface ExperimentRunRecord {
  experiment_id: number;
  status: string;
  current_step: number | null;
  highest_completed_step: number | null;
  completion_time: string | null;
}

interface StudentExperimentRunsRecord {
  username: string;
  experiments: ExperimentRunRecord[];
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

async function loginViaApi(input: {
  username: string;
  password: string;
  role: "Teacher" | "Student";
}) {
  const response = await fetch(new URL("/api/v1/sessions", BACKEND_ORIGIN), {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(
      `Login failed for ${input.username}: ${response.status} ${await response.text()}`,
    );
  }

  const payload = (await response.json()) as SessionLoginResponse;
  const token = payload.token ?? payload.data?.token;
  ensure(token, `Login response for ${input.username} did not include a token`);

  return {
    token,
    user: payload.user ?? payload.data?.user ?? null,
  };
}

async function apiGet<T>(pathname: string, token: string): Promise<T> {
  const response = await fetch(new URL(pathname, BACKEND_ORIGIN), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`GET ${pathname} failed: ${response.status} ${await response.text()}`);
  }

  const payload = (await response.json()) as T | { data?: T };
  if (payload && typeof payload === "object" && "data" in payload) {
    return payload.data as T;
  }
  return payload as T;
}

async function selectParallelDatasetAndWindow(page: Page) {
  await page
    .getByRole("heading", { level: 3, name: INDUSTRY_NAME })
    .click({ force: true });
  await clickLastEnabledButton(page, "下一步");
  await expectHashPath(page, "/company");

  await page
    .getByRole("heading", { level: 3, name: COMPANY_NAME })
    .click({ force: true });
  await clickLastEnabledButton(page, "下一步");
  await expectHashPath(page, "/product");

  await page
    .getByRole("heading", { level: 3, name: PRODUCT_NAME })
    .click({ force: true });
  await clickLastEnabledButton(page, "下一步");
  await expectHashPath(page, "/data");

  await clickLastEnabledButton(page, "下一步：需求预测");
  await expect
    .poll(() => new URL(page.url()).hash, { timeout: 20_000 })
    .toMatch(/^#\/model(\/.*)?$/);

  let hash = new URL(page.url()).hash;
  if (hash === "#/model") {
    await expectHashPath(page, "/model/scenario");
    hash = new URL(page.url()).hash;
  }

  if (hash === "#/model/scenario") {
    await clickLastEnabledButton(page, /下一步/);
    await expectHashPath(page, "/model/role-intro");
    hash = new URL(page.url()).hash;
  }

  if (hash === "#/model/role-intro") {
    await clickLastEnabledButton(page, /下一步|开始预测工作/);
    await expectHashPath(page, "/model/window");
    hash = new URL(page.url()).hash;
  }

  ensure(
    hash === "#/model/window",
    `Unexpected model hash before data window selection: ${hash}`,
  );

  const selects = page.locator("select");
  await expect(selects).toHaveCount(4);
  await selects.nth(0).selectOption(DATA_WINDOW.trainStart);
  await selects.nth(1).selectOption(DATA_WINDOW.trainEnd);
  await selects.nth(2).selectOption(DATA_WINDOW.evaluateStart);
  await selects.nth(3).selectOption(DATA_WINDOW.evaluateEnd);

  await clickLastEnabledButton(page, "下一步");
  await expectHashPath(page, "/model/model-intro");
}

async function submitReportAndLogout(page: Page) {
  await expectHashPath(page, "/report");

  const textareas = page.locator(
    'textarea[placeholder*="请根据上述实验结果"]',
  );
  await expect(textareas).toHaveCount(5);

  for (let index = 0; index < REPORT_ANALYSES.length; index += 1) {
    await textareas.nth(index).fill(REPORT_ANALYSES[index]!);
  }

  await clickLastEnabledButton(page, /保存并提交报告/);
  await expect(page.getByText("恭喜！实验完成")).toBeVisible({
    timeout: 120_000,
  });
  await clickLastEnabledButton(page, /退出登录/);
  await expect
    .poll(() => new URL(page.url()).pathname, { timeout: 15_000 })
    .toBe("/login.html");
}

class StudentRunner {
  constructor(
    readonly username: string,
    private readonly password: string,
    private readonly context: BrowserContext,
    readonly page: Page,
  ) {}

  async login() {
    await this.page.goto(new URL("/login.html", FRONTEND_ORIGIN).toString(), {
      waitUntil: "domcontentloaded",
    });
    await this.page.locator('[data-role="student"]').click();
    await this.page.locator("#login-username").fill(this.username);
    await this.page.locator("#login-password").fill(this.password);
    await this.page.getByRole("button", { name: /登录系统|登录/ }).click();

    await expect
      .poll(() => new URL(this.page.url()).pathname, { timeout: 30_000 })
      .toBe("/exp.html");
  }

  async startExperiment() {
    await completeIntroductionAndStartExperiment(this.page);
  }

  async selectDatasetAndWindow() {
    await selectParallelDatasetAndWindow(this.page);
  }

  async buildModels() {
    await completeBaseModelIntroAndSelectTwo(this.page);
    await completeMovingAverage(this.page);
    await completeExponentialSmoothing(this.page);
    await completeEnsembleIntroAndSelect(this.page, "加权平均融合");
    await completeWeightedEnsemble(this.page);
    await enterEvaluation(this.page);
  }

  async finishEvaluationAndQuiz() {
    await completeEvaluationAndModelQuiz(this.page, "加权平均融合");
  }

  async finishProductionAndPlanQuiz() {
    await completeProductionAndPlanQuiz(this.page);
  }

  async submitReport(index: number) {
    if (REPORT_STAGGER_MS > 0) {
      await delay(index * REPORT_STAGGER_MS);
    }
    await submitReportAndLogout(this.page);
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

async function createStudentRunners() {
  const browser = await chromium.launch({
    headless: HEADLESS,
    slowMo: SLOW_MO,
  });

  const runners = await Promise.all(
    STUDENT_USERNAMES.map(async (username) => {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 1100 },
        locale: "zh-CN",
      });
      const page = await context.newPage();
      return new StudentRunner(username, STUDENT_PASSWORD, context, page);
    }),
  );

  return { browser, runners };
}

async function runStage(
  stage: string,
  runners: StudentRunner[],
  action: (runner: StudentRunner, index: number) => Promise<void>,
) {
  const startedAt = Date.now();
  console.log(`[parallel5] stage=${stage} students=${runners.length}`);

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
    `[parallel5] stage=${stage} completed in ${formatDurationMs(Date.now() - startedAt)}`,
  );
}

async function verifyTeacherSide(expectedUsernames: readonly string[]) {
  const teacherSession = await loginViaApi({
    username: TEACHER_USERNAME,
    password: TEACHER_PASSWORD,
    role: "Teacher",
  });

  const [reports, experimentRuns] = await Promise.all([
    apiGet<TeacherReportRecord[]>(
      `/api/v1/classes/${CLASS_ID}/reports`,
      teacherSession.token,
    ),
    apiGet<StudentExperimentRunsRecord[]>(
      `/api/v1/classes/${CLASS_ID}/experiment-runs`,
      teacherSession.token,
    ),
  ]);

  const reportByUsername = new Map(
    reports.map((report) => [report.username, report]),
  );
  const runByUsername = new Map(
    experimentRuns.map((record) => [record.username, record]),
  );

  for (const username of expectedUsernames) {
    const report = reportByUsername.get(username);
    ensure(report, `Teacher reports missing student ${username}`);
    ensure(report.report_id !== null, `${username} report_id is null`);
    ensure(report.experiment_id !== null, `${username} experiment_id is null`);
    ensure(
      report.status === "submitted" || report.status === "graded",
      `${username} report status is unexpected: ${String(report.status)}`,
    );
    ensure(report.pdf_file_path, `${username} pdf_file_path is missing`);

    const runRecord = runByUsername.get(username);
    ensure(runRecord, `Teacher experiment runs missing student ${username}`);
    ensure(runRecord.experiments.length > 0, `${username} has no experiments`);

    const latestExperiment = [...runRecord.experiments].sort(
      (left, right) => right.experiment_id - left.experiment_id,
    )[0];

    ensure(latestExperiment, `${username} has no latest experiment`);
    ensure(
      latestExperiment.status === "Completed",
      `${username} latest experiment status is ${latestExperiment.status}`,
    );
    ensure(
      latestExperiment.current_step === 7,
      `${username} current_step is ${String(latestExperiment.current_step)}`,
    );
    ensure(
      latestExperiment.highest_completed_step === 7,
      `${username} highest_completed_step is ${String(latestExperiment.highest_completed_step)}`,
    );
    ensure(
      Boolean(latestExperiment.completion_time),
      `${username} completion_time is missing`,
    );
  }

  console.log("[parallel5] teacher verification passed");
  for (const username of expectedUsernames) {
    const report = reportByUsername.get(username)!;
    console.log(
      `[parallel5] ${username} report_id=${report.report_id} experiment_id=${report.experiment_id} status=${report.status}`,
    );
  }
}

async function main() {
  if (process.argv.includes("--help")) {
    console.log(`Usage: bun run scripts/shiyan-concurrency-five.ts

Required environment:
  E2E_FRONTEND_ORIGIN=http://127.0.0.1:55104
  E2E_BACKEND_ORIGIN=http://127.0.0.1:54104

Optional environment:
  E2E_PARALLEL_STUDENTS=20246001,20246002,20246003,20246004,20246005
  E2E_PARALLEL_REPORT_STAGGER_MS=0
  PW_HEADLESS=false
  PW_SLOWMO=100
`);
    return;
  }

  await mkdir(ARTIFACTS_DIR, { recursive: true });

  console.log(`[parallel5] frontend=${FRONTEND_ORIGIN}`);
  console.log(`[parallel5] backend=${BACKEND_ORIGIN}`);
  console.log(`[parallel5] classId=${CLASS_ID}`);
  console.log(`[parallel5] students=${STUDENT_USERNAMES.join(",")}`);
  console.log(`[parallel5] reportStaggerMs=${REPORT_STAGGER_MS}`);

  const { browser, runners } = await createStudentRunners();

  try {
    await runStage("login", runners, (runner) => runner.login());
    await runStage("start-experiment", runners, (runner) =>
      runner.startExperiment(),
    );
    await runStage("select-dataset-window", runners, (runner) =>
      runner.selectDatasetAndWindow(),
    );
    await runStage("build-models", runners, (runner) => runner.buildModels());
    await runStage("evaluation-and-model-quiz", runners, (runner) =>
      runner.finishEvaluationAndQuiz(),
    );
    await runStage("production-and-plan-quiz", runners, (runner) =>
      runner.finishProductionAndPlanQuiz(),
    );
    await runStage("submit-report", runners, (runner, index) =>
      runner.submitReport(index),
    );

    await verifyTeacherSide(STUDENT_USERNAMES);
    console.log("[parallel5] all students completed the shiyan flow");
  } finally {
    await Promise.allSettled(runners.map((runner) => runner.close()));
    await browser.close().catch(() => undefined);
  }
}

await main();
