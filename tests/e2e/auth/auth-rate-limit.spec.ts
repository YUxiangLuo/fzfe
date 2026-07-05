import { expect, test, type APIRequestContext, type APIResponse } from "@playwright/test";
import { ACCOUNTS } from "../helpers";

const BACKEND_PORT = process.env.E2E_BACKEND_PORT ?? "54127";
const BACKEND_ORIGIN =
  process.env.E2E_BACKEND_ORIGIN ?? `http://127.0.0.1:${BACKEND_PORT}`;

type ErrorPayload = {
  error?: string;
  retry_after_seconds?: number;
  data?: unknown;
};

function apiUrl(pathname: string): string {
  return `${BACKEND_ORIGIN}${pathname}`;
}

function jsonHeaders(ip: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "x-forwarded-for": ip,
  };
}

async function postJson(
  request: APIRequestContext,
  pathname: string,
  data: unknown,
  ip: string,
): Promise<APIResponse> {
  return request.post(apiUrl(pathname), {
    headers: jsonHeaders(ip),
    data,
  });
}

async function expectJsonError(
  response: APIResponse,
  status: number,
  error: string,
): Promise<ErrorPayload> {
  expect(response.status()).toBe(status);
  const payload = await response.json() as ErrorPayload;
  expect(payload.error).toBe(error);
  expect(payload).not.toHaveProperty("data");
  return payload;
}

function expectRetryAfter(response: APIResponse, payload: ErrorPayload): void {
  expect(payload.retry_after_seconds).toEqual(expect.any(Number));
  expect(payload.retry_after_seconds).toBeGreaterThan(0);

  const headers = response.headers();
  const retryAfter = headers["retry-after"] ?? headers["Retry-After"];
  expect(retryAfter).toMatch(/^\d+$/);
}

function makeStudentUsername(): string {
  const suffix = String(Date.now() % 10_000_000).padStart(7, "0");
  return `8${suffix}`;
}

test.describe("auth hardening e2e", () => {
  test("limits repeated login attempts for the same account before password verification", async ({ request }) => {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await postJson(
        request,
        "/api/v1/sessions",
        {
          username: ACCOUNTS.teacher.username,
          password: `WrongPassword-${attempt}`,
        },
        `198.51.100.${attempt + 10}`,
      );

      await expectJsonError(response, 401, "用户名或密码错误");
    }

    const blocked = await postJson(
      request,
      "/api/v1/sessions",
      {
        username: ACCOUNTS.teacher.username,
        password: ACCOUNTS.teacher.password,
      },
      "198.51.100.99",
    );

    const payload = await expectJsonError(
      blocked,
      429,
      "该账号登录尝试过于频繁，请稍后再试",
    );
    expectRetryAfter(blocked, payload);
  });

  test("keeps JSON null self-registration payloads as validation errors", async ({ request }) => {
    const response = await postJson(
      request,
      "/api/v1/users/register/Student",
      null,
      "203.0.113.10",
    );

    await expectJsonError(response, 400, "验证失败");
  });

  test("limits repeated self-registration attempts for the same username", async ({ request }) => {
    const username = makeStudentUsername();
    const registration = {
      username,
      password: "StudentE2E!890",
      name: "Rate Limit Student",
      email: `${username}@student-e2e.test`,
    };

    const created = await postJson(
      request,
      "/api/v1/users/register/Student",
      registration,
      "203.0.113.20",
    );
    expect(created.status()).toBe(201);

    const duplicate = await postJson(
      request,
      "/api/v1/users/register/Student",
      registration,
      "203.0.113.21",
    );
    await expectJsonError(duplicate, 409, "用户名已存在");

    const blocked = await postJson(
      request,
      "/api/v1/users/register/Student",
      registration,
      "203.0.113.22",
    );
    const payload = await expectJsonError(
      blocked,
      429,
      "该用户名注册尝试过于频繁，请稍后再试",
    );
    expectRetryAfter(blocked, payload);
  });
});
