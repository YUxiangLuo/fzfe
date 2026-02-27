import { useState, useEffect, useRef } from "react";
import { createAuthObjectUrl } from "../utils/authFile";

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
export function useAuthObjectUrl(filePath: string | null | undefined): string | null {
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
        console.error("Failed to load authenticated file:", err);
        setUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return null;
        });
        urlRef.current = null;
      });

    return () => {
      cancelled = true;
    };
  }, [filePath]);

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
