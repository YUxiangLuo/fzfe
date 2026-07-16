/// <reference lib="dom" />
/// <reference types="bun-types" />

import React from 'react';
import { afterEach, describe, expect, it, mock } from 'bun:test';
import { cleanup, render } from '@testing-library/react';
import GuidedTrainingPanel from './GuidedTrainingPanel';
import type { GuidedTrainingSession } from '../../../services/guidedTraining';

const completedSession: GuidedTrainingSession = {
  session_id: 'guided-copy-1',
  experiment_id: 1,
  model_type: 'boosting',
  status: 'completed',
  current_step_id: null,
  next_step_id: null,
  steps: [{
    id: 'review_output',
    label: '复核教学输出',
    description: '展示全部关键输入、输出和判断依据。',
    actionLabel: '完成',
    status: 'completed',
    output: {
      aicc: 123.456,
      criterion: 'aicc',
      uses_validation: true,
      training_regime: 'standard',
      calibration_source: 'internal_validation',
      stop_reason: 'round_budget',
      model_chain: ['ma', 'es', 'arima', 'lstm', 'ma'],
      evaluate_indices: [991, 992],
      diagnostics: {
        ljung_box_lag: 4,
        warning: 'residual autocorrelation remains at the 5% level',
      },
      feature_types: {
        销售数量: 'numeric',
        促销类型: 'categorical',
      },
      normalization: 'minmax',
      weights: {
        ma: 0.6,
        lstm: 0.4,
      },
      saved_model: '/srv/private/model-artifacts/boosting.pkl',
      weight_diagnostics: {
        train_size: 20,
        weight_val_size: 5,
        minimum_relative_improvement: 0.01,
        relative_improvement: 0.04,
        winner: 'lstm',
      },
    },
  }],
  step_outputs: {},
  result: null,
  error_message: null,
};

const checkpointSession: GuidedTrainingSession = {
  session_id: 'guided-checkpoints-1',
  experiment_id: 2,
  model_type: 'boosting',
  status: 'ready',
  current_step_id: null,
  next_step_id: 'round_1_select_winner',
  steps: [
    {
      id: 'prepare_data',
      label: '准备训练数据',
      description: '确定训练区间。',
      actionLabel: '准备数据',
      status: 'completed',
    },
    ...[1, 2].flatMap((fold) => (['ma', 'lstm'] as const).map((model) => ({
      id: `round_1_evaluate_fold_${fold}_${model}`,
      label: `第 1 轮评估候选（第 ${fold} 折）：${model}`,
      description: `执行第 ${fold} 折候选。`,
      actionLabel: '评估候选',
      status: 'completed' as const,
      output: {
        round: 1,
        fold,
        fold_count: 2,
        model,
        predicted_points: 4,
      },
    }))),
    ...(['ma', 'lstm'] as const).map((model) => ({
      id: `round_1_evaluate_fold_3_${model}`,
      label: `第 1 轮评估候选（第 3 折）：${model}`,
      description: '执行预留的第 3 折候选。',
      actionLabel: '评估候选',
      status: 'completed' as const,
      output: {
        round: 1,
        fold: 3,
        fold_count: 2,
        model,
        skipped: true,
      },
    })),
    {
      id: 'round_1_select_winner',
      label: '第 1 轮选择胜出模型',
      description: '汇总全部有效折后选择胜者。',
      actionLabel: '选择模型',
      status: 'pending',
    },
    {
      id: 'round_2_evaluate_fold_1_ma',
      label: '第 2 轮评估候选（第 1 折）：ma',
      description: '执行下一轮候选。',
      actionLabel: '评估候选',
      status: 'pending',
    },
  ],
  step_outputs: {},
  result: null,
  error_message: null,
};

const singleFoldSession = (
  modelType: 'weighted_avg' | 'stacking',
  foldStepId: string,
): GuidedTrainingSession => ({
  session_id: `guided-${modelType}-folds`,
  experiment_id: 3,
  model_type: modelType,
  status: 'ready',
  current_step_id: null,
  next_step_id: 'aggregate_oof',
  steps: [
    {
      id: foldStepId,
      label: '生成折外预测',
      description: '仅使用历史前缀生成本折预测。',
      actionLabel: '生成预测',
      status: 'completed',
      output: { fold: 1, fold_count: 1, model: 'ma' },
    },
    {
      id: 'aggregate_oof',
      label: '汇总 OOF 结果',
      description: '完成全部有效折后的统一计算。',
      actionLabel: '汇总结果',
      status: 'pending',
    },
  ],
  step_outputs: {},
  result: null,
  error_message: null,
});

describe('GuidedTrainingPanel teaching output', () => {
  afterEach(() => cleanup());

  it('localizes protocol values and does not silently truncate fields, arrays, or objects', () => {
    const view = render(
      <GuidedTrainingPanel
        title="分阶段训练"
        session={completedSession}
        isLoading={false}
        error={null}
        onInitialize={mock(() => {})}
        onRunNextStep={mock(() => {})}
        onRetry={mock(() => {})}
      />,
    );

    expect(view.getAllByText('AICc')).toHaveLength(2);
    expect(view.getByText('标准训练模式')).toBeDefined();
    expect(view.getByText('内部时间验证段')).toBeDefined();
    expect(view.getByText('达到最大轮数')).toBeDefined();
    expect(view.getByText(/移动平均（MA）、一次指数平滑（ES）、ARIMA、LSTM、移动平均（MA）/)).toBeDefined();
    expect(view.getByText(/胜出模型: LSTM/)).toBeDefined();
    expect(view.getByText(/残差诊断/)).toBeDefined();
    expect(view.getByText(/在 5% 显著性水平下仍检测到残差自相关/)).toBeDefined();
    expect(view.getByText(/销售数量: 数值字段/)).toBeDefined();
    expect(view.getByText(/促销类型: 类别字段/)).toBeDefined();
    expect(view.getByText('MinMax 归一化')).toBeDefined();
    expect(view.getByText(/移动平均（MA）: 0.6000/)).toBeDefined();
    expect(view.getByText(/LSTM: 0.4000/)).toBeDefined();
    expect(view.getByText('模型产物已保存')).toBeDefined();
    expect(view.container.textContent).not.toContain('evaluate_indices');
    expect(view.container.textContent).not.toContain('991');
    expect(view.container.textContent).not.toContain('/srv/private');
    expect(view.container.textContent).not.toContain('residual autocorrelation remains');
  });

  it('groups fold checkpoints by boosting round and explains pooled calculation semantics', () => {
    const view = render(
      <GuidedTrainingPanel
        title="分阶段训练"
        session={checkpointSession}
        isLoading={false}
        error={null}
        onInitialize={mock(() => {})}
        onRunNextStep={mock(() => {})}
        onRetry={mock(() => {})}
      />,
    );

    expect(view.getByTestId('fold-checkpoint-explanation').textContent).toContain('单折输出不代表最终权重');
    expect(view.getByText('第 1 轮：候选评估与选择')).toBeDefined();
    expect(view.getAllByText('第 1 折候选').length).toBeGreaterThan(0);
    expect(view.getByText('第 3 折候选')).toBeDefined();
    expect(view.getAllByText('实际折数').length).toBeGreaterThan(0);
    expect(view.getAllByText('滚动折').length).toBeGreaterThan(0);
    expect(view.getAllByText('基础模型').length).toBeGreaterThan(0);
    expect(view.getAllByText('是否跳过').length).toBeGreaterThan(0);
    expect(view.getAllByText('已跳过').length).toBeGreaterThan(0);
    expect((view.getByTestId('guided-training-group-boosting-round-1') as HTMLDetailsElement).open).toBe(true);
    expect((view.getByTestId('guided-training-group-boosting-round-2') as HTMLDetailsElement).open).toBe(false);
    expect(view.container.textContent).not.toContain('fold_count');
    expect(view.container.textContent).not.toContain('skipped');
  });

  it('recognizes weighted and stacking fold checkpoint protocols', () => {
    const cases = [
      {
        session: singleFoldSession('weighted_avg', 'validation_prediction_fold_1_ma'),
        groupLabel: '权重 OOF · 第 1 折',
      },
      {
        session: singleFoldSession('stacking', 'level1_prediction_fold_1_ma'),
        groupLabel: 'Level-1 OOF · 第 1 折',
      },
    ];

    for (const testCase of cases) {
      const view = render(
        <GuidedTrainingPanel
          title="分阶段训练"
          session={testCase.session}
          isLoading={false}
          error={null}
          onInitialize={mock(() => {})}
          onRunNextStep={mock(() => {})}
          onRetry={mock(() => {})}
        />,
      );

      expect(view.getByTestId('fold-checkpoint-explanation')).toBeDefined();
      expect(view.getByText(testCase.groupLabel)).toBeDefined();
      view.unmount();
    }
  });
});
