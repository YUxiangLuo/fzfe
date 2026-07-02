import type { FullConfig } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveE2EBackendDir } from "../helpers/backend-dir";
import { cleanupUploadArtifacts, resetDatabase, resetUserPassword } from "./setup-utils";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE_DIR = path.resolve(__dirname, "../../..");
const BE_DIR = resolveE2EBackendDir(FE_DIR);

export default async function globalSetup(_: FullConfig) {
  const adminUsername = process.env.E2E_ADMIN_USERNAME ?? "admin";
  const adminPassword = process.env.E2E_ADMIN_PASSWORD ?? "AdminE2E!234";

  await resetDatabase(BE_DIR);
  await cleanupUploadArtifacts(BE_DIR);
  await resetUserPassword(BE_DIR, adminUsername, adminPassword);
}
