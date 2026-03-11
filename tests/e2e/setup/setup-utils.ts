import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";

export const MINIMAL_PDF_CONTENT = `%PDF-1.1
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

export function runCommand(
  command: string,
  args: string[],
  cwd: string,
  env: NodeJS.ProcessEnv = process.env,
) {
  execFileSync(command, args, {
    cwd,
    env,
    stdio: "inherit",
  });
}

export function resetDatabase(beDir: string) {
  if (process.env.E2E_SKIP_DB_RESET === "1" || process.env.E2E_SKIP_DB_SETUP === "1") return;

  runCommand("bun", ["run", "db:reset", "--force"], beDir, process.env);
}

export async function cleanupUploadArtifacts(beDir: string) {
  const uploadsRoot = path.resolve(beDir, "uploads");
  const dirsToReset = ["manuals", "datasets", "reports", "exports", "temp"];

  for (const dirName of dirsToReset) {
    const fullPath = path.resolve(uploadsRoot, dirName);
    await fs.rm(fullPath, { recursive: true, force: true });
    await fs.mkdir(fullPath, { recursive: true });
  }
}

export async function resetUserPassword(beDir: string, username: string, password: string) {
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

  runCommand("bun", ["-e", script], beDir, {
    ...process.env,
    E2E_TARGET_USERNAME: username,
    E2E_TARGET_PASSWORD: password,
  });
}

export async function ensureE2EUser(
  beDir: string,
  input: {
    username: string;
    password: string;
    fullName: string;
    email: string;
    phoneNumber: string;
    role: "Teacher" | "Assistant" | "Student" | "Admin";
  },
) {
  const script = `
import mysql from "mysql2/promise";

const {
  DB_HOST,
  DB_USER,
  DB_PASSWORD,
  DB_DATABASE,
  E2E_TARGET_USERNAME,
  E2E_TARGET_PASSWORD,
  E2E_TARGET_FULL_NAME,
  E2E_TARGET_EMAIL,
  E2E_TARGET_PHONE,
  E2E_TARGET_ROLE,
} = process.env;

if (!E2E_TARGET_USERNAME) throw new Error("E2E_TARGET_USERNAME is required");
if (!E2E_TARGET_PASSWORD) throw new Error("E2E_TARGET_PASSWORD is required");
if (!E2E_TARGET_FULL_NAME) throw new Error("E2E_TARGET_FULL_NAME is required");
if (!E2E_TARGET_EMAIL) throw new Error("E2E_TARGET_EMAIL is required");
if (!E2E_TARGET_PHONE) throw new Error("E2E_TARGET_PHONE is required");
if (!E2E_TARGET_ROLE) throw new Error("E2E_TARGET_ROLE is required");

const conn = await mysql.createConnection({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_DATABASE,
  charset: "utf8mb4",
});

const hash = await Bun.password.hash(E2E_TARGET_PASSWORD, { algorithm: "bcrypt", cost: 10 });

try {
  await conn.beginTransaction();

  const [existingUsers] = await conn.query(
    "SELECT user_id FROM users WHERE username = ? LIMIT 1",
    [E2E_TARGET_USERNAME],
  );
  const existingUser = Array.isArray(existingUsers) ? existingUsers[0] : undefined;

  const [emailUsers] = await conn.query(
    "SELECT user_id, username FROM users WHERE email = ? LIMIT 1",
    [E2E_TARGET_EMAIL],
  );
  const existingEmailUser = Array.isArray(emailUsers) ? emailUsers[0] : undefined;

  if (
    existingEmailUser &&
    (!existingUser || existingEmailUser.user_id !== existingUser.user_id)
  ) {
    throw new Error(
      \`Email \${E2E_TARGET_EMAIL} is already used by \${existingEmailUser.username}; refusing to mutate a different user\`,
    );
  }

  if (existingUser) {
    await conn.query(
      \`UPDATE users
       SET password_hash = ?, full_name = ?, email = ?, phone_number = ?, role = ?
       WHERE user_id = ?\`,
      [
        hash,
        E2E_TARGET_FULL_NAME,
        E2E_TARGET_EMAIL,
        E2E_TARGET_PHONE,
        E2E_TARGET_ROLE,
        existingUser.user_id,
      ],
    );
  } else {
    await conn.query(
      \`INSERT INTO users (username, password_hash, full_name, email, phone_number, role)
       VALUES (?, ?, ?, ?, ?, ?)\`,
      [
        E2E_TARGET_USERNAME,
        hash,
        E2E_TARGET_FULL_NAME,
        E2E_TARGET_EMAIL,
        E2E_TARGET_PHONE,
        E2E_TARGET_ROLE,
      ],
    );
  }

  await conn.commit();
} catch (error) {
  await conn.rollback();
  throw error;
} finally {
  await conn.end();
}

console.log(\`Ensured e2e user: \${E2E_TARGET_USERNAME}\`);
`;

  runCommand("bun", ["-e", script], beDir, {
    ...process.env,
    E2E_TARGET_USERNAME: input.username,
    E2E_TARGET_PASSWORD: input.password,
    E2E_TARGET_FULL_NAME: input.fullName,
    E2E_TARGET_EMAIL: input.email,
    E2E_TARGET_PHONE: input.phoneNumber,
    E2E_TARGET_ROLE: input.role,
  });
}

export async function seedTeacherCoreFixtures(beDir: string, options?: {
  reportFixtureName?: string;
  teacherId?: number;
  assistantId?: number;
  assistantClassId?: number;
}) {
  const reportFixtureName = options?.reportFixtureName ?? "e2e-teacher-report.pdf";
  const teacherId = options?.teacherId ?? 101;
  const assistantId = options?.assistantId ?? 202;
  const assistantClassId = options?.assistantClassId ?? 1;

  const reportFixturePath = path.resolve(beDir, "uploads", "reports", reportFixtureName);
  await fs.writeFile(reportFixturePath, MINIMAL_PDF_CONTENT, "utf8");

  runCommand("bun", ["run", "scripts/e2e-seed-teacher-fixtures.ts"], beDir, {
    ...process.env,
    E2E_FIXTURE_TEACHER_ID: String(teacherId),
    E2E_FIXTURE_ASSISTANT_ID: String(assistantId),
    E2E_FIXTURE_ASSISTANT_CLASS_ID: String(assistantClassId),
    E2E_FIXTURE_REPORT_PATH: reportFixturePath,
  });
}

export async function seedAssistantCoreFixtures(beDir: string, options?: {
  reportFixtureName?: string;
  assistantId?: number;
  assistantClassId?: number;
}) {
  const reportFixtureName = options?.reportFixtureName ?? "e2e-assistant-report.pdf";
  const assistantId = options?.assistantId ?? 202;
  const assistantClassId = options?.assistantClassId ?? 2;

  const reportFixturePath = path.resolve(beDir, "uploads", "reports", reportFixtureName);
  await fs.writeFile(reportFixturePath, MINIMAL_PDF_CONTENT, "utf8");

  runCommand("bun", ["run", "scripts/e2e-seed-assistant-fixtures.ts"], beDir, {
    ...process.env,
    E2E_FIXTURE_ASSISTANT_ID: String(assistantId),
    E2E_FIXTURE_ASSISTANT_CLASS_ID: String(assistantClassId),
    E2E_FIXTURE_REPORT_PATH: reportFixturePath,
  });
}

export async function seedShiyanDatasetFixtures(beDir: string, studentUsername: string) {
  runCommand("bun", ["run", "scripts/e2e-seed-shiyan-fixtures.ts"], beDir, {
    ...process.env,
    E2E_SHIYAN_STUDENT_USERNAME: studentUsername,
  });
}

export async function seedEdgeCaseFixtures(beDir: string, options?: {
  reportFixtureName?: string;
}) {
  const reportFixtureName = options?.reportFixtureName ?? "e2e-edge-case-report.pdf";
  const reportFixturePath = path.resolve(beDir, "uploads", "reports", reportFixtureName);
  await fs.writeFile(reportFixturePath, MINIMAL_PDF_CONTENT, "utf8");

  runCommand("bun", ["run", "scripts/e2e-seed-edge-cases.ts"], beDir, {
    ...process.env,
    E2E_FIXTURE_REPORT_PATH: reportFixturePath,
  });
}
