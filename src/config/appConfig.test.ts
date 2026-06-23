import { afterEach, describe, expect, it } from "bun:test";
import { resolve } from "path";

const appConfigModulePath = resolve(import.meta.dir, "./appConfig.ts");
const originalApiUrl = process.env.VITE_API_URL;

let importVersion = 0;

const loadAppConfigModule = async (apiUrl?: string) => {
  if (apiUrl === undefined) {
    delete process.env.VITE_API_URL;
  } else {
    process.env.VITE_API_URL = apiUrl;
  }

  importVersion += 1;
  return import(`${appConfigModulePath}?app-config-test=${importVersion}`);
};

afterEach(() => {
  if (originalApiUrl === undefined) {
    delete process.env.VITE_API_URL;
  } else {
    process.env.VITE_API_URL = originalApiUrl;
  }
});

describe("DOWNLOAD_SERVER_BASE_URL", () => {
  it("falls back to the VITE_API_URL origin when VITE_API_URL is configured", async () => {
    const { DOWNLOAD_SERVER_BASE_URL } = await loadAppConfigModule(
      "http://api.example.com/api/v1",
    );

    expect(DOWNLOAD_SERVER_BASE_URL).toBe("http://api.example.com");
  });

  it("falls back to the same-host backend port when VITE_API_URL is not configured", async () => {
    const { DOWNLOAD_SERVER_BASE_URL } = await loadAppConfigModule();

    expect(DOWNLOAD_SERVER_BASE_URL).toBe("http://localhost:3001");
  });
});
