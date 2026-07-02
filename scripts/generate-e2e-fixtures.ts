import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveE2EBackendDir } from "../tests/e2e/helpers/backend-dir";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE_DIR = path.resolve(__dirname, "..");
const BE_DIR = resolveE2EBackendDir(FE_DIR);

const child = Bun.spawn(["bun", "run", "scripts/generate-e2e-fixtures.ts"], {
  cwd: BE_DIR,
  env: {
    ...process.env,
    E2E_FRONTEND_FIXTURES_DIR:
      process.env.E2E_FRONTEND_FIXTURES_DIR ??
      path.resolve(FE_DIR, "tests/e2e"),
  },
  stdin: "inherit",
  stdout: "inherit",
  stderr: "inherit",
});

const exitCode = await child.exited;
if (exitCode !== 0) {
  process.exit(exitCode);
}
