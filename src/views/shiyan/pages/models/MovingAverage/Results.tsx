import React from 'react';
import { Loader2 } from 'lucide-react';
import PredictionResultsTable from '../components/PredictionResultsTable';

export interface ResultsProps {
  data: {
    predictions: { date: string; actual: number; predicted: number | null }[];
    metrics: { rmse: number; mae: number; r2: number };
  } | null;
  isLoading: boolean;
  error: string | null;
}

const Results: React.FC<ResultsProps> = ({ data, isLoading, error }) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="ml-4 text-gray-600">正在计算...</p>
      </div>
    );
  }

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  if (!data) {
    return <p>没有可用的结果。</p>;
  }

  return (
    <PredictionResultsTable
      title="移动平均法 - 计算结果"
      predictions={data.predictions}
    />
  );
};

export default Results;
