import type { FullConfig } from "@playwright/test";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE_DIR = path.resolve(__dirname, "../../../");
const BE_DIR = path.resolve(FE_DIR, "../be");
const E2E_REPORT_FIXTURE_NAME = "e2e-teacher-report.pdf";
const E2E_REPORT_FIXTURE_EXPERIMENT_ID = 900001;
const E2E_REPORT_FIXTURE_STUDENT_ID = 20241002;
const E2E_REPORT_FIXTURE_TEACHER_ID = 101;
const E2E_ASSISTANT_FIXTURE_ID = 202;
const E2E_ASSISTANT_FIXTURE_CLASS_ID = 1;
const MINIMAL_PDF_CONTENT = `%PDF-1.1
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 144] /Contents 4 0 R /Resources << >> >>
endobj
4 0 obj
<< /Length 44 >>
stream
BT /F1 12 Tf 36 96 Td (E2E fixture report) Tj ET
endstream
endobj
xref
0 5
0000000000 65535 f
0000000010 00000 n
0000000060 00000 n
0000000117 00000 n
0000000219 00000 n
trailer
<< /Root 1 0 R /Size 5 >>
startxref
324
%%EOF
`;

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

async function resetUserPassword(username: string, password: string) {
  const script = `
import mysql from "mysql2/promise";

const username = process.env.E2E_TARGET_USERNAME;
const password = process.env.E2E_TARGET_PASSWORD;
if (!username) throw new Error("E2E_TARGET_USERNAME is required");
if (!password) throw new Error("E2E_TARGET_PASSWORD is required");

const { DB_HOST, DB_USER, DB_PASSWORD, DB_DATABASE } = process.env;
const conn = await mysql.createConnection({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_DATABASE,
  charset: "utf8mb4",
});

const hash = await Bun.password.hash(password, { algorithm: "bcrypt", cost: 10 });
const [result] = await conn.query("UPDATE users SET password_hash = ? WHERE username = ?", [hash, username]);
if (!result || typeof result.affectedRows !== "number" || result.affectedRows === 0) {
  throw new Error(\`Cannot find user \${username} to reset password\`);
}
await conn.end();
console.log(\`Password reset for e2e user: \${username}\`);
`;

  runCommand("bun", ["-e", script], BE_DIR, {
    ...process.env,
    E2E_TARGET_USERNAME: username,
    E2E_TARGET_PASSWORD: password,
  });
}

async function seedTeacherCoreFixtures() {
  const reportFixturePath = path.resolve(BE_DIR, "uploads", "reports", E2E_REPORT_FIXTURE_NAME);
  await fs.writeFile(reportFixturePath, MINIMAL_PDF_CONTENT, "utf8");

  const script = `
import mysql from "mysql2/promise";

const experimentId = Number(process.env.E2E_FIXTURE_EXPERIMENT_ID);
const studentId = Number(process.env.E2E_FIXTURE_STUDENT_ID);
const teacherId = Number(process.env.E2E_FIXTURE_TEACHER_ID);
const assistantId = Number(process.env.E2E_FIXTURE_ASSISTANT_ID);
const assistantClassId = Number(process.env.E2E_FIXTURE_ASSISTANT_CLASS_ID);
const reportPath = process.env.E2E_FIXTURE_REPORT_PATH;

if (!Number.isInteger(experimentId)) throw new Error("E2E_FIXTURE_EXPERIMENT_ID is invalid");
if (!Number.isInteger(studentId)) throw new Error("E2E_FIXTURE_STUDENT_ID is invalid");
if (!Number.isInteger(teacherId)) throw new Error("E2E_FIXTURE_TEACHER_ID is invalid");
if (!Number.isInteger(assistantId)) throw new Error("E2E_FIXTURE_ASSISTANT_ID is invalid");
if (!Number.isInteger(assistantClassId)) throw new Error("E2E_FIXTURE_ASSISTANT_CLASS_ID is invalid");
if (!reportPath) throw new Error("E2E_FIXTURE_REPORT_PATH is required");

const { DB_HOST, DB_USER, DB_PASSWORD, DB_DATABASE } = process.env;
const conn = await mysql.createConnection({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_DATABASE,
  charset: "utf8mb4",
});

await conn.beginTransaction();
try {
  await conn.query("DELETE FROM class_assistants WHERE assistant_id = ?", [assistantId]);
  await conn.query(
    "INSERT INTO class_assistants (assistant_id, class_id) VALUES (?, ?)",
    [assistantId, assistantClassId],
  );

  await conn.query("DELETE FROM experiment_step_events WHERE experiment_id = ?", [experimentId]);
  await conn.query("DELETE FROM experiment_reports WHERE experiment_id = ? AND student_id = ?", [experimentId, studentId]);
  await conn.query("DELETE FROM experiment_grade WHERE experiment_id = ? AND student_id = ?", [experimentId, studentId]);
  await conn.query("DELETE FROM experiment_status WHERE experiment_id = ?", [experimentId]);

  await conn.query(
    \`INSERT INTO experiment_status (
      experiment_id,
      student_id,
      status,
      highest_completed_step,
      current_step,
      total_active_duration_seconds,
      selected_industry,
      selected_company,
      selected_product,
      selected_best_model,
      start_time,
      last_activity_at,
      completion_time
    ) VALUES (?, ?, 'Completed', 7, 7, 5400, ?, ?, ?, 'arima', '2026-01-10 08:00:00', '2026-01-10 10:00:00', '2026-01-10 10:00:00')\`,
    [experimentId, studentId, "纺织业", "鲁泰纺织股份有限公司", "高支纱"],
  );

  const stepTimestamps = [
    "2026-01-10 08:05:00",
    "2026-01-10 08:15:00",
    "2026-01-10 08:30:00",
    "2026-01-10 08:50:00",
    "2026-01-10 09:05:00",
    "2026-01-10 09:20:00",
    "2026-01-10 09:40:00",
  ];

  for (let idx = 0; idx < stepTimestamps.length; idx += 1) {
    await conn.query(
      "INSERT INTO experiment_step_events (experiment_id, student_id, step_order, event_type, event_timestamp) VALUES (?, ?, ?, 'COMPLETED', ?)",
      [experimentId, studentId, idx + 1, stepTimestamps[idx]],
    );
  }

  await conn.query(
    \`INSERT INTO experiment_grade (
      experiment_id,
      student_id,
      exp_flow_demand_data_preparation,
      exp_flow_demand_descriptive_stats,
      exp_flow_demand_model_selection,
      exp_flow_demand_generate_results,
      exp_flow_production_inventory_calc,
      exp_flow_production_service_level,
      exp_flow_production_variable_calc,
      exp_flow_production_plan_creation,
      exp_flow_report_submission,
      knowledge_test,
      model_quality,
      report_quality
    ) VALUES (?, ?, 92, 90, 88, 91, 89, 87, 86, 90, 95, 84, 93, 0)\`,
    [experimentId, studentId],
  );

  await conn.query(
    "INSERT INTO experiment_reports (experiment_id, student_id, report_content, pdf_file_path, status, submitted_at, graded_by) VALUES (?, ?, ?, ?, 'submitted', '2026-01-10 10:15:00', ?)",
    [experimentId, studentId, "<h1>E2E Fixture Report</h1><p>seeded for teacher e2e</p>", reportPath, teacherId],
  );

  await conn.commit();
} catch (error) {
  await conn.rollback();
  throw error;
} finally {
  await conn.end();
}

console.log("Seeded teacher e2e fixture data.");
`;

  runCommand("bun", ["-e", script], BE_DIR, {
    ...process.env,
    E2E_FIXTURE_EXPERIMENT_ID: String(E2E_REPORT_FIXTURE_EXPERIMENT_ID),
    E2E_FIXTURE_STUDENT_ID: String(E2E_REPORT_FIXTURE_STUDENT_ID),
    E2E_FIXTURE_TEACHER_ID: String(E2E_REPORT_FIXTURE_TEACHER_ID),
    E2E_FIXTURE_ASSISTANT_ID: String(E2E_ASSISTANT_FIXTURE_ID),
    E2E_FIXTURE_ASSISTANT_CLASS_ID: String(E2E_ASSISTANT_FIXTURE_CLASS_ID),
    E2E_FIXTURE_REPORT_PATH: reportFixturePath,
  });
}

export default async function globalSetup(_: FullConfig) {
  const skipDbSetup = process.env.E2E_SKIP_DB_SETUP === "1";
  const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? "AdminE2E!234";
  const teacherUsername = process.env.E2E_TEACHER_USERNAME ?? "teacher1";
  const teacherPassword = process.env.E2E_TEACHER_PASSWORD ?? "TeacherE2E!234";
  const assistantUsername = process.env.E2E_ASSISTANT_USERNAME ?? "assistant2";
  const assistantPassword = process.env.E2E_ASSISTANT_PASSWORD ?? "AssistantE2E!234";

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
  await resetUserPassword("admin", adminPassword);
  await resetUserPassword(teacherUsername, teacherPassword);
  await resetUserPassword(assistantUsername, assistantPassword);
  await seedTeacherCoreFixtures();
}
