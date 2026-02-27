import type { FullConfig } from "@playwright/test";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE_DIR = path.resolve(__dirname, "../../../");
const BE_DIR = path.resolve(FE_DIR, "../be");

function runCommand(command: string, args: string[], cwd: string, env: NodeJS.ProcessEnv = process.env) {
  execFileSync(command, args, {
    cwd,
    env,
    stdio: "inherit",
  });
}

async function parseEnvValue(filePath: string, key: string): Promise<string | null> {
  try {
    const content = await fs.readFile(filePath, "utf8");
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) continue;
      if (!line.startsWith(`${key}=`)) continue;
      let value = line.slice(key.length + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      return value;
    }
    return null;
  } catch {
    return null;
  }
}

async function cleanupUploadArtifacts() {
  const uploadsRoot = path.resolve(BE_DIR, "uploads");
  const dirsToReset = ["manuals", "datasets", "reports", "exports", "temp"];

  for (const dirName of dirsToReset) {
    const fullPath = path.resolve(uploadsRoot, dirName);
    await fs.rm(fullPath, { recursive: true, force: true });
    await fs.mkdir(fullPath, { recursive: true });
  }
}

async function resetAdminPassword(adminPassword: string) {
  const script = `
import mysql from "mysql2/promise";

const password = process.env.E2E_ADMIN_PASSWORD;
if (!password) throw new Error("E2E_ADMIN_PASSWORD is required");

const { DB_HOST, DB_USER, DB_PASSWORD, DB_DATABASE } = process.env;
const conn = await mysql.createConnection({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_DATABASE,
  charset: "utf8mb4",
});

const hash = await Bun.password.hash(password, { algorithm: "bcrypt", cost: 10 });
await conn.query("UPDATE users SET password_hash = ? WHERE username = 'admin'", [hash]);
await conn.end();
console.log("Admin password reset for e2e.");
`;

  runCommand("bun", ["-e", script], BE_DIR, {
    ...process.env,
    E2E_ADMIN_PASSWORD: adminPassword,
  });
}

export default async function globalSetup(_: FullConfig) {
  const skipDbSetup = process.env.E2E_SKIP_DB_SETUP === "1";
  const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? "AdminE2E!234";

  if (!skipDbSetup) {
    const dbName =
      process.env.E2E_DB_NAME ??
      (await parseEnvValue(path.resolve(BE_DIR, ".env"), "DB_DATABASE")) ??
      "fangzhen001";
    const dbSetupConfirm = process.env.E2E_DB_SETUP_CONFIRM ?? `RESET:${dbName}`;

    runCommand("bun", ["run", "db:setup"], BE_DIR, {
      ...process.env,
      DB_SETUP_CONFIRM: dbSetupConfirm,
    });
  }

  await cleanupUploadArtifacts();
  await resetAdminPassword(adminPassword);
}
