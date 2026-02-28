import type { FullConfig } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  cleanupUploadArtifacts,
  resetDatabase,
  resetUserPassword,
  seedAssistantCoreFixtures,
} from "./setup-utils";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE_DIR = path.resolve(__dirname, "../../..");
const BE_DIR = path.resolve(FE_DIR, "../be");

export default async function globalSetup(_: FullConfig) {
  const assistantUsername = process.env.E2E_ASSISTANT_USERNAME ?? "assistant2";
  const assistantPassword = process.env.E2E_ASSISTANT_PASSWORD ?? "AssistantE2E!234";

  await resetDatabase(BE_DIR);
  await cleanupUploadArtifacts(BE_DIR);
  await resetUserPassword(BE_DIR, assistantUsername, assistantPassword);
  await seedAssistantCoreFixtures(BE_DIR);
}
