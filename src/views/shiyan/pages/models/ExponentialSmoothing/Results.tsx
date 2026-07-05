import React, { useState } from 'react';
import PredictionResultsTable from '../components/PredictionResultsTable';
import PredictionChart from '../components/PredictionChart';
import GuidedTrainingPanel from '../components/GuidedTrainingPanel';
import type { ModelJobProgressEvent } from '../hooks/useModelJob';
import type { GuidedTrainingSession } from '../../../services/guidedTraining';

export interface ResultsProps {
  data: {
    predictions: { date: string; actual: number; predicted: number | null }[];
    metrics: { rmse: number; mae: number; r2: number };
  } | null;
  guidedSession?: GuidedTrainingSession | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onInitialize?: () => void;
  onRunNextStep?: () => void;
  currentProgress?: ModelJobProgressEvent | null;
  progressEvents?: ModelJobProgressEvent[];
}

const Results: React.FC<ResultsProps> = ({
  data,
  guidedSession,
  isLoading,
  error,
  onRetry,
  onInitialize,
  onRunNextStep,
}) => {
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');

  if (!data) {
    return (
      <GuidedTrainingPanel
        title="指数平滑法 - 分阶段训练"
        session={guidedSession ?? null}
        isLoading={isLoading}
        error={error}
        onInitialize={onInitialize ?? (() => {})}
        onRunNextStep={onRunNextStep ?? (() => {})}
        onRetry={onRetry}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button
          onClick={() => setViewMode('table')}
          className={`px-4 py-2 text-sm font-medium rounded-l-lg ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          表格
        </button>
        <button
          onClick={() => setViewMode('chart')}
          className={`px-4 py-2 text-sm font-medium rounded-r-lg ${viewMode === 'chart' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          图表
        </button>
      </div>

      {viewMode === 'table' ? (
        <PredictionResultsTable
          title="指数平滑法 - 计算结果"
          predictions={data.predictions}
        />
      ) : (
        <PredictionChart data={data.predictions} />
      )}
    </div>
  );
};

export default Results;
