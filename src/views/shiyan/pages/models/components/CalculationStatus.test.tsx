/// <reference lib="dom" />
/// <reference types="bun-types" />

import React from 'react';
import { afterEach, describe, expect, it, mock } from 'bun:test';
import { cleanup, fireEvent, render } from '@testing-library/react';
import CalculationStatus from './CalculationStatus';

describe('CalculationStatus', () => {
  afterEach(() => {
    cleanup();
    mock.clearAllMocks();
  });

  it('renders an animated model-specific training process while loading', () => {
    const view = render(
      <CalculationStatus
        isLoading={true}
        error={null}
        onRetry={mock(() => {})}
        modelType="lstm"
      />,
    );

    expect(view.getByTestId('training-progress-panel')).toBeDefined();
    expect(view.getByText('LSTM 模型训练中')).toBeDefined();
    expect(view.getByText('后端训练流程')).toBeDefined();
    expect(view.getByText('归一化与构造序列')).toBeDefined();
    expect(view.getByText('动态轮数训练')).toBeDefined();
  });

  it('falls back to the ensemble training profile when only isEnsembleModel is provided', () => {
    const view = render(
      <CalculationStatus
        isLoading={true}
        error={null}
        onRetry={mock(() => {})}
        isEnsembleModel={true}
      />,
    );

    expect(view.getByText('融合模型训练中')).toBeDefined();
    expect(view.getByText('检查基础模型')).toBeDefined();
  });

  it('marks all training stages completed when realtime progress reaches 100%', () => {
    const view = render(
      <CalculationStatus
        isLoading={true}
        error={null}
        onRetry={mock(() => {})}
        modelType="ma"
        currentProgress={{
          type: 'progress',
          source: 'backend',
          message: '模型训练完成，正在返回结果',
          percent: 100,
        }}
      />,
    );

    expect(view.getByText(/实时 100%/)).toBeDefined();
    const stepStatuses = view.getAllByTestId('training-step-status');
    expect(stepStatuses.length).toBeGreaterThan(0);
    for (const status of stepStatuses) {
      expect(status.getAttribute('data-state')).toBe('completed');
    }
  });

  it('renders retryable errors and calls the retry handler', () => {
    const onRetry = mock(() => {});
    const view = render(
      <CalculationStatus
        isLoading={false}
        error="模型服务当前繁忙"
        onRetry={onRetry}
      />,
    );

    expect(view.getByText('计算失败')).toBeDefined();
    fireEvent.click(view.getByRole('button', { name: '重试' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
