import { resolveFileUrl } from "./fileUrl";
import { getSessionTokenOrThrow } from "./session";

const DEFAULT_OBJECT_URL_REVOKE_DELAY_MS = 120000;

const readErrorMessage = async (response: Response): Promise<string> => {
  const text = await response.text();
  if (!text) return `文件请求失败 (HTTP ${response.status})`;

  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
      const obj = parsed as Record<string, unknown>;
      const msg = obj.error ?? obj.message;
      if (typeof msg === "string" && msg) return msg;
    }
    return `文件请求失败 (HTTP ${response.status})`;
  } catch {
    return text;
  }
};

export const fetchFileBlob = async (filePath: string): Promise<Blob> => {
  const url = resolveFileUrl(filePath);
  if (!url) throw new Error("无效的文件地址");

  const token = getSessionTokenOrThrow();
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return response.blob();
};

export const createAuthObjectUrl = async (filePath: string): Promise<string> => {
  const blob = await fetchFileBlob(filePath);
  return URL.createObjectURL(blob);
};

const scheduleRevoke = (objectUrl: string, delayMs = DEFAULT_OBJECT_URL_REVOKE_DELAY_MS) => {
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), delayMs);
};

export const openFileWithAuth = async (filePath: string): Promise<void> => {
  // Open a placeholder window synchronously to avoid popup blockers.
  // Avoid `noopener` here — it causes some browsers to return null, defeating
  // the purpose of the synchronous open. We clear opener manually instead.
  const popup = window.open("", "_blank");
  if (popup) {
    popup.opener = null;
  }

  try {
    const objectUrl = await createAuthObjectUrl(filePath);

    if (popup && !popup.closed) {
      popup.location.href = objectUrl;
    } else {
      const fallback = window.open(objectUrl, "_blank");
      if (fallback) {
        fallback.opener = null;
      }
    }

    // Use a longer delay for files opened in a new tab — the user may still
    // be reading the document.  Download-style usage (downloadFileWithAuth)
    // can safely use the shorter default.
    scheduleRevoke(objectUrl, 10 * 60 * 1000);
  } catch (error) {
    if (popup && !popup.closed) {
      popup.close();
    }
    throw error;
  }
};

export const downloadFileWithAuth = async (
  filePath: string,
  preferredFilename?: string,
): Promise<void> => {
  const objectUrl = await createAuthObjectUrl(filePath);
  const fallbackName =
    filePath.split("/").filter(Boolean).pop()?.split("?")[0] || "download";

  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = preferredFilename || fallbackName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  scheduleRevoke(objectUrl);
};
