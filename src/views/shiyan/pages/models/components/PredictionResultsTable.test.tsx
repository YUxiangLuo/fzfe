/// <reference lib="dom" />
/// <reference types="bun-types" />

import React from 'react';
import { afterEach, describe, expect, it } from 'bun:test';
import { cleanup, render } from '@testing-library/react';
import PredictionResultsTable, {
  formatPredictionAccuracy,
  formatPredictionInterval,
  getPredictionAccuracyClassName,
} from './PredictionResultsTable';

describe('prediction accuracy presentation', () => {
  afterEach(() => cleanup());

  it('marks zero actual values as undefined instead of reporting a percentage', () => {
    expect(formatPredictionAccuracy(0, 0)).toBe('不适用');
    expect(formatPredictionAccuracy(0, 10)).toBe('不适用');
    expect(getPredictionAccuracyClassName(0, 10)).toBe('bg-gray-100 text-gray-600');
  });

  it('keeps percentage formatting for non-zero actual values', () => {
    expect(formatPredictionAccuracy(100, 90)).toBe('90.00%');
    expect(getPredictionAccuracyClassName(100, 90)).toContain('bg-green-50');
  });

  it('uses the model interval when present and otherwise derives a normal approximation', () => {
    expect(formatPredictionInterval({
      date: '2024-01',
      actual: 100,
      predicted: 98,
      stdDev: 4,
      intervalLower: 80,
      intervalUpper: 110,
    })).toBe('[80.00, 110.00]');

    expect(formatPredictionInterval({
      date: '2024-01',
      actual: 100,
      predicted: 98,
      stdDev: 4,
    })).toBe('[90.16, 105.84]');

    expect(formatPredictionInterval({
      date: '2024-01',
      actual: 100,
      predicted: null,
    })).toBe('未提供');
  });

  it('uses unambiguous display-band boundaries and Chinese missing-value copy', () => {
    const view = render(
      <PredictionResultsTable
        title="预测结果"
        predictions={[{
          date: '2024-01',
          actual: 100,
          predicted: null,
          stdDev: 2,
        }]}
      />,
    );

    expect(view.getByText('70% ≤ x < 85%')).toBeDefined();
    expect(view.getByText('60% ≤ x < 70%')).toBeDefined();
    expect(view.getAllByText('未提供').length).toBeGreaterThanOrEqual(3);
    expect(view.getByText(/ARIMA 展示模型原生的名义 95% 预测区间/)).toBeDefined();
    expect(view.container.textContent).not.toContain('N/A');
    expect(view.container.textContent).not.toContain('ARIMA 行');
  });

  it('labels uncalibrated LSTM ranges without implying coverage', () => {
    const view = render(
      <PredictionResultsTable
        title="LSTM预测结果"
        predictions={[{
          date: '2024-01',
          actual: 1,
          predicted: 0.5,
          stdDev: 1,
          intervalLower: 0,
          intervalUpper: 2,
          intervalKind: 'censored_nonnegative_uncalibrated_empirical_residual_quantile',
          coverageGuarantee: false,
          calibrationSource: 'early_stopping_validation_reused',
        }]}
      />,
    );

    expect(view.getByText('名义 95% 误差范围')).toBeDefined();
    expect(view.getByText('启发式估计，无覆盖率保证')).toBeDefined();
    expect(view.getByText(/复用的 EarlyStopping 时间验证窗口/)).toBeDefined();
  });

  it('identifies the reused single-origin Weighted weight-fit holdout', () => {
    const view = render(
      <PredictionResultsTable
        title="Weighted预测结果"
        predictions={[{
          date: '2024-01',
          actual: 1,
          predicted: 0.5,
          stdDev: 1,
          intervalLower: 0,
          intervalUpper: 2,
          intervalKind: 'censored_nonnegative_uncalibrated_empirical_residual_quantile',
          coverageGuarantee: false,
          calibrationSource: 'weighted_weight_fit_holdout_reused',
          calibrationOrigins: 1,
        }]}
      />,
    );

    expect(view.getByText('名义 95% 误差范围')).toBeDefined();
    expect(view.getByText(/复用的 Weighted 权重拟合时间留出段/)).toBeDefined();
    expect(view.getByText('历史预测原点：1')).toBeDefined();
    expect(view.getByText('启发式估计，无覆盖率保证')).toBeDefined();
  });

  it('identifies the reused single-origin Boosting selection holdout', () => {
    const view = render(
      <PredictionResultsTable
        title="Boosting预测结果"
        predictions={[{
          date: '2024-01',
          actual: 1,
          predicted: 0.5,
          stdDev: 1,
          intervalLower: 0,
          intervalUpper: 2,
          intervalKind: 'censored_nonnegative_uncalibrated_empirical_residual_quantile',
          coverageGuarantee: false,
          calibrationSource: 'boosting_selection_holdout_reused',
          calibrationOrigins: 1,
        }]}
      />,
    );

    expect(view.getByText('名义 95% 误差范围')).toBeDefined();
    expect(view.getByText(/复用的 Boosting 选模时间留出段/)).toBeDefined();
    expect(view.getByText('历史预测原点：1')).toBeDefined();
    expect(view.getByText('启发式估计，无覆盖率保证')).toBeDefined();
  });

  it('identifies the reused single-origin Stacking meta-fit holdout', () => {
    const view = render(
      <PredictionResultsTable
        title="Stacking预测结果"
        predictions={[{
          date: '2024-01',
          actual: 1,
          predicted: 0.5,
          stdDev: 1,
          intervalLower: 0,
          intervalUpper: 2,
          intervalKind: 'censored_nonnegative_uncalibrated_empirical_residual_quantile',
          coverageGuarantee: false,
          calibrationSource: 'stacking_meta_fit_holdout_reused',
          calibrationOrigins: 1,
        }]}
      />,
    );

    expect(view.getByText('名义 95% 误差范围')).toBeDefined();
    expect(view.getByText(/复用的 Stacking 元模型拟合 Level-1 留出段/)).toBeDefined();
    expect(view.getByText('历史预测原点：1')).toBeDefined();
    expect(view.getByText('启发式估计，无覆盖率保证')).toBeDefined();
  });
});
