import React from 'react';

const Formula: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-800 mb-3">指数平滑法 - 计算公式</h3>
        <p className="text-gray-600 text-base leading-relaxed">
          一次指数平滑法预测模型公式如下:
        </p>
      </div>

      <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 shadow-sm">
        <div className="flex items-center justify-center text-xl font-mono text-gray-800 mb-2">
          <code className="px-4 py-3 bg-white rounded-md shadow-sm">
            F<sub>t+1</sub> = αY<sub>t</sub> + (1 - α)F<sub>t</sub>
          </code>
        </div>
      </div>

      <div className="mt-6 p-5 bg-gray-50 rounded-lg border border-gray-200">
        <h4 className="text-base font-semibold text-gray-800 mb-3">符号说明：</h4>
        <div className="space-y-2 text-gray-700">
          <div className="flex items-start gap-3">
            <span className="font-mono font-semibold text-blue-600 min-w-[3rem]">F<sub>t+1</sub></span>
            <span>—— 下一期的预测值</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="font-mono font-semibold text-blue-600 min-w-[3rem]">Y<sub>t</sub></span>
            <span>—— 本期的实际值</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="font-mono font-semibold text-blue-600 min-w-[3rem]">F<sub>t</sub></span>
            <span>—— 本期的预测值</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="font-mono font-semibold text-blue-600 min-w-[3rem]">α</span>
            <span>—— 平滑系数，本系统要求 0 &lt; α ≤ 1</span>
          </div>
        </div>
      </div>

      <div className="mt-6 p-5 bg-sky-50 rounded-lg border border-sky-200">
        <h4 className="text-base font-semibold text-gray-800 mb-3">本系统实现说明：</h4>
        <p className="text-gray-700 leading-relaxed text-base">
          本系统固定用第一个训练观测初始化，即 S<sub>1</sub>=Y<sub>1</sub>，并使用用户输入的 α 递推，训练过程不自动优化 α。若训练末期为 T，则原始的 h≥1 预测均为 Ŷ<sub>T+h</sub>=S<sub>T</sub>；作为销量输出时再取 max(0, ŷ)。趋势和季节性需要 Holt 或 Holt-Winters 扩展，本模型未启用。
        </p>
      </div>
    </div>
  );
};

export default Formula;
