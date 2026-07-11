import React, { useState } from 'react';
import PredictionChart from '../components/PredictionChart';
import PredictionResultsTable from '../components/PredictionResultsTable';
import GuidedTrainingPanel from '../components/GuidedTrainingPanel';
import ModelResultSummary from '../components/ModelResultSummary';
import type { ModelJobProgressEvent } from '../hooks/useModelJob';
import type { GuidedTrainingSession } from '../../../services/guidedTraining';
import type { ModelResultData } from '../modelResultTypes';

interface AutoParamsProps {
  view: 'params' | 'results';
  data: (ModelResultData & {
    order: { p: number; d: number; q: number };
  }) | null;
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
      title="ARIMA 自动参数寻优 - 分阶段训练"
      session={guidedSession ?? null}
      isLoading={isLoading}
      error={error}
      onInitialize={onInitialize ?? (() => {})}
      onRunNextStep={onRunNextStep ?? (() => {})}
      onRetry={onRetry}
    />
  );

  if (!data) return guidedPanel;

  if (view === 'params') {
    return (
      <div className="space-y-6">
        {guidedPanel}
        <div className="rounded-lg border border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 p-6 shadow-sm">
          <h3 className="text-2xl font-bold text-gray-800">ARIMA 法 - 自动参数寻优计算</h3>
          <p className="mt-3 text-sm text-gray-700">
            差分阶数 d 来自上一页选择；p/q 由系统根据训练样本量限制搜索范围，并比较 AIC/BIC 后选择。
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 rounded-lg bg-white shadow-sm">
              <thead className="bg-gradient-to-r from-blue-50 to-indigo-50">
                <tr>
                  {['AR 参数 p', '差分阶数 d', 'MA 参数 q'].map(label => (
                    <th key={label} className="border-b-2 border-blue-200 px-6 py-4 text-left text-sm font-bold text-gray-700">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {[data.order.p, data.order.d, data.order.q].map((value, index) => (
                    <td key={index} className="px-6 py-4 text-base font-semibold text-blue-700">{value}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-gray-700">
            最佳模型：<strong>ARIMA({data.order.p}, {data.order.d}, {data.order.q})</strong>
          </p>
        </div>
        <button
          onClick={onShowInformationCriteriaInfo}
          className="rounded-md bg-gray-200 px-5 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-300"
        >
          信息准则函数法
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {guidedPanel}
      <ModelResultSummary
        metrics={data.metrics}
        methodName={data.methodName}
        forecastStrategy={data.forecastStrategy}
        implementationNotes={data.implementationNotes}
      />
      <div className="flex justify-end">
        <button
          onClick={() => setViewMode('table')}
          className={`rounded-l-lg px-4 py-2 text-sm font-medium ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          表格
        </button>
        <button
          onClick={() => setViewMode('chart')}
          className={`rounded-r-lg px-4 py-2 text-sm font-medium ${viewMode === 'chart' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          图表
        </button>
      </div>
      {viewMode === 'table' ? (
        <PredictionResultsTable title="ARIMA 法 - 预测结果" predictions={data.predictions} />
      ) : (
        <PredictionChart data={data.predictions} />
      )}
    </div>
  );
};

export default AutoParams;
