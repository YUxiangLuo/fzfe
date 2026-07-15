/// <reference lib="dom" />
/// <reference types="bun-types" />

import React from 'react';
import { afterEach, describe, expect, it, mock } from 'bun:test';
import { cleanup, render, within } from '@testing-library/react';
import MovingAverageResults from '../MovingAverage/Results';
import ExponentialSmoothingResults from '../ExponentialSmoothing/Results';
import LSTMResults from '../LSTM/Results';
import ARIMAAutoParams from '../ARIMA/AutoParams';
import type { GuidedModelType, GuidedTrainingSession } from '../../../services/guidedTraining';

const sessionFor = (modelType: GuidedModelType): GuidedTrainingSession => ({
  session_id: `guided-${modelType}`,
  experiment_id: 1,
  model_type: modelType,
  status: 'completed',
  current_step_id: null,
  next_step_id: null,
  steps: [{
    id: 'save_artifact',
    label: '保存模型产物',
    description: '保留最终模型与教学记录。',
    actionLabel: '完成',
    status: 'completed',
    output: { saved_model: `${modelType}.pkl` },
  }],
  step_outputs: {},
  result: null,
  error_message: null,
});

const data = {
  predictions: [{ date: '2024-01', actual: 100, predicted: 98 }],
  metrics: { rmse: 2, mae: 2, r2: 0.9 },
};

const sharedProps = {
  isLoading: false,
  error: null,
  onRetry: mock(() => {}),
  onInitialize: mock(() => {}),
  onRunNextStep: mock(() => {}),
};

describe('completed base-model training teaching records', () => {
  afterEach(() => cleanup());

  it('keeps the guided steps visible beside completed MA, ES, LSTM, and ARIMA results', () => {
    const cases = [
      render(<MovingAverageResults {...sharedProps} data={data} guidedSession={sessionFor('ma')} />),
      render(<ExponentialSmoothingResults {...sharedProps} data={data} guidedSession={sessionFor('es')} />),
      render(<LSTMResults {...sharedProps} data={data} guidedSession={sessionFor('lstm')} />),
      render(
        <ARIMAAutoParams
          {...sharedProps}
          view="results"
          data={{ ...data, order: { p: 1, d: 1, q: 0 } }}
          guidedSession={sessionFor('arima')}
          onShowInformationCriteriaInfo={mock(() => {})}
        />,
      ),
    ];

    for (const view of cases) {
      const scoped = within(view.container);
      expect(scoped.getByText('保存模型产物')).toBeDefined();
      expect(scoped.getByText('保留最终模型与教学记录。')).toBeDefined();
      view.unmount();
    }
  });
});
