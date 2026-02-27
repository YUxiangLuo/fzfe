import { useState, useCallback, useEffect, useRef } from "react";

/**
 * Manages the lifecycle of a single Object URL (created via URL.createObjectURL).
 *
 * - Automatically revokes the previous URL when a new one is set.
 * - Revokes the URL on unmount to prevent memory leaks.
 *
 * Use this hook for imperative scenarios (e.g. export callbacks) where the
 * Object URL is created in a handler rather than derived from a prop.
 */
export function useObjectUrl() {
  const [url, setUrlState] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);

  const setUrl = useCallback((newUrl: string) => {
    setUrlState((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return newUrl;
    });
    urlRef.current = newUrl;
  }, []);

  const clearUrl = useCallback(() => {
    setUrlState((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    urlRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, []);

  return { url, setUrl, clearUrl } as const;
}
