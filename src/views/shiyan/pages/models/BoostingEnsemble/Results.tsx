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
    <div>
      <h3 className="text-lg font-semibold mb-4">Boosting 融合 - 计算结果</h3>
      
      <div className="grid grid-cols-3 gap-4 mb-6 text-center">
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-700">RMSE</p>
          <p className="text-2xl font-bold text-blue-900">{data.metrics.rmse.toFixed(2)}</p>
        </div>
        <div className="p-4 bg-green-50 rounded-lg">
          <p className="text-sm text-green-700">MAE</p>
          <p className="text-2xl font-bold text-green-900">{data.metrics.mae.toFixed(2)}</p>
        </div>
        <div className="p-4 bg-indigo-50 rounded-lg">
          <p className="text-sm text-indigo-700">R²</p>
          <p className="text-2xl font-bold text-indigo-900">{data.metrics.r2.toFixed(2)}</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">日期</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">实际值</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500">预测值</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.predictions.map((row, index) => (
              <tr key={index}>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{row.date}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">{row.actual}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">{row.predicted?.toFixed(2) ?? 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Results;
