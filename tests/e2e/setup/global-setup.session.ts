import type { FullConfig } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resetDatabase, resetUserPassword } from "./setup-utils";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE_DIR = path.resolve(__dirname, "../../..");
const BE_DIR = path.resolve(FE_DIR, "../fangzhen-be");

export default async function globalSetup(_: FullConfig) {
  const studentUsername = process.env.E2E_STUDENT_USERNAME ?? "20240001";
  const studentPassword = process.env.E2E_STUDENT_PASSWORD ?? "StudentE2E!123";
  const teacherUsername = process.env.E2E_TEACHER_USERNAME ?? "teacher1";
  const teacherPassword = process.env.E2E_TEACHER_PASSWORD ?? "TeacherE2E!234";

  await resetDatabase(BE_DIR);
  await resetUserPassword(BE_DIR, studentUsername, studentPassword);
  await resetUserPassword(BE_DIR, teacherUsername, teacherPassword);
}
