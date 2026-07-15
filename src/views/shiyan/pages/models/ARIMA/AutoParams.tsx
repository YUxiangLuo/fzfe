import React, { useState } from 'react';
import PredictionChart from '../components/PredictionChart';
import PredictionResultsTable from '../components/PredictionResultsTable';
import GuidedTrainingPanel from '../components/GuidedTrainingPanel';
import type { ModelJobProgressEvent } from '../hooks/useModelJob';
import type { GuidedTrainingSession } from '../../../services/guidedTraining';

interface AutoParamsProps {
  view: 'params' | 'results';
  data: {
    predictions: { date: string; actual: number; predicted: number | null }[];
    metrics: { rmse: number; mae: number; r2: number };
    order: { p: number; d: number; q: number };
  } | null;
  guidedSession?: GuidedTrainingSession | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  onInitialize?: () => void;
  onRunNextStep?: () => void;
  onShowInformationCriteriaInfo: () => void;
  currentProgress?: ModelJobProgressEvent | null;
  progressEvents?: ModelJobProgressEvent[];
}

const AutoParams: React.FC<AutoParamsProps> = ({
  view,
  data,
  guidedSession,
  isLoading,
  error,
  onRetry,
  onInitialize,
  onRunNextStep,
  onShowInformationCriteriaInfo,
}) => {
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');

  const guidedPanel = (
    <GuidedTrainingPanel
      title="ARIMA 自动定阶 - 分阶段训练"
      session={guidedSession ?? null}
      isLoading={isLoading}
      error={error}
      onInitialize={onInitialize ?? (() => {})}
      onRunNextStep={onRunNextStep ?? (() => {})}
      onRetry={onRetry}
    />
  );

  if (!data) {
    return guidedPanel;
  }

  // View 1: Parameters table (p, d, q)
  if (view === 'params') {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 space-y-6">
          {guidedPanel}
          <div>
            <h3 className="text-2xl font-bold text-gray-800 mb-4">ARIMA 法 - 自动定阶结果</h3>
          </div>

          <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200 shadow-sm">
            <h4 className="text-lg font-semibold text-gray-800 mb-2">系统选定的模型参数</h4>
            <p className="mb-4 text-sm text-gray-700">
              差分阶数 d 来自上一页选择；系统根据差分后有效训练点数限制 p/q 范围，执行一次 AICc 目标的 stepwise 搜索，并检查优胜模型收敛与残差诊断。该过程不是穷举全部组合。
            </p>
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
              选定模型: <span className="font-bold text-blue-700">ARIMA({data.order.p}, {data.order.d}, {data.order.q})</span>
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
      {guidedPanel}
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
        <PredictionResultsTable
          title="ARIMA 法 - 预测明细与区间"
          predictions={data.predictions}
        />
      ) : (
        <PredictionChart data={data.predictions} />
      )}
    </div>
  );
};

export default AutoParams;
