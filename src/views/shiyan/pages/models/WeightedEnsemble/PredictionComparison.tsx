import React from 'react';
import PredictionResultsTable from '../components/PredictionResultsTable';

export interface PredictionComparisonProps {
  data: {
    predictions: { date: string; actual: number; predicted: number | null }[];
  } | null;
}

const PredictionComparison: React.FC<PredictionComparisonProps> = ({ data }) => {
  if (!data) {
    return <p>没有可用的结果。</p>;
  }

  return (
    <PredictionResultsTable
      title="加权平均融合 - 计算结果"
      predictions={data.predictions}
      showAccuracy={true}
    />
  );
};

export default PredictionComparison;
