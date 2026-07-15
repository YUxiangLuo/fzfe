/// <reference lib="dom" />
/// <reference types="bun-types" />

import { afterEach, describe, expect, it } from 'bun:test';
import { cleanup, render } from '@testing-library/react';
import ProductionBiasDiagnostic from './ProductionBiasDiagnostic';

describe('ProductionBiasDiagnostic', () => {
  afterEach(cleanup);

  it('warns when historical mean underprediction exceeds formula safety stock', () => {
    const view = render(
      <ProductionBiasDiagnostic
        predictions={[
          { std_dev: 10, calibration_mean_error: 2, calibration_count: 8 },
          { std_dev: 10, calibration_mean_error: 20, calibration_count: 8 },
        ]}
        zScore={1.65}
        focusIndex={1}
      />,
    );

    expect(view.getByRole('alert').textContent).toContain('历史平均低估超过当前公式缓冲');
    expect(view.getByRole('alert').textContent).toContain('不会修正点预测、安全库存或产能');
  });

  it('shows a non-blocking diagnostic when the formula buffer covers mean bias', () => {
    const view = render(
      <ProductionBiasDiagnostic
        predictions={[
          { std_dev: 10, calibration_mean_error: 2, calibration_count: 8 },
          { std_dev: 10, calibration_mean_error: 5, calibration_count: 8 },
        ]}
        zScore={1.65}
        focusIndex={1}
      />,
    );

    expect(view.queryByRole('alert')).toBeNull();
    expect(view.getByText(/平均低估约 5.0 件/)).toBeTruthy();
    expect(view.getByText(/不参与公式计算/)).toBeTruthy();
  });

  it('describes the underpredicting risk period even when another period has larger overprediction', () => {
    const view = render(
      <ProductionBiasDiagnostic
        predictions={[
          { std_dev: 10, calibration_mean_error: 0, calibration_count: 8 },
          { std_dev: 10, calibration_mean_error: 20, calibration_count: 8 },
          { std_dev: 10, calibration_mean_error: -100, calibration_count: 8 },
        ]}
        zScore={1.65}
      />,
    );

    expect(view.getByRole('alert').textContent).toContain('平均低估约 20.0 件');
    expect(view.getByRole('alert').textContent).not.toContain('-100.0');
  });

  it('states when fallback calibration cannot provide a bias diagnosis', () => {
    const view = render(
      <ProductionBiasDiagnostic
        predictions={[
          { std_dev: 10, calibration_mean_error: null, calibration_count: null },
          { std_dev: 12, calibration_mean_error: null, calibration_count: null },
        ]}
        zScore={2.33}
      />,
    );

    expect(view.getByText(/历史平均偏差诊断不可用/)).toBeTruthy();
  });
});
