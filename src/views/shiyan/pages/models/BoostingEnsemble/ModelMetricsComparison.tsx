import React, { useMemo } from 'react';
import { useExperiment } from '../../../contexts/ExperimentContext';

export interface ModelMetricsComparisonProps {
  data: {
    metrics: { rmse: number; mae: number; r2: number };
  } | null;
  baseModelIds: string[];
}

const ModelMetricsComparison: React.FC<ModelMetricsComparisonProps> = ({ data, baseModelIds }) => {
  const { state } = useExperiment();

  const baseModelsData = useMemo(() => {
    if (!baseModelIds || baseModelIds.length === 0) return [];

    const modelMapping: Record<string, { name: string; rmse: number | null; mae: number | null; r2: number | null }> = {
      moving_average: {
        name: '移动平均法',
        rmse: state.moving_average_metrics_rmse,
        mae: state.moving_average_metrics_mae,
        r2: state.moving_average_metrics_r2,
      },
      exponential_smoothing: {
        name: '指数平滑法',
        rmse: state.exponential_smoothing_metrics_rmse,
        mae: state.exponential_smoothing_metrics_mae,
        r2: state.exponential_smoothing_metrics_r2,
      },
      arima: {
        name: 'ARIMA模型',
        rmse: state.arima_metrics_rmse,
        mae: state.arima_metrics_mae,
        r2: state.arima_metrics_r2,
      },
      lstm: {
        name: 'LSTM神经网络',
        rmse: state.lstm_metrics_rmse,
        mae: state.lstm_metrics_mae,
        r2: state.lstm_metrics_r2,
      },
    };

    return baseModelIds.map(id => modelMapping[id]).filter(Boolean);
  }, [baseModelIds, state]);

  if (!data) {
    return <p>没有可用的结果。</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-800 mb-3">模型指标对比</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 bg-white rounded-lg shadow-sm border border-gray-200">
          <thead className="bg-gradient-to-r from-green-50 to-emerald-50">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 border-b-2 border-green-200">
                模型名称
              </th>
              <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 border-b-2 border-green-200">
                RMSE
              </th>
              <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 border-b-2 border-green-200">
                MAE
              </th>
              <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 border-b-2 border-green-200">
                R²
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {baseModelsData.map((model, index) => (
              <tr key={index} className="hover:bg-green-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-base text-gray-800 font-medium">
                  {model.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-base text-center text-blue-600 font-semibold">
                  {model.rmse !== null ? model.rmse.toFixed(4) : 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-base text-center text-green-600 font-semibold">
                  {model.mae !== null ? model.mae.toFixed(4) : 'N/A'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-base text-center text-indigo-600 font-semibold">
                  {model.r2 !== null ? model.r2.toFixed(4) : 'N/A'}
                </td>
              </tr>
            ))}
            {/* Boosting融合模型行 */}
            <tr className="bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 transition-colors">
              <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900 font-bold">
                Boosting融合模型
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-base text-center text-blue-700 font-bold">
                {data.metrics.rmse.toFixed(4)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-base text-center text-green-700 font-bold">
                {data.metrics.mae.toFixed(4)}
              </td>
              <td className="px-6 py-4 whitespace-nowrap text-base text-center text-indigo-700 font-bold">
                {data.metrics.r2.toFixed(4)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="p-5 bg-blue-50 rounded-lg border border-blue-200">
        <h5 className="text-base font-semibold text-gray-800 mb-3">指标说明：</h5>
        <div className="space-y-2 text-gray-700 text-sm">
          <div className="flex items-start gap-3">
            <span className="font-semibold text-blue-600 min-w-[4rem]">RMSE</span>
            <span>均方根误差，值越小表示模型预测越准确</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="font-semibold text-green-600 min-w-[4rem]">MAE</span>
            <span>平均绝对误差，值越小表示模型预测越准确</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="font-semibold text-indigo-600 min-w-[4rem]">R²</span>
            <span>决定系数，值越接近1表示模型拟合效果越好</span>
          </div>
        </div>
      </div>

      <div className="p-5 bg-green-50 rounded-lg border border-green-200">
        <p className="text-gray-700 text-base leading-relaxed">
          通过对比各基础模型和Boosting融合模型的评估指标，可以看出Boosting方法通过迭代训练弱学习器并调整样本权重，通常能获得更好的预测性能。
        </p>
      </div>
    </div>
  );
};

export default ModelMetricsComparison;
