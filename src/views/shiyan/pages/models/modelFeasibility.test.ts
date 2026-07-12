import { describe, expect, test } from 'bun:test';
import {
  getEnsembleFeasibility,
  getLstmFeasibility,
  resolveAutomaticLstmLookBack,
} from './modelFeasibility';

describe('model feasibility', () => {
  test('mirrors the backend automatic LSTM look-back rule', () => {
    expect(resolveAutomaticLstmLookBack(8)).toBe(3);
    expect(resolveAutomaticLstmLookBack(20)).toBe(5);
    expect(resolveAutomaticLstmLookBack(100)).toBe(6);
  });

  test('accounts for the complete forecast horizon in LSTM minimum training size', () => {
    expect(getLstmFeasibility({ trainStart: 0, trainEnd: 5, evaluateStart: 6, evaluateEnd: 8 }).feasible).toBe(true);
    expect(getLstmFeasibility({ trainStart: 0, trainEnd: 4, evaluateStart: 5, evaluateEnd: 7 }).feasible).toBe(false);
  });

  test('rejects a backtest-feasible LSTM window that cannot preserve the six-step production strategy', () => {
    const feasibility = getLstmFeasibility({
      trainStart: 0,
      trainEnd: 4,
      evaluateStart: 5,
      evaluateEnd: 6,
    });

    expect(feasibility.feasible).toBe(false);
    expect(feasibility.reason).toContain('生产预测固定为 6 期');
  });

  test('requires eight training points for every ensemble model', () => {
    expect(getEnsembleFeasibility({ trainStart: 0, trainEnd: 6, evaluateStart: 7, evaluateEnd: 8 }).feasible).toBe(false);
    expect(getEnsembleFeasibility({ trainStart: 0, trainEnd: 7, evaluateStart: 8, evaluateEnd: 9 }).feasible).toBe(true);
  });
});
