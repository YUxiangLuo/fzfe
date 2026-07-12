import { describe, expect, it, mock } from 'bun:test';
import {
  MODEL_CAPACITY_AUTO_RETRIES,
  runWithModelCapacityRetry,
} from './modelCapacityRetry';

describe('model capacity retry', () => {
  it('stops after the bounded number of server-directed retries', async () => {
    const capacityError = Object.assign(new Error('busy'), {
      status: 429,
      retryAfterMs: 1,
    });
    const operation = mock(async () => {
      throw capacityError;
    });

    await expect(runWithModelCapacityRetry(operation, { random: () => 0 })).rejects.toBe(capacityError);
    expect(operation).toHaveBeenCalledTimes(MODEL_CAPACITY_AUTO_RETRIES + 1);
  });

  it('does not replay a capacity response without Retry-After metadata', async () => {
    const capacityError = Object.assign(new Error('busy'), { status: 429 });
    const operation = mock(async () => {
      throw capacityError;
    });

    await expect(runWithModelCapacityRetry(operation)).rejects.toBe(capacityError);
    expect(operation).toHaveBeenCalledTimes(1);
  });
});
