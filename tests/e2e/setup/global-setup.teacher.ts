import type { FullConfig } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  cleanupUploadArtifacts,
  resetDatabase,
  resetUserPassword,
  seedTeacherCoreFixtures,
  seedEdgeCaseFixtures,
} from "./setup-utils";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE_DIR = path.resolve(__dirname, "../../..");
const BE_DIR = path.resolve(FE_DIR, "../be");

export default async function globalSetup(_: FullConfig) {
  const teacherUsername = process.env.E2E_TEACHER_USERNAME ?? "teacher1";
  const teacherPassword = process.env.E2E_TEACHER_PASSWORD ?? "TeacherE2E!234";

  await resetDatabase(BE_DIR);
  await cleanupUploadArtifacts(BE_DIR);
  await resetUserPassword(BE_DIR, teacherUsername, teacherPassword);
  await seedTeacherCoreFixtures(BE_DIR);
  await seedEdgeCaseFixtures(BE_DIR);
}
