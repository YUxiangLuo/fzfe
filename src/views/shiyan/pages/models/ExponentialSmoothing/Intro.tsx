import React from 'react';

const Intro: React.FC = () => {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">指数平滑法 - 方法步骤</h3>
      <p>这里是指数平滑法一般步骤的介绍文本。</p>
      <ol className="list-decimal list-inside space-y-2">
        <li>选择一个初始值作为预测的起点。</li>
        <li>选择一个平滑系数 α (alpha)。</li>
        <li>使用指数平滑公式计算下一个时间点的预测值。</li>
        <li>根据得到的预测值和新的观测值，继续迭代计算，直至需要预测的时间段结束。</li>
      </ol>
    </div>
  );
};

export default Intro;
