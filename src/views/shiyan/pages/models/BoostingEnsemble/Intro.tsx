import React from 'react';

const Intro: React.FC = () => {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Boosting 融合 - 方法步骤</h3>
      <p className="mb-4">
        Boosting 是一种串行式的集成学习算法。其核心思想是基于错误来提升模型性能，即每一个新的基模型都会重点关注前一个模型预测错误的样本。
      </p>
      <p>
        通过这种方式，模型可以逐步修正错误，提高整体的预测精度，特别适合处理复杂的数据模式。
      </p>
    </div>
  );
};

export default Intro;
