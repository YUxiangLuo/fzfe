import React from 'react';

const Intro: React.FC = () => {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">加权平均融合 - 方法步骤</h3>
      <p className="mb-4">
        加权平均融合法是一种常见的模型融合策略，它通过为每个基模型的预测结果分配不同的权重，然后进行加权平均，从而得到最终的预测结果。
      </p>
      <p>
        我们将使用<strong>方差倒数法</strong>来确定权重，即对误差平方和较小的模型赋予更高的权重。
      </p>
    </div>
  );
};

export default Intro;
