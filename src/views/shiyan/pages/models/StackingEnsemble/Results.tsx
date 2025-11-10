import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ResultsProps {
  data: {
    predictions: { date: string; actual: number; predicted: number | null }[];
    metrics: { rmse: number; mae: number; r2: number };
    meta_model: { intercept: number; coefficients: number[] };
  } | null;
  isLoading: boolean;
  error: string | null;
}

const Results: React.FC<ResultsProps> = ({ data, isLoading, error }) => {
  const calculateAccuracy = (actual: number, predicted: number | null): string => {
    if (predicted === null || actual === 0) return 'N/A';
    const accuracy = (1 - Math.abs(actual - predicted) / Math.abs(actual)) * 100;
    return `${accuracy.toFixed(2)}%`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="ml-4 text-gray-600">正在计算，请稍候...</p>
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
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-800 mb-3">Stacking 融合 - 计算结果</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 bg-white rounded-lg shadow-sm border border-gray-200">
          <thead className="bg-gradient-to-r from-teal-50 to-emerald-50">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 border-b-2 border-teal-200">
                日期
              </th>
              <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 border-b-2 border-teal-200">
                真实值
              </th>
              <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 border-b-2 border-teal-200">
                预测值
              </th>
              <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 border-b-2 border-teal-200">
                预测准确率
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {data.predictions.map((row, index) => (
              <tr key={index} className="hover:bg-teal-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-base text-gray-700">
                  {row.date}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900 font-medium">
                  {row.actual}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-base text-blue-600 font-semibold">
                  {row.predicted !== null ? row.predicted.toFixed(2) : 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-base text-green-600 font-semibold">
                  {calculateAccuracy(row.actual, row.predicted)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Results;
