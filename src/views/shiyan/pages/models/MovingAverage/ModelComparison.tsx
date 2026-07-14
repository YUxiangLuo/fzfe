import React from 'react';
import ModelMetricsTable from '../components/ModelMetricsTable';
import { useAllModelMetrics } from '../hooks/useAllModelMetrics';

const ModelComparison: React.FC = () => {
  const modelData = useAllModelMetrics();

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
          <span>决定系数，最高为1且越高通常越好；可为负，表示不如评估集均值基准。实际值恒定时，本系统约定完全预测正确为1，否则为0</span>
        </div>
      </div>
    </>
  );

  return (
    <ModelMetricsTable
      title="模型指标对比"
      models={modelData}
      highlightRow="移动平均法"
      footerNote={footer}
    />
  );
};

export default ModelComparison;
