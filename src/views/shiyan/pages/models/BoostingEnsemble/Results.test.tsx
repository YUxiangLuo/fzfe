/// <reference lib="dom" />
/// <reference types="bun-types" />

import React from 'react';
import { afterEach, describe, expect, it, mock } from 'bun:test';
import { cleanup, render } from '@testing-library/react';
import Results from './Results';

describe('Boosting training result explanation', () => {
  afterEach(() => cleanup());

  it('shows the refitted model chain and every stage coefficient', () => {
    const view = render(
      <Results
        data={{
          predictions: [{ date: '2024-01', actual: 100, predicted: 98 }],
          metrics: { rmse: 2, mae: 2, r2: 0.9 },
          model_chain: ['ma', 'lstm', 'ma'],
          stage_coefficients: [0.8, 0.25, 0.1],
        }}
        isLoading={false}
        error={null}
        onRetry={mock(() => {})}
        guidedSession={null}
        onInitialize={mock(() => {})}
        onRunNextStep={mock(() => {})}
      />,
    );

    expect(view.getByText('最终残差提升模型链')).toBeDefined();
    expect(view.getByText('第 1 阶段：移动平均（MA）')).toBeDefined();
    expect(view.getByText('第 2 阶段：LSTM')).toBeDefined();
    expect(view.getByText('第 3 阶段：移动平均（MA）')).toBeDefined();
    expect(view.getByText('γ = 0.2500')).toBeDefined();
  });
});
