import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ResultsProps {
  data: {
    weights: number[];
    model_names: string[];
  } | null;
  isLoading: boolean;
  error: string | null;
}

const Results: React.FC<ResultsProps> = ({ data, isLoading, error }) => {
  const modelIdToName: Record<string, string> = {
    ma: '移动平均法',
    es: '指数平滑法',
    arima: 'ARIMA模型',
    lstm: 'LSTM神经网络',
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        <p className="ml-4 text-gray-600">正在计算...</p>
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
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-800 mb-3">加权平均融合 - 计算结果</h3>
      </div>

      {/* 权重分布表 */}
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

      <div className="p-5 bg-purple-50 rounded-lg border border-purple-200">
        <p className="text-gray-700 text-base leading-relaxed">
          上表展示了各基础模型在加权融合中的权重分布。权重根据方差倒数法计算，预测误差越小的模型获得更大的权重。
        </p>
      </div>
    </div>
  );
};

export default Results;
