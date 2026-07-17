import React, { useMemo } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Circle,
  Loader2,
  Play,
  RotateCcw,
} from 'lucide-react';
import Button from '../../../shared/components/common/Button';
import type { GuidedTrainingSession, GuidedTrainingStep } from '../../../services/guidedTraining';

const outputKeyLabels: Record<string, string> = {
  actual: '真实值',
  action: '本轮动作',
  algorithm: '算法',
  aic: 'AIC',
  aicc: 'AICc',
  alpha: '平滑系数',
  artifact_origin: '成员产物来源',
  batch_size: '批大小',
  boost_train_size: '残差训练样本',
  boost_val_size: '残差验证样本',
  best_order: '选定阶数',
  bic: 'BIC',
  candidates: '候选模型误差',
  converged: '是否收敛',
  convergence_retried: '是否提高迭代上限重试',
  coefficient: '阶段系数',
  coefficient_strategy: '阶段系数求解',
  coefficients: '模型系数',
  criterion: '搜索准则',
  d: '差分阶数',
  data_points: '数据点数',
  desired_validation_size: '期望验证样本',
  diagnostics: '残差诊断',
  early_stopped: '是否早停',
  effective_train_size: '差分后样本数',
  encoded_feature_count: '编码后特征数',
  epochs: '训练轮数',
  epochs_ran: '实际轮数',
  epochs_requested: '计划轮数',
  epsilon: '数值稳定项 ε',
  evaluate_months: '评估月份',
  evaluate_size: '评估样本数',
  evaluated_points: '评估点数',
  evaluation_role: '独立评估结果用途',
  feature_keys: '特征字段',
  feature_types: '字段类型',
  final_loss: '最终损失',
  fitted_points: '拟合点数',
  forecast_horizon: '预测跨度',
  forecast_steps: '预测步数',
  history_end_index: '历史结束点',
  history_start_index: '历史起始点',
  input_shape: '输入形状',
  improvement: '改善幅度',
  initial_level: '估计初始水平',
  interval_kind: '区间类型',
  interval_level: '区间水平',
  kind: '元模型类型',
  level0_size: 'Level-0 样本',
  level1_size: 'Level-1 样本',
  level: '平滑水平',
  learning_rate: '学习率',
  ljung_box_lag: 'Ljung–Box 检验滞后阶数',
  ljung_box_pvalue: 'Ljung–Box p 值',
  look_back: '回看窗口',
  lower: '下界',
  mae: 'MAE',
  ma: '移动平均（MA）',
  mape: 'MAPE',
  max_p: '最大 p',
  max_q: '最大 q',
  max_epochs: '最大训练轮数',
  max_rounds: '最大轮数',
  mean_residual: '平均残差',
  meta_model: '元模型',
  method: '计算方法',
  minimum_relative_improvement: '最小相对改善门槛',
  model_chain: '模型链',
  model_count: '成员模型数',
  model: '模型',
  model_name: '模型',
  model_names: '基础模型顺序',
  model_spec: '模型规格',
  models: '基础模型',
  es: '一次指数平滑（ES）',
  arima: 'ARIMA',
  lstm: 'LSTM',
  metrics: '误差指标',
  normalization: '数值缩放方式',
  objective: '优化目标',
  order: '模型阶数',
  p: '自回归阶数 p',
  parameter_budget: '参数预算',
  parameter_count: '模型参数量',
  patience: '早停耐心值',
  previous_rmse: '加入本阶段前 RMSE',
  predicted: '预测值',
  predicted_points: '预测点数',
  preview: '结果预览',
  prefix_size: '内部训练前缀样本',
  purpose: '划分用途',
  r2: 'R²',
  residual_points: '残差点数',
  residual_mse: '残差 MSE',
  residual_white_noise: '残差是否通过白噪声门槛',
  relative_improvement: '相对改善',
  reliability: '启发式收缩系数 ρ',
  residual_norm: 'Level-1 残差范数',
  rmse: 'RMSE',
  round: '轮次',
  raw_weights: '收缩前候选权重',
  reused_artifacts: '复用产物',
  selection_criterion: '选择依据',
  selected_order: '选定阶数',
  selection_coefficients: '验证阶段系数',
  selection_model_chain: '验证选出的模型链',
  split_plan: '时间拆分方案',
  stop_reason: '停止原因',
  saved_model: '模型产物',
  std_dev_residuals: '残差波动',
  stage_count: '阶段数',
  stage: '阶段',
  stages: '逐轮选择记录',
  stage_coefficients: '时间验证段阶段系数',
  stage_eval: '独立评估区间阶段结果（仅报告）',
  strategy: '求解策略',
  target_key: '目标字段',
  target_shape: '标签形状',
  training_regime: '训练模式',
  train_size: '训练样本数',
  training_residual_points: '训练期残差点数',
  teaching_small_sample: '是否为小样本教学划分',
  uncertainty_summary: '不确定性方法',
  uncertainty_profile: '逐预测步不确定性配置',
  calibration_source: '不确定性估计数据',
  calibration_count: '误差估计样本数',
  calibration_origins: '历史预测原点数',
  calibration_mean_error: '误差估计平均值',
  confidence_intervals: '预测区间',
  fallback: '是否使用回退估计',
  fallback_horizons: '使用回退的预测步',
  horizons: '逐预测步不确定性',
  horizon_start: '起始预测步',
  interval_lower_offset: '95%误差下偏移',
  interval_upper_offset: '95%误差上偏移',
  reason: '原因',
  reused_artifact: '是否复用已完成基础模型产物',
  source: '不确定性来源',
  std_dev: '预测误差标准差',
  upper_error_p99: '名义99%上侧误差估计',
  upper_error_p99_kind: '99%上侧误差性质',
  coverage_guarantee: '是否具有覆盖率保证',
  units: 'LSTM 隐藏单元',
  used_validation: '是否使用时间验证',
  uses_validation: '是否使用时间验证',
  validation_windows: '验证窗口数',
  validation_size: '实际验证样本',
  upper: '上界',
  weight_train_size: '权重训练样本',
  weight_val_size: '权重验证样本',
  weight_diagnostics: '权重诊断',
  weights: '融合权重',
  winner: '胜出模型',
  winner_rmse: '胜出 RMSE',
  window: '窗口长度',
  window_count: '监督窗口数',
  window_values: '窗口数据',
  purge_windows: '隔离窗口数',
  q: '移动平均阶数 q',
  refit_coefficients: '部署模型链保留的验证系数',
  refit_model_chain: '部署模型链',
  seasonal_order: '季节阶数',
  trend: '趋势或漂移设定',
  warning: '诊断提示',
  with_intercept: '是否含截距或漂移',
};

const formatKey = (key: string) => outputKeyLabels[key] ?? key;

const outputValueLabels: Record<string, string> = {
  aicc: 'AICc',
  standard: '常规样本量配置',
  limited_time_validation: '有限时间验证模式',
  teaching_demo: '教学演示模式',
  selected: '已选中',
  early_stop: '改善不足，提前停止',
  refit_stage: '准备部署阶段产物',
  reporting_only: '仅用于教学展示，不参与模型链或系数选择',
  round_budget: '达到最大轮数',
  internal_validation: '内部时间验证段',
  level1_holdout: 'Level-1 时间留出段',
  internal_time_validation: '内部时间验证窗口',
  early_stopping_validation_reused: '复用的 EarlyStopping 时间验证窗口',
  training_rolling_origin: '训练段 rolling-origin 回测',
  training_one_step_residuals: '训练期一步预测残差',
  training_history: '训练历史回退尺度',
  validation_residuals_by_horizon: '时间验证逐 horizon 残差',
  rolling_origin_horizon_residuals: '训练段 rolling-origin 逐 horizon 残差',
  member_growth_residual_calibrated: '成员增长形状 + 内部残差尺度',
  ets_ann_analytic: 'ETS(A,N,N) 解析预测方差',
  difference_sqrt_h: '一阶差分尺度 × √h 回退',
  rolling_origin_horizon_residual_quantiles: '训练段 rolling-origin 逐 horizon 残差分位数',
  ets_ann_empirical_residual_quantiles: 'ETS(A,N,N) 增长形状 + 一步残差分位数',
  ets_ann_fallback_normal: 'ETS(A,N,N) 标准差增长 + 正态近似回退',
  validation_residual_quantiles_by_horizon: '时间验证逐 horizon 残差分位数',
  uncalibrated_validation_residual_quantiles_by_horizon: '复用 EarlyStopping 验证段的未校准逐 horizon 残差分位数',
  uncalibrated_weight_fit_holdout_residual_quantiles_member_growth: '复用 Weighted 权重拟合留出段的未校准组合残差分位数与成员增长形状',
  uncalibrated_selection_holdout_residual_quantiles_member_growth: '复用 Boosting 选模留出段的未校准组合残差分位数与成员增长形状',
  uncalibrated_meta_fit_holdout_residual_quantiles_member_growth: '复用 Stacking 元模型拟合留出段的未校准组合残差分位数与成员增长形状',
  member_growth_residual_quantiles: '成员增长形状 + 组合残差分位数',
  normal_approximation: '基于标准差的正态近似范围',
  fallback_normal_approximation: '样本不足时的正态近似回退范围',
  empirical_residual_quantile: 'actual-prediction 经验残差分位数范围',
  uncalibrated_empirical_residual_quantile: '未校准的 actual-prediction 经验残差分位数范围',
  censored_nonnegative_uncalibrated_empirical_residual_quantile: '非负销量域中的未校准经验残差分位数范围',
  censored_nonnegative_fallback_normal_approximation: '非负销量域中的正态近似回退范围',
  uncalibrated_estimate: '未校准估计（不代表99%覆盖率）',
  weighted_weight_fit_holdout_reused: '复用的 Weighted 权重拟合时间留出段',
  boosting_selection_holdout_reused: '复用的 Boosting 选模时间留出段',
  stacking_meta_fit_holdout_reused: '复用的 Stacking 元模型拟合 Level-1 留出段',
  model_prediction_interval: '模型原生预测区间',
  production_full_refit_in_sample: '生产窗口完整重拟合残差',
  residual_boosting: '残差提升',
  nonnegative_squared_error_line_search: '非负平方损失线搜索',
  validation_residual_rmse: '验证段残差 RMSE',
  nnls: '非负最小二乘（NNLS）',
  nonnegative_least_squares: '非负最小二乘',
  weighted: '加权平均内部验证',
  boosting: 'Boosting 内部验证',
  stacking: 'Stacking Level-1 留出',
  standalone_base: '复用已完成基础模型产物',
  temporary_training: '本阶段新拟合产物',
  model: '模型解析结果',
  empirical: '经验残差估计',
  fallback: '回退估计',
  numeric: '数值字段',
  categorical: '类别字段',
  minmax: 'MinMax 归一化',
  zscore: 'Z-score 标准化',
  first_difference_rms_floor: '使用一阶差分均方根下限',
  first_difference_scale: '使用一阶差分尺度',
  insufficient_residuals: '可用残差样本不足',
  nonfinite_scale: '残差尺度不是有限数值',
  missing_horizon_calibration: '该预测步缺少单独校准证据',
  'effective sample is too short for a degrees-of-freedom adjusted Ljung-Box test': '有效样本过少，无法执行自由度修正后的 Ljung–Box 检验',
  'residual variance is degenerate, so Ljung-Box is undefined': '残差方差退化，Ljung–Box 检验无定义',
  'residual autocorrelation remains at the 5% level': '在 5% 显著性水平下仍检测到残差自相关',
  ma: '移动平均（MA）',
  es: '一次指数平滑（ES）',
  arima: 'ARIMA',
  lstm: 'LSTM',
};

interface GuidedTrainingPanelProps {
  session: GuidedTrainingSession | null;
  isLoading: boolean;
  error: string | null;
  onInitialize: () => void;
  onRunNextStep: () => void;
  onRetry: () => void;
  title: string;
}

const hiddenOutputKeys = new Set(['evaluate_indices']);

const formatValue = (value: unknown, key?: string): string => {
  if (key === 'saved_model') {
    return typeof value === 'string' && value.length > 0 ? '模型产物已保存' : '';
  }
  if (value === null) {
    return '无';
  }
  if (value === undefined) {
    return '';
  }
  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : value.toFixed(4);
  }
  if (typeof value === 'string') {
    return outputValueLabels[value] ?? value;
  }
  if (typeof value === 'boolean') {
    return value ? '是' : '否';
  }
  if (Array.isArray(value)) {
    if (key === 'horizons') {
      return value.map((item, index) => {
        if (!item || typeof item !== 'object' || Array.isArray(item)) {
          return `第 ${index + 1} 步：${formatValue(item)}`;
        }
        const horizon = item as Record<string, unknown>;
        const parts: string[] = [];
        if (horizon.std_dev !== undefined) {
          parts.push(`预测误差标准差 ${formatValue(horizon.std_dev, 'std_dev')}`);
        }
        if (horizon.interval_lower_offset !== undefined || horizon.interval_upper_offset !== undefined) {
          const intervalLabel = horizon.coverage_guarantee === false ? '名义95%误差偏移' : '95%误差偏移';
          parts.push(`${intervalLabel} [${formatValue(horizon.interval_lower_offset, 'interval_lower_offset')}, ${formatValue(horizon.interval_upper_offset, 'interval_upper_offset')}]`);
        }
        if (horizon.upper_error_p99 !== undefined) {
          const p99Label = horizon.coverage_guarantee === false ? '名义99%上侧误差估计' : '99%上侧误差';
          parts.push(`${p99Label} ${formatValue(horizon.upper_error_p99, 'upper_error_p99')}`);
        }
        if (horizon.interval_kind !== undefined) {
          parts.push(`区间类型 ${formatValue(horizon.interval_kind, 'interval_kind')}`);
        }
        if (horizon.source !== undefined) {
          parts.push(`来源 ${formatValue(horizon.source, 'source')}`);
        }
        if (horizon.calibration_source !== undefined) {
          parts.push(`估计数据 ${formatValue(horizon.calibration_source, 'calibration_source')}`);
        }
        if (horizon.calibration_count !== undefined) {
          const sampleLabel = horizon.coverage_guarantee === false ? '误差样本' : '校准样本';
          parts.push(`${sampleLabel} ${formatValue(horizon.calibration_count, 'calibration_count')}`);
        }
        if (horizon.calibration_origins !== undefined) {
          parts.push(`历史预测原点 ${formatValue(horizon.calibration_origins, 'calibration_origins')}`);
        }
        if (horizon.calibration_mean_error !== undefined) {
          parts.push(`校准平均误差 ${formatValue(horizon.calibration_mean_error, 'calibration_mean_error')}`);
        }
        if (horizon.reason !== undefined) {
          parts.push(`说明 ${formatValue(horizon.reason, 'reason')}`);
        }
        const handledKeys = new Set([
          'std_dev',
          'interval_lower_offset',
          'interval_upper_offset',
          'upper_error_p99',
          'interval_kind',
          'source',
          'calibration_source',
          'calibration_count',
          'calibration_origins',
          'calibration_mean_error',
          'reason',
        ]);
        for (const [nestedKey, nestedValue] of Object.entries(horizon)) {
          if (!handledKeys.has(nestedKey) && !hiddenOutputKeys.has(nestedKey)) {
            parts.push(`${formatKey(nestedKey)} ${formatValue(nestedValue, nestedKey)}`);
          }
        }
        return `第 ${index + 1} 步：${parts.join('；')}`;
      }).join('\n');
    }
    return value.map((item) => formatValue(item)).filter(Boolean).join('、');
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return Object.entries(record)
      .filter(([nestedKey]) => !hiddenOutputKeys.has(nestedKey))
      .map(([nestedKey, item]) => `${formatKey(nestedKey)}: ${formatValue(item, nestedKey)}`)
      .join('；');
  }
  return String(value);
};

const outputRows = (output: unknown) => {
  if (!output || typeof output !== 'object' || Array.isArray(output)) {
    return [];
  }

  return Object.entries(output as Record<string, unknown>)
    .filter(([key]) => !hiddenOutputKeys.has(key))
    .map(([key, value]) => ({ key, label: formatKey(key), value: formatValue(value, key) }))
    .filter((row) => row.value.length > 0);
};

const StepMarker: React.FC<{ step: GuidedTrainingStep; isLoading: boolean }> = ({ step, isLoading }) => {
  const markerClass = step.status === 'completed'
    ? 'bg-green-100 text-green-700'
    : step.status === 'active'
      ? 'bg-blue-600 text-white ring-4 ring-blue-100'
      : step.status === 'failed'
        ? 'bg-red-100 text-red-700'
        : 'bg-gray-100 text-gray-400';

  return (
    <div className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${markerClass}`}>
      {isLoading && step.status === 'active' ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : step.status === 'completed' ? (
        <CheckCircle2 className="h-4 w-4" />
      ) : step.status === 'failed' ? (
        <AlertCircle className="h-4 w-4" />
      ) : (
        <Circle className="h-4 w-4" />
      )}
    </div>
  );
};

const GuidedTrainingPanel: React.FC<GuidedTrainingPanelProps> = ({
  session,
  isLoading,
  error,
  onInitialize,
  onRunNextStep,
  onRetry,
  title,
}) => {
  const activeStep = useMemo(
    () => session?.steps.find((step) => step.id === session.next_step_id)
      ?? session?.steps.find((step) => step.status === 'active')
      ?? null,
    [session],
  );

  if (!session && !error) {
    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
        <h3 className="text-xl font-bold text-gray-900">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-gray-700">
          系统会把真实训练过程拆成多个阶段。每完成一个阶段，都会展示关键输入、输出和判断依据，再进入下一阶段。
        </p>
        <Button onClick={onInitialize} disabled={isLoading} className="mt-4">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          进入分阶段训练
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900">{title}</h3>
            {activeStep && (
              <p className="mt-2 text-sm leading-6 text-gray-700">
                当前阶段：<span className="font-semibold text-blue-700">{activeStep.label}</span>。{activeStep.description}
              </p>
            )}
          </div>
          {session?.status !== 'completed' && (
            <Button onClick={onRunNextStep} disabled={isLoading || session?.status === 'running' || !!error || !session?.next_step_id}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
              {activeStep?.actionLabel ?? '执行下一阶段'}
            </Button>
          )}
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">当前阶段执行失败</p>
              <p className="mt-1 leading-6">{error}</p>
              <Button onClick={onRetry} variant="outline" size="sm" className="mt-3">
                <RotateCcw className="h-4 w-4" />
                重试
              </Button>
            </div>
          </div>
        )}
      </div>

      {session && (
        <ol className="space-y-3">
          {session.steps.map((step) => {
            const rows = outputRows(step.output);
            return (
              <li key={step.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <div className="flex gap-3">
                  <StepMarker step={step} isLoading={isLoading} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-gray-900">{step.label}</p>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
                        {step.status === 'completed'
                          ? '已完成'
                          : step.status === 'active'
                            ? '当前阶段'
                            : step.status === 'failed'
                              ? '失败'
                              : '未开始'}
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-6 text-gray-600">{step.description}</p>
                    {rows.length > 0 && (
                      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                        {rows.map((row) => (
                          <div key={row.key} className="rounded-md bg-gray-50 px-3 py-2">
                            <dt className="text-xs font-semibold text-gray-500">{row.label}</dt>
                            <dd className="mt-1 whitespace-pre-wrap break-words text-gray-800">{row.value}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
};

export default GuidedTrainingPanel;
