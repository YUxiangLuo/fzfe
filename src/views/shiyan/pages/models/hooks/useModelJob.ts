import { useCallback, useEffect, useRef, useState } from 'react';
import { useAbortableRequest } from './useAbortableRequest';

type TrainingLockSetter = (isLocked: boolean, lockPath?: string | null) => void;

interface RunModelJobOptions<T> {
  request: (signal: AbortSignal) => Promise<T>;
  lockPath?: string | null;
  setTrainingLock?: TrainingLockSetter;
  getErrorMessage?: (error: unknown) => string;
}

export function useModelJob() {
  const { executeRequest } = useAbortableRequest();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const isMountedRef = useRef(true);
  const jobIdRef = useRef(0);
  const activeLockRef = useRef<{
    jobId: number;
    release: TrainingLockSetter;
  } | null>(null);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (activeLockRef.current) {
        activeLockRef.current.release(false, null);
        activeLockRef.current = null;
      }
    };
  }, []);

  const releaseLock = useCallback((jobId?: number) => {
    if (!activeLockRef.current) {
      return;
    }

    if (jobId !== undefined && activeLockRef.current.jobId !== jobId) {
      return;
    }

    activeLockRef.current.release(false, null);
    activeLockRef.current = null;
  }, []);

  const clearLoadingState = useCallback((jobId: number) => {
    if (jobIdRef.current !== jobId) {
      return;
    }

    if (isMountedRef.current) {
      setIsLoading(false);
    }
  }, []);

  const recordFailure = useCallback((jobError: unknown, fallbackMessage = '模型任务执行失败') => {
    if (!isMountedRef.current) {
      return;
    }

    const errorMessage =
      typeof jobError === 'string' && jobError.trim().length > 0
        ? jobError
        : jobError instanceof Error
          ? jobError.message
          : fallbackMessage;

    setError(errorMessage);
    setRetryCount((previous) => previous + 1);
  }, []);

  const runJob = useCallback(async <T>({
    request,
    lockPath,
    setTrainingLock,
    getErrorMessage,
  }: RunModelJobOptions<T>): Promise<T | null> => {
    const jobId = ++jobIdRef.current;

    if (setTrainingLock) {
      activeLockRef.current = {
        jobId,
        release: setTrainingLock,
      };
      setTrainingLock(true, lockPath ?? null);
    }

    if (isMountedRef.current) {
      setIsLoading(true);
    }

    try {
      const result = await executeRequest(request);
      if (result === null) {
        return null;
      }

      if (isMountedRef.current) {
        setError(null);
      }

      return result;
    } catch (jobError) {
      const errorMessage = getErrorMessage?.(jobError)
        ?? (jobError instanceof Error ? jobError.message : '模型任务执行失败');
      setError(errorMessage);
      setRetryCount((prev) => prev + 1);

      return null;
    } finally {
      clearLoadingState(jobId);
      releaseLock(jobId);
    }
  }, [clearLoadingState, executeRequest, recordFailure, releaseLock]);

  const handleRetry = useCallback(() => {
    if (retryCount < 3) {
      setError(null);
    }
  }, [retryCount]);

  const resetRetryCount = useCallback(() => {
    setRetryCount(0);
  }, []);

  return {
    isLoading,
    error,
    setError,
    retryCount,
    runJob,
    recordFailure,
    handleRetry,
    resetRetryCount,
  };
}
