import { afterEach, describe, expect, it, mock } from "bun:test";
import { resolve } from "path";

mock.restore();

const fileUrlModulePath = resolve(import.meta.dir, "./fileUrl.ts");
const appConfigModulePath = resolve(import.meta.dir, "../config/appConfig.ts");

let configuredDownloadBaseUrl = "http://api.example.com";
let importVersion = 0;
const downloadBaseUrlValue = {
  trim: () => configuredDownloadBaseUrl.trim(),
};

mock.module(appConfigModulePath, () => ({
  DOWNLOAD_SERVER_BASE_URL: downloadBaseUrlValue,
}));

const loadFileUrlModule = async (downloadBaseUrl = "http://api.example.com") => {
  configuredDownloadBaseUrl = downloadBaseUrl;
  importVersion += 1;
  return import(`${fileUrlModulePath}?file-url-test=${importVersion}`);
};

afterEach(() => {
  configuredDownloadBaseUrl = "http://api.example.com";
  mock.clearAllMocks();
});

describe("resolveFileUrl", () => {
  it("uses the configured download base for relative file paths", async () => {
    const { resolveFileUrl } = await loadFileUrlModule("http://api.example.com");

    expect(resolveFileUrl("reports/example.pdf")).toBe(
      "http://api.example.com/reports/example.pdf",
    );
  });

  it("preserves fully-qualified http(s) file URLs", async () => {
    const { resolveFileUrl } = await loadFileUrlModule("");

    expect(resolveFileUrl("https://cdn.example.com/manuals/example.pdf")).toBe(
      "https://cdn.example.com/manuals/example.pdf",
    );
  });

  it("prefers VITE_DOWNLOAD_URL when it is configured", async () => {
    const { resolveFileUrl } = await loadFileUrlModule("https://files.example.com");

    expect(resolveFileUrl("reports/example.pdf")).toBe(
      "https://files.example.com/reports/example.pdf",
    );
  });
});
