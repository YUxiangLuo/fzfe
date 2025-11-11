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
    const baseModelIds = state.ensemble_boosting_base_models || [];
    
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

    const baseModels = baseModelIds
      .map(id => modelMapping[id])
      .filter((model): model is { name: string; rmse: number | null; mae: number | null; r2: number | null; } => !!model);

    if (!data) return baseModels;

    const boostingModel = {
      name: MODEL_NAME,
      rmse: data.metrics.rmse,
      mae: data.metrics.mae,
      r2: data.metrics.r2,
    };

    return [...baseModels, boostingModel];
  }, [baseModelIds, state, data]);

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

