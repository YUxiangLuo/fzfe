// This file contains application-wide constants and configurations.

/**
 * The base URL for the server that hosts downloadable files (e.g., experiment manuals).
 * In development, this is likely your backend server. In production, it could be a CDN or a different domain.
 */
const getApiOrigin = (): string => {
  const apiUrl = import.meta.env.VITE_API_URL?.trim();
  if (!apiUrl) {
    return typeof window !== "undefined" && window.location.origin
      ? window.location.origin
      : "";
  }

  try {
    if (/^https?:\/\//i.test(apiUrl)) {
      return new URL(apiUrl).origin;
    }

    if (typeof window !== "undefined" && window.location.origin) {
      return new URL(apiUrl, window.location.origin).origin;
    }
  } catch {
    return "";
  }

  return typeof window !== "undefined" && window.location.origin
    ? window.location.origin
    : "";
};

export const DOWNLOAD_SERVER_BASE_URL = getApiOrigin();
