import { afterEach, describe, expect, it } from "bun:test";
import { resolve } from "path";

const appConfigModulePath = resolve(import.meta.dir, "./appConfig.ts");
const originalDownloadUrl = process.env.VITE_DOWNLOAD_URL;
const originalApiUrl = process.env.VITE_API_URL;

let importVersion = 0;

const loadAppConfigModule = async (downloadUrl?: string, apiUrl?: string) => {
  if (downloadUrl === undefined) {
    delete process.env.VITE_DOWNLOAD_URL;
  } else {
    process.env.VITE_DOWNLOAD_URL = downloadUrl;
  }

  if (apiUrl === undefined) {
    delete process.env.VITE_API_URL;
  } else {
    process.env.VITE_API_URL = apiUrl;
  }

  importVersion += 1;
  return import(`${appConfigModulePath}?app-config-test=${importVersion}`);
};

afterEach(() => {
  if (originalDownloadUrl === undefined) {
    delete process.env.VITE_DOWNLOAD_URL;
  } else {
    process.env.VITE_DOWNLOAD_URL = originalDownloadUrl;
  }

  if (originalApiUrl === undefined) {
    delete process.env.VITE_API_URL;
  } else {
    process.env.VITE_API_URL = originalApiUrl;
  }
});

describe("DOWNLOAD_SERVER_BASE_URL", () => {
  it("falls back to the VITE_API_URL origin when VITE_DOWNLOAD_URL is blank", async () => {
    const { DOWNLOAD_SERVER_BASE_URL } = await loadAppConfigModule(
      "",
      "http://api.example.com/api/v1",
    );

    expect(DOWNLOAD_SERVER_BASE_URL).toBe("http://api.example.com");
  });

  it("prefers VITE_DOWNLOAD_URL when it is configured", async () => {
    const { DOWNLOAD_SERVER_BASE_URL } = await loadAppConfigModule(
      "https://files.example.com",
      "http://api.example.com/api/v1",
    );

    expect(DOWNLOAD_SERVER_BASE_URL).toBe("https://files.example.com");
  });
});
