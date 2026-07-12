export const MODEL_CAPACITY_AUTO_RETRIES = 3;

interface CapacityErrorLike {
  status?: unknown;
  retryAfterMs?: unknown;
}

interface CapacityRetryOptions {
  signal?: AbortSignal;
  shouldContinue?: () => boolean;
  onRetry?: (delayMs: number, retryNumber: number) => void;
  random?: () => number;
}

const getRetryAfterMs = (error: unknown): number | null => {
  if (!error || typeof error !== 'object') return null;
  const candidate = error as CapacityErrorLike;
  if (candidate.status !== 429) return null;
  if (typeof candidate.retryAfterMs !== 'number' || !Number.isFinite(candidate.retryAfterMs)) {
    return null;
  }
  return Math.max(1, candidate.retryAfterMs);
};

const wait = (delayMs: number, signal?: AbortSignal) => new Promise<void>((resolve, reject) => {
  if (signal?.aborted) {
    reject(new DOMException('Request aborted', 'AbortError'));
    return;
  }

  const timeoutId = globalThis.setTimeout(() => {
    signal?.removeEventListener('abort', onAbort);
    resolve();
  }, delayMs);
  const onAbort = () => {
    globalThis.clearTimeout(timeoutId);
    reject(new DOMException('Request aborted', 'AbortError'));
  };
  signal?.addEventListener('abort', onAbort, { once: true });
});

export async function runWithModelCapacityRetry<T>(
  operation: () => Promise<T>,
  options: CapacityRetryOptions = {},
): Promise<T> {
  const random = options.random ?? Math.random;

  for (let retryIndex = 0; ; retryIndex += 1) {
    try {
      return await operation();
    } catch (error) {
      const retryAfterMs = getRetryAfterMs(error);
      if (
        retryAfterMs === null
        || retryIndex >= MODEL_CAPACITY_AUTO_RETRIES
        || options.signal?.aborted
        || options.shouldContinue?.() === false
      ) {
        throw error;
      }

      const exponentialDelay = Math.min(12_000, retryAfterMs * (2 ** retryIndex));
      const delayMs = Math.min(
        15_000,
        Math.ceil(exponentialDelay * (1 + Math.max(0, Math.min(1, random())) * 0.25)),
      );
      options.onRetry?.(delayMs, retryIndex + 1);
      await wait(delayMs, options.signal);

      if (options.shouldContinue?.() === false) {
        throw error;
      }
    }
  }
}
