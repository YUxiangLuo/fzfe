import type { FullConfig } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  cleanupUploadArtifacts,
  ensureE2EUser,
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
  const emptyTeacherUsername = process.env.E2E_EMPTY_TEACHER_USERNAME ?? "teacher_empty";
  const emptyTeacherPassword = process.env.E2E_EMPTY_TEACHER_PASSWORD ?? "TeacherE2E!234";
  const emptyTeacherEmailLocalPart = emptyTeacherUsername
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "") || "teacher.empty";
  const emptyTeacherEmail = process.env.E2E_EMPTY_TEACHER_EMAIL ?? `${emptyTeacherEmailLocalPart}.e2e@test.com`;

  await resetDatabase(BE_DIR);
  await cleanupUploadArtifacts(BE_DIR);
  await resetUserPassword(BE_DIR, teacherUsername, teacherPassword);
  await ensureE2EUser(BE_DIR, {
    username: emptyTeacherUsername,
    password: emptyTeacherPassword,
    fullName: "空班级教师",
    email: emptyTeacherEmail,
    phoneNumber: "13800009999",
    role: "Teacher",
  });
  await seedTeacherCoreFixtures(BE_DIR);
  await seedEdgeCaseFixtures(BE_DIR);
}
