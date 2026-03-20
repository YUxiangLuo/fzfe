import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { resolve } from "path";

mock.restore();

const authFileModulePath = resolve(import.meta.dir, "./authFile.ts");
const fileUrlModulePath = resolve(import.meta.dir, "./fileUrl.ts");
const sessionModulePath = resolve(import.meta.dir, "./session.ts");

const clearSessionAndRedirectMock = mock(() => {});
const getSessionTokenOrThrowMock = mock(() => "test-token");
const resolveFileUrlMock = mock(() => "http://files.example.com/manuals/example.pdf");
const fetchMock = mock<typeof fetch>();

let importVersion = 0;
const originalFetch = globalThis.fetch;

mock.module(fileUrlModulePath, () => ({
  resolveFileUrl: resolveFileUrlMock,
}));

mock.module(sessionModulePath, () => ({
  clearSessionAndRedirect: clearSessionAndRedirectMock,
  getSessionTokenOrThrow: getSessionTokenOrThrowMock,
}));

const loadAuthFileModule = async () => {
  importVersion += 1;
  return import(`${authFileModulePath}?auth-file-test=${importVersion}`);
};

describe("fetchFileBlob", () => {
  beforeEach(() => {
    clearSessionAndRedirectMock.mockReset();
    getSessionTokenOrThrowMock.mockReset();
    getSessionTokenOrThrowMock.mockReturnValue("test-token");
    resolveFileUrlMock.mockReset();
    resolveFileUrlMock.mockReturnValue("http://files.example.com/manuals/example.pdf");
    fetchMock.mockReset();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    mock.clearAllMocks();
  });

  it("clears the session and throws a consistent message when the file request returns 401", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const { fetchFileBlob } = await loadAuthFileModule();

    await expect(fetchFileBlob("manuals/example.pdf")).rejects.toThrow(
      "会话已过期，请重新登录",
    );
    expect(clearSessionAndRedirectMock).toHaveBeenCalledTimes(1);
  });

  it("preserves non-401 backend error messages without clearing the session", async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "权限不足" }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }),
    );

    const { fetchFileBlob } = await loadAuthFileModule();

    await expect(fetchFileBlob("manuals/example.pdf")).rejects.toThrow("权限不足");
    expect(clearSessionAndRedirectMock).not.toHaveBeenCalled();
  });
});
