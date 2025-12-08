import React, { useState } from 'react';
import CalculationStatus from '../components/CalculationStatus';
import PredictionChart from '../components/PredictionChart';

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
  onShowInformationCriteriaInfo: () => void;
}

const AutoParams: React.FC<AutoParamsProps> = ({ view, data, isLoading, error, onRetry, onShowInformationCriteriaInfo }) => {
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');

  const calculateAccuracy = (actual: number, predicted: number | null): string => {
    if (predicted === null || actual === 0) return 'N/A';
    const accuracy = (1 - Math.abs(actual - predicted) / Math.abs(actual)) * 100;
    return `${accuracy.toFixed(2)}%`;
  };

  const getAccuracyColor = (actual: number, predicted: number | null): string => {
    if (predicted === null || actual === 0) return 'bg-gray-100 text-gray-600';
    const accuracy = (1 - Math.abs(actual - predicted) / Math.abs(actual)) * 100;

    if (accuracy >= 85) return 'bg-green-50 text-green-700 font-semibold';
    if (accuracy >= 70) return 'bg-blue-50 text-blue-700 font-semibold';
    if (accuracy >= 60) return 'bg-yellow-50 text-yellow-700 font-semibold';
    return 'bg-red-50 text-red-700 font-semibold';
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
      <div className="flex flex-col h-full">
        <div className="flex-1 space-y-6">
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
        <div>
          <button
            onClick={onShowInformationCriteriaInfo}
            className="px-5 py-2 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300 transition-colors text-sm"
          >
            信息准则函数法
          </button>
        </div>
      </div>
    );
  }

  // View 2: Predictions table (date, actual, predicted, accuracy)
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold text-gray-800">ARIMA 法 - 预测结果</h3>
        <div>
          <button
            onClick={() => setViewMode('table')}
            className={`px-4 py-2 text-sm font-medium rounded-l-lg ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            表格
          </button>
          <button
            onClick={() => setViewMode('chart')}
            className={`px-4 py-2 text-sm font-medium rounded-r-lg ${viewMode === 'chart' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
          >
            图表
          </button>
        </div>
      </div>

      {viewMode === 'table' ? (
        <>
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
                    <td className={`px-6 py-4 whitespace-nowrap text-base ${getAccuracyColor(row.actual, row.predicted)}`}>
                      {calculateAccuracy(row.actual, row.predicted)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-6 p-6 bg-gradient-to-br from-indigo-50 via-blue-50 to-cyan-50 rounded-xl border-2 border-indigo-200 shadow-md">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-6 bg-indigo-600 rounded-full"></div>
              <h4 className="text-lg font-bold text-gray-800">预测准确率计算说明</h4>
            </div>

            <div className="flex flex-row gap-6">
              {/* 左侧：公式容器 */}
              <div className="flex-[3] bg-white rounded-lg p-5 border-l-4 border-indigo-500 shadow-sm flex items-center justify-center">
                <div className="space-y-4 w-full">
                  {/* 主公式 */}
                  <div className="text-center">
                    <div className="text-xl font-bold text-gray-800 leading-relaxed">
                      预测准确率 = (1 - <span className="text-indigo-600">误差绝对值</span> / <span className="text-blue-600">实际需求量</span>) × 100%
                    </div>
                  </div>

                  {/* 分隔线 */}
                  <div className="border-t border-gray-200"></div>

                  {/* 辅助说明 */}
                  <div className="text-center">
                    <div className="text-sm text-gray-600 leading-relaxed">
                      其中：<span className="font-semibold text-indigo-600">误差绝对值</span> = |<span className="text-blue-600">实际需求量</span> - <span className="text-purple-600">预测需求量</span>|
                    </div>
                  </div>
                </div>
              </div>

              {/* 右侧：评价标准 */}
              <div className="flex-[2] bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
                <div className="text-sm font-semibold text-gray-700 mb-3">评价标准</div>
                <div className="space-y-2">
                  <div className="flex items-center p-2 bg-green-50 rounded border border-green-200">
                    <div className="flex-1">
                      <div className="text-sm font-bold text-green-700">≥ 85% <span className="text-xs font-normal text-green-600">优秀</span></div>
                    </div>
                  </div>
                  <div className="flex items-center p-2 bg-blue-50 rounded border border-blue-200">
                    <div className="flex-1">
                      <div className="text-sm font-bold text-blue-700">70-85% <span className="text-xs font-normal text-blue-600">良好</span></div>
                    </div>
                  </div>
                  <div className="flex items-center p-2 bg-yellow-50 rounded border border-yellow-200">
                    <div className="flex-1">
                      <div className="text-sm font-bold text-yellow-700">60-70% <span className="text-xs font-normal text-yellow-600">合格</span></div>
                    </div>
                  </div>
                  <div className="flex items-center p-2 bg-red-50 rounded border border-red-200">
                    <div className="flex-1">
                      <div className="text-sm font-bold text-red-700">&lt; 60% <span className="text-xs font-normal text-red-600">需改进</span></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        <PredictionChart data={data.predictions} />
      )}
    </div>
  );
};

export default AutoParams;
