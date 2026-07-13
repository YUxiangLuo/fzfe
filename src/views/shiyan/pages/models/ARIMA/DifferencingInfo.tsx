import React from 'react';

const DifferencingInfo: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-800 mb-4">差分阶数选择的意义</h3>
      </div>

      <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200 shadow-sm">
        <h4 className="text-lg font-semibold text-gray-800 mb-3">什么是差分？</h4>
        <p className="text-gray-800 leading-relaxed text-base mb-4">
          差分是将非平稳时间序列转化为平稳序列的重要方法。通过计算相邻时刻数据的差值，可以消除时间序列中的趋势和季节性成分。
        </p>
        <p className="text-gray-800 leading-relaxed text-base">
          一阶差分计算公式为：<strong>ΔY<sub>t</sub> = Y<sub>t</sub> - Y<sub>t-1</sub></strong>
        </p>
      </div>

      <div className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-200 shadow-sm">
        <h4 className="text-lg font-semibold text-gray-800 mb-3">不同差分阶数的含义</h4>
        <div className="space-y-4">
          <div className="p-4 bg-white rounded-lg shadow-sm">
            <p className="text-base font-semibold text-blue-700 mb-2">零阶差分（d=0）</p>
            <p className="text-gray-700 leading-relaxed">
              序列本身已经是平稳的，不需要进行差分处理。此时模型退化为标准的 ARMA 模型。
            </p>
          </div>
          <div className="p-4 bg-white rounded-lg shadow-sm">
            <p className="text-base font-semibold text-indigo-700 mb-2">一阶差分（d=1）</p>
            <p className="text-gray-700 leading-relaxed">
              消除线性趋势。适用于具有单调增长或下降趋势的序列。大多数经济时间序列经过一阶差分后可以达到平稳。
            </p>
          </div>
          <div className="p-4 bg-white rounded-lg shadow-sm">
            <p className="text-base font-semibold text-purple-700 mb-2">二阶差分（d=2）</p>
            <p className="text-gray-700 leading-relaxed">
              消除二次趋势。适用于增长率本身也在变化的序列。实际应用中较少使用，过度差分可能导致信息损失。
            </p>
          </div>
        </div>
      </div>

      <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200 shadow-sm">
        <h4 className="text-lg font-semibold text-gray-800 mb-3">如何选择差分阶数？</h4>
        <div className="space-y-3 text-gray-800 text-base">
          <p className="leading-relaxed">
            <strong>1. 观察 ADF 检验结果：</strong>如果原序列的 ADF 检验显示平稳（p 值 ≤ 0.05），则选择 d=0；否则进行一阶差分。
          </p>
          <p className="leading-relaxed">
            <strong>2. 逐步增加差分阶数：</strong>从 d=0 开始，如果不平稳则尝试 d=1，如果仍不平稳则尝试 d=2。
          </p>
          <p className="leading-relaxed">
            <strong>3. 避免过度差分：</strong>差分阶数过高会导致序列损失过多信息，影响预测精度。一般不超过 2 阶。
          </p>
        </div>
      </div>

      <div className="p-5 bg-amber-50 rounded-lg border border-amber-200">
        <h4 className="text-base font-semibold text-gray-800 mb-2">注意事项</h4>
        <p className="text-gray-700 leading-relaxed text-base">
          差分阶数 d 是 ARIMA 模型的核心参数之一。选择合适的差分阶数是建立准确预测模型的关键步骤。通过 ADF 检验表中的 p 值和平稳性标识，可以判断所选差分阶数是否合适。
        </p>
      </div>
    </div>
  );
};

export default DifferencingInfo;
