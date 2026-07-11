import React from 'react';
import ModelMetricsTable from '../components/ModelMetricsTable';
import { useAllModelMetrics } from '../hooks/useAllModelMetrics';

export interface ModelMetricsComparisonProps {
  data: {
    metrics: { rmse: number; mae: number; mape: number; r2: number };
  } | null;
  baseModelIds: string[];
}

const MODEL_NAME = 'Boosting融合模型';

const ModelMetricsComparison: React.FC<ModelMetricsComparisonProps> = ({ data, baseModelIds }) => {
  const modelData = useAllModelMetrics();

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
