import React, { useMemo } from 'react';
import { useExperiment } from '../../../contexts/ExperimentContext';

const ModelComparison: React.FC = () => {
  const { state } = useExperiment();

  const modelData = useMemo(() => {
    const models = [
      {
        name: '移动平均法',
        rmse: state.moving_average_metrics_rmse,
        mae: state.moving_average_metrics_mae,
        r2: state.moving_average_metrics_r2,
        completed: state.moving_average_completed,
      },
      {
        name: '指数平滑法',
        rmse: state.exponential_smoothing_metrics_rmse,
        mae: state.exponential_smoothing_metrics_mae,
        r2: state.exponential_smoothing_metrics_r2,
        completed: state.exponential_smoothing_completed,
      },
      {
        name: 'ARIMA模型',
        rmse: state.arima_metrics_rmse,
        mae: state.arima_metrics_mae,
        r2: state.arima_metrics_r2,
        completed: state.arima_completed,
      },
      {
        name: 'LSTM模型',
        rmse: state.lstm_metrics_rmse,
        mae: state.lstm_metrics_mae,
        r2: state.lstm_metrics_r2,
        completed: state.lstm_completed,
      },
      {
        name: '加权融合模型',
        rmse: state.ensemble_weighted_metrics_rmse,
        mae: state.ensemble_weighted_metrics_mae,
        r2: state.ensemble_weighted_metrics_r2,
        completed: state.ensemble_weighted_completed,
      },
      {
        name: 'Boosting融合模型',
        rmse: state.ensemble_boosting_metrics_rmse,
        mae: state.ensemble_boosting_metrics_mae,
        r2: state.ensemble_boosting_metrics_r2,
        completed: state.ensemble_boosting_completed,
      },
      {
        name: 'Stacking融合模型',
        rmse: state.ensemble_stacking_metrics_rmse,
        mae: state.ensemble_stacking_metrics_mae,
        r2: state.ensemble_stacking_metrics_r2,
        completed: state.ensemble_stacking_completed,
      },
    ];

    // Filter to only show completed models with metrics
    return models.filter(
      model => model.completed && model.rmse !== null && model.mae !== null && model.r2 !== null
    );
  }, [state]);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-800 mb-3">模型指标对比</h3>
        <p className="text-gray-600 text-base leading-relaxed">
          以下是所有已完成模型的评估指标对比：
        </p>
      </div>

      {modelData.length === 0 ? (
        <div className="p-6 bg-amber-50 rounded-lg border border-amber-200">
          <p className="text-gray-700 text-base">
            暂无已完成的模型数据，请先完成至少一个模型的训练。
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
            <thead className="bg-gradient-to-r from-blue-50 to-indigo-50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">
                  模型名称
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">
                  RMSE
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">
                  MAE
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">
                  R²
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {modelData.map((model, index) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-800">
                    {model.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-blue-600 font-semibold">
                    {model.rmse !== null ? model.rmse.toFixed(4) : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-green-600 font-semibold">
                    {model.mae !== null ? model.mae.toFixed(4) : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-indigo-600 font-semibold">
                    {model.r2 !== null ? model.r2.toFixed(4) : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="p-5 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="text-base font-semibold text-gray-800 mb-3">指标说明：</h4>
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
    </div>
  );
};

export default ModelComparison;
