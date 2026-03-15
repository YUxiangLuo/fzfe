import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import {
  SESSION_ROLE_KEY,
  SESSION_TOKEN_KEY,
  clearSession,
  getSessionUser,
  getStoredTeacherPortalRole,
  getStoredToken,
  persistSession,
} from "./session";

const createToken = (role: string, overrides: Record<string, unknown> = {}): string => {
  const payload = {
    sub: 1,
    username: `${role}-user`,
    role,
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    ...overrides,
  };

  return [
    Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url"),
    Buffer.from(JSON.stringify(payload)).toString("base64url"),
    "",
  ].join(".");
};

describe("session portal isolation", () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState({}, "", "/");
  });

  afterEach(() => {
    localStorage.clear();
    window.history.replaceState({}, "", "/");
  });

  it("stores student and teacher sessions under different storage keys", () => {
    const studentToken = createToken("student");
    const teacherToken = createToken("teacher", { sub: 2 });

    persistSession(studentToken, null, "student");
    persistSession(teacherToken, "teacher", "teacher");

    expect(localStorage.getItem("studentToken")).toBe(studentToken);
    expect(localStorage.getItem("teacherToken")).toBe(teacherToken);
    expect(localStorage.getItem("teacherUserRole")).toBe("teacher");

    window.history.replaceState({}, "", "/exp.html");
    expect(getStoredToken()).toBe(studentToken);
    expect(getSessionUser()?.role).toBe("student");

    window.history.replaceState({}, "", "/teacher.html");
    expect(getStoredToken()).toBe(teacherToken);
    expect(getStoredTeacherPortalRole()).toBe("teacher");
    expect(getSessionUser()?.role).toBe("teacher");
  });

  it("only falls back to the legacy token when its role belongs to the current portal", () => {
    const teacherToken = createToken("teacher");

    localStorage.setItem(SESSION_TOKEN_KEY, teacherToken);
    localStorage.setItem(SESSION_ROLE_KEY, "teacher");

    window.history.replaceState({}, "", "/exp.html");
    expect(getStoredToken()).toBeNull();
    expect(getSessionUser()).toBeNull();

    window.history.replaceState({}, "", "/teacher.html");
    expect(getStoredToken()).toBe(teacherToken);
    expect(getStoredTeacherPortalRole()).toBe("teacher");
  });

  it("clears only the current portal session and leaves other portal tokens intact", () => {
    const studentToken = createToken("student");
    const teacherToken = createToken("teacher", { sub: 2 });

    persistSession(studentToken, null, "student");
    persistSession(teacherToken, "teacher", "teacher");
    localStorage.setItem(SESSION_TOKEN_KEY, createToken("student", { sub: 3 }));

    window.history.replaceState({}, "", "/exp.html");
    clearSession();

    expect(localStorage.getItem("studentToken")).toBeNull();
    expect(localStorage.getItem(SESSION_TOKEN_KEY)).toBeNull();
    expect(localStorage.getItem("teacherToken")).toBe(teacherToken);
    expect(localStorage.getItem("teacherUserRole")).toBe("teacher");
  });
});
