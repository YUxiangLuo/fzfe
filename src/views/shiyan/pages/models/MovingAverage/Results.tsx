import React, { useState } from 'react';
import PredictionResultsTable from '../components/PredictionResultsTable';
import CalculationStatus from '../components/CalculationStatus';
import PredictionChart from '../components/PredictionChart';
import type { ModelJobProgressEvent } from '../hooks/useModelJob';

export interface ResultsProps {
  data: {
    predictions: { date: string; actual: number; predicted: number | null }[];
    metrics: { rmse: number; mae: number; r2: number };
  } | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  currentProgress?: ModelJobProgressEvent | null;
  progressEvents?: ModelJobProgressEvent[];
}

const Results: React.FC<ResultsProps> = ({ data, isLoading, error, onRetry, currentProgress, progressEvents }) => {
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');

  const status = <CalculationStatus isLoading={isLoading} error={error} onRetry={onRetry} modelType="ma" currentProgress={currentProgress} progressEvents={progressEvents} />;
  if (isLoading || error) {
    return status;
  }

  if (!data) {
    return (
      <div>
        {status}
        <p>没有可用的结果。</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {status}
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
          title="移动平均法 - 计算结果"
          predictions={data.predictions}
        />
      ) : (
        <PredictionChart data={data.predictions} />
      )}
    </div>
  );
};

export default Results;
