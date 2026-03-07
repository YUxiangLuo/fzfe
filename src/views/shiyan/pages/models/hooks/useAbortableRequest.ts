import { useRef, useCallback, useEffect } from 'react';

/**
 * Custom hook for managing abortable API requests
 * Prevents race conditions and cleans up on unmount
 */
export function useAbortableRequest() {
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Execute an async function with automatic abort support
   * Cancels any previous pending request before starting a new one
   */
  const executeRequest = useCallback(async <T>(
    requestFn: (signal: AbortSignal) => Promise<T>
  ): Promise<T | null> => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this request
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const result = await requestFn(abortController.signal);
      return result;
    } catch (error) {
      // Ignore abort errors
      if (error instanceof DOMException && error.name === 'AbortError') {
        return null;
      }
      throw error;
    }
  }, []);

  /**
   * Manually abort the current pending request
   */
  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  }, []);

  /**
   * Cleanup: cancel all pending requests on unmount
   */
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    executeRequest,
    abort,
  };
}
