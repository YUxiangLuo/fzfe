import { describe, expect, test } from 'bun:test';
import {
  hasMinimumEvaluationPoints,
  MIN_EVALUATION_POINTS,
  MIN_TOTAL_POINTS,
} from './dataWindowConstraints';

describe('data window constraints', () => {
  test('requires at least two inclusive evaluation points', () => {
    expect(MIN_EVALUATION_POINTS).toBe(2);
    expect(hasMinimumEvaluationPoints(12, 12)).toBe(false);
    expect(hasMinimumEvaluationPoints(12, 13)).toBe(true);
  });

  test('reserves enough total data for training and evaluation', () => {
    expect(MIN_TOTAL_POINTS).toBe(4);
  });
});
