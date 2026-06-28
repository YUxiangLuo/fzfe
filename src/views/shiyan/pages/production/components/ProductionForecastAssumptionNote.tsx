import React from 'react';
import { Info } from 'lucide-react';

interface ProductionForecastAssumptionNoteProps {
  className?: string;
}

const ProductionForecastAssumptionNote: React.FC<ProductionForecastAssumptionNoteProps> = ({ className = '' }) => {
  return (
    <div className={`bg-blue-50 border border-blue-200 rounded-lg p-4 ${className}`}>
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
  );
};

export default ProductionForecastAssumptionNote;
