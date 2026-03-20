/// <reference lib="dom" />
/// <reference types="bun-types" />

import { resolve } from 'path';
import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { fireEvent, render, waitFor } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import React, { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';

mock.restore();

const r = (path: string) => resolve(import.meta.dir, path);

const experimentContextModulePath = r('../../../contexts/ExperimentContext.zustand.tsx');
const apiClientModulePath = r('../../../../../utils/apiClient.ts');

const apiPost = mock(async () => ({
  status: 'success',
  results: {
    eval_y_true: [172, 181],
    eval_predictions: [157.33, 160.78],
    evaluate_months: ['2024-09', '2024-10'],
    metrics: { rmse: 20.55, mae: 19.67, r2: -9.49 },
  },
}));

let experimentValue = {
  state: {
    experiment_id: 12,
    selected_industry: 'electronics',
    selected_company: 'factory',
    selected_product: 'widget',
    data_window_train_start_index: 0,
    data_window_train_end_index: 7,
    data_window_evaluate_start_index: 8,
    data_window_evaluate_end_index: 9,
    moving_average_window: 3,
  },
  productSalesData: {
    meta: {
      industry: 'electronics',
      company: 'factory',
      product: 'widget',
      name: 'Widget',
      description: 'Widget',
      unit: '件',
    },
    monthlySales: [
      { month: '2024-01', sales: 120 },
      { month: '2024-02', sales: 132 },
      { month: '2024-03', sales: 128 },
      { month: '2024-04', sales: 141 },
      { month: '2024-05', sales: 150 },
      { month: '2024-06', sales: 147 },
      { month: '2024-07', sales: 159 },
      { month: '2024-08', sales: 166 },
      { month: '2024-09', sales: 172 },
      { month: '2024-10', sales: 181 },
    ],
  },
  updateState: mock(async (updates: Record<string, unknown>) => {
    experimentValue = {
      ...experimentValue,
      state: {
        ...experimentValue.state,
        ...updates,
      },
    };
  }),
  setTrainingLock: mock(() => {}),
};

mock.module(experimentContextModulePath, () => ({
  useExperiment: () => experimentValue,
}));

mock.module(apiClientModulePath, () => ({
  apiClient: {
    post: apiPost,
  },
}));

const Harness = async (currentStepId = 'results') => {
  const { useSimpleModel } = await import('./useSimpleModel');
  const { useAutoCalculation } = await import('./useAutoCalculation');

  const Component: React.FC = () => {
    const simpleModel = useSimpleModel<number | ''>({
      type: 'moving_average',
      apiEndpoint: '/models/ma/training',
      stateKeys: {
        param: 'moving_average_window',
        completed: 'moving_average_completed',
        metricsRmse: 'moving_average_metrics_rmse',
        metricsMae: 'moving_average_metrics_mae',
        metricsR2: 'moving_average_metrics_r2',
      },
      paramKey: 'moving_average_window',
      validateParam: (windowSize) => windowSize !== '' && windowSize >= 2,
    });
    const [completionError, setCompletionError] = useState<string | null>(null);

    useAutoCalculation({
      calculationStepId: 'results',
      currentStepId,
      handleCalculate: simpleModel.handleCalculate,
      canCalculate: simpleModel.isValidParam,
      results: simpleModel.results,
      isLoading: simpleModel.isLoading,
      error: simpleModel.error,
    });

    return (
      <div>
        <div data-testid="loading">{String(simpleModel.isLoading)}</div>
        <div data-testid="results-ready">{String(simpleModel.results !== null)}</div>
        <div data-testid="error">{simpleModel.error ?? ''}</div>
        <div data-testid="completion-error">{completionError ?? ''}</div>
        <button
          type="button"
          onClick={() => {
            void simpleModel.markAsCompleted().catch((error) => {
              setCompletionError(error instanceof Error ? error.message : 'complete failed');
            });
          }}
        >
          complete
        </button>
      </div>
    );
  };

  return Component;
};

describe('useSimpleModel', () => {
  let view: RenderResult | null = null;

  beforeEach(() => {
    apiPost.mockClear();
    experimentValue = {
      state: {
        experiment_id: 12,
        selected_industry: 'electronics',
        selected_company: 'factory',
        selected_product: 'widget',
        data_window_train_start_index: 0,
        data_window_train_end_index: 7,
        data_window_evaluate_start_index: 8,
        data_window_evaluate_end_index: 9,
        moving_average_window: 3,
      },
      productSalesData: {
        meta: {
          industry: 'electronics',
          company: 'factory',
          product: 'widget',
          name: 'Widget',
          description: 'Widget',
          unit: '件',
        },
        monthlySales: [
          { month: '2024-01', sales: 120 },
          { month: '2024-02', sales: 132 },
          { month: '2024-03', sales: 128 },
          { month: '2024-04', sales: 141 },
          { month: '2024-05', sales: 150 },
          { month: '2024-06', sales: 147 },
          { month: '2024-07', sales: 159 },
          { month: '2024-08', sales: 166 },
          { month: '2024-09', sales: 172 },
          { month: '2024-10', sales: 181 },
        ],
      },
      updateState: mock(async (updates: Record<string, unknown>) => {
        experimentValue = {
          ...experimentValue,
          state: {
            ...experimentValue.state,
            ...updates,
          },
        };
      }),
      setTrainingLock: mock(() => {}),
    };
  });

  afterEach(() => {
    view?.unmount();
    view = null;
    mock.clearAllMocks();
  });

  it('does not keep results when the state sync fails after a successful training response', async () => {
    experimentValue.updateState = mock(async () => {
      throw new Error('sync failed');
    });
    const Component = await Harness();

    view = render(
      <MemoryRouter initialEntries={['/model/moving-average/results']}>
        <Component />
      </MemoryRouter>,
    );

    await waitFor(() => expect(apiPost).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(view!.getByTestId('error').textContent).toBe('sync failed'));

    expect(view.getByTestId('results-ready').textContent).toBe('false');
  });

  it('propagates completion sync failures to the caller', async () => {
    experimentValue.updateState = mock(async () => {
      throw new Error('sync failed');
    });
    const Component = await Harness('params');

    view = render(
      <MemoryRouter initialEntries={['/model/moving-average/results']}>
        <Component />
      </MemoryRouter>,
    );

    fireEvent.click(view.getByRole('button', { name: 'complete' }));

    await waitFor(() => expect(view!.getByTestId('completion-error').textContent).toBe('sync failed'));
  });
});
