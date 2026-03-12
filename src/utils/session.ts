import { decodeToken, type DecodedToken } from "./auth";

export const SESSION_TOKEN_KEY = "token";
export const SESSION_ROLE_KEY = "userRole";
export const LOGIN_PAGE_PATH = "/login.html";

export type TeacherPortalRole = "teacher" | "assistant";

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

export const getStoredToken = (): string | null => readStorageItem(SESSION_TOKEN_KEY);

export const getSessionTokenOrThrow = (): string => {
  const token = getStoredToken();
  if (!token) {
    throw new Error("未找到登录凭据");
  }

  return token;
};

export const getStoredTeacherPortalRole = (): TeacherPortalRole | null => {
  return normalizeTeacherPortalRole(readStorageItem(SESSION_ROLE_KEY));
};

export const setStoredTeacherPortalRole = (role: TeacherPortalRole | null): void => {
  writeStorageItem(SESSION_ROLE_KEY, role);
};

export const persistSession = (
  token: string,
  teacherPortalRole?: TeacherPortalRole | null,
): void => {
  const normalizedRole = normalizeTeacherPortalRole(teacherPortalRole ?? null);

  try {
    writeStorageItemOrThrow(SESSION_TOKEN_KEY, token);
    writeStorageItemOrThrow(SESSION_ROLE_KEY, normalizedRole);
  } catch (error) {
    clearSession();
    throw error;
  }
};

export const clearSession = (): void => {
  writeStorageItem(SESSION_TOKEN_KEY, null);
  writeStorageItem(SESSION_ROLE_KEY, null);
};

export const redirectToLogin = (): void => {
  window.location.href = LOGIN_PAGE_PATH;
};

export const clearSessionAndRedirect = (): void => {
  clearSession();
  redirectToLogin();
};

export const getSessionUser = (): DecodedToken | null => {
  const token = getStoredToken();
  if (!token) return null;

  return decodeToken(token);
};

export const getSessionUserOrThrow = (): DecodedToken => {
  const user = getSessionUser();
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
  const normalizedRole = user?.role?.toLowerCase();
  return normalizedRole ? allowedRoles.includes(normalizedRole) : false;
};
