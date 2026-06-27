import React, { useEffect, useMemo, useState } from 'react';
import Button from '../../../shared/components/common/Button';
import {
  AlertCircle,
  CheckCircle2,
  Circle,
  Clock,
  Loader2,
  Sparkles,
} from 'lucide-react';
import {
  getTrainingProgressProfile,
  type ModelProgressProfileKey,
  type TrainingProgressProfile,
} from './modelTrainingProgress';
import type { ModelJobProgressEvent } from '../hooks/useModelJob';

interface CalculationStatusProps {
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  isRetryable?: boolean;
  isEnsembleModel?: boolean;
  modelType?: ModelProgressProfileKey;
  progressProfile?: TrainingProgressProfile;
  currentProgress?: ModelJobProgressEvent | null;
  progressEvents?: ModelJobProgressEvent[];
}

const ACCENT_CLASSES: Record<TrainingProgressProfile['accent'], {
  container: string;
  icon: string;
  bar: string;
  activeDot: string;
  activeRing: string;
  completedDot: string;
  badge: string;
}> = {
  blue: {
    container: 'from-blue-50 via-white to-cyan-50 border-blue-200',
    icon: 'bg-blue-600 text-white shadow-blue-200',
    bar: 'from-blue-500 to-cyan-500',
    activeDot: 'bg-blue-600 text-white',
    activeRing: 'ring-blue-200',
    completedDot: 'bg-blue-100 text-blue-700',
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  indigo: {
    container: 'from-indigo-50 via-white to-blue-50 border-indigo-200',
    icon: 'bg-indigo-600 text-white shadow-indigo-200',
    bar: 'from-indigo-500 to-blue-500',
    activeDot: 'bg-indigo-600 text-white',
    activeRing: 'ring-indigo-200',
    completedDot: 'bg-indigo-100 text-indigo-700',
    badge: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  },
  purple: {
    container: 'from-purple-50 via-white to-fuchsia-50 border-purple-200',
    icon: 'bg-purple-600 text-white shadow-purple-200',
    bar: 'from-purple-500 to-fuchsia-500',
    activeDot: 'bg-purple-600 text-white',
    activeRing: 'ring-purple-200',
    completedDot: 'bg-purple-100 text-purple-700',
    badge: 'bg-purple-100 text-purple-700 border-purple-200',
  },
  emerald: {
    container: 'from-emerald-50 via-white to-teal-50 border-emerald-200',
    icon: 'bg-emerald-600 text-white shadow-emerald-200',
    bar: 'from-emerald-500 to-teal-500',
    activeDot: 'bg-emerald-600 text-white',
    activeRing: 'ring-emerald-200',
    completedDot: 'bg-emerald-100 text-emerald-700',
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  amber: {
    container: 'from-amber-50 via-white to-orange-50 border-amber-200',
    icon: 'bg-amber-600 text-white shadow-amber-200',
    bar: 'from-amber-500 to-orange-500',
    activeDot: 'bg-amber-600 text-white',
    activeRing: 'ring-amber-200',
    completedDot: 'bg-amber-100 text-amber-700',
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
  },
};

const DEFAULT_STEP_DURATION_MS = 2600;
const TICK_INTERVAL_MS = 650;

const getTotalWeight = (profile: TrainingProgressProfile) =>
  profile.steps.reduce((sum, step) => sum + (step.weight ?? 1), 0);

const getProgressSnapshot = (profile: TrainingProgressProfile, elapsedMs: number) => {
  const totalWeight = getTotalWeight(profile);
  const totalDurationMs = Math.max(profile.steps.length * DEFAULT_STEP_DURATION_MS, totalWeight * 1900);
  const elapsedWeight = Math.min(totalWeight * 0.95, (elapsedMs / totalDurationMs) * totalWeight);

  let cumulativeWeight = 0;
  let activeStepIndex = profile.steps.length - 1;
  for (let index = 0; index < profile.steps.length; index += 1) {
    cumulativeWeight += profile.steps[index]?.weight ?? 1;
    if (elapsedWeight <= cumulativeWeight) {
      activeStepIndex = index;
      break;
    }
  }

  const percent = Math.max(4, Math.min(95, Math.round((elapsedWeight / totalWeight) * 100)));
  return { activeStepIndex, percent };
};

const getStepIndexForPercent = (profile: TrainingProgressProfile, percent: number) => {
  const clampedPercent = Math.max(0, Math.min(100, percent));
  if (clampedPercent >= 100) {
    return profile.steps.length;
  }

  const totalWeight = getTotalWeight(profile);
  const progressWeight = (clampedPercent / 100) * totalWeight;
  let cumulativeWeight = 0;

  for (let index = 0; index < profile.steps.length; index += 1) {
    cumulativeWeight += profile.steps[index]?.weight ?? 1;
    if (progressWeight <= cumulativeWeight) {
      return index;
    }
  }

  return Math.max(0, profile.steps.length - 1);
};

const TrainingProgressPanel: React.FC<{
  profile: TrainingProgressProfile;
  currentProgress?: ModelJobProgressEvent | null;
  progressEvents?: ModelJobProgressEvent[];
}> = ({ profile, currentProgress, progressEvents = [] }) => {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    setElapsedMs(0);
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      setElapsedMs(Date.now() - startedAt);
    }, TICK_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [profile]);

  const { activeStepIndex, percent } = useMemo(
    () => getProgressSnapshot(profile, elapsedMs),
    [elapsedMs, profile],
  );
  const accent = ACCENT_CLASSES[profile.accent];
  const displayPercent = typeof currentProgress?.percent === 'number'
    ? Math.max(2, Math.min(100, Math.round(currentProgress.percent)))
    : percent;
  const displayStepIndex = typeof currentProgress?.percent === 'number'
    ? getStepIndexForPercent(profile, displayPercent)
    : activeStepIndex;
  const activeStep = profile.steps[Math.min(displayStepIndex, profile.steps.length - 1)] ?? profile.steps[0];
  const progressLabel = currentProgress
    ? currentProgress.source === 'python'
      ? '后端日志'
      : '后端状态'
    : '预计阶段';
  const progressMessage = currentProgress?.message ?? activeStep?.description;

  return (
    <div
      className={`rounded-2xl border-2 bg-gradient-to-br p-6 shadow-sm ${accent.container}`}
      role="status"
      aria-live="polite"
      data-testid="training-progress-panel"
    >
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex flex-1 gap-4">
          <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl shadow-lg ${accent.icon}`}>
            <Loader2 className="h-7 w-7 animate-spin" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h4 className="text-xl font-bold text-gray-900">{profile.title}</h4>
              <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${accent.badge}`}>
                <Clock className="h-3.5 w-3.5" />
                {profile.estimate}
              </span>
            </div>
            <p className="mt-2 text-base leading-7 text-gray-700">{profile.subtitle}</p>
            <div className="mt-4 rounded-xl border border-white/70 bg-white/80 p-4 shadow-sm">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-semibold text-gray-700">{progressLabel}：{currentProgress ? currentProgress.message : activeStep?.label}</span>
                <span className="font-bold text-gray-700">{currentProgress ? '实时' : '预计'} {displayPercent}%</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-gray-200">
                <div
                  className={`h-full rounded-full bg-gradient-to-r transition-all duration-700 ease-out ${accent.bar}`}
                  style={{ width: `${displayPercent}%` }}
                />
              </div>
              <p className="mt-3 text-sm leading-6 text-gray-600">{progressMessage}</p>
              {progressEvents.length > 0 && (
                <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50/80 p-3">
                  <div className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-500">实时训练日志</div>
                  <div className="max-h-32 space-y-1 overflow-y-auto pr-1">
                    {progressEvents.slice(-5).map((event, index) => (
                      <p key={`${event.timestamp ?? 'event'}-${index}`} className="text-xs leading-5 text-gray-600">
                        <span className="font-semibold text-gray-700">{event.source === 'python' ? 'Python' : '后端'}：</span>
                        {event.message}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="w-full rounded-xl border border-white/70 bg-white/80 p-4 shadow-sm lg:w-96">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-800">
            <Sparkles className="h-4 w-4 text-amber-500" />
            后端训练流程
          </div>
          <ol className="space-y-3">
            {profile.steps.map((step, index) => {
              const isCompleted = displayStepIndex >= profile.steps.length || index < displayStepIndex;
              const isActive = displayStepIndex < profile.steps.length && index === displayStepIndex;
              const stepState = isCompleted ? 'completed' : isActive ? 'active' : 'pending';
              return (
                <li key={`${step.label}-${index}`} className="flex gap-3">
                  <div
                    data-testid="training-step-status"
                    data-state={stepState}
                    className={`mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${
                      isCompleted
                        ? accent.completedDot
                        : isActive
                          ? `${accent.activeDot} ring-4 ${accent.activeRing}`
                          : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : isActive ? (
                      <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
                    ) : (
                      <Circle className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${isActive ? 'text-gray-900' : 'text-gray-700'}`}>
                      {step.label}
                    </p>
                    <p className="text-xs leading-5 text-gray-500">{step.description}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      <div className="mt-5 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/80 p-3 text-sm text-gray-700">
        <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
        <p>
          <span className="font-semibold text-amber-700">温馨提示：</span>
          {profile.tip ?? '动画会按模型训练流程推进，训练完成后自动展示真实结果。训练期间请保持当前页面打开，不要刷新或切换到其他实验步骤。'}
        </p>
      </div>
    </div>
  );
};

/**
 * A shared component to display the status of a calculation.
 * It handles showing an animated training process, an error message with a retry button,
 * or nothing if the calculation is not running and has no errors.
 */
const CalculationStatus: React.FC<CalculationStatusProps> = ({
  isLoading,
  error,
  onRetry,
  isRetryable = true,
  isEnsembleModel = false,
  modelType,
  progressProfile,
  currentProgress,
  progressEvents,
}) => {
  if (isLoading) {
    const profile = progressProfile ?? getTrainingProgressProfile(modelType, isEnsembleModel);
    return (
      <TrainingProgressPanel
        profile={profile}
        currentProgress={currentProgress}
        progressEvents={progressEvents}
      />
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-red-300 bg-red-50 p-4 text-red-700">
        <p className="font-semibold">{isRetryable ? '计算失败' : '提示'}</p>
        <p className="mb-2">{error}</p>
        {isRetryable && (
          <Button onClick={onRetry} variant="outline" size="sm">
            重试
          </Button>
        )}
      </div>
    );
  }

  return null;
};

export default CalculationStatus;
