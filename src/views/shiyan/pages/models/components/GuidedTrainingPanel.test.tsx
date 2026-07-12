/// <reference lib="dom" />

import React from 'react';
import { describe, expect, test } from 'bun:test';
import { render } from '@testing-library/react';
import GuidedTrainingPanel from './GuidedTrainingPanel';
import type { GuidedTrainingSession } from '../../../services/guidedTraining';

const session: GuidedTrainingSession = {
  session_id: 'session-1',
  experiment_id: 1,
  model_type: 'lstm',
  status: 'completed',
  current_step_id: null,
  next_step_id: null,
  error_message: null,
  artifact_revision: '11111111-1111-4111-8111-111111111111',
  experiment_state_version: 4,
  step_outputs: {},
  result: null,
  steps: [{
    id: 'prepare_data',
    label: '准备数据',
    description: '展示完整预处理结果。',
    actionLabel: '准备',
    status: 'completed',
    output: {
      data_points: 24,
      train_size: 18,
      evaluate_size: 6,
      feature_keys: ['价格', '促销', '库存', '天气', '渠道'],
      feature_types: {
        价格: 'numerical',
        促销: 'numerical',
        库存: 'numerical',
        天气: 'categorical',
        渠道: 'categorical',
      },
      target_key: '销售数量',
      normalization: 'zscore',
    },
  }],
};

describe('GuidedTrainingPanel', () => {
  test('renders every top-level and nested output without silent truncation', () => {
    const view = render(
      <GuidedTrainingPanel
        title="LSTM 分阶段训练"
        session={session}
        isLoading={false}
        error={null}
        onInitialize={() => {}}
        onRunNextStep={() => {}}
        onRetry={() => {}}
      />,
    );

    expect(view.getByText('归一化方式')).toBeDefined();
    expect(view.getByText('zscore')).toBeDefined();
    expect(view.getAllByText('渠道').length).toBeGreaterThanOrEqual(2);
    expect(view.getAllByText(/共 5/).length).toBeGreaterThanOrEqual(2);
  });
});
