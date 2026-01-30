import { useMemo } from 'react';
import { useExperiment } from '../../../contexts/ExperimentContext.zustand';

export interface ModelMetricsRow {
  model: string;
  rmse: number | null;
  mae: number | null;
  r2: number | null;
}

export const useAllModelMetrics = (): ModelMetricsRow[] => {
  const { state } = useExperiment();

  return useMemo(() => {
    const data: ModelMetricsRow[] = [];
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
  }, [state]);
};
