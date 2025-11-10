import React from 'react';

export interface StationarityProps {
  onShowAutoregression: () => void;
}

const Stationarity: React.FC<StationarityProps> = ({ onShowAutoregression }) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-800 mb-4">ARIMA 法 - 平稳性检验</h3>
      </div>

      <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 shadow-sm">
        <p className="text-gray-800 leading-relaxed text-base mb-4">
          平稳性检验使用 ADF 单位根检验，单位根检验是指检验序列是否存在单位根，如果存在单位根即为非平稳时间序列；检验零假设为：存在单位根；如果 P 值大于显著性水平(5%)，则不可拒绝原假设，即检验序列存在单位根。
        </p>
        <p className="text-gray-800 leading-relaxed text-base">
          当一个自回归过程中，如果滞后项系数 b 为 1，就称为单位根。当单位根存在时，自变量和因变量之间的关系具有欺骗性，是非平稳时间序列。
        </p>
      </div>

      <div className="flex justify-center">
        <button
          onClick={onShowAutoregression}
          className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
        >
          自回归方程
        </button>
      </div>
    </div>
  );
};

export default Stationarity;
