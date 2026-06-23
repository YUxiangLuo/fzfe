import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE_DIR = path.resolve(__dirname, "..");
const BE_DIR = path.resolve(FE_DIR, "..", "fangzhen-be");
const STARTUP_TIMEOUT_MS = 120_000;

export type ParallelScenarioName = "start-only" | "training-burst" | "mixed-load";

interface ManagedProcess {
  child: ChildProcessWithoutNullStreams;
  label: string;
}

interface BackendRuntimeInfo {
  app: string;
  database: string;
  port: number;
}

interface FrontendRuntimeInfo {
  app: string;
  apiTarget: string;
}

export interface ParallelRuntimeHandle {
  cleanup: () => Promise<void>;
}

function isEnabled(value: string | undefined, defaultValue: boolean) {
  if (value === undefined) {
    return defaultValue;
  }
  return value !== "0";
}

function appendLog(buffer: string, chunk: Buffer | string) {
  const next = `${buffer}${chunk.toString()}`;
  return next.length > 8000 ? next.slice(-8000) : next;
}

async function isReachable(url: URL, requireOk: boolean) {
  const response = await fetch(url, { redirect: "manual" }).catch(() => null);
  if (!response) {
    return false;
  }
  return requireOk ? response.ok : true;
}

async function fetchJson(url: URL): Promise<unknown | null> {
  const response = await fetch(url, { redirect: "manual" }).catch(() => null);
  if (!response?.ok) {
    return null;
  }

  const payload = await response.json().catch(() => null);
  if (
    payload &&
    typeof payload === "object" &&
    "data" in payload &&
    Object.keys(payload as Record<string, unknown>).length === 1
  ) {
    return (payload as { data: unknown }).data;
  }
  return payload;
}

async function waitForReachable(
  url: URL,
  description: string,
  requireOk: boolean,
  logs?: () => string,
) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < STARTUP_TIMEOUT_MS) {
    if (await isReachable(url, requireOk)) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  const details = logs?.().trim();
  throw new Error(
    `${description} did not become reachable within ${STARTUP_TIMEOUT_MS}ms at ${url.toString()}${details ? `\n${details}` : ""}`,
  );
}

async function runSubcommand(input: {
  label: string;
  cwd: string;
  args: string[];
  env?: Record<string, string>;
}) {
  console.log(`[parallel-runtime] ${input.label}: bun ${input.args.join(" ")} (cwd=${input.cwd})`);

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

function parsePort(origin: string, fallbackPort: number) {
  const url = new URL(origin);
  return url.port ? Number.parseInt(url.port, 10) : fallbackPort;
}

function normalizeOrigin(origin: string) {
  return new URL(origin).origin;
}

let expectedBackendDatabasePromise: Promise<string | null> | null = null;

async function resolveExpectedBackendDatabase() {
  if (!expectedBackendDatabasePromise) {
    expectedBackendDatabasePromise = (async () => {
      const envDatabase = process.env.DB_DATABASE?.trim();
      if (envDatabase) {
        return envDatabase;
      }

      const envPath = path.resolve(BE_DIR, ".env");
      const rawEnv = await readFile(envPath, "utf8").catch(() => "");
      for (const line of rawEnv.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) {
          continue;
        }
        const separatorIndex = trimmed.indexOf("=");
        if (separatorIndex === -1) {
          continue;
        }
        const key = trimmed.slice(0, separatorIndex).trim();
        if (key !== "DB_DATABASE") {
          continue;
        }
        const value = trimmed.slice(separatorIndex + 1).trim();
        return value.length > 0 ? value : null;
      }

      return null;
    })();
  }

  return await expectedBackendDatabasePromise;
}

async function isExpectedBackend(input: { backendOrigin: string }) {
  const payload = await fetchJson(new URL("/api/v1/runtime-info", input.backendOrigin));
  if (
    !payload ||
    typeof payload !== "object" ||
    (payload as BackendRuntimeInfo).app !== "fangzhen-be"
  ) {
    return false;
  }

  const expectedDatabase = await resolveExpectedBackendDatabase();
  if (!expectedDatabase) {
    return true;
  }

  return (payload as BackendRuntimeInfo).database === expectedDatabase;
}

async function isExpectedFrontend(input: {
  frontendOrigin: string;
  backendOrigin: string;
}) {
  const payload = await fetchJson(new URL("/__runtime_info__", input.frontendOrigin));
  if (
    !payload ||
    typeof payload !== "object" ||
    (payload as FrontendRuntimeInfo).app !== "fangzhen-fe"
  ) {
    return false;
  }

  return normalizeOrigin((payload as FrontendRuntimeInfo).apiTarget) === normalizeOrigin(input.backendOrigin);
}

async function startService(input: {
  label: string;
  cwd: string;
  args: string[];
  env?: Record<string, string>;
  readyUrl: URL;
  readyDescription: string;
  requireOk: boolean;
}) {
  let recentLogs = "";

  const child = spawn("bun", input.args, {
    cwd: input.cwd,
    env: {
      ...process.env,
      ...input.env,
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
          `${input.label} exited before ready (code=${String(code)}, signal=${String(signal)})${recentLogs ? `\n${recentLogs}` : ""}`,
        ),
      );
    });
    child.once("error", reject);
  });

  await Promise.race([
    waitForReachable(
      input.readyUrl,
      input.readyDescription,
      input.requireOk,
      () => recentLogs,
    ),
    exitPromise,
  ]);

  console.log(`[parallel-runtime] started ${input.label} at ${input.readyUrl.toString()}`);
  return {
    child,
    label: input.label,
  } satisfies ManagedProcess;
}

async function stopManagedProcess(processHandle: ManagedProcess) {
  if (processHandle.child.exitCode !== null) {
    return;
  }

  processHandle.child.kill("SIGTERM");
  await new Promise<void>((resolve) => {
    const timeout = setTimeout(() => {
      processHandle.child.kill("SIGKILL");
      resolve();
    }, 5_000);

    processHandle.child.once("exit", () => {
      clearTimeout(timeout);
      resolve();
    });
  });
}

export async function ensureParallelRuntime(input: {
  scriptLabel: string;
  frontendOrigin: string;
  backendOrigin: string;
  scenario?: ParallelScenarioName | null;
}): Promise<ParallelRuntimeHandle> {
  const autoPrepare = isEnabled(process.env.E2E_PARALLEL_AUTO_PREPARE, true);
  const autoStartServers = isEnabled(
    process.env.E2E_PARALLEL_AUTO_START_SERVERS,
    true,
  );
  const managedProcesses: ManagedProcess[] = [];

  if (autoPrepare) {
    await runSubcommand({
      label: `${input.scriptLabel}:prepare-parallel`,
      cwd: BE_DIR,
      args: [
        "run",
        "scripts/prepare-parallel.ts",
        ...(input.scenario ? [input.scenario] : []),
        "--force",
      ],
    });
  }

  const backendReadyUrl = new URL("/", input.backendOrigin);
  const frontendReadyUrl = new URL("/login.html", input.frontendOrigin);

  if (autoStartServers) {
    if (await isExpectedBackend({ backendOrigin: input.backendOrigin })) {
      console.log(`[parallel-runtime] reusing backend ${input.backendOrigin}`);
    } else if (await isReachable(backendReadyUrl, false)) {
      throw new Error(
        `Refusing to reuse backend at ${input.backendOrigin}: runtime identity mismatch`,
      );
    } else {
      const backendPort = parsePort(input.backendOrigin, 54104);
      managedProcesses.push(
        await startService({
          label: `${input.scriptLabel}:backend`,
          cwd: BE_DIR,
          args: ["run", "src/index.ts"],
          env: {
            PORT: String(backendPort),
          },
          readyUrl: backendReadyUrl,
          readyDescription: "Backend service",
          requireOk: false,
        }),
      );
    }

    if (
      await isExpectedFrontend({
        frontendOrigin: input.frontendOrigin,
        backendOrigin: input.backendOrigin,
      })
    ) {
      console.log(`[parallel-runtime] reusing frontend ${input.frontendOrigin}`);
    } else if (await isReachable(frontendReadyUrl, true)) {
      throw new Error(
        `Refusing to reuse frontend at ${input.frontendOrigin}: runtime identity mismatch`,
      );
    } else {
      const frontendUrl = new URL(input.frontendOrigin);
      const frontendPort = parsePort(input.frontendOrigin, 55104);
      managedProcesses.push(
        await startService({
          label: `${input.scriptLabel}:frontend`,
          cwd: FE_DIR,
          args: [
            "run",
            "dev",
            "--",
            "--host",
            frontendUrl.hostname,
            "--port",
            String(frontendPort),
          ],
          env: {
            VITE_API_URL: new URL("/api/v1", input.backendOrigin).toString(),
          },
          readyUrl: frontendReadyUrl,
          readyDescription: "Frontend login page",
          requireOk: true,
        }),
      );
    }
  } else {
    await waitForReachable(backendReadyUrl, "Backend service", false);
    await waitForReachable(frontendReadyUrl, "Frontend login page", true);
    if (!(await isExpectedBackend({ backendOrigin: input.backendOrigin }))) {
      throw new Error(
        `Backend at ${input.backendOrigin} did not expose the expected runtime identity`,
      );
    }
    if (
      !(await isExpectedFrontend({
        frontendOrigin: input.frontendOrigin,
        backendOrigin: input.backendOrigin,
      }))
    ) {
      throw new Error(
        `Frontend at ${input.frontendOrigin} did not expose the expected runtime identity`,
      );
    }
  }

  return {
    cleanup: async () => {
      for (let index = managedProcesses.length - 1; index >= 0; index -= 1) {
        await stopManagedProcess(managedProcesses[index]!);
      }
    },
  };
}
