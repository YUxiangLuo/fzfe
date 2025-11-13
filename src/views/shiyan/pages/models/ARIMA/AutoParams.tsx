import React from 'react';
import CalculationStatus from '../components/CalculationStatus';

interface AutoParamsProps {
  view: 'params' | 'results';
  data: {
    predictions: { date: string; actual: number; predicted: number | null }[];
    metrics: { rmse: number; mae: number; r2: number };
    order: { p: number; d: number; q: number };
  } | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
}

const AutoParams: React.FC<AutoParamsProps> = ({ view, data, isLoading, error, onRetry }) => {
  const calculateAccuracy = (actual: number, predicted: number | null): string => {
    if (predicted === null || actual === 0) return 'N/A';
    const accuracy = (1 - Math.abs(actual - predicted) / Math.abs(actual)) * 100;
    return `${accuracy.toFixed(2)}%`;
  };

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

  // View 1: Parameters table (p, d, q)
  if (view === 'params') {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-2xl font-bold text-gray-800 mb-4">ARIMA 法 - 自动参数寻优计算</h3>
        </div>

        <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200 shadow-sm">
          <h4 className="text-lg font-semibold text-gray-800 mb-4">最佳模型参数</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 bg-white rounded-lg shadow-sm">
              <thead className="bg-gradient-to-r from-blue-50 to-indigo-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 border-b-2 border-blue-200">
                    AR参数 p
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 border-b-2 border-blue-200">
                    差分阶数 d
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 border-b-2 border-blue-200">
                    MA参数 q
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                <tr className="hover:bg-blue-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-base font-semibold text-blue-600">
                    {data.order.p}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-base font-semibold text-indigo-600">
                    {data.order.d}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-base font-semibold text-purple-600">
                    {data.order.q}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-base text-gray-700">
            最佳模型: <span className="font-bold text-blue-700">ARIMA({data.order.p}, {data.order.d}, {data.order.q})</span>
          </p>
        </div>
      </div>
    );
  }

  // View 2: Predictions table (date, actual, predicted, accuracy)
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-800 mb-4">ARIMA 法 - 预测结果</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 bg-white rounded-lg shadow-sm">
          <thead className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 border-b-2 border-blue-200">
                日期
              </th>
              <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 border-b-2 border-blue-200">
                真实值
              </th>
              <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 border-b-2 border-blue-200">
                预测值
              </th>
              <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 border-b-2 border-blue-200">
                预测准确率
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {data.predictions.map((row, index) => (
              <tr key={index} className="hover:bg-blue-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-base text-gray-700">
                  {row.date}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900 font-medium">
                  {row.actual}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-base text-blue-600 font-semibold">
                  {row.predicted?.toFixed(2) ?? 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-base text-green-600 font-medium">
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

export default AutoParams;
