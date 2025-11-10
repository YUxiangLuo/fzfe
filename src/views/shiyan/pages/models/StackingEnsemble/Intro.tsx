import React from 'react';

const Intro: React.FC = () => {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Stacking 融合 - 方法步骤</h3>
      <p className="mb-4">
        Stacking 是一种更复杂的模型融合技术。它通常分为两层：第一层被称为初级学习器（基学习器），第二层被称为元学习器（次级学习器）。
      </p>
      <p>
        它的核心思想是：使用多个不同的基学习器对训练集进行预测，然后将这些预测结果作为新的特征，用于训练一个元学习器，从而得到最终的预测。
      </p>
    </div>
  );
};

export default Intro;
