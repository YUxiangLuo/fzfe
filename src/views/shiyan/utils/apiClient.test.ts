/// <reference types="bun-types" />

import { afterEach, describe, expect, it, mock } from "bun:test";
import { apiClient } from "../../../utils/apiClient";

const originalFetch = globalThis.fetch;
const originalSetTimeout = globalThis.setTimeout;
const originalClearTimeout = globalThis.clearTimeout;

afterEach(() => {
  globalThis.fetch = originalFetch;
  globalThis.setTimeout = originalSetTimeout;
  globalThis.clearTimeout = originalClearTimeout;
});

describe("apiClient timeout handling", () => {
  it("preserves external aborts instead of rewriting them as request timeouts", async () => {
    globalThis.fetch = mock((_input: RequestInfo | URL, init?: RequestInit) => {
      const signal = init?.signal;

      return new Promise<Response>((_resolve, reject) => {
        const rejectAbort = () => reject(new DOMException("Aborted", "AbortError"));

        if (!signal) {
          reject(new Error("Expected an abort signal."));
          return;
        }

        if (signal.aborted) {
          rejectAbort();
          return;
        }

        signal.addEventListener("abort", rejectAbort, { once: true });
      });
    }) as unknown as typeof fetch;

    const controller = new AbortController();
    const requestPromise = apiClient.post("/tools/adf", { series: [] }, { signal: controller.signal });

    controller.abort();

    await expect(requestPromise).rejects.toMatchObject({
      name: "AbortError",
      message: "Aborted",
    });
  });

  it("still rewrites real timeout aborts into the timeout error message", async () => {
    globalThis.setTimeout = ((handler: TimerHandler) => {
      queueMicrotask(() => {
        if (typeof handler === "function") {
          handler();
        }
      });
      return 1 as unknown as ReturnType<typeof setTimeout>;
    }) as unknown as typeof setTimeout;

    globalThis.clearTimeout = mock(() => {}) as typeof clearTimeout;
    globalThis.fetch = mock((_input: RequestInfo | URL, init?: RequestInit) => {
      const signal = init?.signal;

      return new Promise<Response>((_resolve, reject) => {
        const rejectAbort = () => reject(new DOMException("Aborted", "AbortError"));

        if (!signal) {
          reject(new Error("Expected an abort signal."));
          return;
        }

        if (signal.aborted) {
          rejectAbort();
          return;
        }

        signal.addEventListener("abort", rejectAbort, { once: true });
      });
    }) as unknown as typeof fetch;

    try {
      await expect(apiClient.get("/status")).rejects.toThrow("请求超时（10秒）");
    } finally {
      globalThis.setTimeout = originalSetTimeout;
      globalThis.clearTimeout = originalClearTimeout;
      globalThis.fetch = originalFetch;
    }
  });
});
