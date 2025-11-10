import React from 'react';

const Formula: React.FC = () => {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">指数平滑法 - 计算公式</h3>
      <p>一次指数平滑法预测模型公式如下:</p>
      <div className="p-4 bg-gray-100 rounded-md my-4 text-center">
        <p className="text-lg font-mono">
          F<sub>t+1</sub> = αY<sub>t</sub> + (1 - α)F<sub>t</sub>
        </p>
      </div>
      <div className="text-sm text-gray-600">
        <p><strong>F<sub>t+1</sub></strong>: 下一期的预测值</p>
        <p><strong>Y<sub>t</sub></strong>: 本期的实际值</p>
        <p><strong>F<sub>t</sub></strong>: 本期的预测值</p>
        <p><strong>α</strong>: 平滑系数 (0 ≤ α ≤ 1)</p>
      </div>
    </div>
  );
};

export default Formula;
