import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { once } from "node:events";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";
import { resolveE2EBackendDir } from "../tests/e2e/helpers/backend-dir";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE_DIR = path.resolve(__dirname, "..");
const BE_DIR = resolveE2EBackendDir(FE_DIR);
const STARTUP_TIMEOUT_MS = 120_000;

type SuiteName = "all" | "model" | "pdf";
type OutcomeKind = "success" | "busy429" | "busy503" | "conflict409" | "unexpected";

const BACKEND_ORIGIN =
  process.env.E2E_CONCURRENCY_BACKEND_ORIGIN ??
  `http://127.0.0.1:${process.env.E2E_CONCURRENCY_BACKEND_PORT ?? "54108"}`;
const STUDENT_PASSWORD =
  process.env.E2E_CONCURRENCY_STUDENT_PASSWORD ??
  process.env.E2E_PARALLEL_STUDENT_PASSWORD ??
  "StudentParallel!123";
const MODEL_CONCURRENCY = parsePositiveInteger(
  process.env.E2E_CONCURRENCY_MODEL_JOBS ?? "2",
  "E2E_CONCURRENCY_MODEL_JOBS",
);
const MODEL_CAPACITY_REQUESTS = parsePositiveInteger(
  process.env.E2E_CONCURRENCY_MODEL_CAPACITY_REQUESTS ??
    String(Math.min(MODEL_CONCURRENCY, 2)),
  "E2E_CONCURRENCY_MODEL_CAPACITY_REQUESTS",
);
const DB_CONNECTION_LIMIT = parsePositiveInteger(
  process.env.DB_CONNECTION_LIMIT ?? "48",
  "DB_CONNECTION_LIMIT",
);
const PDF_CONCURRENCY = parsePositiveInteger(
  process.env.E2E_CONCURRENCY_PDF_JOBS ?? "1",
  "E2E_CONCURRENCY_PDF_JOBS",
);
const PDF_STUDENT_COUNT = parsePositiveInteger(
  process.env.E2E_CONCURRENCY_PDF_STUDENTS ?? "4",
  "E2E_CONCURRENCY_PDF_STUDENTS",
);
const PDF_QUEUE_TIMEOUT_MS = parsePositiveInteger(
  process.env.E2E_CONCURRENCY_PDF_QUEUE_TIMEOUT_MS ?? "1",
  "E2E_CONCURRENCY_PDF_QUEUE_TIMEOUT_MS",
);
const PDF_GENERATION_TIMEOUT_MS = parsePositiveInteger(
  process.env.E2E_CONCURRENCY_PDF_GENERATION_TIMEOUT_MS ?? "30000",
  "E2E_CONCURRENCY_PDF_GENERATION_TIMEOUT_MS",
);
const REQUEST_TIMEOUT_MS = parsePositiveInteger(
  process.env.E2E_CONCURRENCY_REQUEST_TIMEOUT_MS ?? "180000",
  "E2E_CONCURRENCY_REQUEST_TIMEOUT_MS",
);
const AUTO_PREPARE = process.env.E2E_CONCURRENCY_AUTO_PREPARE !== "0";
const AUTO_START_BACKEND = process.env.E2E_CONCURRENCY_AUTO_START_BACKEND !== "0";
const EXPECT_PDF_503 = process.env.E2E_CONCURRENCY_EXPECT_PDF_503 !== "0";
const ARTIFACTS_DIR = path.resolve(process.cwd(), "test-results", "shiyan-concurrency");
const TRAINING_STUDENT_USERNAME = "20246001";
const PRODUCTION_STUDENT_USERNAME =
  process.env.E2E_CONCURRENCY_PRODUCTION_STUDENT_USERNAME ?? "20246031";

const MODEL_SLOT_LOCK_SCRIPT = `
import mysql from "mysql2/promise";

const lockCount = Number(process.env.E2E_MODEL_SLOT_LOCK_COUNT ?? "0");
const firstSlot = Number(process.env.E2E_MODEL_SLOT_LOCK_START ?? "1");
const connectionOptions = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_DATABASE,
  charset: "utf8mb4",
};

if (!connectionOptions.host || !connectionOptions.user || !connectionOptions.database) {
  throw new Error("Missing DB connection environment variables");
}
if (!Number.isInteger(lockCount) || lockCount < 0) {
  throw new Error(\`E2E_MODEL_SLOT_LOCK_COUNT must be a non-negative integer, got: \${process.env.E2E_MODEL_SLOT_LOCK_COUNT}\`);
}
if (!Number.isInteger(firstSlot) || firstSlot <= 0) {
  throw new Error(\`E2E_MODEL_SLOT_LOCK_START must be a positive integer, got: \${process.env.E2E_MODEL_SLOT_LOCK_START}\`);
}

const connection = await mysql.createConnection(connectionOptions);
const lockNames = [];

try {
  for (let slot = firstSlot; slot < firstSlot + lockCount; slot += 1) {
    const name = \`fangzhen-model:slot:\${slot}\`;
    const [rows] = await connection.query("SELECT GET_LOCK(?, 0) AS acquired", [name]);
    if (rows[0]?.acquired !== 1) {
      throw new Error(\`Failed to acquire model slot lock: \${name}\`);
    }
    lockNames.push(name);
  }

  console.log("LOCKS_ACQUIRED");
  process.stdin.resume();
  await new Promise((resolve) => process.stdin.once("data", resolve));
} finally {
  for (let index = lockNames.length - 1; index >= 0; index -= 1) {
    try {
      await connection.query("SELECT RELEASE_LOCK(?)", [lockNames[index]]);
    } catch {
      // Ignore release failures during test cleanup.
    }
  }
  await connection.end().catch(() => {});
}
`;

const NAMED_ADVISORY_LOCK_SCRIPT = `
import mysql from "mysql2/promise";

const rawLockNames = process.env.E2E_ADVISORY_LOCK_NAMES;
if (!rawLockNames) {
  throw new Error("E2E_ADVISORY_LOCK_NAMES is required");
}

const lockNames = JSON.parse(rawLockNames);
if (!Array.isArray(lockNames) || lockNames.length === 0 || !lockNames.every((name) => typeof name === "string" && name.length > 0)) {
  throw new Error("E2E_ADVISORY_LOCK_NAMES must be a non-empty JSON string array");
}

const connectionOptions = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_DATABASE,
  charset: "utf8mb4",
};

if (!connectionOptions.host || !connectionOptions.user || !connectionOptions.database) {
  throw new Error("Missing DB connection environment variables");
}

const connection = await mysql.createConnection(connectionOptions);
const acquired = [];

try {
  for (const name of lockNames) {
    const [rows] = await connection.query("SELECT GET_LOCK(?, 0) AS acquired", [name]);
    if (rows[0]?.acquired !== 1) {
      throw new Error(\`Failed to acquire advisory lock: \${name}\`);
    }
    acquired.push(name);
  }

  console.log("LOCKS_ACQUIRED");
  process.stdin.resume();
  await new Promise((resolve) => process.stdin.once("data", resolve));
} finally {
  for (let index = acquired.length - 1; index >= 0; index -= 1) {
    try {
      await connection.query("SELECT RELEASE_LOCK(?)", [acquired[index]]);
    } catch {
      // Ignore release failures during test cleanup.
    }
  }
  await connection.end().catch(() => {});
}
`;

interface RuntimeInfo {
  app?: string;
  database?: string;
  concurrency?: {
    systemParallelism?: unknown;
    maxConcurrentModelJobs?: unknown;
    maxConcurrentPdfJobs?: unknown;
    dbConnectionLimit?: unknown;
    dbLockConnections?: unknown;
    dbQueryHeadroom?: unknown;
    pythonModelProcessThreads?: unknown;
    pythonTensorflowInterOpThreads?: unknown;
  };
  timeouts?: {
    pdfQueueMs?: unknown;
    pdfGenerationMs?: unknown;
  };
}

interface LoginResponse {
  token?: string;
  data?: {
    token?: string;
  };
}

interface ExperimentRecord {
  experiment_id: number;
  status: string | null;
  current_step: number | null;
  highest_completed_step: number | null;
  production_forecast_results?: unknown;
  production_mps_table?: unknown;
}

interface RequestOutcome {
  username: string;
  experimentId: number;
  httpStatus: number;
  outcome: OutcomeKind;
  elapsedMs: number;
  payload: unknown;
}

interface ModelSlotLockHandle {
  release: () => Promise<void>;
}

function parsePositiveInteger(value: string, envName: string): number {
  const normalizedValue = value.trim();
  if (!/^[1-9]\d*$/.test(normalizedValue)) {
    throw new Error(`${envName} must be a positive integer, got: ${value}`);
  }

  const parsed = Number(normalizedValue);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`${envName} must be a positive integer, got: ${value}`);
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

function unwrapDataEnvelope<T>(payload: unknown): T {
  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    Object.keys(payload as Record<string, unknown>).length === 1
  ) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function appendLog(buffer: string, chunk: Buffer | string) {
  const next = `${buffer}${chunk.toString()}`;
  return next.length > 8000 ? next.slice(-8000) : next;
}

function parseSuiteName(): SuiteName {
  const rawValue = process.argv
    .slice(2)
    .find((value) => value !== "--" && !value.startsWith("--"))
    ?.trim();

  if (!rawValue) {
    return "all";
  }

  if (rawValue === "all" || rawValue === "model" || rawValue === "pdf") {
    return rawValue;
  }

  throw new Error(`Unknown concurrency suite "${rawValue}". Expected all, model, or pdf.`);
}

async function runSubcommand(input: {
  label: string;
  cwd: string;
  args: string[];
  env?: Record<string, string>;
}) {
  console.log(`[concurrency] ${input.label}: bun ${input.args.join(" ")} (cwd=${input.cwd})`);
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
      reject(new Error(`${input.label} failed (code=${String(code)}, signal=${String(signal)})`));
    });
  });
}

async function isReachable(url: URL) {
  const response = await fetch(url, { redirect: "manual" }).catch(() => null);
  return Boolean(response);
}

async function fetchJson(url: URL): Promise<unknown | null> {
  const response = await fetch(url, { redirect: "manual" }).catch(() => null);
  if (!response?.ok) {
    return null;
  }
  return await response.json().catch(() => null);
}

async function fetchRuntimeInfo(): Promise<RuntimeInfo | null> {
  const payload = await fetchJson(new URL("/api/v1/runtime-info", BACKEND_ORIGIN));
  if (!payload) {
    return null;
  }
  return unwrapDataEnvelope<RuntimeInfo>(payload);
}

async function waitForBackend(logs?: () => string) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < STARTUP_TIMEOUT_MS) {
    const runtimeInfo = await fetchRuntimeInfo();
    if (runtimeInfo?.app === "fangzhen-be") {
      return runtimeInfo;
    }
    await delay(500);
  }

  const detail = logs?.().trim();
  throw new Error(
    `Backend did not become ready within ${STARTUP_TIMEOUT_MS}ms at ${BACKEND_ORIGIN}${detail ? `\n${detail}` : ""}`,
  );
}

function expectedBackendEnv() {
  return {
    MAX_CONCURRENT_MODEL_JOBS: String(MODEL_CONCURRENCY),
    MAX_CONCURRENT_PDF_JOBS: String(PDF_CONCURRENCY),
    PDF_QUEUE_TIMEOUT_MS: String(PDF_QUEUE_TIMEOUT_MS),
    PDF_GENERATION_TIMEOUT_MS: String(PDF_GENERATION_TIMEOUT_MS),
      DB_CONNECTION_LIMIT: process.env.DB_CONNECTION_LIMIT ?? "48",
    PYTHON_MODEL_THREADS: process.env.PYTHON_MODEL_THREADS ?? "1",
    TF_NUM_INTEROP_THREADS: process.env.TF_NUM_INTEROP_THREADS ?? "1",
  };
}

function validateRuntimeInfo(runtimeInfo: RuntimeInfo) {
  ensure(
    Number(runtimeInfo.concurrency?.maxConcurrentModelJobs) === MODEL_CONCURRENCY,
    `Expected backend maxConcurrentModelJobs=${MODEL_CONCURRENCY}, got ${String(runtimeInfo.concurrency?.maxConcurrentModelJobs)}`,
  );
  ensure(
    Number(runtimeInfo.concurrency?.maxConcurrentPdfJobs) === PDF_CONCURRENCY,
    `Expected backend maxConcurrentPdfJobs=${PDF_CONCURRENCY}, got ${String(runtimeInfo.concurrency?.maxConcurrentPdfJobs)}`,
  );
  ensure(
    Number(runtimeInfo.timeouts?.pdfQueueMs) === PDF_QUEUE_TIMEOUT_MS,
    `Expected backend pdfQueueMs=${PDF_QUEUE_TIMEOUT_MS}, got ${String(runtimeInfo.timeouts?.pdfQueueMs)}`,
  );
  ensure(
    Number(runtimeInfo.timeouts?.pdfGenerationMs) === PDF_GENERATION_TIMEOUT_MS,
    `Expected backend pdfGenerationMs=${PDF_GENERATION_TIMEOUT_MS}, got ${String(runtimeInfo.timeouts?.pdfGenerationMs)}`,
  );
  ensure(
    Number(runtimeInfo.concurrency?.dbConnectionLimit) === DB_CONNECTION_LIMIT,
    `Expected backend dbConnectionLimit=${DB_CONNECTION_LIMIT}, got ${String(runtimeInfo.concurrency?.dbConnectionLimit)}`,
  );
  ensure(
    Number(runtimeInfo.concurrency?.dbLockConnections) === MODEL_CONCURRENCY * 2,
    `Expected backend dbLockConnections=${MODEL_CONCURRENCY * 2}, got ${String(runtimeInfo.concurrency?.dbLockConnections)}`,
  );
  ensure(
    Number(runtimeInfo.concurrency?.pythonModelProcessThreads) >= 1,
    `Expected backend pythonModelProcessThreads to be positive, got ${String(runtimeInfo.concurrency?.pythonModelProcessThreads)}`,
  );
}

async function startBackend(): Promise<ChildProcessWithoutNullStreams | null> {
  if (!AUTO_START_BACKEND) {
    const runtimeInfo = await waitForBackend();
    validateRuntimeInfo(runtimeInfo);
    return null;
  }

  const rootUrl = new URL("/", BACKEND_ORIGIN);
  if (await isReachable(rootUrl)) {
    const runtimeInfo = await fetchRuntimeInfo();
    if (runtimeInfo?.app === "fangzhen-be") {
      validateRuntimeInfo(runtimeInfo);
      console.log(`[concurrency] reusing backend ${BACKEND_ORIGIN}`);
      return null;
    }
    throw new Error(`Refusing to use ${BACKEND_ORIGIN}: runtime identity mismatch`);
  }

  let recentLogs = "";
  const backendPort = new URL(BACKEND_ORIGIN).port || "54108";
  const child = spawn("bun", ["run", "src/index.ts"], {
    cwd: BE_DIR,
    env: {
      ...process.env,
      PORT: backendPort,
      ...expectedBackendEnv(),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });

  child.stdout.on("data", (chunk) => {
    recentLogs = appendLog(recentLogs, chunk);
  });
  child.stderr.on("data", (chunk) => {
    recentLogs = appendLog(recentLogs, chunk);
  });

  const exitPromise = new Promise<never>((_, reject) => {
    child.once("exit", (code, signal) => {
      reject(
        new Error(
          `Backend exited before ready (code=${String(code)}, signal=${String(signal)})${recentLogs ? `\n${recentLogs}` : ""}`,
        ),
      );
    });
    child.once("error", reject);
  });

  const runtimeInfo = await Promise.race([waitForBackend(() => recentLogs), exitPromise]);
  validateRuntimeInfo(runtimeInfo);
  console.log(`[concurrency] started backend ${BACKEND_ORIGIN}`);
  return child;
}

async function stopBackend(child: ChildProcessWithoutNullStreams | null) {
  if (!child || child.exitCode !== null) {
    return;
  }

  child.kill("SIGTERM");
  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      resolve();
    }, 5_000);
    child.once("exit", () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

async function requestJson(input: {
  pathname: string;
  method?: "GET" | "POST";
  token?: string;
  body?: unknown;
  timeoutMs?: number;
}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? REQUEST_TIMEOUT_MS);
  const startedAt = Date.now();

  try {
    const response = await fetch(new URL(input.pathname, BACKEND_ORIGIN), {
      method: input.method ?? "GET",
      headers: {
        "content-type": "application/json",
        ...(input.token ? { Authorization: `Bearer ${input.token}` } : {}),
      },
      body: input.body === undefined ? undefined : JSON.stringify(input.body),
      signal: controller.signal,
    });

    const text = await response.text();
    let payload: unknown = null;
    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = text;
      }
    }

    return {
      status: response.status,
      ok: response.ok,
      payload,
      elapsedMs: Date.now() - startedAt,
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function loginStudent(username: string) {
  const response = await requestJson({
    pathname: "/api/v1/sessions",
    method: "POST",
    body: {
      username,
      password: STUDENT_PASSWORD,
      role: "Student",
    },
  });

  if (!response.ok) {
    throw new Error(`Login failed for ${username}: ${response.status} ${JSON.stringify(response.payload)}`);
  }

  const payload = unwrapDataEnvelope<LoginResponse>(response.payload);
  const token = payload.token ?? payload.data?.token;
  ensure(token, `Login response for ${username} did not include a token`);
  return token;
}

async function listExperiments(token: string) {
  const response = await requestJson({
    pathname: "/api/v1/students/me/experiment-runs",
    token,
  });

  if (!response.ok) {
    throw new Error(`List experiments failed: ${response.status} ${JSON.stringify(response.payload)}`);
  }

  return unwrapDataEnvelope<ExperimentRecord[]>(response.payload);
}

async function getLatestExperiment(username: string) {
  const token = await loginStudent(username);
  const experiments = await listExperiments(token);
  const experiment = experiments[0];
  ensure(experiment, `No seeded experiment found for ${username}`);
  return {
    username,
    token,
    experimentId: experiment.experiment_id,
    experiment,
  };
}

async function waitForReady(child: ChildProcessWithoutNullStreams) {
  const readyText = "LOCKS_ACQUIRED";
  let stdout = "";
  let stderr = "";

  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");

  return await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      child.stdout.off("data", onStdout);
      child.stderr.off("data", onStderr);
      child.off("exit", onExit);
      child.off("error", onError);
    };

    const onStdout = (chunk: string) => {
      stdout += chunk;
      if (stdout.includes(readyText)) {
        cleanup();
        resolve();
      }
    };

    const onStderr = (chunk: string) => {
      stderr += chunk;
    };

    const onExit = (code: number | null, signal: NodeJS.Signals | null) => {
      cleanup();
      reject(
        new Error(
          `Model slot lock helper exited before ready (code=${String(code)}, signal=${String(signal)}): ${stderr || stdout}`,
        ),
      );
    };

    const onError = (error: Error) => {
      cleanup();
      reject(error);
    };

    child.stdout.on("data", onStdout);
    child.stderr.on("data", onStderr);
    child.on("exit", onExit);
    child.on("error", onError);
  });
}

async function acquireModelSlots(slotCount: number, firstSlot = 1): Promise<ModelSlotLockHandle> {
  const child = spawn("bun", ["-e", MODEL_SLOT_LOCK_SCRIPT], {
    cwd: BE_DIR,
    env: {
      ...process.env,
      E2E_MODEL_SLOT_LOCK_COUNT: String(slotCount),
      E2E_MODEL_SLOT_LOCK_START: String(firstSlot),
    },
    stdio: ["pipe", "pipe", "pipe"],
  });

  await waitForReady(child);

  return {
    release: async () => {
      if (child.exitCode !== null) {
        return;
      }

      child.stdin.end("\n");
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      const [code, signal] = await Promise.race([
        once(child, "exit"),
        new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            child.kill("SIGKILL");
            reject(new Error("Model slot lock helper did not exit in time"));
          }, 5_000);
        }),
      ]);
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
      if (code !== 0) {
        throw new Error(
          `Model slot lock helper exited abnormally (code=${String(code)}, signal=${String(signal)})`,
        );
      }
    },
  };
}

async function acquireNamedAdvisoryLocks(lockNames: string[]): Promise<ModelSlotLockHandle> {
  const child = spawn("bun", ["-e", NAMED_ADVISORY_LOCK_SCRIPT], {
    cwd: BE_DIR,
    env: {
      ...process.env,
      E2E_ADVISORY_LOCK_NAMES: JSON.stringify(lockNames),
    },
    stdio: ["pipe", "pipe", "pipe"],
  });

  await waitForReady(child);

  return {
    release: async () => {
      if (child.exitCode !== null) {
        return;
      }

      child.stdin.end("\n");
      let timeoutId: ReturnType<typeof setTimeout> | undefined;
      const [code, signal] = await Promise.race([
        once(child, "exit"),
        new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => {
            child.kill("SIGKILL");
            reject(new Error("Named advisory lock helper did not exit in time"));
          }, 5_000);
        }),
      ]);
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
      if (code !== 0) {
        throw new Error(
          `Named advisory lock helper exited abnormally (code=${String(code)}, signal=${String(signal)})`,
        );
      }
    },
  };
}

async function prepareParallelScenario(scenario: "start-only" | "training-burst" | "mixed-load") {
  if (!AUTO_PREPARE) {
    return;
  }

  await runSubcommand({
    label: `prepare-parallel:${scenario}`,
    cwd: BE_DIR,
    args: ["run", "scripts/prepare-parallel.ts", scenario, "--force"],
  });
}

async function prepareReportBurstScenario() {
  if (!AUTO_PREPARE) {
    return;
  }

  await prepareParallelScenario("start-only");
  await runSubcommand({
    label: "seed-parallel-report-burst",
    cwd: BE_DIR,
    args: ["run", "seed:parallel:report-burst", "--force"],
    env: {
      E2E_PDF_BURST_STUDENT_COUNT: String(PDF_STUDENT_COUNT),
    },
  });
}

function modelTrainingBody(experimentId: number) {
  return {
    experiment_id: experimentId,
    moving_average_window: 6,
  };
}

async function submitMovingAverageTraining(input: {
  username: string;
  token: string;
  experimentId: number;
}): Promise<RequestOutcome> {
  const response = await requestJson({
    pathname: "/api/v1/models/ma/training",
    method: "POST",
    token: input.token,
    body: modelTrainingBody(input.experimentId),
  });

  return {
    username: input.username,
    experimentId: input.experimentId,
    httpStatus: response.status,
    outcome: response.ok
      ? "success"
      : response.status === 429
        ? "busy429"
        : response.status === 409
          ? "conflict409"
          : "unexpected",
    elapsedMs: response.elapsedMs,
    payload: response.payload,
  };
}

async function prepareProductionModel(input: {
  username: string;
  token: string;
  experimentId: number;
  modelType?: "ma" | "weighted_avg";
}): Promise<RequestOutcome> {
  const modelType = input.modelType ?? "ma";
  const response = await requestJson({
    pathname: `/api/v1/models/${modelType}/prepare-production`,
    method: "POST",
    token: input.token,
    body: {
      experiment_id: input.experimentId,
    },
  });

  return {
    username: input.username,
    experimentId: input.experimentId,
    httpStatus: response.status,
    outcome: response.ok ? "success" : response.status === 429 ? "busy429" : "unexpected",
    elapsedMs: response.elapsedMs,
    payload: response.payload,
  };
}

async function predictWithProductionModel(input: {
  username: string;
  token: string;
  experimentId: number;
}): Promise<RequestOutcome> {
  const response = await requestJson({
    pathname: "/api/v1/models/ma/predict",
    method: "POST",
    token: input.token,
    body: {
      experiment_id: input.experimentId,
      forecast_steps: 6,
    },
  });

  return {
    username: input.username,
    experimentId: input.experimentId,
    httpStatus: response.status,
    outcome: response.ok ? "success" : response.status === 429 ? "busy429" : "unexpected",
    elapsedMs: response.elapsedMs,
    payload: response.payload,
  };
}

async function createReusableBaseProductionArtifact(input: {
  username: string;
  experimentId: number;
}) {
  const trainedModelsDir = path.resolve(BE_DIR, "py", "trained_models");
  await mkdir(trainedModelsDir, { recursive: true });
  const artifactPath = path.join(
    trainedModelsDir,
    `exp${input.experimentId}-student${input.username}-ma-production.pkl`,
  );
  await writeFile(artifactPath, "e2e reusable artifact placeholder\n", "utf8");
  return artifactPath;
}

function buildReportMarkdown(username: string, experimentId: number) {
  return [
    `# PDF 并发复现报告 ${username}`,
    "",
    `实验编号：${experimentId}`,
    "",
    "## 需求预测",
    "已完成移动平均模型训练，并记录误差指标。",
    "",
    "## 生产计划",
    "已完成预测结果、MPS 表和产能配置。",
    "",
    "## 总结",
    "本报告用于验证 PDF 生成服务在并发达到上限后的排队、503 和重试行为。",
  ].join("\n");
}

async function submitReport(input: {
  username: string;
  token: string;
  experimentId: number;
}): Promise<RequestOutcome> {
  const response = await requestJson({
    pathname: `/api/v1/experiment-runs/${input.experimentId}/report`,
    method: "POST",
    token: input.token,
    body: {
      report_content: buildReportMarkdown(input.username, input.experimentId),
    },
  });

  const message =
    response.payload &&
    typeof response.payload === "object" &&
    typeof (response.payload as Record<string, unknown>).error === "string"
      ? String((response.payload as Record<string, unknown>).error)
      : "";

  return {
    username: input.username,
    experimentId: input.experimentId,
    httpStatus: response.status,
    outcome: response.ok
      ? "success"
      : response.status === 503 && /PDF 生成服务繁忙|排队等待超过/.test(message)
        ? "busy503"
        : "unexpected",
    elapsedMs: response.elapsedMs,
    payload: response.payload,
  };
}

function summarizeOutcomes(outcomes: RequestOutcome[]) {
  return {
    success: outcomes.filter((outcome) => outcome.outcome === "success").length,
    busy429: outcomes.filter((outcome) => outcome.outcome === "busy429").length,
    busy503: outcomes.filter((outcome) => outcome.outcome === "busy503").length,
    conflict409: outcomes.filter((outcome) => outcome.outcome === "conflict409").length,
    unexpected: outcomes.filter((outcome) => outcome.outcome === "unexpected").length,
  };
}

function assertNumberField(
  row: Record<string, unknown>,
  fieldName: string,
  context: string,
) {
  ensure(
    typeof row[fieldName] === "number" && Number.isFinite(row[fieldName]),
    `${context} missing numeric ${fieldName}`,
  );
}

function assertReportReadyExperimentShape(input: {
  username: string;
  experiment: ExperimentRecord;
}) {
  const forecastResults = input.experiment.production_forecast_results;
  ensure(
    Array.isArray(forecastResults) && forecastResults.length >= 2,
    `${input.username} report seed must include production_forecast_results`,
  );
  forecastResults.forEach((row, index) => {
    const context = `${input.username} production_forecast_results[${index}]`;
    ensure(isRecord(row), `${context} must be an object`);
    assertNumberField(row, "prediction", context);
    assertNumberField(row, "std_dev", context);
  });

  const mpsRows = input.experiment.production_mps_table;
  ensure(
    Array.isArray(mpsRows) && mpsRows.length >= 2,
    `${input.username} report seed must include production_mps_table`,
  );
  mpsRows.forEach((row, index) => {
    const context = `${input.username} production_mps_table[${index}]`;
    ensure(isRecord(row), `${context} must be an object`);
    ensure(typeof row.period_label === "string" && row.period_label.length > 0, `${context} missing period_label`);
    for (const fieldName of [
      "period",
      "demand_forecast",
      "safety_stock",
      "planned_production",
      "beginning_inventory",
      "production_output",
      "ending_inventory",
      "stockout",
      "service_level",
    ]) {
      assertNumberField(row, fieldName, context);
    }
  });
}

function logOutcome(prefix: string, outcome: RequestOutcome) {
  console.log(
    `[concurrency] ${prefix} ${outcome.username} exp=${outcome.experimentId} status=${outcome.httpStatus} outcome=${outcome.outcome} elapsed=${outcome.elapsedMs}ms`,
  );
}

async function runModelCapacityTest() {
  ensure(
    MODEL_CAPACITY_REQUESTS <= MODEL_CONCURRENCY,
    `E2E_CONCURRENCY_MODEL_CAPACITY_REQUESTS must be <= E2E_CONCURRENCY_MODEL_JOBS`,
  );

  await prepareParallelScenario("training-burst");
  const sessions = await Promise.all(
    Array.from({ length: MODEL_CAPACITY_REQUESTS }, (_, index) =>
      getLatestExperiment(String(20246001 + index)),
    ),
  );

  const outcomes = await Promise.all(sessions.map((session) => submitMovingAverageTraining(session)));
  outcomes.forEach((outcome) => logOutcome("model-capacity", outcome));
  const counts = summarizeOutcomes(outcomes);

  ensure(counts.unexpected === 0, `Model capacity test had unexpected responses: ${counts.unexpected}`);
  ensure(counts.busy429 === 0, `Model capacity test should not return 429 inside configured capacity`);
  ensure(counts.success === MODEL_CAPACITY_REQUESTS, `Expected ${MODEL_CAPACITY_REQUESTS} model successes, got ${counts.success}`);

  return {
    name: "model-capacity",
    counts,
    outcomes,
  };
}

async function runTrainingSlotSaturationTest() {
  await prepareParallelScenario("training-burst");
  const session = await getLatestExperiment(TRAINING_STUDENT_USERNAME);
  const locks = await acquireModelSlots(MODEL_CONCURRENCY);

  try {
    const outcome = await submitMovingAverageTraining(session);
    logOutcome("training-slot-saturation", outcome);
    ensure(outcome.outcome === "busy429", `Expected training slot saturation to return 429, got ${outcome.httpStatus}`);

    return {
      name: "training-slot-saturation",
      counts: summarizeOutcomes([outcome]),
      outcomes: [outcome],
    };
  } finally {
    await locks.release();
  }
}

async function runExecutionLockConflictTest() {
  await prepareParallelScenario("training-burst");
  const session = await getLatestExperiment(TRAINING_STUDENT_USERNAME);
  const lockName = `fangzhen-model:exp:${session.experimentId}`;
  const locks = await acquireNamedAdvisoryLocks([lockName]);

  try {
    const outcome = await submitMovingAverageTraining(session);
    logOutcome("execution-lock-conflict", outcome);
    ensure(outcome.outcome === "conflict409", `Expected execution lock conflict to return 409, got ${outcome.httpStatus}`);

    return {
      name: "execution-lock-conflict",
      counts: summarizeOutcomes([outcome]),
      outcomes: [outcome],
    };
  } finally {
    await locks.release();
  }
}

async function runProductionPrepareModelSlotSaturationTest() {
  await prepareParallelScenario("mixed-load");
  const session = await getLatestExperiment(PRODUCTION_STUDENT_USERNAME);
  const locks = await acquireModelSlots(MODEL_CONCURRENCY);

  try {
    const outcome = await prepareProductionModel(session);
    logOutcome("production-prepare-model-slot-saturation", outcome);
    ensure(
      outcome.outcome === "busy429",
      `Expected production prepare to return 429 when global model slots are saturated, got ${outcome.httpStatus}`,
    );

    return {
      name: "production-prepare-model-slot-saturation",
      counts: summarizeOutcomes([outcome]),
      outcomes: [outcome],
    };
  } finally {
    await locks.release();
  }
}

async function runPredictionSlotSaturationTest() {
  await prepareParallelScenario("mixed-load");
  const session = await getLatestExperiment(PRODUCTION_STUDENT_USERNAME);
  const locks = await acquireModelSlots(MODEL_CONCURRENCY);

  try {
    const outcome = await predictWithProductionModel(session);
    logOutcome("prediction-slot-saturation", outcome);
    ensure(outcome.outcome === "busy429", `Expected prediction slot saturation to return 429, got ${outcome.httpStatus}`);

    return {
      name: "prediction-slot-saturation",
      counts: summarizeOutcomes([outcome]),
      outcomes: [outcome],
    };
  } finally {
    await locks.release();
  }
}

async function runReusableBaseArtifactBypassTest() {
  await prepareParallelScenario("mixed-load");
  const session = await getLatestExperiment(PRODUCTION_STUDENT_USERNAME);
  const artifactPath = await createReusableBaseProductionArtifact(session);
  const locks = await acquireModelSlots(MODEL_CONCURRENCY);

  try {
    const outcome = await prepareProductionModel(session);
    logOutcome("base-reusable-artifact-slot-bypass", outcome);
    const payload = unwrapDataEnvelope<unknown>(outcome.payload);
    ensure(outcome.outcome === "success", `Expected reusable base production artifact to bypass model slots, got ${outcome.httpStatus}`);
    ensure(
      isRecord(payload) &&
        isRecord(payload.results) &&
        payload.results.reused_existing === true,
      `Expected reusable base artifact response, got ${JSON.stringify(outcome.payload)}`,
    );

    return {
      name: "base-reusable-artifact-slot-bypass",
      counts: summarizeOutcomes([outcome]),
      outcomes: [outcome],
    };
  } finally {
    await locks.release();
    await rm(artifactPath, { force: true });
  }
}

async function runReusableEnsembleStillBehindSlotTest() {
  await prepareParallelScenario("mixed-load");
  const session = await getLatestExperiment(PRODUCTION_STUDENT_USERNAME);
  const locks = await acquireModelSlots(MODEL_CONCURRENCY);

  try {
    const outcome = await prepareProductionModel({
      ...session,
      modelType: "weighted_avg",
    });
    logOutcome("ensemble-reusable-artifact-still-behind-slot", outcome);
    ensure(outcome.outcome === "busy429", `Expected ensemble production prepare to remain behind model slots, got ${outcome.httpStatus}`);

    return {
      name: "ensemble-reusable-artifact-still-behind-slot",
      counts: summarizeOutcomes([outcome]),
      outcomes: [outcome],
    };
  } finally {
    await locks.release();
  }
}

async function runPdfQueueTest() {
  await prepareReportBurstScenario();
  const sessions = await Promise.all(
    Array.from({ length: PDF_STUDENT_COUNT }, (_, index) =>
      getLatestExperiment(String(20246001 + index)),
    ),
  );
  sessions.forEach(({ username, experiment }) =>
    assertReportReadyExperimentShape({ username, experiment }),
  );

  const initialOutcomes = await Promise.all(sessions.map((session) => submitReport(session)));
  initialOutcomes.forEach((outcome) => logOutcome("pdf-initial", outcome));
  const initialCounts = summarizeOutcomes(initialOutcomes);
  const minBusy503 = Math.max(1, PDF_STUDENT_COUNT - PDF_CONCURRENCY);

  ensure(initialCounts.unexpected === 0, `PDF queue test had unexpected initial responses: ${initialCounts.unexpected}`);
  ensure(initialCounts.success >= 1, "PDF queue test expected at least one successful initial report");
  if (EXPECT_PDF_503) {
    ensure(
      initialCounts.busy503 >= minBusy503,
      `Expected at least ${minBusy503} initial PDF 503 responses, got ${initialCounts.busy503}`,
    );
  } else {
    ensure(
      initialCounts.success + initialCounts.busy503 === PDF_STUDENT_COUNT,
      `Expected every PDF response to be success or 503, got ${JSON.stringify(initialCounts)}`,
    );
  }

  const retrySessions = sessions.filter((session) =>
    initialOutcomes.some(
      (outcome) => outcome.username === session.username && outcome.outcome === "busy503",
    ),
  );
  const retryOutcomes: RequestOutcome[] = [];
  for (const session of retrySessions) {
    const outcome = await submitReport(session);
    logOutcome("pdf-retry", outcome);
    retryOutcomes.push(outcome);
  }

  const retryCounts = summarizeOutcomes(retryOutcomes);
  ensure(retryCounts.unexpected === 0, `PDF queue test had unexpected retry responses: ${retryCounts.unexpected}`);
  ensure(retryCounts.busy503 === 0, `PDF queue retries should succeed sequentially`);
  ensure(retryCounts.success === retrySessions.length, `Expected all PDF retries to succeed`);

  return {
    name: "pdf-queue-503-and-retry",
    counts: {
      initial: initialCounts,
      retry: retryCounts,
    },
    outcomes: {
      initial: initialOutcomes,
      retry: retryOutcomes,
    },
  };
}

async function main() {
  if (process.argv.includes("--help")) {
    console.log(`
Usage:
  bun run e2e:shiyan:concurrency
  bun run e2e:shiyan:concurrency:model
  bun run e2e:shiyan:concurrency:pdf

This API-level suite starts a controlled backend by default:
  E2E_CONCURRENCY_MODEL_JOBS=2
  E2E_CONCURRENCY_PDF_JOBS=1
  E2E_CONCURRENCY_PDF_QUEUE_TIMEOUT_MS=1
  E2E_CONCURRENCY_BACKEND_PORT=54108

The controlled limits keep the suite deterministic on both local 6-core/12-thread
machines and larger 64-core servers.

For 64-core server pressure runs, set:
  E2E_CONCURRENCY_MODEL_JOBS=50
  E2E_CONCURRENCY_MODEL_CAPACITY_REQUESTS=50
  E2E_CONCURRENCY_PDF_JOBS=12
  E2E_CONCURRENCY_PDF_STUDENTS=50
  E2E_CONCURRENCY_EXPECT_PDF_503=0
  DB_CONNECTION_LIMIT=140
`);
    return;
  }

  const suite = parseSuiteName();
  await mkdir(ARTIFACTS_DIR, { recursive: true });

  const backend = await startBackend();
  try {
    const runtimeInfo = await waitForBackend();
    validateRuntimeInfo(runtimeInfo);

    console.log(`[concurrency] suite=${suite}`);
    console.log(`[concurrency] backend=${BACKEND_ORIGIN}`);
    console.log(`[concurrency] systemParallelism=${String(runtimeInfo.concurrency?.systemParallelism)}`);
    console.log(`[concurrency] maxConcurrentModelJobs=${MODEL_CONCURRENCY}`);
    console.log(`[concurrency] maxConcurrentPdfJobs=${PDF_CONCURRENCY}`);
    console.log(`[concurrency] pdfQueueTimeoutMs=${PDF_QUEUE_TIMEOUT_MS}`);

    const results = [];
    if (suite === "all" || suite === "model") {
      results.push(await runModelCapacityTest());
      results.push(await runTrainingSlotSaturationTest());
      results.push(await runExecutionLockConflictTest());
      results.push(await runProductionPrepareModelSlotSaturationTest());
      results.push(await runPredictionSlotSaturationTest());
      results.push(await runReusableBaseArtifactBypassTest());
      results.push(await runReusableEnsembleStillBehindSlotTest());
    }
    if (suite === "all" || suite === "pdf") {
      results.push(await runPdfQueueTest());
    }

    const summary = {
      generatedAt: new Date().toISOString(),
      suite,
      backendOrigin: BACKEND_ORIGIN,
      runtimeInfo,
      config: {
        modelConcurrency: MODEL_CONCURRENCY,
        modelCapacityRequests: MODEL_CAPACITY_REQUESTS,
        pdfConcurrency: PDF_CONCURRENCY,
        pdfStudentCount: PDF_STUDENT_COUNT,
        pdfQueueTimeoutMs: PDF_QUEUE_TIMEOUT_MS,
        pdfGenerationTimeoutMs: PDF_GENERATION_TIMEOUT_MS,
      },
      results,
    };

    await writeFile(
      path.join(ARTIFACTS_DIR, `${suite}-summary.json`),
      `${JSON.stringify(summary, null, 2)}\n`,
      "utf8",
    );

    console.log(`[concurrency] completed suite=${suite}`);
  } finally {
    await stopBackend(backend);
  }
}

await main();
