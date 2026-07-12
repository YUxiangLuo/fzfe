import { describe, expect, it } from 'bun:test';
import { resolveAdfResultsForPersistence } from './adfPersistence';

describe('resolveAdfResultsForPersistence', () => {
  it('keeps persisted ADF rows when local component state is empty', () => {
    const persisted = [{ diff_order: 1, stationary: true }];

    expect(resolveAdfResultsForPersistence([], persisted)).toEqual(persisted);
  });

  it('uses newly calculated local ADF rows when available', () => {
    const local = [{ diff_order: 2, stationary: true }];
    const persisted = [{ diff_order: 1, stationary: true }];

    expect(resolveAdfResultsForPersistence(local, persisted)).toEqual(local);
  });
});
