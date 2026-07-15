import React from 'react';
import { Info, TriangleAlert } from 'lucide-react';
import {
  summarizeFallbackUncertainty,
  type UncertaintyAuditPoint,
} from '../utils/predictionValidator';

interface ProductionForecastAssumptionNoteProps {
  className?: string;
  predictions?: readonly UncertaintyAuditPoint[];
}

const ProductionForecastAssumptionNote: React.FC<ProductionForecastAssumptionNoteProps> = ({
  className = '',
  predictions = [],
}) => {
  const fallbackSummary = summarizeFallbackUncertainty(predictions);

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-800 space-y-2 leading-relaxed">
            <p className="font-semibold text-blue-900">生产预测特征说明</p>
            <p>
              系统会沿用需求预测阶段已训练模型的<strong>目标字段、特征字段和归一化方式</strong>，因此在生产计划模块不需要重新选择特征，避免训练与预测口径不一致。
            </p>
            <p>
              若当前模型为 LSTM 或包含 LSTM 的融合模型，本教学版本为简化操作，不再要求逐期输入未来促销、广告、搜索指数、天气等外部变量；模型将基于已保存的历史窗口和历史模式生成未来需求的<strong>基线预测</strong>。
            </p>
            <p className="text-xs text-blue-700">
              真实业务中，应进一步补充未来促销方案、广告预算、节假日与天气等情景假设，再进行条件预测和生产计划优化。
            </p>
          </div>
        </div>
      </div>
      {fallbackSummary.fallbackCount > 0 && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900" role="alert">
          <TriangleAlert className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
          <div className="space-y-1">
            <p className="font-semibold">{fallbackSummary.fallbackCount} 期误差区间与安全库存标准差使用了回退估计</p>
            <p>可用残差信息不足，这些期的区间和安全库存应结合业务经验复核；历史偏差诊断也不可用。</p>
            {fallbackSummary.reasons.length > 0 && (
              <p className="text-xs text-amber-700">回退原因：{fallbackSummary.reasons.join('；')}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductionForecastAssumptionNote;
