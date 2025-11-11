import React from 'react';

interface Prediction {
  date: string;
  actual: number;
  predicted: number | null;
}

interface PredictionResultsTableProps {
  title: string;
  predictions: Prediction[];
  showAccuracy?: boolean;
}

const PredictionResultsTable: React.FC<PredictionResultsTableProps> = ({
  title,
  predictions,
  showAccuracy = true,
}) => {
  const calculateAccuracy = (actual: number, predicted: number | null): string => {
    if (predicted === null || actual === 0) return 'N/A';
    const accuracy = (1 - Math.abs(actual - predicted) / Math.abs(actual)) * 100;
    return `${accuracy.toFixed(2)}%`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-800 mb-3">{title}</h3>
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
              {showAccuracy && (
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 border-b-2 border-blue-200">
                  预测准确率
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {predictions.map((row) => (
              <tr key={row.date} className="hover:bg-blue-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-base text-gray-700">
                  {row.date}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900 font-medium">
                  {row.actual}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-base text-blue-600 font-semibold">
                  {row.predicted !== null ? row.predicted.toFixed(2) : 'N/A'}
                </td>
                {showAccuracy && (
                  <td className="px-6 py-4 whitespace-nowrap text-base text-green-600 font-semibold">
                    {calculateAccuracy(row.actual, row.predicted)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default PredictionResultsTable;
