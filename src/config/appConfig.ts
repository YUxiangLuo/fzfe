// This file contains application-wide constants and configurations.

/**
 * The base URL for the server that hosts downloadable files (e.g., experiment manuals).
 * In development, this is likely your backend server. In production, it could be a CDN or a different domain.
 */
/**
 * Defaults to the origin derived from VITE_API_URL when not configured explicitly.
 * If neither VITE_DOWNLOAD_URL nor VITE_API_URL is configured, it falls back to
 * the backend service on the same host at port 3001. This matches the intranet
 * deployment where nginx serves only frontend files and the browser talks to the
 * backend directly.
 */
const DEFAULT_BACKEND_PORT = "3001";

const getDefaultBackendOrigin = (): string => {
  if (typeof window !== "undefined" && window.location.hostname) {
    const protocol = window.location.protocol || "http:";
    return `${protocol}//${window.location.hostname}:${DEFAULT_BACKEND_PORT}`;
  }

  return `http://localhost:${DEFAULT_BACKEND_PORT}`;
};

const getApiOrigin = (): string => {
  const apiUrl = import.meta.env.VITE_API_URL?.trim();
  if (!apiUrl) {
    return getDefaultBackendOrigin();
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

  return getDefaultBackendOrigin();
};

export const DOWNLOAD_SERVER_BASE_URL =
  import.meta.env.VITE_DOWNLOAD_URL?.trim() || getApiOrigin();
