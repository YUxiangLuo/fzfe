/// <reference lib="dom" />
/// <reference types="bun-types" />

import { afterEach, describe, expect, it } from 'bun:test';
import { cleanup, render } from '@testing-library/react';
import { buildInitialState } from '../../store/experiment/initialState';
import { PlanParameters } from './PlanParameters';

describe('PlanParameters', () => {
  afterEach(cleanup);

  it('shows fallback uncertainty audit details in the report preview', () => {
    const state = {
      ...buildInitialState(),
      production_forecast_results: [
        {
          prediction: 100,
          std_dev: 2,
          upper_error_p99: 4,
          uncertainty_source: 'fallback' as const,
          uncertainty_reason: 'first_difference_rms_floor',
          calibration_mean_error: null,
          calibration_count: null,
        },
        {
          prediction: 101,
          std_dev: 2,
          upper_error_p99: 4,
          uncertainty_source: 'model' as const,
          calibration_mean_error: 0,
          calibration_count: 8,
        },
      ],
      production_mps_table: [
        {
          period: 1,
          period_label: 'P1',
          demand_forecast: 100,
          safety_stock: 5,
          planned_production: 105,
          beginning_inventory: 0,
          production_output: 105,
          ending_inventory: 5,
          stockout: 0,
          service_level: 1,
        },
        {
          period: 2,
          period_label: 'P2',
          demand_forecast: 101,
          safety_stock: 5,
          planned_production: 101,
          beginning_inventory: 5,
          production_output: 101,
          ending_inventory: 5,
          stockout: 0,
          service_level: 1,
        },
      ],
    };

    const view = render(
      <PlanParameters
        state={state}
        getAnalysisValue={() => ''}
        getAnalysisSetter={() => () => undefined}
        isSubmitting={false}
      />,
    );

    expect(view.getByRole('alert').textContent).toContain('不确定性审计：1 期使用回退估计');
    expect(view.getByRole('alert').textContent).toContain('差分波动接近零但存在稳定趋势');
  });

  it('renders a valid zero capacity as zero instead of N/A', () => {
    const state = {
      ...buildInitialState(),
      production_capacity: 0,
      production_mps_table: [
        {
          period: 1,
          period_label: 'P1',
          demand_forecast: 0,
          safety_stock: 0,
          planned_production: 0,
          beginning_inventory: 0,
          production_output: 0,
          ending_inventory: 0,
          stockout: 0,
          service_level: 1,
        },
        {
          period: 2,
          period_label: 'P2',
          demand_forecast: 0,
          safety_stock: 0,
          planned_production: 0,
          beginning_inventory: 0,
          production_output: 0,
          ending_inventory: 0,
          stockout: 0,
          service_level: 1,
        },
      ],
    };

    const view = render(
      <PlanParameters
        state={state}
        getAnalysisValue={() => ''}
        getAnalysisSetter={() => () => undefined}
        isSubmitting={false}
      />,
    );

    expect(view.getByText('产能上限/期').parentElement?.textContent).toContain('0件');
    expect(view.getByText('产能上限/期').parentElement?.textContent).not.toContain('N/A');
  });
});
