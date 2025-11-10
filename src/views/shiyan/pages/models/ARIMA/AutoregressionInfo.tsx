import React from 'react';

const AutoregressionInfo: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-800 mb-4">自回归方程科普</h3>
      </div>

      <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200 shadow-sm">
        <h4 className="text-lg font-semibold text-gray-800 mb-3">什么是自回归模型？</h4>
        <p className="text-gray-800 leading-relaxed text-base mb-4">
          自回归模型（AR, Autoregressive Model）是时间序列分析中的重要模型之一。它假设当前时刻的值可以用过去若干时刻的值来预测。
        </p>
      </div>

      <div className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-200 shadow-sm">
        <h4 className="text-lg font-semibold text-gray-800 mb-3">自回归方程的一般形式</h4>
        <div className="my-4 p-4 bg-white rounded-lg shadow-sm">
          <code className="text-base font-mono text-gray-800">
            Y<sub>t</sub> = c + φ<sub>1</sub>Y<sub>t-1</sub> + φ<sub>2</sub>Y<sub>t-2</sub> + ... + φ<sub>p</sub>Y<sub>t-p</sub> + ε<sub>t</sub>
          </code>
        </div>
        <div className="space-y-2 text-gray-700 text-base">
          <p><strong>Y<sub>t</sub></strong>：当前时刻的观测值</p>
          <p><strong>c</strong>：常数项</p>
          <p><strong>φ<sub>i</sub></strong>：自回归系数</p>
          <p><strong>p</strong>：自回归阶数（使用过去 p 个时刻的值）</p>
          <p><strong>ε<sub>t</sub></strong>：随机误差项（白噪声）</p>
        </div>
      </div>

      <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200 shadow-sm">
        <h4 className="text-lg font-semibold text-gray-800 mb-3">单位根的含义</h4>
        <p className="text-gray-800 leading-relaxed text-base mb-3">
          在自回归模型中，如果滞后项系数之和等于 1（即存在单位根），则时间序列是非平稳的。例如：
        </p>
        <div className="my-3 p-4 bg-white rounded-lg shadow-sm">
          <code className="text-base font-mono text-gray-800">
            Y<sub>t</sub> = Y<sub>t-1</sub> + ε<sub>t</sub>
          </code>
        </div>
        <p className="text-gray-800 leading-relaxed text-base">
          这种情况下，序列表现出随机游走特征，过去的冲击会永久影响未来的值，导致序列不稳定。
        </p>
      </div>

      <div className="p-5 bg-amber-50 rounded-lg border border-amber-200">
        <h4 className="text-base font-semibold text-gray-800 mb-2">为什么需要平稳性？</h4>
        <p className="text-gray-700 leading-relaxed text-base">
          平稳序列的统计特性不随时间变化，使得我们可以用历史数据来预测未来。非平稳序列会导致虚假回归问题，需要通过差分等方法转化为平稳序列后再建模。
        </p>
      </div>
    </div>
  );
};

export default AutoregressionInfo;
