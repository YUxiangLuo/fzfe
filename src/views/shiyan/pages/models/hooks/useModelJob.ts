import { useCallback, useEffect, useRef, useState } from 'react';
import { useAbortableRequest } from './useAbortableRequest';
import { MODEL_RETRY_LIMITS } from '../constants';

type TrainingLockSetter = (isLocked: boolean, lockPath?: string | null) => void;

interface RunModelJobOptions<T> {
  request: (signal: AbortSignal) => Promise<T>;
  lockPath?: string | null;
  setTrainingLock?: TrainingLockSetter;
  getErrorMessage?: (error: unknown) => string;
  onSuccess?: (result: T) => Promise<void> | void;
}

const isRetryCountExemptError = (jobError: unknown): boolean => {
  if (!jobError || typeof jobError !== 'object') {
    return false;
  }

  const maybeError = jobError as {
    status?: unknown;
    payload?: unknown;
    message?: unknown;
  };

  if (maybeError.status === 429) {
    return true;
  }

  const payloadMessage =
    maybeError.payload && typeof maybeError.payload === 'object'
      ? (() => {
          const payload = maybeError.payload as Record<string, unknown>;
          if (typeof payload.error === 'string') return payload.error;
          if (typeof payload.message === 'string') return payload.message;
          return null;
        })()
      : null;

  const errorMessage =
    typeof maybeError.message === 'string'
      ? maybeError.message
      : jobError instanceof Error
        ? jobError.message
        : null;

  return [payloadMessage, errorMessage].some(
    (message) => typeof message === 'string' && message.includes('模型服务繁忙'),
  );
};

export function useModelJob() {
  const { executeRequest } = useAbortableRequest();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const isMountedRef = useRef(true);
  const jobIdRef = useRef(0);
  const inFlightJobIdRef = useRef<number | null>(null);
  const activeLockRef = useRef<{
    jobId: number;
    release: TrainingLockSetter;
  } | null>(null);

  useEffect(() => {
    // Re-set to true for StrictMode's unmount→remount replay
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      inFlightJobIdRef.current = null;
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

  const clearInFlightJob = useCallback((jobId: number) => {
    if (inFlightJobIdRef.current === jobId) {
      inFlightJobIdRef.current = null;
    }
  }, []);

  const recordFailure = useCallback((
    jobError: unknown,
    fallbackMessage = '模型任务执行失败',
    countTowardsRetryLimit = true,
  ) => {
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
    if (countTowardsRetryLimit) {
      setRetryCount((previous) => previous + 1);
    }
  }, []);

  const getResolvedErrorMessage = useCallback((jobError: unknown, getErrorMessage?: (error: unknown) => string) => {
    if (getErrorMessage) {
      return getErrorMessage(jobError);
    }

    if (jobError instanceof Error && jobError.message) {
      return jobError.message;
    }

    if (typeof jobError === 'string' && jobError.trim().length > 0) {
      return jobError;
    }

    return '模型任务执行失败';
  }, []);

  const runJob = useCallback(async <T>({
    request,
    lockPath,
    setTrainingLock,
    getErrorMessage,
    onSuccess,
  }: RunModelJobOptions<T>): Promise<T | null> => {
    if (inFlightJobIdRef.current !== null) {
      return null;
    }

    const jobId = ++jobIdRef.current;
    inFlightJobIdRef.current = jobId;

    if (isMountedRef.current) {
      setIsLoading(true);
    }

    if (setTrainingLock) {
      activeLockRef.current = {
        jobId,
        release: setTrainingLock,
      };
      setTrainingLock(true, lockPath ?? null);
    }

    try {
      const result = await executeRequest(request);
      if (result === null) {
        return null;
      }

      if (isMountedRef.current) {
        setError(null);
      }

      await onSuccess?.(result);

      return result;
    } catch (jobError) {
      recordFailure(
        getResolvedErrorMessage(jobError, getErrorMessage),
        undefined,
        !isRetryCountExemptError(jobError),
      );

      return null;
    } finally {
      clearLoadingState(jobId);
      releaseLock(jobId);
      clearInFlightJob(jobId);
    }
  }, [clearInFlightJob, clearLoadingState, executeRequest, getResolvedErrorMessage, recordFailure, releaseLock]);

  const handleRetry = useCallback(() => {
    if (retryCount <= MODEL_RETRY_LIMITS.maxRetries) {
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
    handleRetry,
    resetRetryCount,
  };
}
