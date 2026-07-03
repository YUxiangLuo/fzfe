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
  onFinalResult: (result: TFinalResult) => Promise<void> | void;
  lockPath?: string | null;
  setTrainingLock?: TrainingLockSetter;
  getErrorMessage?: (error: unknown) => string;
}

const stripHttpPrefix = (message: string): string => {
  const trimmed = message.trim();
  if (!trimmed.startsWith('HTTP ')) {
    return trimmed;
  }

  const separatorIndex = trimmed.indexOf(' - ');
  return separatorIndex === -1 ? trimmed : trimmed.slice(separatorIndex + 3).trim();
};

const resolveErrorMessage = (error: unknown, fallback = '分阶段训练执行失败') => {
  if (error instanceof Error) {
    return stripHttpPrefix(error.message || fallback);
  }
  if (typeof error === 'string' && error.trim()) {
    return stripHttpPrefix(error);
  }
  return fallback;
};

export function useGuidedModelTraining<TFinalResult>({
  modelType,
  buildRequestBody,
  onFinalResult,
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

  const ensureSession = useCallback(async () => {
    if (session) {
      return session;
    }

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
      await onFinalResult(targetSession.result as TFinalResult);
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
      const message = getErrorMessage
        ? getErrorMessage(sessionError)
        : resolveErrorMessage(sessionError, '创建分阶段训练会话失败');
      if (isMountedRef.current) {
        setError(message);
      }
    } finally {
      inFlightRef.current = false;
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [applyFinalResult, ensureSession, getErrorMessage, session]);

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
        setError(updatedSession.error_message ?? '分阶段训练执行失败');
        setRetryCount((previous) => previous + 1);
        return;
      }

      await applyFinalResult(updatedSession);
    } catch (stepError) {
      const message = getErrorMessage
        ? getErrorMessage(stepError)
        : resolveErrorMessage(stepError, '分阶段训练执行失败');
      if (isMountedRef.current) {
        setError(message);
        setRetryCount((previous) => previous + 1);
      }
    } finally {
      inFlightRef.current = false;
      setTrainingLock?.(false, null);
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [applyFinalResult, ensureSession, getErrorMessage, lockPath, modelType, setTrainingLock]);

  const handleRetry = useCallback(async () => {
    if (retryCount > MODEL_RETRY_LIMITS.maxRetries) {
      return;
    }

    setError(null);

    if (session?.status !== 'completed' || !session.result || inFlightRef.current) {
      return;
    }

    try {
      inFlightRef.current = true;
      setIsLoading(true);
      await applyFinalResult(session);
    } catch (retryError) {
      const message = getErrorMessage
        ? getErrorMessage(retryError)
        : resolveErrorMessage(retryError, '分阶段训练执行失败');
      if (isMountedRef.current) {
        setError(message);
        setRetryCount((previous) => previous + 1);
      }
    } finally {
      inFlightRef.current = false;
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, [applyFinalResult, getErrorMessage, retryCount, session]);

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
