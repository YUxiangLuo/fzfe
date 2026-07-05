import React, { useState } from 'react';
import PredictionResultsTable from '../components/PredictionResultsTable';
import GuidedTrainingPanel from '../components/GuidedTrainingPanel';
import PredictionChart from '../components/PredictionChart';
import type { GuidedTrainingSession } from '../../../services/guidedTraining';
import type { ModelJobProgressEvent } from '../hooks/useModelJob';

export interface ResultsProps {
  data: {
    predictions: { date: string; actual: number; predicted: number | null }[];
    metrics: { rmse: number; mae: number; r2: number };
  } | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  guidedSession?: GuidedTrainingSession | null;
  onInitialize: () => void;
  onRunNextStep: () => void;
  currentProgress?: ModelJobProgressEvent | null;
  progressEvents?: ModelJobProgressEvent[];
}

const Results: React.FC<ResultsProps> = ({
  data,
  isLoading,
  error,
  onRetry,
  guidedSession,
  onInitialize,
  onRunNextStep,
}) => {
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');

  const guidedPanel = (
    <GuidedTrainingPanel
      title="Boosting 融合 - 分阶段训练"
      session={guidedSession ?? null}
      isLoading={isLoading}
      error={error}
      onInitialize={onInitialize}
      onRunNextStep={onRunNextStep}
      onRetry={onRetry}
    />
  );

  if (!data) {
    return (
      <div className="space-y-6">
        {guidedPanel}
        <p className="text-sm text-gray-600">完成全部训练阶段后会显示预测结果。</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {guidedPanel}
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
          title="Boosting 融合 - 计算结果"
          predictions={data.predictions}
        />
      ) : (
        <PredictionChart data={data.predictions} />
      )}
    </div>
  );
};

export default Results;
