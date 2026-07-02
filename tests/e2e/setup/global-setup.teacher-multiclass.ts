import type { FullConfig } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveE2EBackendDir } from "../helpers/backend-dir";
import {
  cleanupUploadArtifacts,
  resetDatabase,
  seedShiyanDatasetFixtures,
  seedTeacherMulticlassFixtures,
} from "./setup-utils";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE_DIR = path.resolve(__dirname, "../../..");
const BE_DIR = resolveE2EBackendDir(FE_DIR);

export default async function globalSetup(_: FullConfig) {
  const liveStudentUsername = process.env.E2E_STUDENT_USERNAME ?? "20247001";

  await resetDatabase(BE_DIR);
  await cleanupUploadArtifacts(BE_DIR);
  await seedTeacherMulticlassFixtures(BE_DIR);
  await seedShiyanDatasetFixtures(BE_DIR, liveStudentUsername);
}
