/// <reference types="bun-types" />

import { resolve } from "path";
import { afterEach, describe, expect, it, mock } from "bun:test";
import { SESSION_TOKEN_KEY } from "../../../utils/session";

mock.restore();

const apiClientModulePath = resolve(import.meta.dir, "../../../utils/apiClient.ts");
let apiClientImportVersion = 0;

const originalFetch = globalThis.fetch;
const originalSetTimeout = globalThis.setTimeout;
const originalClearTimeout = globalThis.clearTimeout;
const originalPathname = window.location.pathname;
const originalApiBaseUrl = process.env.VITE_API_URL;

const loadApiClient = async () => {
  apiClientImportVersion += 1;
  process.env.VITE_API_URL = "http://localhost/api/v1";
  const { apiClient } = await import(
    `${apiClientModulePath}?api-client-test=${apiClientImportVersion}`
  );
  return apiClient;
};

afterEach(() => {
  globalThis.fetch = originalFetch;
  globalThis.setTimeout = originalSetTimeout;
  globalThis.clearTimeout = originalClearTimeout;
  localStorage.clear();
  window.history.replaceState({}, "", originalPathname || "/");
  if (originalApiBaseUrl) {
    process.env.VITE_API_URL = originalApiBaseUrl;
  } else {
    delete process.env.VITE_API_URL;
  }
});

describe("apiClient timeout handling", () => {
  it("includes backend processing and transport overhead for model execution requests", async () => {
    const apiClient = await loadApiClient();
    const setTimeoutMock = mock((_handler: TimerHandler, timeout?: number) => {
      expect(timeout).toBe(690_000);
      return 1 as unknown as ReturnType<typeof setTimeout>;
    });
    const fetchMock = mock(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.signal).toBeInstanceOf(AbortSignal);

      return new Response(JSON.stringify({ data: { ok: true } }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      });
    });

    globalThis.setTimeout = setTimeoutMock as unknown as typeof setTimeout;
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(
      apiClient.post("/models/ma/prepare-production", {
        experiment_id: 7,
        forecast_steps: 6,
      }),
    ).resolves.toEqual({ ok: true });

    expect(setTimeoutMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("uses the hard-cap transport budget for configurable model predictions", async () => {
    const apiClient = await loadApiClient();
    const setTimeoutMock = mock((_handler: TimerHandler, timeout?: number) => {
      expect(timeout).toBe(690_000);
      return 1 as unknown as ReturnType<typeof setTimeout>;
    });
    globalThis.setTimeout = setTimeoutMock as unknown as typeof setTimeout;
    globalThis.fetch = mock(async () => new Response(JSON.stringify({ data: { predictions: [] } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })) as unknown as typeof fetch;

    await expect(
      apiClient.post("/models/ma/predict", {
        experiment_id: 7,
        forecast_steps: 6,
      }),
    ).resolves.toEqual({ predictions: [] });
    expect(setTimeoutMock).toHaveBeenCalledTimes(1);
  });

  it("uses a 30-second timeout for guided-session metadata requests", async () => {
    const apiClient = await loadApiClient();
    const setTimeoutMock = mock((_handler: TimerHandler, timeout?: number) => {
      expect(timeout).toBe(30_000);
      return 1 as unknown as ReturnType<typeof setTimeout>;
    });
    globalThis.setTimeout = setTimeoutMock as unknown as typeof setTimeout;
    globalThis.fetch = mock(async () => new Response(JSON.stringify({ data: { session_id: "s1" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })) as unknown as typeof fetch;

    await expect(
      apiClient.get("/models/ma/guided-training/sessions/s1"),
    ).resolves.toEqual({ session_id: "s1" });
    expect(setTimeoutMock).toHaveBeenCalledTimes(1);
  });

  it("preserves external aborts instead of rewriting them as request timeouts", async () => {
    const apiClient = await loadApiClient();

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

  it("keeps an external abort classified as cancellation even if the timeout callback runs later", async () => {
    const apiClient = await loadApiClient();
    let runTimeout = () => {};

    globalThis.setTimeout = ((handler: TimerHandler) => {
      runTimeout = () => {
        if (typeof handler === "function") handler();
      };
      return 1 as unknown as ReturnType<typeof setTimeout>;
    }) as unknown as typeof setTimeout;
    globalThis.clearTimeout = mock(() => {}) as typeof clearTimeout;
    globalThis.fetch = mock((_input: RequestInfo | URL, init?: RequestInit) => {
      const signal = init?.signal;
      return new Promise<Response>((_resolve, reject) => {
        signal?.addEventListener(
          "abort",
          () => reject(new DOMException("Cancelled by caller", "AbortError")),
          { once: true },
        );
      });
    }) as unknown as typeof fetch;

    const controller = new AbortController();
    const requestPromise = apiClient.get("/status", { signal: controller.signal });
    controller.abort(new DOMException("Navigation", "AbortError"));
    runTimeout();

    await expect(requestPromise).rejects.toMatchObject({
      name: "AbortError",
      message: "Cancelled by caller",
    });
  });

  it("keeps the timeout active while the response body is being read", async () => {
    const apiClient = await loadApiClient();
    let runTimeout = () => {};
    let timerCleared = false;

    globalThis.setTimeout = ((handler: TimerHandler) => {
      runTimeout = () => {
        if (!timerCleared && typeof handler === "function") handler();
      };
      return 1 as unknown as ReturnType<typeof setTimeout>;
    }) as unknown as typeof setTimeout;
    globalThis.clearTimeout = mock(() => {
      timerCleared = true;
    }) as typeof clearTimeout;
    globalThis.fetch = mock(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const signal = init?.signal;
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          signal?.addEventListener("abort", () => {
            controller.error(signal.reason);
          }, { once: true });
        },
      });
      return new Response(body, {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }) as unknown as typeof fetch;

    const requestPromise = apiClient.get("/status");
    await Promise.resolve();
    expect(timerCleared).toBe(false);
    runTimeout();

    await expect(requestPromise).rejects.toMatchObject({
      name: "ApiTimeoutError",
      code: "CLIENT_TIMEOUT",
      timeoutMs: 10_000,
    });
    expect(timerCleared).toBe(true);
  });

  it("still rewrites real timeout aborts into the timeout error message", async () => {
    const apiClient = await loadApiClient();

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
      await expect(apiClient.get("/status")).rejects.toMatchObject({
        name: "ApiTimeoutError",
        code: "CLIENT_TIMEOUT",
        timeoutMs: 10_000,
        message: "请求超时（10秒），请检查网络连接后重试",
      });
    } finally {
      globalThis.setTimeout = originalSetTimeout;
      globalThis.clearTimeout = originalClearTimeout;
      globalThis.fetch = originalFetch;
    }
  });

  it("uses an explicit timeout override for long queue-backed requests", async () => {
    const apiClient = await loadApiClient();
    const setTimeoutMock = mock((_handler: TimerHandler, timeout?: number) => {
      expect(timeout).toBe(195000);
      return 1 as unknown as ReturnType<typeof setTimeout>;
    });
    const clearTimeoutMock = mock(() => {});
    const fetchMock = mock(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect(init?.signal).toBeInstanceOf(AbortSignal);

      return new Response(JSON.stringify({ data: { ok: true } }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      });
    });

    globalThis.setTimeout = setTimeoutMock as unknown as typeof setTimeout;
    globalThis.clearTimeout = clearTimeoutMock as unknown as typeof clearTimeout;
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(
      apiClient.post("/experiment-runs/17/report", { report_content: "# report" }, { timeoutMs: 195000 }),
    ).resolves.toEqual({ ok: true });

    expect(setTimeoutMock).toHaveBeenCalledTimes(1);
    expect(clearTimeoutMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe("apiClient error handling", () => {
  it("extracts nested validation messages from backend Zod errors", async () => {
    const apiClient = await loadApiClient();
    const validationMessage = "姓名只能包含中文字符、英文字母和空格";

    globalThis.fetch = mock(async () => new Response(JSON.stringify({
      success: false,
      error: {
        name: "ZodError",
        message: JSON.stringify([{ message: validationMessage }]),
      },
    }), {
      status: 400,
      statusText: "Bad Request",
      headers: {
        "Content-Type": "application/json",
      },
    })) as unknown as typeof fetch;

    await expect(apiClient.post("/classes/1/students", {})).rejects.toThrow(
      `HTTP 400 Bad Request - ${validationMessage}`,
    );
  });
});

describe("apiClient session isolation", () => {
  it("uses the student portal token on the student entry page", async () => {
    const apiClient = await loadApiClient();
    const studentToken = "student-token";
    const teacherToken = "teacher-token";

    localStorage.setItem("studentToken", studentToken);
    localStorage.setItem("teacherToken", teacherToken);
    window.history.replaceState({}, "", "/exp.html");

    globalThis.fetch = mock(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect((init?.headers as Record<string, string>)?.Authorization).toBe(`Bearer ${studentToken}`);

      return new Response(JSON.stringify({ data: { ok: true } }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }) as unknown as typeof fetch;

    await expect(apiClient.get("/users/me")).resolves.toEqual({ ok: true });
  });

  it("does not attach a mismatched legacy token on the student entry page", async () => {
    const apiClient = await loadApiClient();

    localStorage.setItem(SESSION_TOKEN_KEY, [
      Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url"),
      Buffer.from(JSON.stringify({
        sub: 1,
        username: "teacher-user",
        role: "teacher",
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000),
      })).toString("base64url"),
      "",
    ].join("."));
    window.history.replaceState({}, "", "/exp.html");

    globalThis.fetch = mock(async (_input: RequestInfo | URL, init?: RequestInit) => {
      expect((init?.headers as Record<string, string>)?.Authorization).toBeUndefined();

      return new Response(JSON.stringify({ data: { ok: true } }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }) as unknown as typeof fetch;

    await expect(apiClient.get("/users/me")).resolves.toEqual({ ok: true });
  });
});
