import { API_BASE_URL } from '@/utils/apiClient';
import { clearSessionAndRedirect, getStoredToken } from '@/utils/session';
import type { ModelJobProgressEvent } from '../pages/models/hooks/useModelJob';

interface TrainingStreamOptions {
  signal?: AbortSignal;
  onProgress?: (event: ModelJobProgressEvent) => void;
}

interface TrainingStreamErrorEvent {
  type: 'error';
  status?: number;
  message?: string;
  error?: string;
  details?: unknown;
}

interface TrainingStreamResultEvent<T> {
  type: 'result';
  data: T;
}

type TrainingStreamEvent<T> =
  | ModelJobProgressEvent
  | TrainingStreamErrorEvent
  | TrainingStreamResultEvent<T>;

const buildTrainingStreamUrl = (endpoint: string) => {
  const base = API_BASE_URL.replace(/\/+$/, '');
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${normalizedEndpoint}`;
};

const parseResponseError = async (response: Response, fallbackMessage: string) => {
  const text = await response.text().catch(() => '');
  let payload: unknown = text;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }

  const payloadRecord = payload && typeof payload === 'object'
    ? payload as Record<string, unknown>
    : null;
  const message = typeof payloadRecord?.error === 'string'
    ? payloadRecord.error
    : typeof payloadRecord?.message === 'string'
      ? payloadRecord.message
      : text || fallbackMessage;

  const error = new Error(message) as Error & { status?: number; payload?: unknown };
  error.status = response.status;
  error.payload = payload;
  return error;
};

const createStreamEventError = (event: TrainingStreamErrorEvent) => {
  const message = event.message || event.error || '模型训练失败';
  const error = new Error(message) as Error & { status?: number; payload?: unknown };
  error.status = event.status;
  error.payload = { error: message, details: event.details };
  return error;
};

const normalizeProgressEvent = (event: TrainingStreamEvent<unknown>): ModelJobProgressEvent | null => {
  if (event.type !== 'phase' && event.type !== 'progress' && event.type !== 'log') {
    return null;
  }

  if (typeof event.message !== 'string' || event.message.trim().length === 0) {
    return null;
  }

  return {
    type: event.type,
    message: event.message,
    phase: typeof event.phase === 'string' ? event.phase : undefined,
    percent: typeof event.percent === 'number' ? event.percent : undefined,
    source: event.source === 'python' ? 'python' : 'backend',
    timestamp: typeof event.timestamp === 'string' ? event.timestamp : undefined,
  };
};

export const postModelTrainingStream = async <T>(
  endpoint: string,
  body: unknown,
  options: TrainingStreamOptions = {},
): Promise<T> => {
  const token = getStoredToken('student');
  const response = await fetch(buildTrainingStreamUrl(endpoint), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
    signal: options.signal,
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearSessionAndRedirect('student');
      throw new Error('会话已过期，请重新登录');
    }
    throw await parseResponseError(response, '启动模型训练失败');
  }

  if (!response.body) {
    throw new Error('当前浏览器不支持读取训练进度流');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  const handleLine = (line: string): T | undefined => {
    const trimmed = line.trim();
    if (!trimmed) return undefined;

    let event: TrainingStreamEvent<T>;
    try {
      event = JSON.parse(trimmed) as TrainingStreamEvent<T>;
    } catch {
      options.onProgress?.({
        type: 'log',
        source: 'backend',
        message: trimmed,
      });
      return undefined;
    }

    if (event.type === 'result') {
      return event.data;
    }

    if (event.type === 'error') {
      throw createStreamEventError(event);
    }

    const progressEvent = normalizeProgressEvent(event);
    if (progressEvent) {
      options.onProgress?.(progressEvent);
    }

    return undefined;
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const result = handleLine(line);
      if (result !== undefined) {
        return result;
      }
    }
  }

  const finalChunk = decoder.decode();
  if (finalChunk) buffer += finalChunk;
  if (buffer.trim()) {
    const result = handleLine(buffer);
    if (result !== undefined) {
      return result;
    }
  }

  throw new Error('模型训练流已结束，但未收到训练结果');
};
