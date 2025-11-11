// This file contains application-wide constants and configurations.

/**
 * The base URL for the server that hosts downloadable files (e.g., experiment manuals).
 * In development, this is likely your backend server. In production, it could be a CDN or a different domain.
 */
const DOWNLOAD_URL = import.meta.env.VITE_DOWNLOAD_URL;

if (!DOWNLOAD_URL) {
  throw new Error("VITE_DOWNLOAD_URL is not defined. Please check your .env file.");
}
export const DOWNLOAD_SERVER_BASE_URL = DOWNLOAD_URL;
