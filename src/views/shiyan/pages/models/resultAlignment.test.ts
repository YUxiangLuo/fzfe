/// <reference types="bun-types" />

import { describe, expect, it } from 'bun:test';
import { alignPredictionRows, parseArimaOrder, parseModelMetrics } from './resultAlignment';

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

  it('rejects an invalid point instead of silently dropping it', () => {
    expect(() => alignPredictionRows({
      actualValues: [100, null, 130],
      predictedValues: [98, 110, 128],
      backendMonths: ['2024-01', '2024-02', '2024-03'],
      fallbackMonths: ['fallback-1', 'fallback-2', 'fallback-3'],
    })).toThrow('实际值第 2 项必须是有限数字');
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

  it('does not truncate rows when fallback months are shorter', () => {
    const rows = alignPredictionRows({
      actualValues: [100, 120],
      predictedValues: [98, 123],
      backendMonths: [],
      fallbackMonths: ['fallback-1'],
    });

    expect(rows).toEqual([
      { date: 'fallback-1', actual: 100, predicted: 98 },
      { date: '评估点2', actual: 120, predicted: 123 },
    ]);
  });

  it('rejects empty or differently sized value arrays', () => {
    expect(() => alignPredictionRows({
      actualValues: [],
      predictedValues: [],
      backendMonths: [],
      fallbackMonths: [],
    })).toThrow('实际值必须是非空数组');

    expect(() => alignPredictionRows({
      actualValues: [100, 120],
      predictedValues: [98],
      backendMonths: [],
      fallbackMonths: [],
    })).toThrow('实际值与预测值数量不一致');
  });

  it('preserves validated uncertainty metadata and prediction intervals', () => {
    const rows = alignPredictionRows({
      actualValues: [100],
      predictedValues: [98],
      predictionPoints: [{
        prediction: 98,
        std_dev: 4,
        uncertainty_source: 'empirical',
        calibration_source: 'internal_validation',
        interval_lower: 90.16,
        interval_upper: 105.84,
        interval_level: 0.95,
        interval_kind: 'normal_approximation',
        coverage_guarantee: false,
        upper_error_p99_kind: 'uncalibrated_estimate',
        calibration_origins: 1,
      }],
      backendMonths: ['2024-01'],
      fallbackMonths: [],
    });

    expect(rows[0]).toMatchObject({
      stdDev: 4,
      uncertaintySource: 'empirical',
      calibrationSource: 'internal_validation',
      intervalLower: 90.16,
      intervalUpper: 105.84,
      intervalLevel: 0.95,
      intervalKind: 'normal_approximation',
      coverageGuarantee: false,
      upperErrorP99Kind: 'uncalibrated_estimate',
      calibrationOrigins: 1,
    });
  });

  it('rejects malformed or misaligned uncertainty metadata', () => {
    expect(() => alignPredictionRows({
      actualValues: [100],
      predictedValues: [98],
      predictionPoints: [{
        prediction: 97,
        std_dev: 4,
        uncertainty_source: 'empirical',
      }],
      backendMonths: ['2024-01'],
      fallbackMonths: [],
    })).toThrow('预测值与带不确定性的预测点第 1 项不一致');

    expect(() => alignPredictionRows({
      actualValues: [100],
      predictedValues: [98],
      predictionPoints: [{
        prediction: 98,
        std_dev: -1,
        uncertainty_source: 'empirical',
      }],
      backendMonths: ['2024-01'],
      fallbackMonths: [],
    })).toThrow('标准差必须是非负有限数字');

    expect(() => alignPredictionRows({
      actualValues: [100],
      predictedValues: [98],
      predictionPoints: [{
        prediction: 98,
        std_dev: 4,
        uncertainty_source: 'empirical',
        coverage_guarantee: 'false',
      }],
      backendMonths: ['2024-01'],
      fallbackMonths: [],
    })).toThrow('覆盖率保证标记无效');

    expect(() => alignPredictionRows({
      actualValues: [100],
      predictedValues: [98],
      predictionPoints: [{
        prediction: 98,
        std_dev: 4,
        uncertainty_source: 'empirical',
        calibration_origins: 0,
      }],
      backendMonths: ['2024-01'],
      fallbackMonths: [],
    })).toThrow('历史预测原点数无效');
  });
});

describe('model result metadata validation', () => {
  it('accepts finite metrics and non-negative integer ARIMA orders', () => {
    expect(parseModelMetrics({ rmse: 1.2, mae: 0.8, r2: -0.1 })).toEqual({
      rmse: 1.2,
      mae: 0.8,
      r2: -0.1,
    });
    expect(parseArimaOrder({ p: 1, d: 1, q: 2 })).toEqual({ p: 1, d: 1, q: 2 });
  });

  it('rejects malformed metrics and ARIMA orders', () => {
    expect(() => parseModelMetrics({ rmse: Number.NaN, mae: 0.8, r2: 0.5 }))
      .toThrow('模型评估指标格式无效');
    expect(() => parseArimaOrder({ p: 1.5, d: 1, q: 2 }))
      .toThrow('ARIMA 最优阶数必须是非负整数');
  });
});
