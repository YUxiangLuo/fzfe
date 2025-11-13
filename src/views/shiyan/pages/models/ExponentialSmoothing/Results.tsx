import React from 'react';
import PredictionResultsTable from '../components/PredictionResultsTable';
import CalculationStatus from '../components/CalculationStatus';

export interface ResultsProps {
  data: {
    predictions: { date: string; actual: number; predicted: number | null }[];
    metrics: { rmse: number; mae: number; r2: number };
  } | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

const Results: React.FC<ResultsProps> = ({ data, isLoading, error, onRetry }) => {
  const status = <CalculationStatus isLoading={isLoading} error={error} onRetry={onRetry} />;
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
    <>
      {status}
      <PredictionResultsTable
        title="指数平滑法 - 计算结果"
        predictions={data.predictions}
      />
    </>
  );
};

export default Results;
