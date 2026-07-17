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
      action: 'refit_stage',
      aicc: 123.456,
      criterion: 'aicc',
      uses_validation: true,
      training_regime: 'limited_time_validation',
      calibration_source: 'internal_validation',
      stop_reason: 'round_budget',
      model: 'ma',
      reused_artifact: true,
      evaluation_role: 'reporting_only',
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
      uncertainty_summary: {
        method: 'ets_ann_analytic',
        calibration_source: 'training_one_step_residuals',
        horizons: [{
          std_dev: 1.25,
          interval_lower_offset: -2.45,
          interval_upper_offset: 2.45,
          upper_error_p99: 2.91,
          source: 'fallback',
          calibration_source: 'boosting_selection_holdout_reused',
          calibration_origins: 1,
          calibration_mean_error: null,
          calibration_count: null,
          interval_kind: 'fallback_normal_approximation',
          coverage_guarantee: false,
          upper_error_p99_kind: 'uncalibrated_estimate',
          reason: 'missing_horizon_calibration',
        }],
      },
    },
  }],
  step_outputs: {},
  result: null,
  error_message: null,
};

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
    expect(view.getByText('有限时间验证模式')).toBeDefined();
    expect(view.getByText('内部时间验证段')).toBeDefined();
    expect(view.getByText('达到最大轮数')).toBeDefined();
    expect(view.getByText('准备部署阶段产物')).toBeDefined();
    expect(view.getByText('仅用于教学展示，不参与模型链或系数选择')).toBeDefined();
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
    expect(view.getByText(/第 1 步：预测误差标准差 1.2500/)).toBeDefined();
    expect(view.getByText(/名义99%上侧误差估计 2.9100/)).toBeDefined();
    expect(view.getByText(/复用的 Boosting 选模时间留出段/)).toBeDefined();
    expect(view.getByText(/历史预测原点 1/)).toBeDefined();
    expect(view.getByText(/误差样本 无/)).toBeDefined();
    expect(view.getByText(/未校准估计（不代表99%覆盖率）/)).toBeDefined();
    expect(view.getByText(/该预测步缺少单独校准证据/)).toBeDefined();
    expect(view.container.textContent).not.toContain('evaluate_indices');
    expect(view.container.textContent).not.toContain('991');
    expect(view.container.textContent).not.toContain('/srv/private');
    expect(view.container.textContent).not.toContain('residual autocorrelation remains');
    expect(view.container.textContent).not.toContain('reused_artifact');
    expect(view.container.textContent).not.toContain('std_dev');
    expect(view.container.textContent).not.toContain('refit_stage');
    expect(view.container.textContent).not.toContain('missing_horizon_calibration');
  });
});
