/// <reference types="bun-types" />

import { describe, expect, it } from 'bun:test';
import {
  formatPredictionAccuracy,
  getPredictionAccuracyClassName,
} from './PredictionResultsTable';

describe('prediction accuracy presentation', () => {
  it('marks zero actual values as undefined instead of reporting a percentage', () => {
    expect(formatPredictionAccuracy(0, 0)).toBe('不适用');
    expect(formatPredictionAccuracy(0, 10)).toBe('不适用');
    expect(getPredictionAccuracyClassName(0, 10)).toBe('bg-gray-100 text-gray-600');
  });

  it('keeps percentage formatting for non-zero actual values', () => {
    expect(formatPredictionAccuracy(100, 90)).toBe('90.00%');
    expect(getPredictionAccuracyClassName(100, 90)).toContain('bg-green-50');
  });
});
