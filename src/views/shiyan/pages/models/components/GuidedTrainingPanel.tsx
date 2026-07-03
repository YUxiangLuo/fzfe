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
      .map(([key, item]) => `${key}: ${formatValue(item)}`)
      .join('；');
  }
  return String(value);
};

const outputRows = (output: unknown) => {
  if (!output || typeof output !== 'object' || Array.isArray(output)) {
    return [];
  }

  return Object.entries(output as Record<string, unknown>)
    .map(([key, value]) => ({ key, value: formatValue(value) }))
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
          系统会把真实训练过程拆成多个阶段，每个阶段执行完成后展示关键证据，再进入下一阶段。
        </p>
        <Button onClick={onInitialize} disabled={isLoading} className="mt-4">
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          准备分阶段训练
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
              <p className="font-semibold">训练阶段执行失败</p>
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
                            ? '待执行'
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
                            <dt className="text-xs font-semibold uppercase text-gray-500">{row.key}</dt>
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
