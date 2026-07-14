import React from 'react';

export interface StationarityProps {
  onShowAutoregression: () => void;
}

const Stationarity: React.FC<StationarityProps> = ({ onShowAutoregression }) => {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-6">
        <div>
          <h3 className="text-2xl font-bold text-gray-800 mb-4">ARIMA 法 - 平稳性检验</h3>
        </div>

        <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 shadow-sm">
          <p className="text-gray-800 leading-relaxed text-base mb-4">
            平稳性检验使用 ADF 单位根检验。零假设是“序列存在单位根”。本系统采用严格规则：p&lt;0.05 时拒绝零假设，并把对应差分序列标记为“通过当前 ADF 门槛”；p≥0.05 时只能说证据不足以拒绝单位根，不能证明序列一定非平稳。
          </p>
          <p className="text-gray-800 leading-relaxed text-base">
            对最简单的 AR(1) 过程，滞后系数为1就是单位根；更高阶模型要看特征多项式的根。本系统调用 ADF 时包含常数项，并由 AIC 自动选择检验回归的滞后长度。
          </p>
        </div>
      </div>

      <div>
        <button
          onClick={onShowAutoregression}
          className="px-5 py-2 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300 transition-colors text-sm"
        >
          什么是自回归方程？
        </button>
      </div>
    </div>
  );
};

export default Stationarity;
