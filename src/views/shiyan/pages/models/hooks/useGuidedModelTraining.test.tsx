/// <reference lib="dom" />
/// <reference types="bun-types" />

import { resolve } from 'path';
import { afterEach, beforeEach, describe, expect, it, mock } from 'bun:test';
import { fireEvent, render, waitFor } from '@testing-library/react';
import type { RenderResult } from '@testing-library/react';
import React from 'react';
import type { GuidedTrainingSession } from '../../../services/guidedTraining';

mock.restore();

const r = (path: string) => resolve(import.meta.dir, path);

const guidedTrainingModulePath = r('../../../services/guidedTraining.ts');

const readyGuidedSession = (): GuidedTrainingSession => ({
  session_id: 'guided-1',
  experiment_id: 12,
  model_type: 'ma',
  status: 'ready',
  current_step_id: 'prepare_data',
  next_step_id: 'prepare_data',
  steps: [],
  step_outputs: {},
  result: null,
  error_message: null,
});

const completedGuidedSession = (): GuidedTrainingSession => ({
  session_id: 'guided-1',
  experiment_id: 12,
  model_type: 'ma',
  status: 'completed',
  current_step_id: null,
  next_step_id: null,
  steps: [],
  step_outputs: {},
  result: {
    status: 'success',
    results: {
      metrics: { rmse: 1, mae: 1, r2: 0.9 },
    },
  },
  error_message: null,
});

const createGuidedTrainingSession = mock(async () => readyGuidedSession());
const runGuidedTrainingStep = mock(async () => completedGuidedSession());
const discardGuidedTrainingSession = mock(async () => undefined);

mock.module(guidedTrainingModulePath, () => ({
  createGuidedTrainingSession,
  runGuidedTrainingStep,
  fetchGuidedTrainingSession: mock(async () => null),
  discardGuidedTrainingSession,
}));

const Harness = async () => {
  const { useGuidedModelTraining } = await import('./useGuidedModelTraining');

  const Component: React.FC = () => {
    const [lastRunSucceeded, setLastRunSucceeded] = React.useState<string>('');
    const guidedTraining = useGuidedModelTraining({
      modelType: 'ma',
      buildRequestBody: () => ({
        experiment_id: 12,
        selected_industry: 'electronics',
        selected_company: 'factory',
        selected_product: 'widget',
      }),
      onFinalResult: async () => undefined,
      lockPath: '/model/moving-average/results',
      setTrainingLock: mock(() => {}),
      getErrorMessage: (error) =>
        error instanceof Error ? error.message : '分阶段训练执行失败',
    });

    return (
      <div>
        <div data-testid="loading">{String(guidedTraining.isLoading)}</div>
        <div data-testid="error">{guidedTraining.error ?? ''}</div>
        <div data-testid="retry-count">{String(guidedTraining.retryCount)}</div>
        <div data-testid="session-status">{guidedTraining.session?.status ?? ''}</div>
        <div data-testid="last-run-succeeded">{lastRunSucceeded}</div>
        <button
          type="button"
          onClick={() => {
            void guidedTraining.initializeSession();
          }}
        >
          init
        </button>
        <button
          type="button"
          onClick={async () => {
            setLastRunSucceeded(String(await guidedTraining.runNextStep()));
          }}
        >
          run
        </button>
        <button
          type="button"
          onClick={() => {
            void guidedTraining.handleRetry();
          }}
        >
          retry
        </button>
        <button
          type="button"
          onClick={() => {
            void guidedTraining.discardAndRestart();
          }}
        >
          restart
        </button>
      </div>
    );
  };

  return Component;
};

describe('useGuidedModelTraining', () => {
  let view: RenderResult | null = null;

  beforeEach(() => {
    createGuidedTrainingSession.mockClear();
    createGuidedTrainingSession.mockResolvedValue(readyGuidedSession());
    runGuidedTrainingStep.mockClear();
    runGuidedTrainingStep.mockResolvedValue(completedGuidedSession());
    discardGuidedTrainingSession.mockClear();
  });

  afterEach(() => {
    view?.unmount();
    view = null;
    mock.clearAllMocks();
  });

  it('reruns the failed guided step when retry is clicked', async () => {
    runGuidedTrainingStep
      .mockRejectedValueOnce(new Error('step failed'))
      .mockResolvedValueOnce(completedGuidedSession());
    const Component = await Harness();

    view = render(<Component />);

    fireEvent.click(view.getByRole('button', { name: 'run' }));

    await waitFor(() => expect(view!.getByTestId('error').textContent).toBe('step failed'));
    expect(view.getByTestId('last-run-succeeded').textContent).toBe('false');
    expect(view.getByTestId('retry-count').textContent).toBe('1');

    fireEvent.click(view.getByRole('button', { name: 'retry' }));

    await waitFor(() => expect(runGuidedTrainingStep).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(view!.getByTestId('session-status').textContent).toBe('completed'));
    expect(view.getByTestId('error').textContent).toBe('');
    expect(view.getByTestId('retry-count').textContent).toBe('0');
  });

  it('reports a successful guided step so callers can gate navigation', async () => {
    const Component = await Harness();
    view = render(<Component />);

    fireEvent.click(view.getByRole('button', { name: 'run' }));

    await waitFor(() =>
      expect(view!.getByTestId('last-run-succeeded').textContent).toBe('true'),
    );
    expect(view.getByTestId('session-status').textContent).toBe('completed');
    expect(view.getByTestId('error').textContent).toBe('');
  });

  it('does not count backend busy responses toward the retry limit', async () => {
    const busyError = Object.assign(
      new Error('HTTP 429 Too Many Requests - 模型服务繁忙，请稍后再试'),
      { status: 429, payload: { error: '模型服务繁忙，请稍后再试' } },
    );
    runGuidedTrainingStep
      .mockRejectedValueOnce(busyError)
      .mockResolvedValueOnce(completedGuidedSession());
    const Component = await Harness();

    view = render(<Component />);

    fireEvent.click(view.getByRole('button', { name: 'run' }));

    await waitFor(() =>
      expect(view!.getByTestId('error').textContent).toBe('模型服务当前繁忙，请稍后再次点击“重试”。'),
    );
    expect(view.getByTestId('retry-count').textContent).toBe('0');

    fireEvent.click(view.getByRole('button', { name: 'retry' }));

    await waitFor(() => expect(runGuidedTrainingStep).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(view!.getByTestId('session-status').textContent).toBe('completed'));
  });

  it('does not count same-model conflicts toward the retry limit', async () => {
    const conflictError = Object.assign(
      new Error('HTTP 409 Conflict - 同一模型正在训练或预测，请稍后再试'),
      { status: 409, payload: { error: '同一模型正在训练或预测，请稍后再试' } },
    );
    runGuidedTrainingStep
      .mockRejectedValueOnce(conflictError)
      .mockResolvedValueOnce(completedGuidedSession());
    const Component = await Harness();

    view = render(<Component />);

    fireEvent.click(view.getByRole('button', { name: 'run' }));

    await waitFor(() =>
      expect(view!.getByTestId('error').textContent).toBe('当前模型已有训练或预测任务在执行，请稍后再次点击“重试”。'),
    );
    expect(view.getByTestId('retry-count').textContent).toBe('0');

    fireEvent.click(view.getByRole('button', { name: 'retry' }));

    await waitFor(() => expect(runGuidedTrainingStep).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(view!.getByTestId('session-status').textContent).toBe('completed'));
  });

  it('shows the structured timeout message and counts it toward manual retries', async () => {
    const timeoutError = Object.assign(
      new Error('HTTP 504 Gateway Timeout - 训练步骤超时，请重试当前步骤'),
      {
        status: 504,
        payload: {
          error: '训练步骤超时，请重试当前步骤',
          code: 'MODEL_TIMEOUT',
          retryable: true,
        },
      },
    );
    runGuidedTrainingStep.mockRejectedValueOnce(timeoutError);
    const Component = await Harness();

    view = render(<Component />);
    fireEvent.click(view.getByRole('button', { name: 'run' }));

    await waitFor(() =>
      expect(view!.getByTestId('error').textContent).toBe('训练步骤超时，请重试当前步骤'),
    );
    expect(view.getByTestId('retry-count').textContent).toBe('1');
    expect(runGuidedTrainingStep).toHaveBeenCalledTimes(1);
  });

  it('counts session creation failures and retries initialization', async () => {
    createGuidedTrainingSession
      .mockRejectedValueOnce(new Error('create failed'))
      .mockResolvedValueOnce(readyGuidedSession());
    const Component = await Harness();

    view = render(<Component />);

    fireEvent.click(view.getByRole('button', { name: 'init' }));

    await waitFor(() => expect(view!.getByTestId('error').textContent).toBe('create failed'));
    expect(view.getByTestId('retry-count').textContent).toBe('1');

    fireEvent.click(view.getByRole('button', { name: 'retry' }));

    await waitFor(() => expect(createGuidedTrainingSession).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(view!.getByTestId('session-status').textContent).toBe('ready'));
    expect(view.getByTestId('error').textContent).toBe('');
    expect(view.getByTestId('retry-count').textContent).toBe('0');
  });

  it('discards an exhausted guided session before allowing a clean restart', async () => {
    runGuidedTrainingStep.mockRejectedValue(new Error('step failed'));
    const Component = await Harness();

    view = render(<Component />);
    fireEvent.click(view.getByRole('button', { name: 'run' }));
    await waitFor(() => expect(view!.getByTestId('retry-count').textContent).toBe('1'));

    fireEvent.click(view.getByRole('button', { name: 'retry' }));
    await waitFor(() => expect(view!.getByTestId('retry-count').textContent).toBe('2'));

    fireEvent.click(view.getByRole('button', { name: 'restart' }));
    await waitFor(() => expect(discardGuidedTrainingSession).toHaveBeenCalledWith('ma', 'guided-1'));
    await waitFor(() => expect(view!.getByTestId('retry-count').textContent).toBe('0'));
    expect(view.getByTestId('error').textContent).toBe('');
    expect(view.getByTestId('session-status').textContent).toBe('');
  });
});
