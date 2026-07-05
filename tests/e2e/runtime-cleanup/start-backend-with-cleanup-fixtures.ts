import { execFileSync } from "node:child_process";
import { mkdir, rm, utimes, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { resolveE2EBackendDir } from "../helpers/backend-dir";

const FE_DIR = path.resolve(import.meta.dir, "../../..");
const BE_DIR = resolveE2EBackendDir(FE_DIR);
const UPLOADS_DIR = path.join(BE_DIR, "uploads");
const EXPORTS_DIR = path.join(UPLOADS_DIR, "exports");
const TEMP_DIR = path.join(UPLOADS_DIR, "temp");
const PY_DIR = path.join(BE_DIR, "py");
const GUIDED_TRAINING_DIR = path.join(PY_DIR, "guided_training");
const TRAINED_MODELS_DIR = path.join(PY_DIR, "trained_models");
const MANIFEST_PATH = path.join(TEMP_DIR, "e2e-runtime-cleanup-manifest.json");

const oldDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
const freshDate = new Date();

const fixturePaths = {
  oldExport: path.join(EXPORTS_DIR, "class-909901-reports-1000.zip"),
  freshExport: path.join(EXPORTS_DIR, "class-909902-grades-2000.csv"),
  unrelatedExport: path.join(EXPORTS_DIR, "manual-909901.csv"),
  oldTemp: path.join(TEMP_DIR, "e2e-runtime-cleanup-old-upload.tmp"),
  freshTemp: path.join(TEMP_DIR, "e2e-runtime-cleanup-fresh-upload.tmp"),
  orphanGuidedDir: path.join(GUIDED_TRAINING_DIR, "e2e-runtime-cleanup-orphan-guided"),
  expiredGuidedDir: path.join(GUIDED_TRAINING_DIR, "e2e-runtime-cleanup-expired-guided"),
  activeGuidedDir: path.join(GUIDED_TRAINING_DIR, "e2e-runtime-cleanup-active-guided"),
  staleModel: path.join(TRAINED_MODELS_DIR, "exp909901-student20240001-ma.pkl"),
  staleProductionModel: path.join(TRAINED_MODELS_DIR, "exp909901-student20240001-ma-production.pkl"),
  freshModel: path.join(TRAINED_MODELS_DIR, "exp909902-student20240001-ma.pkl"),
  unrelatedModel: path.join(TRAINED_MODELS_DIR, "e2e-runtime-cleanup-unrelated.pkl"),
  manifest: MANIFEST_PATH,
} as const;

async function removeFixturePath(targetPath: string): Promise<void> {
  await rm(targetPath, { recursive: true, force: true });
}

async function cleanupPreviousFixtures(): Promise<void> {
  await Promise.all(Object.values(fixturePaths).map(removeFixturePath));
}

async function writeDatedFile(targetPath: string, content: string, mtime: Date): Promise<void> {
  await mkdir(path.dirname(targetPath), { recursive: true });
  await writeFile(targetPath, content);
  await utimes(targetPath, mtime, mtime);
}

async function writeDatedDirectory(targetPath: string, mtime: Date): Promise<void> {
  await mkdir(targetPath, { recursive: true });
  await writeFile(path.join(targetPath, "state.pkl"), "e2e guided training fixture");
  await utimes(targetPath, mtime, mtime);
}

function resetDatabase(): void {
  execFileSync("bun", ["run", "db:reset", "--force"], {
    cwd: BE_DIR,
    env: process.env,
    stdio: "inherit",
  });
}

function seedGuidedTrainingRows(): void {
  const script = `
import mysql from "mysql2/promise";

const conn = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  charset: "utf8mb4",
});

const studentUsername = process.env.E2E_STUDENT_USERNAME ?? "20240001";
const [students] = await conn.query(
  "SELECT user_id FROM users WHERE username = ? LIMIT 1",
  [studentUsername],
);
const student = students[0];
if (!student?.user_id) throw new Error("Cannot find e2e student for cleanup fixture");

const [experimentResult] = await conn.query(
  "INSERT INTO experiment_status (student_id, status, start_time, last_activity_at) VALUES (?, 'In Progress', NOW(), NOW())",
  [student.user_id],
);
const experimentId = experimentResult.insertId;

await conn.query(
  \`INSERT INTO model_guided_training_sessions
     (session_id, experiment_id, student_id, model_type, request_hash, request_payload, status, completed_step_ids, step_outputs, step_plan, artifact_dir, expires_at)
   VALUES
     (?, ?, ?, 'ma', ?, '{}', 'ready', '[]', '{}', '[]', ?, DATE_ADD(NOW(), INTERVAL 7 DAY)),
     (?, ?, ?, 'ma', ?, '{}', 'ready', '[]', '{}', '[]', ?, DATE_SUB(NOW(), INTERVAL 1 SECOND))\`,
  [
    "00000000-0000-4000-8000-000000090901",
    experimentId,
    student.user_id,
    "a".repeat(64),
    process.env.E2E_RUNTIME_ACTIVE_GUIDED_DIR,
    "00000000-0000-4000-8000-000000090902",
    experimentId,
    student.user_id,
    "b".repeat(64),
    process.env.E2E_RUNTIME_EXPIRED_GUIDED_DIR,
  ],
);

await conn.end();
`;

  execFileSync("bun", ["-e", script], {
    cwd: BE_DIR,
    env: {
      ...process.env,
      E2E_RUNTIME_ACTIVE_GUIDED_DIR: fixturePaths.activeGuidedDir,
      E2E_RUNTIME_EXPIRED_GUIDED_DIR: fixturePaths.expiredGuidedDir,
    },
    stdio: "inherit",
  });
}

async function prepareCleanupFixtures(): Promise<void> {
  await cleanupPreviousFixtures();
  resetDatabase();

  await Promise.all([
    writeDatedFile(fixturePaths.oldExport, "old export", oldDate),
    writeDatedFile(fixturePaths.freshExport, "fresh export", freshDate),
    writeDatedFile(fixturePaths.unrelatedExport, "unrelated export", oldDate),
    writeDatedFile(fixturePaths.oldTemp, "old temp", oldDate),
    writeDatedFile(fixturePaths.freshTemp, "fresh temp", freshDate),
    writeDatedDirectory(fixturePaths.orphanGuidedDir, oldDate),
    writeDatedDirectory(fixturePaths.expiredGuidedDir, oldDate),
    writeDatedDirectory(fixturePaths.activeGuidedDir, oldDate),
    writeDatedFile(fixturePaths.staleModel, "old model", oldDate),
    writeDatedFile(fixturePaths.staleProductionModel, "old production model", oldDate),
    writeDatedFile(fixturePaths.freshModel, "fresh model", freshDate),
    writeDatedFile(fixturePaths.unrelatedModel, "unrelated model", oldDate),
  ]);

  seedGuidedTrainingRows();

  await writeDatedFile(
    MANIFEST_PATH,
    JSON.stringify({ backendDir: BE_DIR, paths: fixturePaths }, null, 2),
    freshDate,
  );
}

await prepareCleanupFixtures();

process.env.E2E_SERVER ??= "1";
await import(pathToFileURL(path.join(BE_DIR, "src/e2e-server.ts")).href);
