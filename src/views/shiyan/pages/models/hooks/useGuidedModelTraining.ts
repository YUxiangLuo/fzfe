import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createGuidedTrainingSession,
  runGuidedTrainingStep,
  type GuidedModelType,
  type GuidedTrainingSession,
} from '../../../services/guidedTraining';
import { MODEL_RETRY_LIMITS } from '../constants';

type TrainingLockSetter = (isLocked: boolean, lockPath?: string | null) => void;

interface UseGuidedModelTrainingOptions<TFinalResult> {
  modelType: GuidedModelType;
  buildRequestBody: () => Record<string, any> | null;
  onFinalResult: (result: TFinalResult, session: GuidedTrainingSession) => Promise<void> | void;
  persistDraft?: () => Promise<void> | void;
  lockPath?: string | null;
  setTrainingLock?: TrainingLockSetter;
  getErrorMessage?: (error: unknown) => string;
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

const extractGuidedErrorDetail = (guidedError: unknown): string | null => {
  if (!guidedError || typeof guidedError !== 'object') {
    return typeof guidedError === 'string' ? stripHttpPrefix(guidedError) : null;
  }

  const maybeError = guidedError as {
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

  return guidedError instanceof Error ? stripHttpPrefix(guidedError.message) : null;
};

const extractGuidedErrorStatus = (guidedError: unknown): number | null => {
  if (!guidedError || typeof guidedError !== 'object') {
    return null;
  }

  const status = (guidedError as { status?: unknown }).status;
  return typeof status === 'number' ? status : null;
};

const getTransientGuidedTrainingMessage = (guidedError: unknown): string | null => {
  const status = extractGuidedErrorStatus(guidedError);
  const detail = extractGuidedErrorDetail(guidedError);

  if (status === 429 || detail?.includes('模型服务繁忙')) {
    return '模型服务当前繁忙，请稍后再次点击“重试”。';
  }

  if (status === 409 || detail?.includes('同一模型正在训练或预测')) {
    return '当前模型已有训练或预测任务在执行，请稍后再次点击“重试”。';
  }

  return null;
};

const isRetryCountExemptError = (guidedError: unknown): boolean => {
  return getTransientGuidedTrainingMessage(guidedError) !== null;
};

const resolveErrorMessage = (
  error: unknown,
  getErrorMessage?: (error: unknown) => string,
  fallback = '分阶段训练执行失败',
) => {
  const transientMessage = getTransientGuidedTrainingMessage(error);
  if (transientMessage) {
    return transientMessage;
  }

  if (getErrorMessage) {
    const customMessage = getErrorMessage(error);
    return stripHttpPrefix(customMessage) ?? customMessage;
  }

  const detail = extractGuidedErrorDetail(error);
  return detail ?? fallback;
};

export function useGuidedModelTraining<TFinalResult>({
  modelType,
  buildRequestBody,
  onFinalResult,
  persistDraft,
  lockPath,
  setTrainingLock,
  getErrorMessage,
}: UseGuidedModelTrainingOptions<TFinalResult>) {
  const [session, setSession] = useState<GuidedTrainingSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const isMountedRef = useRef(true);
  const inFlightRef = useRef(false);
  const persistDraftRef = useRef(persistDraft);

  useEffect(() => {
    persistDraftRef.current = persistDraft;
  }, [persistDraft]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (setTrainingLock) {
        setTrainingLock(false, null);
      }
    };
  }, [setTrainingLock]);

  const resetGuidedTraining = useCallback(() => {
    setSession(null);
    setError(null);
    setRetryCount(0);
  }, []);

  const recordFailure = useCallback((
    guidedError: unknown,
    fallbackMessage = '分阶段训练执行失败',
    countTowardsRetryLimit = !isRetryCountExemptError(guidedError),
  ) => {
    if (!isMountedRef.current) {
      return;
    }

    setError(resolveErrorMessage(guidedError, getErrorMessage, fallbackMessage));
    if (countTowardsRetryLimit) {
      setRetryCount((previous) => previous + 1);
    }
  }, [getErrorMessage]);

  const ensureSession = useCallback(async () => {
    if (session) {
      return session;
    }

    await persistDraftRef.current?.();
    const requestBody = buildRequestBody();
    if (!requestBody) {
      return null;
    }

    const nextSession = await createGuidedTrainingSession(modelType, requestBody);
    if (isMountedRef.current) {
      setSession(nextSession);
      setError(nextSession.status === 'failed' ? nextSession.error_message : null);
    }
    return nextSession;
  }, [buildRequestBody, modelType, session]);

  const applyFinalResult = useCallback(async (targetSession: GuidedTrainingSession | null) => {
    if (targetSession?.result) {
      await onFinalResult(targetSession.result as TFinalResult, targetSession);
    }
  }, [onFinalResult]);

  const initializeSession = useCallback(async () => {
    if (session || inFlightRef.current) {
      return;
    }

    try {
      inFlightRef.current = true;
      setIsLoading(true);
      const initializedSession = await ensureSession();
      await applyFinalResult(initializedSession);
    } catch (sessionError) {
      recordFailure(sessionError, '创建分阶段训练会话失败');
    } finally {
      inFlightRef.current = false;
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [applyFinalResult, ensureSession, recordFailure, session]);

  const runNextStep = useCallback(async () => {
    if (inFlightRef.current) {
      return;
    }

    try {
      inFlightRef.current = true;
      setIsLoading(true);
      setError(null);
      setTrainingLock?.(true, lockPath ?? null);

      const currentSession = await ensureSession();
      const nextStepId = currentSession?.next_step_id;
      if (!currentSession) {
        return;
      }

      if (!nextStepId) {
        await applyFinalResult(currentSession);
        return;
      }

      const updatedSession = await runGuidedTrainingStep(modelType, currentSession.session_id, nextStepId);
      if (!isMountedRef.current) {
        return;
      }

      setSession(updatedSession);
      if (updatedSession.status === 'failed') {
        recordFailure(updatedSession.error_message ?? '分阶段训练执行失败');
        return;
      }

      await applyFinalResult(updatedSession);
    } catch (stepError) {
      recordFailure(stepError, '分阶段训练执行失败');
    } finally {
      inFlightRef.current = false;
      setTrainingLock?.(false, null);
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [applyFinalResult, ensureSession, lockPath, modelType, recordFailure, setTrainingLock]);

  const handleRetry = useCallback(async () => {
    if (retryCount >= MODEL_RETRY_LIMITS.maxFailures || inFlightRef.current) {
      return;
    }

    setError(null);

    if (!session) {
      await initializeSession();
      return;
    }

    if (session.status !== 'completed') {
      await runNextStep();
      return;
    }

    if (!session.result) {
      return;
    }

    try {
      inFlightRef.current = true;
      setIsLoading(true);
      await applyFinalResult(session);
    } catch (retryError) {
      recordFailure(retryError, '分阶段训练执行失败');
    } finally {
      inFlightRef.current = false;
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [applyFinalResult, initializeSession, recordFailure, retryCount, runNextStep, session]);

  return {
    session,
    isLoading,
    error,
    setError,
    retryCount,
    initializeSession,
    runNextStep,
    handleRetry,
    resetGuidedTraining,
  };
}
