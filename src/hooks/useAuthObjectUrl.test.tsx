/// <reference types="bun-types" />
/// <reference lib="dom" />

import React from "react";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { render, waitFor } from "@testing-library/react";
import { resolve } from "path";

mock.restore();

const hookModulePath = resolve(import.meta.dir, "./useAuthObjectUrl.ts");
const authFileModulePath = resolve(import.meta.dir, "../utils/authFile.ts");

const createAuthObjectUrlMock = mock<(filePath: string) => Promise<string>>();

let importVersion = 0;
const originalConsoleError = console.error;

mock.module(authFileModulePath, () => ({
  createAuthObjectUrl: createAuthObjectUrlMock,
}));

const loadHookModule = async () => {
  importVersion += 1;
  return import(`${hookModulePath}?use-auth-object-url-test=${importVersion}`);
};

describe("useAuthObjectUrl", () => {
  beforeEach(() => {
    createAuthObjectUrlMock.mockReset();
  });

  afterEach(() => {
    console.error = originalConsoleError;
    mock.clearAllMocks();
  });

  it("can report load failures without writing to console.error", async () => {
    const expectedError = new Error("文件不存在");
    createAuthObjectUrlMock.mockRejectedValueOnce(expectedError);
    const consoleErrorMock = mock(() => {});
    const onError = mock(() => {});
    console.error = consoleErrorMock as unknown as typeof console.error;

    const { useAuthObjectUrl } = await loadHookModule();
    const Probe = () => {
      const url = useAuthObjectUrl("reports/missing.pdf", {
        onError,
        logErrors: false,
      });
      return <span>{url ?? "empty"}</span>;
    };

    render(<Probe />);

    await waitFor(() => expect(onError).toHaveBeenCalledTimes(1));
    expect(onError).toHaveBeenCalledWith(expectedError);
    expect(consoleErrorMock).not.toHaveBeenCalled();
  });
});
