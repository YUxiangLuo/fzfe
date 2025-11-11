import React, { useMemo } from 'react';
import { useExperiment } from '../../../contexts/ExperimentContext.zustand';
import ModelMetricsTable from '../components/ModelMetricsTable';

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

    return models.filter(
      model => model.completed && model.rmse !== null && model.mae !== null && model.r2 !== null
    );
  }, [state]);

  const footer = (
    <>
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
    </>
  );

  return (
    <ModelMetricsTable
      title="模型指标对比"
      models={modelData}
      highlightRow="LSTM模型"
      footerNote={footer}
    />
  );
};

export default ModelComparison;
