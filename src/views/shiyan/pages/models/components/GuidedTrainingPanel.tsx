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
  aic: 'AIC',
  alpha: '平滑系数',
  batch_size: '批大小',
  boost_train_size: '残差训练样本',
  boost_val_size: '残差验证样本',
  best_order: '最优阶数',
  bic: 'BIC',
  candidates: '候选模型误差',
  converged: '是否收敛',
  coefficient: '阶段系数',
  d: '差分阶数',
  data_points: '数据点数',
  early_stopped: '是否早停',
  effective_train_size: '差分后样本数',
  encoded_feature_count: '编码后特征数',
  epochs: '训练轮数',
  epochs_ran: '实际轮数',
  epochs_requested: '计划轮数',
  evaluate_months: '评估月份',
  evaluate_size: '评估样本数',
  evaluated_points: '评估点数',
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
  level0_size: 'Level-0 样本',
  level1_size: 'Level-1 样本',
  level: '平滑水平',
  learning_rate: '学习率',
  look_back: '回看窗口',
  lower: '下界',
  mae: 'MAE',
  mape: 'MAPE',
  max_p: '最大 p',
  max_q: '最大 q',
  max_rounds: '最大轮数',
  mean_residual: '平均残差',
  model_chain: '模型链',
  models: '基础模型',
  metrics: '误差指标',
  normalization: '归一化方式',
  order: '模型阶数',
  predicted: '预测值',
  predicted_points: '预测点数',
  preview: '结果预览',
  r2: 'R²',
  residual_points: '残差点数',
  residual_mse: '残差 MSE',
  rmse: 'RMSE',
  round: '轮次',
  reused_artifacts: '复用产物',
  selection_criterion: '选择依据',
  saved_model: '模型产物',
  std_dev_residuals: '残差波动',
  stage_count: '阶段数',
  stage_eval: '阶段评估',
  target_key: '目标字段',
  target_shape: '标签形状',
  train_size: '训练样本数',
  upper: '上界',
  weight_train_size: '权重训练样本',
  weight_val_size: '权重验证样本',
  weights: '融合权重',
  winner: '胜出模型',
  winner_rmse: '胜出 RMSE',
  window: '窗口长度',
  window_values: '窗口数据',
};

const formatKey = (key: string) => outputKeyLabels[key] ?? key;

interface GuidedTrainingPanelProps {
  session: GuidedTrainingSession | null;
  isLoading: boolean;
  error: string | null;
  onInitialize: () => void;
  onRunNextStep: () => void;
  onRetry: () => void;
  title: string;
}

const formatValue = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'number') {
    return Number.isInteger(value) ? String(value) : value.toFixed(4);
  }
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'boolean') {
    return value ? '是' : '否';
  }
  if (Array.isArray(value)) {
    return value.slice(0, 4).map(formatValue).filter(Boolean).join('、');
  }
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return Object.entries(record)
      .slice(0, 4)
      .map(([key, item]) => `${formatKey(key)}: ${formatValue(item)}`)
      .join('；');
  }
  return String(value);
};

const outputRows = (output: unknown) => {
  if (!output || typeof output !== 'object' || Array.isArray(output)) {
    return [];
  }

  return Object.entries(output as Record<string, unknown>)
    .map(([key, value]) => ({ key, label: formatKey(key), value: formatValue(value) }))
    .filter((row) => row.value.length > 0)
    .slice(0, 6);
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
                            <dd className="mt-1 truncate text-gray-800" title={row.value}>{row.value}</dd>
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
