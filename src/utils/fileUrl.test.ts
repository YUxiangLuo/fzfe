import { afterEach, describe, expect, it } from "bun:test";
import { resolve } from "path";

const fileUrlModulePath = resolve(import.meta.dir, "./fileUrl.ts");
const originalDownloadUrl = process.env.VITE_DOWNLOAD_URL;
let importVersion = 0;

const loadFileUrlModule = async (downloadUrl?: string) => {
  if (downloadUrl === undefined) {
    delete process.env.VITE_DOWNLOAD_URL;
  } else {
    process.env.VITE_DOWNLOAD_URL = downloadUrl;
  }

  importVersion += 1;
  return import(`${fileUrlModulePath}?file-url-test=${importVersion}`);
};

afterEach(() => {
  if (originalDownloadUrl === undefined) {
    delete process.env.VITE_DOWNLOAD_URL;
  } else {
    process.env.VITE_DOWNLOAD_URL = originalDownloadUrl;
  }
});

describe("resolveFileUrl", () => {
  it("falls back to the current origin when VITE_DOWNLOAD_URL is blank", async () => {
    const { resolveFileUrl } = await loadFileUrlModule("");

    expect(resolveFileUrl("reports/example.pdf")).toBe(
      `${window.location.origin}/reports/example.pdf`,
    );
  });

  it("preserves fully-qualified http(s) file URLs", async () => {
    const { resolveFileUrl } = await loadFileUrlModule("");

    expect(resolveFileUrl("https://cdn.example.com/manuals/example.pdf")).toBe(
      "https://cdn.example.com/manuals/example.pdf",
    );
  });
});
