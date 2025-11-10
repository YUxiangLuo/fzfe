import React from 'react';
import { Loader2 } from 'lucide-react';

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
        <p className="ml-4 text-gray-600">正在加载结果...</p>
      </div>
    );
  }

  if (error) {
    return <p className="text-red-500">{error}</p>;
  }

  if (!data) {
    return <p>没有可用的结果。</p>;
  }

  const calculateAccuracy = (actual: number, predicted: number | null): string => {
    if (predicted === null || actual === 0) return 'N/A';
    const accuracy = (1 - Math.abs(actual - predicted) / Math.abs(actual)) * 100;
    return `${accuracy.toFixed(2)}%`;
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">指数平滑法 - 计算结果</h3>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">日期</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">真实值</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">预测值</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">预测准确率</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.predictions.map((row, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{row.date}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{row.actual}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{row.predicted !== null ? row.predicted.toFixed(2) : 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">{calculateAccuracy(row.actual, row.predicted)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Results;
