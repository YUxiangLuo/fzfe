import React from 'react';

interface Prediction {
  date: string;
  actual: number;
  predicted: number | null;
  stdDev?: number;
}

interface PredictionResultsTableProps {
  title: string;
  predictions: Prediction[];
  showAccuracy?: boolean;
}

const calculateTeachingScore = (actual: number, predicted: number | null): number | null => {
  if (predicted === null || actual === 0) return null;
  return (1 - Math.abs(actual - predicted) / Math.abs(actual)) * 100;
};

const getTeachingScoreColor = (score: number | null): string => {
  if (score === null) return 'bg-gray-100 text-gray-600';
  if (score >= 85) return 'bg-green-50 text-green-700 font-semibold';
  if (score >= 70) return 'bg-blue-50 text-blue-700 font-semibold';
  if (score >= 60) return 'bg-yellow-50 text-yellow-700 font-semibold';
  return 'bg-red-50 text-red-700 font-semibold';
};

const PredictionResultsTable: React.FC<PredictionResultsTableProps> = ({
  title,
  predictions,
  showAccuracy = true,
}) => {
  const hasUncertainty = predictions.some(row => Number.isFinite(row.stdDev));

  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-bold text-gray-800">{title}</h3>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white shadow-sm">
          <thead className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <tr>
              {['日期', '真实值', '预测值'].map(label => (
                <th key={label} className="border-b-2 border-blue-200 px-6 py-4 text-left text-sm font-bold text-gray-700">
                  {label}
                </th>
              ))}
              {hasUncertainty && (
                <th className="border-b-2 border-blue-200 px-6 py-4 text-left text-sm font-bold text-gray-700">
                  预测标准差
                </th>
              )}
              {showAccuracy && (
                <th className="border-b-2 border-blue-200 px-6 py-4 text-left text-sm font-bold text-gray-700">
                  单期 1−APE（教学指标）
                </th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {predictions.map((row, index) => {
              const teachingScore = calculateTeachingScore(row.actual, row.predicted);
              return (
                <tr key={`${row.date}-${index}`} className="transition-colors hover:bg-blue-50">
                  <td className="whitespace-nowrap px-6 py-4 text-base text-gray-700">{row.date}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-base font-medium text-gray-900">{row.actual}</td>
                  <td className="whitespace-nowrap px-6 py-4 text-base font-semibold text-blue-600">
                    {row.predicted !== null ? row.predicted.toFixed(2) : 'N/A'}
                  </td>
                  {hasUncertainty && (
                    <td className="whitespace-nowrap px-6 py-4 text-base text-gray-700">
                      {Number.isFinite(row.stdDev) ? row.stdDev!.toFixed(2) : 'N/A'}
                    </td>
                  )}
                  {showAccuracy && (
                    <td className={`whitespace-nowrap px-6 py-4 text-base ${getTeachingScoreColor(teachingScore)}`}>
                      {teachingScore === null ? 'N/A' : `${teachingScore.toFixed(2)}%`}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showAccuracy && (
        <div className="rounded-xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 via-blue-50 to-cyan-50 p-5 text-sm text-gray-700 shadow-sm">
          <h4 className="font-bold text-gray-900">单期 1−APE 教学指标</h4>
          <p className="mt-2">
            计算式为 (1 − |真实值 − 预测值| / |真实值|) × 100%。它可能为负数；真实值为 0 时不定义并显示 N/A。
          </p>
          <p className="mt-2">
            85%、70%、60% 是本项目的教学参考分档，并非行业统一标准。模型整体表现请以 RMSE、MAE、MAPE 和 R² 为准。
          </p>
        </div>
      )}

      {hasUncertainty && (
        <p className="text-sm text-gray-600">
          预测标准差来自后端实际模型输出：ARIMA 会随预测步长变化，其他模型使用评估残差的样本标准差。
        </p>
      )}
    </div>
  );
};

export default PredictionResultsTable;
