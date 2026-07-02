import { existsSync } from "node:fs";
import path from "node:path";

export const E2E_BACKEND_DIR_ENV = "E2E_BACKEND_DIR";

const BACKEND_MARKER_FILES = [
  "package.json",
  "src/index.ts",
  "sql/schema.sql",
  "scripts/generate-e2e-fixtures.ts",
] as const;

function isBackendDir(candidate: string) {
  return BACKEND_MARKER_FILES.every((marker) =>
    existsSync(path.join(candidate, marker)),
  );
}

function configuredBackendDir(frontendDir: string) {
  const rawValue = process.env[E2E_BACKEND_DIR_ENV]?.trim();
  if (!rawValue) {
    return undefined;
  }

  const resolved = path.resolve(frontendDir, rawValue);
  if (!isBackendDir(resolved)) {
    throw new Error(
      `${E2E_BACKEND_DIR_ENV} does not point to a valid backend directory: ${resolved}`,
    );
  }

  return resolved;
}

export function resolveE2EBackendDir(frontendDir: string) {
  const configured = configuredBackendDir(frontendDir);
  if (configured) {
    return configured;
  }

  const candidates = [path.resolve(frontendDir, "../fzbe")];
  const backendDir = candidates.find(isBackendDir);
  if (backendDir) {
    return backendDir;
  }

  throw new Error(
    `Unable to locate backend directory. Set ${E2E_BACKEND_DIR_ENV} to the fangzhen backend path.`,
  );
}
