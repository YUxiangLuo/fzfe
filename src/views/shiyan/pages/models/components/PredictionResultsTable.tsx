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

export const formatPredictionAccuracy = (
  actual: number,
  predicted: number | null,
): string => {
  if (predicted === null || actual === 0) return '不适用';
  const accuracy = (1 - Math.abs(actual - predicted) / Math.abs(actual)) * 100;
  return `${accuracy.toFixed(2)}%`;
};

export const getPredictionAccuracyClassName = (
  actual: number,
  predicted: number | null,
): string => {
  if (predicted === null || actual === 0) return 'bg-gray-100 text-gray-600';
  const accuracy = (1 - Math.abs(actual - predicted) / Math.abs(actual)) * 100;

  if (accuracy >= 85) return 'bg-green-50 text-green-700 font-semibold';
  if (accuracy >= 70) return 'bg-blue-50 text-blue-700 font-semibold';
  if (accuracy >= 60) return 'bg-yellow-50 text-yellow-700 font-semibold';
  return 'bg-red-50 text-red-700 font-semibold';
};

const PredictionResultsTable: React.FC<PredictionResultsTableProps> = ({
  title,
  predictions,
  showAccuracy = true,
}) => {
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
                  单点相对准确度（展示值）
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
                  <td className={`px-6 py-4 whitespace-nowrap text-base ${getPredictionAccuracyClassName(row.actual, row.predicted)}`}>
                    {formatPredictionAccuracy(row.actual, row.predicted)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showAccuracy && (
        <div className="mt-6 p-6 bg-gradient-to-br from-indigo-50 via-blue-50 to-cyan-50 rounded-xl border-2 border-indigo-200 shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-6 bg-indigo-600 rounded-full"></div>
            <h4 className="text-lg font-bold text-gray-800">单点相对准确度计算说明</h4>
          </div>

          <div className="flex flex-row gap-6">
            {/* 左侧：公式容器 */}
            <div className="flex-[3] bg-white rounded-lg p-5 border-l-4 border-indigo-500 shadow-sm flex items-center justify-center">
              <div className="space-y-4 w-full">
                {/* 主公式 */}
                <div className="text-center">
                  <div className="text-xl font-bold text-gray-800 leading-relaxed">
                    单点相对准确度 = (1 - <span className="text-indigo-600">误差绝对值</span> / |<span className="text-blue-600">实际需求量</span>|) × 100%
                  </div>
                </div>

                {/* 分隔线 */}
                <div className="border-t border-gray-200"></div>

                {/* 辅助说明 */}
                <div className="text-center">
                  <div className="text-sm text-gray-600 leading-relaxed">
                    其中：<span className="font-semibold text-indigo-600">误差绝对值</span> = |<span className="text-blue-600">实际需求量</span> - <span className="text-purple-600">预测需求量</span>|
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    这是由单点绝对百分比误差派生的页面展示值，不是训练或模型选择指标；当误差大于实际值绝对值时可为负数。实际需求量为0时无定义，表中显示“不适用”。
                  </div>
                </div>
              </div>
            </div>

            {/* 右侧：评价标准 */}
            <div className="flex-[2] bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
              <div className="text-sm font-semibold text-gray-700 mb-3">页面色带（非统计标准）</div>
              <div className="space-y-2">
                <div className="flex items-center p-2 bg-green-50 rounded border border-green-200">
                  <div className="flex-1">
                    <div className="text-sm font-bold text-green-700">≥ 85% <span className="text-xs font-normal text-green-600">相对误差较小</span></div>
                  </div>
                </div>
                <div className="flex items-center p-2 bg-blue-50 rounded border border-blue-200">
                  <div className="flex-1">
                    <div className="text-sm font-bold text-blue-700">70-85% <span className="text-xs font-normal text-blue-600">仅作显示分组</span></div>
                  </div>
                </div>
                <div className="flex items-center p-2 bg-yellow-50 rounded border border-yellow-200">
                  <div className="flex-1">
                    <div className="text-sm font-bold text-yellow-700">60-70% <span className="text-xs font-normal text-yellow-600">仅作显示分组</span></div>
                  </div>
                </div>
                <div className="flex items-center p-2 bg-red-50 rounded border border-red-200">
                  <div className="flex-1">
                    <div className="text-sm font-bold text-red-700">&lt; 60% <span className="text-xs font-normal text-red-600">相对误差较大</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PredictionResultsTable;
