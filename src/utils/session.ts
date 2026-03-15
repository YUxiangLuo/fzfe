import { decodeToken, type DecodedToken } from "./auth";

export const SESSION_TOKEN_KEY = "token";
export const SESSION_ROLE_KEY = "userRole";
export const LOGIN_PAGE_PATH = "/login.html";

export type TeacherPortalRole = "teacher" | "assistant";
export type SessionPortal = "student" | "teacher" | "admin";

const SESSION_PORTAL_TOKEN_KEYS: Record<SessionPortal, string> = {
  student: "studentToken",
  teacher: "teacherToken",
  admin: "adminToken",
};

const SESSION_PORTAL_ROLE_KEYS: Record<SessionPortal, string | null> = {
  student: null,
  teacher: "teacherUserRole",
  admin: null,
};

const SESSION_PORTAL_ALLOWED_ROLES: Record<SessionPortal, readonly string[]> = {
  student: ["student"],
  teacher: ["teacher", "assistant"],
  admin: ["admin"],
};

const readStorageItem = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.error(`Failed to read "${key}" from localStorage:`, error);
    return null;
  }
};

const writeStorageItem = (key: string, value: string | null): void => {
  try {
    if (value === null) {
      localStorage.removeItem(key);
      return;
    }

    localStorage.setItem(key, value);
  } catch (error) {
    console.error(`Failed to write "${key}" to localStorage:`, error);
  }
};

const writeStorageItemOrThrow = (key: string, value: string | null): void => {
  try {
    if (value === null) {
      localStorage.removeItem(key);
      return;
    }

    localStorage.setItem(key, value);
  } catch (error) {
    console.error(`Failed to persist "${key}" to localStorage:`, error);
    throw new Error("无法保存登录状态，请检查浏览器存储权限后重试");
  }
};

const normalizeTeacherPortalRole = (role: string | null | undefined): TeacherPortalRole | null => {
  if (role === "teacher" || role === "assistant") {
    return role;
  }

  return null;
};

const normalizeRole = (role: string | null | undefined): string | null => {
  const normalizedRole = role?.toLowerCase();
  return normalizedRole ? normalizedRole : null;
};

const resolvePortalFromRole = (role: string | null | undefined): SessionPortal | null => {
  const normalizedRole = normalizeRole(role);
  if (!normalizedRole) {
    return null;
  }

  if (SESSION_PORTAL_ALLOWED_ROLES.student.includes(normalizedRole)) {
    return "student";
  }

  if (SESSION_PORTAL_ALLOWED_ROLES.teacher.includes(normalizedRole)) {
    return "teacher";
  }

  if (SESSION_PORTAL_ALLOWED_ROLES.admin.includes(normalizedRole)) {
    return "admin";
  }

  return null;
};

const getPortalTokenKey = (portal: SessionPortal): string => SESSION_PORTAL_TOKEN_KEYS[portal];

const getPortalRoleKey = (portal: SessionPortal): string | null => SESSION_PORTAL_ROLE_KEYS[portal];

const isRoleAllowedForPortal = (role: string | null | undefined, portal: SessionPortal): boolean => {
  const normalizedRole = normalizeRole(role);
  return normalizedRole ? SESSION_PORTAL_ALLOWED_ROLES[portal].includes(normalizedRole) : false;
};

const isTokenAllowedForPortal = (token: string, portal: SessionPortal): boolean => {
  return isRoleAllowedForPortal(decodeToken(token)?.role, portal);
};

const getTeacherPortalRoleFromToken = (token: string | null | undefined): TeacherPortalRole | null => {
  return normalizeTeacherPortalRole(decodeToken(token ?? "")?.role);
};

const PORTAL_PATH_PATTERNS: ReadonlyArray<[RegExp, SessionPortal]> = [
  [/^\/exp(?:\.html|\/|$)/, "student"],
  [/^\/teacher(?:\.html|\/|$)/, "teacher"],
  [/^\/admin(?:\.html|\/|$)/, "admin"],
];

const getPortalFromLocation = (): SessionPortal | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const pathname = window.location.pathname.toLowerCase();

  for (const [pattern, portal] of PORTAL_PATH_PATTERNS) {
    if (pattern.test(pathname)) {
      return portal;
    }
  }

  return null;
};

const resolveSessionPortal = (
  portal?: SessionPortal | null,
  token?: string | null,
): SessionPortal | null => {
  if (portal) {
    return portal;
  }

  return getPortalFromLocation() ?? resolvePortalFromRole(decodeToken(token ?? "")?.role);
};

const getLegacyTokenForPortal = (portal: SessionPortal | null): string | null => {
  const token = readStorageItem(SESSION_TOKEN_KEY);
  if (!token) {
    return null;
  }

  if (!portal) {
    return token;
  }

  return isTokenAllowedForPortal(token, portal) ? token : null;
};

const clearLegacySessionForPortal = (portal: SessionPortal): void => {
  const legacyToken = readStorageItem(SESSION_TOKEN_KEY);
  if (legacyToken && isTokenAllowedForPortal(legacyToken, portal)) {
    writeStorageItem(SESSION_TOKEN_KEY, null);
    writeStorageItem(SESSION_ROLE_KEY, null);
    return;
  }

  if (portal === "teacher") {
    const legacyRole = normalizeTeacherPortalRole(readStorageItem(SESSION_ROLE_KEY));
    if (legacyRole) {
      writeStorageItem(SESSION_ROLE_KEY, null);
    }
  }
};

export const getStoredToken = (portal?: SessionPortal | null): string | null => {
  const resolvedPortal = resolveSessionPortal(portal);
  if (!resolvedPortal) {
    return getLegacyTokenForPortal(null);
  }

  return readStorageItem(getPortalTokenKey(resolvedPortal)) ?? getLegacyTokenForPortal(resolvedPortal);
};

export const getSessionTokenOrThrow = (portal?: SessionPortal | null): string => {
  const token = getStoredToken(portal);
  if (!token) {
    throw new Error("未找到登录凭据");
  }

  return token;
};

// 角色解析优先级：门户专用 key → token 解码 → 旧版 key（向后兼容，迁移完成后可移除）
export const getStoredTeacherPortalRole = (portal: SessionPortal | null = null): TeacherPortalRole | null => {
  if (resolveSessionPortal(portal) !== "teacher") {
    return null;
  }

  const teacherRoleKey = getPortalRoleKey("teacher");
  const storedRole = teacherRoleKey ? normalizeTeacherPortalRole(readStorageItem(teacherRoleKey)) : null;
  if (storedRole) {
    return storedRole;
  }

  const teacherToken = getStoredToken("teacher");
  const tokenRole = getTeacherPortalRoleFromToken(teacherToken);
  if (tokenRole) {
    return tokenRole;
  }

  return normalizeTeacherPortalRole(readStorageItem(SESSION_ROLE_KEY));
};

export const setStoredTeacherPortalRole = (
  role: TeacherPortalRole | null,
  portal: SessionPortal | null = null,
): void => {
  if (resolveSessionPortal(portal) !== "teacher") {
    console.warn("setStoredTeacherPortalRole: 当前门户不是教师门户，操作已忽略");
    return;
  }

  const teacherRoleKey = getPortalRoleKey("teacher");
  if (teacherRoleKey) {
    writeStorageItem(teacherRoleKey, role);
  }
};

export const persistSession = (
  token: string,
  teacherPortalRole?: TeacherPortalRole | null,
  portal?: SessionPortal | null,
): void => {
  const resolvedPortal = resolveSessionPortal(portal, token);
  if (!resolvedPortal) {
    throw new Error("无法识别会话所属门户，请检查登录调用是否传入了明确的门户类型");
  }

  const normalizedRole = normalizeTeacherPortalRole(teacherPortalRole ?? null);
  const portalRoleKey = getPortalRoleKey(resolvedPortal);

  try {
    writeStorageItemOrThrow(getPortalTokenKey(resolvedPortal), token);
    if (portalRoleKey) {
      writeStorageItemOrThrow(
        portalRoleKey,
        normalizedRole ?? getTeacherPortalRoleFromToken(token),
      );
    }
  } catch (error) {
    clearSession(resolvedPortal);
    throw error;
  }
};

export const clearSession = (portal?: SessionPortal | null): void => {
  const resolvedPortal = resolveSessionPortal(portal);

  if (!resolvedPortal) {
    writeStorageItem(SESSION_TOKEN_KEY, null);
    writeStorageItem(SESSION_ROLE_KEY, null);
    return;
  }

  writeStorageItem(getPortalTokenKey(resolvedPortal), null);

  const portalRoleKey = getPortalRoleKey(resolvedPortal);
  if (portalRoleKey) {
    writeStorageItem(portalRoleKey, null);
  }

  clearLegacySessionForPortal(resolvedPortal);
};

export const redirectToLogin = (): void => {
  window.location.href = LOGIN_PAGE_PATH;
};

export const clearSessionAndRedirect = (portal?: SessionPortal | null): void => {
  clearSession(portal);
  redirectToLogin();
};

export const getSessionUser = (portal?: SessionPortal | null): DecodedToken | null => {
  const token = getStoredToken(portal);
  if (!token) return null;

  return decodeToken(token);
};

export const getSessionUserOrThrow = (portal?: SessionPortal | null): DecodedToken => {
  const user = getSessionUser(portal);
  if (!user) {
    throw new Error("登录信息已失效");
  }

  return user;
};

export const isSessionExpired = (user: Pick<DecodedToken, "exp"> | null | undefined): boolean => {
  if (!user) return true;

  return typeof user.exp === "number" && user.exp * 1000 <= Date.now();
};

export const hasSessionRole = (
  user: Pick<DecodedToken, "role"> | null | undefined,
  allowedRoles: readonly string[],
): boolean => {
  const role = normalizeRole(user?.role);
  return role ? allowedRoles.includes(role) : false;
};
