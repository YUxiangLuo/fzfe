/// <reference lib="dom" />

import React from 'react';
import { describe, expect, test } from 'bun:test';
import { render } from '@testing-library/react';
import ModelResultSummary from './ModelResultSummary';
import PredictionResultsTable from './PredictionResultsTable';

describe('model result presentation', () => {
  test('shows all backend metrics and implementation metadata', () => {
    const view = render(
      <ModelResultSummary
        metrics={{ rmse: 2.3, mae: 1.8, mape: 4.25, r2: 0.91 }}
        methodName="递推移动平均"
        forecastStrategy="recursive_roll_forward"
        implementationNotes={['不读取评估集真实值。']}
      />,
    );

    expect(view.getByText('MAPE')).toBeDefined();
    expect(view.getByText('4.25%')).toBeDefined();
    expect(view.getByText(/递推移动平均/)).toBeDefined();
    expect(view.getByText(/recursive_roll_forward/)).toBeDefined();
    expect(view.getByText('不读取评估集真实值。')).toBeDefined();
  });

  test('shows aligned uncertainty and labels the per-period score as a teaching metric', () => {
    const view = render(
      <PredictionResultsTable
        title="预测结果"
        predictions={[
          { date: '2026-01', actual: 100, predicted: 95, stdDev: 3.2 },
          { date: '2026-02', actual: 0, predicted: 2, stdDev: 4.1 },
        ]}
      />,
    );

    expect(view.getByText('预测标准差')).toBeDefined();
    expect(view.getByText('单期 1−APE（教学指标）')).toBeDefined();
    expect(view.getByText('95.00%')).toBeDefined();
    expect(view.getAllByText('N/A').length).toBeGreaterThanOrEqual(1);
    expect(view.getByText(/非行业统一标准/)).toBeDefined();
  });
});
