import { expect, test } from "@playwright/test";
import { readFile, rm, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveE2EBackendDir } from "../helpers/backend-dir";

const BACKEND_PORT = process.env.E2E_BACKEND_PORT ?? "54128";
const BACKEND_ORIGIN =
  process.env.E2E_BACKEND_ORIGIN ?? `http://127.0.0.1:${BACKEND_PORT}`;

type RuntimeCleanupManifest = {
  backendDir: string;
  paths: Record<string, string>;
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE_DIR = path.resolve(__dirname, "../../..");
const BE_DIR = resolveE2EBackendDir(FE_DIR);
const MANIFEST_PATH = path.join(BE_DIR, "uploads", "temp", "e2e-runtime-cleanup-manifest.json");

async function loadManifest(): Promise<RuntimeCleanupManifest> {
  return JSON.parse(await readFile(MANIFEST_PATH, "utf8")) as RuntimeCleanupManifest;
}

async function exists(targetPath: string): Promise<boolean> {
  try {
    await stat(targetPath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

async function expectPathExists(targetPath: string): Promise<void> {
  expect(await exists(targetPath), targetPath).toBe(true);
}

async function expectPathMissing(targetPath: string): Promise<void> {
  expect(await exists(targetPath), targetPath).toBe(false);
}

test.afterAll(async () => {
  const manifest = await loadManifest().catch(() => null);
  if (!manifest) return;

  await Promise.all(
    Object.values(manifest.paths).map((targetPath) =>
      rm(targetPath, { recursive: true, force: true }),
    ),
  );
});

test.describe("runtime disk cleanup e2e", () => {
  test("startup cleanup removes only stale runtime artifacts", async ({ request }) => {
    const runtimeInfo = await request.get(`${BACKEND_ORIGIN}/api/v1/runtime-info`);
    expect(runtimeInfo.ok()).toBeTruthy();

    const manifest = await loadManifest();
    expect(manifest.backendDir).toBe(BE_DIR);
    const paths = manifest.paths;

    await expectPathMissing(paths.oldExport);
    await expectPathExists(paths.freshExport);
    await expectPathExists(paths.unrelatedExport);

    await expectPathMissing(paths.oldTemp);
    await expectPathExists(paths.freshTemp);
    await expectPathExists(paths.manifest);

    await expectPathMissing(paths.orphanGuidedDir);
    await expectPathMissing(paths.expiredGuidedDir);
    await expectPathExists(paths.activeGuidedDir);

    await expectPathMissing(paths.staleModel);
    await expectPathMissing(paths.staleProductionModel);
    await expectPathExists(paths.freshModel);
    await expectPathExists(paths.unrelatedModel);
  });
});
