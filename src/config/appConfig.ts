// This file contains application-wide constants and configurations.

/**
 * The base URL for the server that hosts downloadable files (e.g., experiment manuals).
 * In development, this is likely your backend server. In production, it could be a CDN or a different domain.
 */
/**
 * Falls back to empty string (current origin) when not configured,
 * which works when frontend and backend are served from the same domain via Nginx.
 */
export const DOWNLOAD_SERVER_BASE_URL = import.meta.env.VITE_DOWNLOAD_URL || '';
