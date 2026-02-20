import type { Page } from "@playwright/test";

type JwtPayload = {
  sub: number;
  username: string;
  role: string;
  exp: number;
  iat: number;
  full_name?: string;
};

const encodeBase64Url = (value: unknown): string =>
  Buffer.from(JSON.stringify(value)).toString("base64url");

export const createFakeJwt = (overrides: Partial<JwtPayload> = {}): string => {
  const now = Math.floor(Date.now() / 1000);
  const payload: JwtPayload = {
    sub: overrides.sub ?? 1,
    username: overrides.username ?? "e2e_admin",
    role: overrides.role ?? "Admin",
    iat: now,
    exp: now + 60 * 60,
    full_name: overrides.full_name ?? "E2E Admin",
  };

  const header = { alg: "none", typ: "JWT" };
  return `${encodeBase64Url(header)}.${encodeBase64Url(payload)}.`;
};

export const setTokenBeforeNavigation = async (
  page: Page,
  token: string,
): Promise<void> => {
  await page.addInitScript(({ value }) => {
    window.localStorage.setItem("token", value);
  }, { value: token });
};

export const clearTokenBeforeNavigation = async (page: Page): Promise<void> => {
  await page.addInitScript(() => {
    window.localStorage.removeItem("token");
  });
};

export const useAdminToken = async (
  page: Page,
  overrides: Partial<JwtPayload> = {},
): Promise<void> => {
  await setTokenBeforeNavigation(page, createFakeJwt({ role: "Admin", ...overrides }));
};

