import React, { useState } from 'react';
import PredictionResultsTable from '../components/PredictionResultsTable';
import PredictionChart from '../components/PredictionChart';

export interface PredictionComparisonProps {
  data: {
    predictions: { date: string; actual: number; predicted: number | null }[];
  } | null;
}

const PredictionComparison: React.FC<PredictionComparisonProps> = ({ data }) => {
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');

  if (!data) {
    return <p>没有可用的结果。</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold text-gray-800">加权平均融合 - 预测结果</h3>
        <div>
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
      </div>

      {viewMode === 'table' ? (
        <PredictionResultsTable
          title="加权平均融合 - 预测结果"
          predictions={data.predictions}
          showAccuracy={true}
        />
      ) : (
        <PredictionChart data={data.predictions} />
      )}
    </div>
  );
};

export default PredictionComparison;
