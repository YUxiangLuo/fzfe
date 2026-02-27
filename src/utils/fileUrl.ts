import { DOWNLOAD_SERVER_BASE_URL } from "../config/appConfig";

const PUBLIC_FILE_PREFIX_RE = /(manuals|datasets|reports|exports)\/.+$/i;

const normalizeFilePath = (rawPath: string): string => {
  const normalized = rawPath.trim().replace(/\\/g, "/");

  const legacyUploadsMatch = normalized.match(
    /(?:^|\/)uploads\/((?:manuals|datasets|reports|exports)\/.+)$/i,
  );
  if (legacyUploadsMatch?.[1]) {
    return legacyUploadsMatch[1];
  }

  const publicPathMatch = normalized.match(
    /(?:^|\/)((?:manuals|datasets|reports|exports)\/.+)$/i,
  );
  if (publicPathMatch?.[1]) {
    return publicPathMatch[1];
  }

  if (PUBLIC_FILE_PREFIX_RE.test(normalized)) {
    return normalized.replace(/^\/+/, "");
  }

  return normalized.replace(/^\/+/, "");
};

export const resolveFileUrl = (filePath: string | null | undefined): string => {
  if (!filePath) return "";

  const trimmed = filePath.trim();
  if (!trimmed) return "";

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const parsed = new URL(trimmed);
      return parsed.protocol === "http:" || parsed.protocol === "https:"
        ? parsed.toString()
        : "";
    } catch {
      return "";
    }
  }

  // Reject protocol-relative URLs and non-http(s) schemes.
  if (/^\/\//.test(trimmed) || /^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    return "";
  }

  const normalizedPath = normalizeFilePath(trimmed);
  if (!normalizedPath) return "";

  return new URL(
    normalizedPath,
    `${DOWNLOAD_SERVER_BASE_URL.replace(/\/+$/, "")}/`,
  ).toString();
};
