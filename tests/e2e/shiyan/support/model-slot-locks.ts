import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { once } from "node:events";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BE_DIR = path.resolve(__dirname, "../../../../../fangzhen-be");

const SLOT_LOCK_SCRIPT = `
import mysql from "mysql2/promise";
import { CONCURRENCY_LIMITS } from "./src/utils/constants.ts";

const lockCount = Number(
  process.env.E2E_MODEL_SLOT_LOCK_COUNT ??
    CONCURRENCY_LIMITS.MAX_CONCURRENT_MODEL_JOBS,
);
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

const waitForReady = async (child: ChildProcessWithoutNullStreams) => {
  const readyText = "LOCKS_ACQUIRED";
  let stdout = "";
  let stderr = "";

  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");

  return await new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
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
        resolve({ stdout, stderr });
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
};

export interface ModelSlotLockHandle {
  release: () => Promise<void>;
}

export async function acquireAllModelSlots(
  slotCount?: number,
  firstSlot?: number,
): Promise<ModelSlotLockHandle> {
  const child = spawn("bun", ["-e", SLOT_LOCK_SCRIPT], {
    cwd: BE_DIR,
    env: {
      ...process.env,
      ...(slotCount === undefined
        ? {}
        : { E2E_MODEL_SLOT_LOCK_COUNT: String(slotCount) }),
      ...(firstSlot === undefined
        ? {}
        : { E2E_MODEL_SLOT_LOCK_START: String(firstSlot) }),
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
