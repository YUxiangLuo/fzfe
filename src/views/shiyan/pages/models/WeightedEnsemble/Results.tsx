import React, { useState } from 'react';
import GuidedTrainingPanel from '../components/GuidedTrainingPanel';
import WeightsPieChart from '../components/WeightsPieChart';
import type { GuidedTrainingSession } from '../../../services/guidedTraining';
import type { ModelJobProgressEvent } from '../hooks/useModelJob';

export interface ResultsProps {
  data: {
    weights: number[];
    model_names: string[];
  } | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  guidedSession?: GuidedTrainingSession | null;
  onInitialize: () => void;
  onRunNextStep: () => void;
  currentProgress?: ModelJobProgressEvent | null;
  progressEvents?: ModelJobProgressEvent[];
}

const Results: React.FC<ResultsProps> = ({
  data,
  isLoading,
  error,
  onRetry,
  guidedSession,
  onInitialize,
  onRunNextStep,
}) => {
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('chart');

  const modelIdToName: Record<string, string> = {
    ma: '移动平均法',
    es: '指数平滑法',
    arima: 'ARIMA模型',
    lstm: 'LSTM模型',
  };

  const guidedPanel = (
    <GuidedTrainingPanel
      title="加权平均融合 - 分阶段训练"
      session={guidedSession ?? null}
      isLoading={isLoading}
      error={error}
      onInitialize={onInitialize}
      onRunNextStep={onRunNextStep}
      onRetry={onRetry}
    />
  );

  if (!data) {
    return (
      <div className="space-y-6">
        {guidedPanel}
        <p className="text-sm text-gray-600">完成全部训练阶段后会显示权重结果。</p>
      </div>
    );
  }

  const chartData = data.model_names.map((id, index) => ({
    name: modelIdToName[id] ?? id,
    value: data.weights?.[index] ?? 0,
  }));

  return (
    <div className="space-y-6">
      {guidedPanel}
      <div className="flex justify-between items-center">
        <h3 className="text-2xl font-bold text-gray-800">加权平均融合 - 计算结果</h3>
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
        <div>
          <h4 className="text-lg font-semibold text-gray-800 mb-3">各模型权重分布</h4>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 bg-white rounded-lg shadow-sm border border-gray-200">
              <thead className="bg-gradient-to-r from-purple-50 to-pink-50">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 border-b-2 border-purple-200">
                    模型名称
                  </th>
                  <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 border-b-2 border-purple-200">
                    权重
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {data.model_names?.map((id, index) => (
                  <tr key={id} className="hover:bg-purple-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-base text-gray-800 font-medium">
                      {modelIdToName[id] ?? id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-base text-center text-purple-600 font-bold">
                      {(data.weights?.[index] != null ? data.weights[index] * 100 : 0).toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div>
          <h4 className="text-lg font-semibold text-gray-800 mb-3 text-center">各模型权重分布</h4>
          <WeightsPieChart data={chartData} />
        </div>
      )}

      <div className="p-5 bg-purple-50 rounded-lg border border-purple-200">
        <p className="text-gray-700 text-base leading-relaxed">
          上图表展示了各基础模型在加权平均融合中的权重分布。权重根据验证集残差MSE倒数计算，预测误差越小的模型获得更大的权重。
        </p>
      </div>
    </div>
  );
};

export default Results;
