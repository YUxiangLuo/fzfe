/// <reference lib="dom" />
/// <reference types="bun-types" />

import { resolve } from 'path';
import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { render, waitFor } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';

mock.restore();

const r = (path: string) => resolve(import.meta.dir, path);

const experimentContextModulePath = r('../../../contexts/ExperimentContext.zustand.tsx');
const guidedTrainingModulePath = r('../../../services/guidedTraining.ts');

const completedGuidedSession = () => ({
  session_id: 'guided-ensemble-1',
  experiment_id: 12,
  model_type: 'weighted_avg',
  status: 'completed',
  current_step_id: null,
  next_step_id: null,
  steps: [],
  step_outputs: {},
  error_message: null,
  result: {
    status: 'success',
    results: {
      eval_y_true: [100, 120],
      eval_predictions: [98, 121],
      evaluate_months: ['2024-04', '2024-05'],
      metrics: { rmse: 2.1, mae: 1.7, r2: 0.95 },
      weights: [0.6, 0.4],
      model_names: ['ma', 'lstm'],
    },
  },
});

const createGuidedTrainingSession = mock(async () => completedGuidedSession());
const runGuidedTrainingStep = mock(async () => completedGuidedSession());

const successfulGuidedResult = {
  status: 'success',
  results: {
    eval_y_true: [100, 120],
    eval_predictions: [98, 121],
    evaluate_months: ['2024-04', '2024-05'],
    metrics: { rmse: 2.1, mae: 1.7, r2: 0.95 },
    weights: [0.6, 0.4],
    model_names: ['ma', 'lstm'],
  },
};

let experimentValue = {
  state: {
    experiment_id: 12,
    selected_industry: 'electronics',
    selected_company: 'factory',
    selected_product: 'widget',
    data_window_train_start_index: 0,
    data_window_train_end_index: 2,
    data_window_evaluate_start_index: 3,
    data_window_evaluate_end_index: 4,
    arima_d: 1,
    exponential_smoothing_alpha: 0.3,
    moving_average_window: 3,
    lstm_features: ['销售数量'],
    lstm_target_field: '销售数量',
    lstm_normalization: 'minmax' as const,
    ensemble_weighted_base_models: ['moving_average', 'lstm'],
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
      { month: '2024-01', sales: 80 },
      { month: '2024-02', sales: 90 },
      { month: '2024-03', sales: 95 },
      { month: '2024-04', sales: 100 },
      { month: '2024-05', sales: 120 },
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

mock.module(guidedTrainingModulePath, () => ({
  createGuidedTrainingSession,
  runGuidedTrainingStep,
  fetchGuidedTrainingSession: mock(async () => null),
}));

const Harness = async () => {
  const { useEnsembleModel } = await import('./useEnsembleModel');
  const { useAutoCalculation } = await import('./useAutoCalculation');

  const Component: React.FC = () => {
    const ensemble = useEnsembleModel({
      type: 'weighted',
      apiEndpoint: '/models/weighted_avg/training',
      stateKey: {
        baseModels: 'ensemble_weighted_base_models',
        completed: 'ensemble_weighted_completed',
        metricsRmse: 'ensemble_weighted_metrics_rmse',
        metricsMae: 'ensemble_weighted_metrics_mae',
        metricsR2: 'ensemble_weighted_metrics_r2',
      },
    });

    useAutoCalculation({
      calculationStepId: 'results',
      currentStepId: 'results',
      handleCalculate: ensemble.initializeGuidedSession,
      canCalculate: ensemble.isValidSelection,
      results: ensemble.results,
      isLoading: ensemble.isLoading,
      error: ensemble.error,
    });

    return (
      <div>
        <div data-testid="loading">{String(ensemble.isLoading)}</div>
        <div data-testid="results-ready">{String(ensemble.results !== null)}</div>
        <div data-testid="error">{ensemble.error ?? ''}</div>
      </div>
    );
  };

  return Component;
};

describe('useEnsembleModel', () => {
  let view: RenderResult | null = null;

  beforeEach(() => {
    createGuidedTrainingSession.mockClear();
    createGuidedTrainingSession.mockResolvedValue(completedGuidedSession());
    runGuidedTrainingStep.mockClear();
    runGuidedTrainingStep.mockResolvedValue(completedGuidedSession());
    experimentValue = {
      state: {
        experiment_id: 12,
        selected_industry: 'electronics',
        selected_company: 'factory',
        selected_product: 'widget',
        data_window_train_start_index: 0,
        data_window_train_end_index: 2,
        data_window_evaluate_start_index: 3,
        data_window_evaluate_end_index: 4,
        arima_d: 1,
        exponential_smoothing_alpha: 0.3,
        moving_average_window: 3,
        lstm_features: ['销售数量'],
        lstm_target_field: '销售数量',
        lstm_normalization: 'minmax' as const,
        ensemble_weighted_base_models: ['moving_average', 'lstm'],
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
          { month: '2024-01', sales: 80 },
          { month: '2024-02', sales: 90 },
          { month: '2024-03', sales: 95 },
          { month: '2024-04', sales: 100 },
          { month: '2024-05', sales: 120 },
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

  it('does not retrigger auto-training after a successful save sync with the same selection', async () => {
    const Component = await Harness();

    view = render(
      <MemoryRouter initialEntries={['/model/weighted-ensemble/results']}>
        <Component />
      </MemoryRouter>,
    );

    await waitFor(() => expect(createGuidedTrainingSession).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(view!.getByTestId('results-ready').textContent).toBe('true'));

    view.rerender(
      <MemoryRouter initialEntries={['/model/weighted-ensemble/results']}>
        <Component />
      </MemoryRouter>,
    );

    await new Promise((resolvePromise) => setTimeout(resolvePromise, 20));

    expect(createGuidedTrainingSession).toHaveBeenCalledTimes(1);
    expect(runGuidedTrainingStep).not.toHaveBeenCalled();
    const firstRequestBody = (createGuidedTrainingSession.mock.calls[0] as unknown[] | undefined)?.[1];
    expect(firstRequestBody).toMatchObject({
      lstmFeatures: JSON.stringify(['销售数量']),
    });
    expect(completedGuidedSession().result).toEqual(successfulGuidedResult);
    expect(view.getByTestId('loading').textContent).toBe('false');
    expect(view.getByTestId('results-ready').textContent).toBe('true');
  });

  it('does not keep ensemble results when the state sync fails after training succeeds', async () => {
    experimentValue.updateState = mock(async () => {
      throw new Error('sync failed');
    });
    const Component = await Harness();

    view = render(
      <MemoryRouter initialEntries={['/model/weighted-ensemble/results']}>
        <Component />
      </MemoryRouter>,
    );

    await waitFor(() => expect(createGuidedTrainingSession).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(view!.getByTestId('error').textContent).toBe('sync failed'));

    expect(view.getByTestId('results-ready').textContent).toBe('false');
  });
});
