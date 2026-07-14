/// <reference lib="dom" />
/// <reference types="bun-types" />

import { afterEach, describe, expect, it, mock } from 'bun:test';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import type { SelectedBestModel } from '../../../store/experiment/types';
import { ProductionPredictionError } from '../../../services/modelLifecycle';
import ProductionPredictionErrorAlert from './ProductionPredictionErrorAlert';

const LocationDisplay = () => {
  const location = useLocation();
  return <div data-testid="location">{location.pathname}</div>;
};

const createError = (recoveryAction: 'retry' | 'retrain') => new ProductionPredictionError(
  recoveryAction === 'retrain' ? '模型产物已损坏' : '请求超时',
  {
    stage: recoveryAction === 'retrain' ? 'prepare' : 'predict',
    kind: recoveryAction === 'retrain' ? 'conflict' : 'timeout',
    code: recoveryAction === 'retrain' ? 'MODEL_ARTIFACT_INVALID' : 'CLIENT_TIMEOUT',
    recoveryAction,
    originalError: null,
  },
);

describe('ProductionPredictionErrorAlert', () => {
  afterEach(() => {
    cleanup();
    mock.clearAllMocks();
  });

  it('keeps retryable errors visible and calls the supplied retry action', () => {
    const onRetry = mock(() => {});
    const view = render(
      <MemoryRouter>
        <ProductionPredictionErrorAlert
          error={createError('retry')}
          selectedBestModel="ma"
          isRetrying={false}
          onRetry={onRetry}
        />
      </MemoryRouter>,
    );

    expect(view.getByRole('alert')).toBeDefined();
    expect(view.getByText('需求预测失败')).toBeDefined();
    fireEvent.click(view.getByRole('button', { name: '重试' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('routes every supported model to its executable retraining result step', async () => {
    const routes: Array<[SelectedBestModel, string]> = [
      ['ma', '/model/moving-average/results'],
      ['exp', '/model/exponential-smoothing/results'],
      ['arima', '/model/arima/autoparams'],
      ['lstm', '/model/lstm/results'],
      ['ensemble_weighted', '/model/weighted-ensemble/results'],
      ['ensemble_boosting', '/model/boosting-ensemble/results'],
      ['ensemble_stacking', '/model/stacking-ensemble/results'],
    ];

    for (const [selectedBestModel, expectedPath] of routes) {
      const view = render(
        <MemoryRouter initialEntries={['/production/steps']}>
          <ProductionPredictionErrorAlert
            error={createError('retrain')}
            selectedBestModel={selectedBestModel}
            isRetrying={false}
            onRetry={mock(() => {})}
          />
          <LocationDisplay />
        </MemoryRouter>,
      );

      fireEvent.click(view.getByRole('button', { name: '返回对应模型重新训练' }));
      await waitFor(() => expect(view.getByTestId('location').textContent).toBe(expectedPath));
      view.unmount();
    }
  });
});
