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
  feature_keys: '特征字段',
  feature_types: '字段类型',
  final_loss: '最终损失',
  fitted_points: '拟合点数',
  fold: '滚动折',
  fold_count: '实际折数',
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
  model: '基础模型',
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
  reliability: '验证权重可靠度 ρ',
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
  skipped: '是否跳过',
  stop_reason: '停止原因',
  saved_model: '模型产物',
  std_dev_residuals: '残差波动',
  stage_count: '阶段数',
  stage: '阶段',
  stages: '逐轮选择记录',
  stage_coefficients: '滚动 OOF 阶段系数',
  stage_eval: '阶段评估',
  strategy: '求解策略',
  target_key: '目标字段',
  target_shape: '标签形状',
  training_regime: '训练模式',
  train_size: '训练样本数',
  teaching_small_sample: '是否为小样本教学划分',
  uncertainty_summary: '不确定性方法',
  calibration_source: '不确定性校准数据',
  fallback: '是否使用回退估计',
  fallback_horizons: '使用回退的预测步',
  reason: '原因',
  source: '不确定性来源',
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
  refit_coefficients: '完整训练保留的 OOF 系数',
  refit_model_chain: '完整训练保留模型链',
  seasonal_order: '季节阶数',
  trend: '趋势或漂移设定',
  warning: '诊断提示',
  with_intercept: '是否含截距或漂移',
};

const formatKey = (key: string) => outputKeyLabels[key] ?? key;

const outputValueLabels: Record<string, string> = {
  aicc: 'AICc',
  standard: '标准训练模式',
  teaching_demo: '教学演示模式',
  selected: '已选中',
  early_stop: '改善不足，提前停止',
  round_budget: '达到最大轮数',
  internal_validation: '内部时间验证段',
  rolling_origin_oof: '扩展窗口滚动起点 OOF',
  level1_holdout: 'Level-1 时间留出段',
  internal_time_validation: '内部时间验证窗口',
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
  member_growth_residual_quantiles: '成员增长形状 + 组合残差分位数',
  normal_approximation: '基于标准差的正态近似范围',
  fallback_normal_approximation: '样本不足时的正态近似回退范围',
  empirical_residual_quantile: 'actual-prediction 经验残差分位数范围',
  model_prediction_interval: '模型原生预测区间',
  production_full_refit_in_sample: '生产窗口完整重拟合残差',
  residual_boosting: '残差提升',
  nonnegative_squared_error_line_search: '非负平方损失线搜索',
  validation_residual_rmse: '验证段残差 RMSE',
  nnls: '非负最小二乘（NNLS）',
  nonnegative_least_squares: '非负最小二乘',
  weighted: '加权平均滚动起点 OOF',
  boosting: 'Boosting 滚动起点 OOF',
  stacking: 'Stacking 滚动起点 OOF',
  standalone_base: '复用已完成基础模型产物',
  temporary_training: '当前流程临时重训',
  model: '模型解析结果',
  empirical: '经验残差估计',
  fallback: '回退估计',
  numeric: '数值字段',
  categorical: '类别字段',
  minmax: 'MinMax 归一化',
  zscore: 'Z-score 标准化',
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

type FoldStepKind = 'weighted' | 'stacking' | 'boosting';

interface FoldStepMetadata {
  kind: FoldStepKind;
  fold: number;
  round?: number;
}

interface StepDisplayGroup {
  id: string;
  kind: 'fold' | 'round';
  label: string;
  description: string;
  steps: GuidedTrainingStep[];
}

type StepDisplayItem =
  | { kind: 'step'; step: GuidedTrainingStep }
  | { kind: 'group'; group: StepDisplayGroup };

const getOutputRecord = (step: GuidedTrainingStep): Record<string, unknown> | null => (
  step.output && typeof step.output === 'object' && !Array.isArray(step.output)
    ? step.output as Record<string, unknown>
    : null
);

const isSkippedStep = (step: GuidedTrainingStep) => getOutputRecord(step)?.skipped === true;

const parseFoldStep = (stepId: string): FoldStepMetadata | null => {
  const weighted = stepId.match(/^validation_prediction_fold_(\d+)_(?:ma|es|arima|lstm)$/);
  if (weighted) return { kind: 'weighted', fold: Number(weighted[1]) };

  const stacking = stepId.match(/^level1_prediction_fold_(\d+)_(?:ma|es|arima|lstm)$/);
  if (stacking) return { kind: 'stacking', fold: Number(stacking[1]) };

  const boosting = stepId.match(/^round_(\d+)_evaluate_fold_(\d+)_(?:ma|es|arima|lstm)$/);
  if (boosting) {
    return {
      kind: 'boosting',
      round: Number(boosting[1]),
      fold: Number(boosting[2]),
    };
  }
  return null;
};

const foldGroupCopy = (metadata: FoldStepMetadata) => {
  if (metadata.kind === 'weighted') {
    return {
      label: `权重 OOF · 第 ${metadata.fold} 折`,
      description: '本折按基础模型逐个拟合历史前缀并预测留出段；全部有效折完成后才统一计算融合权重。',
    };
  }
  if (metadata.kind === 'stacking') {
    return {
      label: `Level-1 OOF · 第 ${metadata.fold} 折`,
      description: '本折按基础模型逐个生成 Level-1 特征；全部有效折完成后才合并矩阵并拟合 NNLS 元模型。',
    };
  }
  return {
    label: `第 ${metadata.fold} 折候选`,
    description: '本折按候选模型逐个拟合当前残差；本轮全部有效折完成后才统一求阶段系数并选择胜出模型。',
  };
};

const buildFoldStepItems = (steps: GuidedTrainingStep[]): StepDisplayItem[] => {
  const handled = new Set<string>();
  const items: StepDisplayItem[] = [];

  for (const step of steps) {
    if (handled.has(step.id)) continue;
    const metadata = parseFoldStep(step.id);
    if (!metadata) {
      items.push({ kind: 'step', step });
      continue;
    }

    const groupedSteps = steps.filter((candidate) => {
      const candidateMetadata = parseFoldStep(candidate.id);
      return candidateMetadata?.kind === metadata.kind
        && candidateMetadata.fold === metadata.fold
        && candidateMetadata.round === metadata.round;
    });
    groupedSteps.forEach((candidate) => handled.add(candidate.id));
    const copy = foldGroupCopy(metadata);
    items.push({
      kind: 'group',
      group: {
        id: `${metadata.kind}-round-${metadata.round ?? 0}-fold-${metadata.fold}`,
        kind: 'fold',
        label: copy.label,
        description: copy.description,
        steps: groupedSteps,
      },
    });
  }
  return items;
};

const buildStepDisplayItems = (session: GuidedTrainingSession): StepDisplayItem[] => {
  if (session.model_type !== 'boosting') {
    return buildFoldStepItems(session.steps);
  }

  const handled = new Set<string>();
  const items: StepDisplayItem[] = [];
  for (const step of session.steps) {
    if (handled.has(step.id)) continue;
    const roundMatch = step.id.match(/^round_(\d+)_/);
    if (!roundMatch) {
      items.push({ kind: 'step', step });
      continue;
    }

    const round = Number(roundMatch[1]);
    const roundSteps = session.steps.filter((candidate) => candidate.id.startsWith(`round_${round}_`));
    roundSteps.forEach((candidate) => handled.add(candidate.id));
    items.push({
      kind: 'group',
      group: {
        id: `boosting-round-${round}`,
        kind: 'round',
        label: `第 ${round} 轮：候选评估与选择`,
        description: '候选先按滚动折分别执行并保存检查点；所有有效折完成后，系统汇总 OOF 残差、计算非负阶段系数并选择本轮胜出模型。',
        steps: roundSteps,
      },
    });
  }
  return items;
};

const getGroupStatus = (steps: GuidedTrainingStep[]): GuidedTrainingStep['status'] => {
  if (steps.some((step) => step.status === 'failed')) return 'failed';
  if (steps.some((step) => step.status === 'active')) return 'active';
  if (steps.every((step) => step.status === 'completed')) return 'completed';
  if (steps.some((step) => step.status === 'completed')) return 'active';
  return 'pending';
};

const statusLabel = (status: GuidedTrainingStep['status'], skipped = false) => {
  if (skipped) return '已跳过';
  if (status === 'completed') return '已完成';
  if (status === 'active') return '当前阶段';
  if (status === 'failed') return '失败';
  return '未开始';
};

const statusBadgeClass = (status: GuidedTrainingStep['status'], skipped = false) => {
  if (skipped) return 'bg-gray-100 text-gray-600';
  if (status === 'completed') return 'bg-green-100 text-green-700';
  if (status === 'active') return 'bg-blue-100 text-blue-700';
  if (status === 'failed') return 'bg-red-100 text-red-700';
  return 'bg-gray-100 text-gray-600';
};

const StepMarker: React.FC<{ step: GuidedTrainingStep; isLoading: boolean }> = ({ step, isLoading }) => {
  const skipped = isSkippedStep(step);
  const markerClass = skipped
    ? 'bg-gray-100 text-gray-500'
    : step.status === 'completed'
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
      ) : step.status === 'completed' && !skipped ? (
        <CheckCircle2 className="h-4 w-4" />
      ) : step.status === 'failed' ? (
        <AlertCircle className="h-4 w-4" />
      ) : (
        <Circle className="h-4 w-4" />
      )}
    </div>
  );
};

const StepCard: React.FC<{ step: GuidedTrainingStep; isLoading: boolean; nested?: boolean }> = ({
  step,
  isLoading,
  nested = false,
}) => {
  const rows = outputRows(step.output);
  const skipped = isSkippedStep(step);
  return (
    <div
      data-testid={`guided-training-step-${step.id}`}
      className={`rounded-lg border p-4 ${nested ? 'border-gray-100 bg-white' : 'border-gray-200 bg-white shadow-sm'} ${skipped ? 'opacity-80' : ''}`}
    >
      <div className="flex gap-3">
        <StepMarker step={step} isLoading={isLoading} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-gray-900">{step.label}</p>
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(step.status, skipped)}`}>
              {statusLabel(step.status, skipped)}
            </span>
          </div>
          <p className="mt-1 text-sm leading-6 text-gray-600">{step.description}</p>
          {skipped && (
            <p className="mt-2 text-xs leading-5 text-gray-500">
              当前数据只生成了较少的有效滚动折，本预留折无需训练，且不参与后续汇总。
            </p>
          )}
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
    </div>
  );
};

const StepGroupCard: React.FC<{
  group: StepDisplayGroup;
  isLoading: boolean;
  activeStepId: string | null;
  nested?: boolean;
}> = ({ group, isLoading, activeStepId, nested = false }) => {
  const derivedStatus = getGroupStatus(group.steps);
  const containsCurrentStep = group.steps.some((step) => step.id === activeStepId);
  const status = derivedStatus === 'pending' && containsCurrentStep ? 'active' : derivedStatus;
  const completedCount = group.steps.filter((step) => step.status === 'completed').length;
  const skippedCount = group.steps.filter(isSkippedStep).length;
  const shouldOpen = group.steps.some((step) => (
    step.id === activeStepId || step.status === 'active' || step.status === 'failed'
  ));
  const childItems = group.kind === 'round'
    ? buildFoldStepItems(group.steps)
    : group.steps.map<StepDisplayItem>((step) => ({ kind: 'step', step }));

  return (
    <details
      data-testid={`guided-training-group-${group.id}`}
      open={shouldOpen}
      className={`rounded-lg border bg-white ${nested ? 'border-gray-200' : 'border-purple-200 shadow-sm'}`}
    >
      <summary className="group flex cursor-pointer list-none items-start gap-3 p-4 marker:content-none">
        <div className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full ${status === 'completed' ? 'bg-green-100 text-green-700' : status === 'active' ? 'bg-blue-100 text-blue-700' : status === 'failed' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-500'}`}>
          {status === 'completed' ? <CheckCircle2 className="h-4 w-4" /> : status === 'failed' ? <AlertCircle className="h-4 w-4" /> : <ChevronRight className="h-4 w-4 transition-transform group-open:rotate-90" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-gray-900">{group.label}</p>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
              {completedCount}/{group.steps.length} 个步骤
            </span>
            {skippedCount > 0 && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
                已跳过 {skippedCount} 个
              </span>
            )}
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusBadgeClass(status)}`}>
              {statusLabel(status)}
            </span>
          </div>
          <p className="mt-1 text-sm leading-6 text-gray-600">{group.description}</p>
        </div>
      </summary>
      <div className="space-y-3 border-t border-gray-100 bg-gray-50/70 p-3 sm:p-4">
        {childItems.map((item) => item.kind === 'step' ? (
          <StepCard key={item.step.id} step={item.step} isLoading={isLoading} nested />
        ) : (
          <StepGroupCard
            key={item.group.id}
            group={item.group}
            isLoading={isLoading}
            activeStepId={activeStepId}
            nested
          />
        ))}
      </div>
    </details>
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
  const displayItems = useMemo(
    () => session ? buildStepDisplayItems(session) : [],
    [session],
  );
  const hasFoldCheckpoints = useMemo(
    () => session?.steps.some((step) => parseFoldStep(step.id) !== null) ?? false,
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

      {session && hasFoldCheckpoints && (
        <div
          data-testid="fold-checkpoint-explanation"
          className="rounded-lg border border-purple-200 bg-purple-50 p-4 text-sm leading-6 text-purple-950"
        >
          <span className="font-semibold">滚动折检查点：</span>
          每个基础模型会在每个有效滚动折上单独执行并保存结果。单折输出不代表最终权重、元模型系数或 Boosting
          阶段系数；系统会在该组全部有效折完成后统一汇总。流程最多预留三折，样本不足时多余步骤会标记为“已跳过”。
        </div>
      )}

      {session && (
        <div className="space-y-3">
          {displayItems.map((item) => item.kind === 'step' ? (
            <StepCard key={item.step.id} step={item.step} isLoading={isLoading} />
          ) : (
            <StepGroupCard
              key={item.group.id}
              group={item.group}
              isLoading={isLoading}
              activeStepId={activeStep?.id ?? null}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default GuidedTrainingPanel;
