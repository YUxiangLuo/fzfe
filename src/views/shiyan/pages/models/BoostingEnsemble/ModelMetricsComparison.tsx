import React, { useMemo } from 'react';
import { useExperiment } from '../../../contexts/ExperimentContext.zustand';
import ModelMetricsTable from '../components/ModelMetricsTable';

export interface ModelMetricsComparisonProps {
  data: {
    metrics: { rmse: number; mae: number; r2: number };
  } | null;
  baseModelIds: string[];
}

const MODEL_NAME = 'Boosting融合模型';

const ModelMetricsComparison: React.FC<ModelMetricsComparisonProps> = ({ data, baseModelIds }) => {
const { state } = useExperiment();

const modelData = useMemo(() => {
  const data = [];
  if (state.moving_average_completed) {
    data.push({
      model: '移动平均法',
      rmse: state.moving_average_metrics_rmse,
      mae: state.moving_average_metrics_mae,
      r2: state.moving_average_metrics_r2,
    });
  }
  if (state.exponential_smoothing_completed) {
    data.push({
      model: '指数平滑法',
      rmse: state.exponential_smoothing_metrics_rmse,
      mae: state.exponential_smoothing_metrics_mae,
      r2: state.exponential_smoothing_metrics_r2,
    });
  }
  if (state.arima_completed) {
    data.push({
      model: 'ARIMA模型',
      rmse: state.arima_metrics_rmse,
      mae: state.arima_metrics_mae,
      r2: state.arima_metrics_r2,
    });
  }
  if (state.lstm_completed) {
    data.push({
      model: 'LSTM模型',
      rmse: state.lstm_metrics_rmse,
      mae: state.lstm_metrics_mae,
      r2: state.lstm_metrics_r2,
    });
  }
  if (state.ensemble_weighted_completed) {
    data.push({
      model: '加权融合模型',
      rmse: state.ensemble_weighted_metrics_rmse,
      mae: state.ensemble_weighted_metrics_mae,
      r2: state.ensemble_weighted_metrics_r2,
    });
  }
  if (state.ensemble_boosting_completed) {
    data.push({
      model: 'Boosting融合模型',
      rmse: state.ensemble_boosting_metrics_rmse,
      mae: state.ensemble_boosting_metrics_mae,
      r2: state.ensemble_boosting_metrics_r2,
    });
  }
  if (state.ensemble_stacking_completed) {
    data.push({
      model: 'Stacking融合模型',
      rmse: state.ensemble_stacking_metrics_rmse,
      mae: state.ensemble_stacking_metrics_mae,
      r2: state.ensemble_stacking_metrics_r2,
    });
  }
  return data;
}, [
  state.moving_average_completed, state.moving_average_metrics_rmse, state.moving_average_metrics_mae, state.moving_average_metrics_r2,
  state.exponential_smoothing_completed, state.exponential_smoothing_metrics_rmse, state.exponential_smoothing_metrics_mae, state.exponential_smoothing_metrics_r2,
  state.arima_completed, state.arima_metrics_rmse, state.arima_metrics_mae, state.arima_metrics_r2,
  state.lstm_completed, state.lstm_metrics_rmse, state.lstm_metrics_mae, state.lstm_metrics_r2,
  state.ensemble_weighted_completed, state.ensemble_weighted_metrics_rmse, state.ensemble_weighted_metrics_mae, state.ensemble_weighted_metrics_r2,
  state.ensemble_boosting_completed, state.ensemble_boosting_metrics_rmse, state.ensemble_boosting_metrics_mae, state.ensemble_boosting_metrics_r2,
  state.ensemble_stacking_completed, state.ensemble_stacking_metrics_rmse, state.ensemble_stacking_metrics_mae, state.ensemble_stacking_metrics_r2,
]);

  const footer = (
    <>
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
    </>
  );

  return (
    <ModelMetricsTable
      title="模型指标对比"
      models={modelData}
      highlightRow={MODEL_NAME}
      footerNote={footer}
    />
  );
};

export default ModelMetricsComparison;

