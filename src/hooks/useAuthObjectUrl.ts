import { useState, useEffect, useRef } from "react";
import { createAuthObjectUrl } from "../utils/authFile";

interface UseAuthObjectUrlOptions {
  onError?: (error: unknown) => void;
  logErrors?: boolean;
}

/**
 * Declaratively fetches an authenticated file and returns an Object URL.
 *
 * Pass a `filePath` (or `null`/`undefined` to skip). The hook:
 * - Fetches the file with auth headers and creates an Object URL.
 * - Revokes stale URLs when the path changes or on unmount.
 * - Handles race conditions when the path changes mid-fetch.
 *
 * For imperative usage (e.g. export callbacks) use `useObjectUrl` instead.
 */
export function useAuthObjectUrl(
  filePath: string | null | undefined,
  options: UseAuthObjectUrlOptions = {},
): string | null {
  const { onError, logErrors = true } = options;
  const [url, setUrl] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const requestId = ++requestIdRef.current;

    if (!filePath) {
      setUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      urlRef.current = null;
      return;
    }

    let cancelled = false;

    createAuthObjectUrl(filePath)
      .then((objectUrl) => {
        if (cancelled || requestId !== requestIdRef.current) {
          URL.revokeObjectURL(objectUrl);
          return;
        }
        setUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return objectUrl;
        });
        urlRef.current = objectUrl;
      })
      .catch((err) => {
        if (cancelled || requestId !== requestIdRef.current) return;
        if (logErrors) {
          console.error("Failed to load authenticated file:", err);
        }
        onError?.(err);
        setUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
        urlRef.current = null;
      });

    return () => {
      cancelled = true;
    };
  }, [filePath, logErrors, onError]);

  useEffect(() => {
    return () => {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, []);

  return url;
}
