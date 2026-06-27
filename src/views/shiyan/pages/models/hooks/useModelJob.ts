import { useCallback, useEffect, useRef, useState } from 'react';
import { useAbortableRequest } from './useAbortableRequest';
import { MODEL_RETRY_LIMITS } from '../constants';

type TrainingLockSetter = (isLocked: boolean, lockPath?: string | null) => void;

export interface ModelJobProgressEvent {
  type: 'phase' | 'progress' | 'log';
  message: string;
  phase?: string;
  percent?: number;
  source?: 'backend' | 'python';
  timestamp?: string;
}

type ModelJobProgressHandler = (event: ModelJobProgressEvent) => void;

interface RunModelJobOptions<T> {
  request: (signal: AbortSignal, onProgress: ModelJobProgressHandler) => Promise<T>;
  lockPath?: string | null;
  setTrainingLock?: TrainingLockSetter;
  getErrorMessage?: (error: unknown) => string;
  onSuccess?: (result: T) => Promise<void> | void;
  minLoadingMs?: number;
}

const extractPayloadMessage = (payload: unknown): string | null => {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const payloadRecord = payload as Record<string, unknown>;
  if (typeof payloadRecord.error === 'string' && payloadRecord.error.trim().length > 0) {
    return payloadRecord.error.trim();
  }
  if (typeof payloadRecord.message === 'string' && payloadRecord.message.trim().length > 0) {
    return payloadRecord.message.trim();
  }
  return null;
};

const stripHttpPrefix = (message: string): string | null => {
  const trimmed = message.trim();
  if (!trimmed) {
    return null;
  }

  if (!trimmed.startsWith('HTTP ')) {
    return trimmed;
  }

  const separatorIndex = trimmed.indexOf(' - ');
  if (separatorIndex === -1) {
    return trimmed;
  }

  const detail = trimmed.slice(separatorIndex + 3).trim();
  return detail.length > 0 ? detail : null;
};

const extractJobErrorDetail = (jobError: unknown): string | null => {
  if (!jobError || typeof jobError !== 'object') {
    return typeof jobError === 'string' ? stripHttpPrefix(jobError) : null;
  }

  const maybeError = jobError as {
    payload?: unknown;
    message?: unknown;
  };

  const payloadMessage = extractPayloadMessage(maybeError.payload);
  if (payloadMessage) {
    return payloadMessage;
  }

  if (typeof maybeError.message === 'string') {
    return stripHttpPrefix(maybeError.message);
  }

  return jobError instanceof Error ? stripHttpPrefix(jobError.message) : null;
};

const extractJobErrorStatus = (jobError: unknown): number | null => {
  if (!jobError || typeof jobError !== 'object') {
    return null;
  }

  const status = (jobError as { status?: unknown }).status;
  return typeof status === 'number' ? status : null;
};

const getTransientModelJobMessage = (jobError: unknown): string | null => {
  const status = extractJobErrorStatus(jobError);
  const detail = extractJobErrorDetail(jobError);

  if (status === 429 || detail?.includes('模型服务繁忙')) {
    return '模型服务当前繁忙，请稍后再次点击“重试”。';
  }

  if (status === 409 || detail?.includes('同一模型正在训练或预测')) {
    return '当前模型已有训练或预测任务在执行，请稍后再次点击“重试”。';
  }

  return null;
};

const isRetryCountExemptError = (jobError: unknown): boolean => {
  return getTransientModelJobMessage(jobError) !== null;
};

const delay = (ms: number) => new Promise<void>((resolve) => {
  window.setTimeout(resolve, ms);
});

export function useModelJob() {
  const { executeRequest } = useAbortableRequest();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [progressEvents, setProgressEvents] = useState<ModelJobProgressEvent[]>([]);
  const [currentProgress, setCurrentProgress] = useState<ModelJobProgressEvent | null>(null);
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

  const recordProgress = useCallback((jobId: number, event: ModelJobProgressEvent) => {
    if (!isMountedRef.current || jobIdRef.current !== jobId) {
      return;
    }

    const normalizedEvent = {
      ...event,
      timestamp: event.timestamp ?? new Date().toISOString(),
    };
    setCurrentProgress(normalizedEvent);
    setProgressEvents((previous) => [...previous, normalizedEvent].slice(-8));
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
    const transientMessage = getTransientModelJobMessage(jobError);
    if (transientMessage) {
      return transientMessage;
    }

    if (getErrorMessage) {
      const customMessage = getErrorMessage(jobError);
      return stripHttpPrefix(customMessage) ?? customMessage;
    }

    const detail = extractJobErrorDetail(jobError);
    if (detail) {
      return detail;
    }

    return '模型任务执行失败';
  }, []);

  const runJob = useCallback(async <T>({
    request,
    lockPath,
    setTrainingLock,
    getErrorMessage,
    onSuccess,
    minLoadingMs = 0,
  }: RunModelJobOptions<T>): Promise<T | null> => {
    if (inFlightJobIdRef.current !== null) {
      return null;
    }

    const jobId = ++jobIdRef.current;
    const startedAt = Date.now();
    inFlightJobIdRef.current = jobId;

    if (isMountedRef.current) {
      setIsLoading(true);
      setCurrentProgress(null);
      setProgressEvents([]);
    }

    if (setTrainingLock) {
      activeLockRef.current = {
        jobId,
        release: setTrainingLock,
      };
      setTrainingLock(true, lockPath ?? null);
    }

    const handleProgress: ModelJobProgressHandler = (event) => {
      recordProgress(jobId, event);
    };
    let completedSuccessfully = false;

    try {
      const result = await executeRequest((signal) => request(signal, handleProgress));
      if (result === null) {
        return null;
      }

      if (isMountedRef.current) {
        setError(null);
      }

      await onSuccess?.(result);
      completedSuccessfully = true;

      return result;
    } catch (jobError) {
      recordFailure(
        getResolvedErrorMessage(jobError, getErrorMessage),
        undefined,
        !isRetryCountExemptError(jobError),
      );

      return null;
    } finally {
      const remainingLoadingMs = completedSuccessfully
        ? Math.max(0, minLoadingMs - (Date.now() - startedAt))
        : 0;
      if (remainingLoadingMs > 0 && isMountedRef.current && jobIdRef.current === jobId) {
        recordProgress(jobId, {
          type: 'progress',
          phase: 'done',
          percent: 100,
          source: 'backend',
          message: '模型训练完成，正在展示结果',
        });
        await delay(remainingLoadingMs);
      }
      clearLoadingState(jobId);
      releaseLock(jobId);
      clearInFlightJob(jobId);
    }
  }, [clearInFlightJob, clearLoadingState, executeRequest, getResolvedErrorMessage, recordFailure, recordProgress, releaseLock]);

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
    currentProgress,
    progressEvents,
    runJob,
    handleRetry,
    resetRetryCount,
  };
}
