/// <reference types="bun-types" />

import { describe, expect, it } from 'bun:test';
import { alignPredictionRows } from './resultAlignment';

describe('alignPredictionRows', () => {
  it('uses backend months when all arrays are aligned', () => {
    const rows = alignPredictionRows({
      actualValues: [100, 120],
      predictedValues: [98, 123],
      backendMonths: ['2024-01', '2024-02'],
      fallbackMonths: ['fallback-1', 'fallback-2'],
    });

    expect(rows).toEqual([
      { date: '2024-01', actual: 100, predicted: 98 },
      { date: '2024-02', actual: 120, predicted: 123 },
    ]);
  });

  it('keeps standard deviation aligned with each prediction horizon', () => {
    const rows = alignPredictionRows({
      actualValues: [100, 120],
      predictedValues: [98, 123],
      standardDeviations: [2.1, 3.4],
      backendMonths: ['2024-01', '2024-02'],
      fallbackMonths: [],
    });

    expect(rows).toEqual([
      { date: '2024-01', actual: 100, predicted: 98, stdDev: 2.1 },
      { date: '2024-02', actual: 120, predicted: 123, stdDev: 3.4 },
    ]);
  });

  it('preserves index alignment when a single invalid value appears', () => {
    const rows = alignPredictionRows({
      actualValues: [100, null, 130],
      predictedValues: [98, 110, 128],
      backendMonths: ['2024-01', '2024-02', '2024-03'],
      fallbackMonths: ['fallback-1', 'fallback-2', 'fallback-3'],
    });

    expect(rows).toEqual([
      { date: '2024-01', actual: 100, predicted: 98 },
      { date: '2024-03', actual: 130, predicted: 128 },
    ]);
  });

  it('falls back to local months when backend months are missing or mismatched', () => {
    const rows = alignPredictionRows({
      actualValues: [100, 120],
      predictedValues: [98, 123],
      backendMonths: ['2024-01'],
      fallbackMonths: ['fallback-1', 'fallback-2'],
    });

    expect(rows).toEqual([
      { date: 'fallback-1', actual: 100, predicted: 98 },
      { date: 'fallback-2', actual: 120, predicted: 123 },
    ]);
  });
});
