/// <reference types="bun-types" />

import { resolve } from "node:path";
import { beforeEach, describe, expect, it, mock } from "bun:test";

mock.restore();

const r = (p: string) => resolve(import.meta.dir, p);

let sessionUser: { sub: number; role: string; username: string; exp: number; iat: number } = {
  sub: 42,
  role: "Teacher",
  username: "teacher42",
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
};

const apiGet = mock(async () => [] as unknown[]);
const getSessionUserOrThrow = mock(() => sessionUser);

mock.module(r("../../../utils/apiClient.ts"), () => ({
  apiClient: {
    get: apiGet,
  },
}));

mock.module(r("../../../utils/session.ts"), () => ({
  getSessionUserOrThrow,
}));

const portalApiModulePath = `${r("./portalApi.ts")}?portal-api-test`;
const {
  getTeacherPortalUserOrThrow,
  listManagedClassGradeSummaries,
  listManagedClasses,
} = await import(portalApiModulePath);

describe("teacher portal API academic term parameters", () => {
  beforeEach(() => {
    sessionUser = {
      sub: 42,
      role: "Teacher",
      username: "teacher42",
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    };
    apiGet.mockReset();
    apiGet.mockResolvedValue([]);
    getSessionUserOrThrow.mockClear();
  });

  it("builds teacher class-list endpoint with academic year and semester query parameters", async () => {
    const signal = new AbortController().signal;

    await listManagedClasses({
      signal,
      headers: { "X-Test": "yes" },
      academicTerm: { academic_year_start: 2025, semester: 2 },
    });

    expect(apiGet).toHaveBeenCalledWith(
      "/teachers/42/classes?academic_year_start=2025&semester=2",
      { signal, headers: { "X-Test": "yes" } },
    );
  });

  it("omits term query parameters when no term is selected", async () => {
    await listManagedClasses({ academicTerm: null });

    expect(apiGet).toHaveBeenCalledWith("/teachers/42/classes", {});
  });

  it("uses assistant endpoints for assistant portal users", async () => {
    sessionUser = {
      sub: 601,
      role: "Assistant",
      username: "assistant601",
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    };

    await listManagedClasses({ academicTerm: { academic_year_start: 2024, semester: 1 } });

    expect(apiGet).toHaveBeenCalledWith(
      "/assistants/601/classes?academic_year_start=2024&semester=1",
      {},
    );
  });

  it("applies the same academic term parameters to managed grade summary endpoints", async () => {
    await listManagedClassGradeSummaries({
      academicTerm: { academic_year_start: 2026, semester: 1 },
    });

    expect(apiGet).toHaveBeenCalledWith(
      "/teachers/42/grade-summaries?academic_year_start=2026&semester=1",
      {},
    );
  });

  it("rejects non-teacher-portal session roles before constructing endpoints", () => {
    sessionUser = {
      sub: 9,
      role: "Student",
      username: "student9",
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    };

    expect(() => getTeacherPortalUserOrThrow()).toThrow("当前用户不是教师端/助教端账号");
  });
});
