import type { FullConfig } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveE2EBackendDir } from "../helpers/backend-dir";
import {
  cleanupUploadArtifacts,
  resetDatabase,
  resetUserPassword,
  seedAssistantCoreFixtures,
  seedEdgeCaseFixtures,
} from "./setup-utils";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE_DIR = path.resolve(__dirname, "../../..");
const BE_DIR = resolveE2EBackendDir(FE_DIR);

export default async function globalSetup(_: FullConfig) {
  const assistantUsername = process.env.E2E_ASSISTANT_USERNAME ?? "assistant2";
  const assistantPassword = process.env.E2E_ASSISTANT_PASSWORD ?? "AssistantE2E!234";
  const adminUsername = process.env.E2E_ADMIN_USERNAME ?? "admin";
  const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? "AdminE2E!234";
  const teacherUsername = process.env.E2E_TEACHER_USERNAME ?? "teacher1";
  const teacherPassword = process.env.E2E_TEACHER_PASSWORD ?? "TeacherE2E!234";
  const studentUsername = process.env.E2E_STUDENT_USERNAME ?? "20240001";
  const studentPassword = process.env.E2E_STUDENT_PASSWORD ?? "StudentE2E!123";

  await resetDatabase(BE_DIR);
  await cleanupUploadArtifacts(BE_DIR);
  await resetUserPassword(BE_DIR, adminUsername, adminPassword);
  await resetUserPassword(BE_DIR, assistantUsername, assistantPassword);
  await resetUserPassword(BE_DIR, teacherUsername, teacherPassword);
  await resetUserPassword(BE_DIR, studentUsername, studentPassword);
  await seedAssistantCoreFixtures(BE_DIR);
  await seedEdgeCaseFixtures(BE_DIR);
}
