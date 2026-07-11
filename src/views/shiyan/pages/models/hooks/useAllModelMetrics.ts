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
        model: '加权平均融合模型',
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

    // R² 需要评估集方差；单点评估时后端按约定返回 0.0，展示会误导为"模型很差"。
    const evaluateStart = state.data_window_evaluate_start_index;
    const evaluateEnd = state.data_window_evaluate_end_index;
    if (evaluateStart !== null && evaluateEnd !== null && evaluateEnd - evaluateStart + 1 < 2) {
      return data.map(row => ({ ...row, r2: null }));
    }
    return data;
  }, [state]);
};
