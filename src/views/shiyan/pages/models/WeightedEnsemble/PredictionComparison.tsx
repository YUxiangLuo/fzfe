import React from 'react';

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
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-800 mb-3">真实值与预测值对比</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 bg-white rounded-lg shadow-sm border border-gray-200">
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
                  {row.predicted !== null ? row.predicted.toFixed(2) : 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-5 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-gray-700 text-base leading-relaxed">
          上表展示了加权融合模型在评估集上的预测值与真实值的对比。预测值是通过各基础模型预测结果的加权平均计算得出。
        </p>
      </div>
    </div>
  );
};

export default PredictionComparison;
