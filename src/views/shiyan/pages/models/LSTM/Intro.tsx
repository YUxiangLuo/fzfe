import React from 'react';

const Intro: React.FC = () => {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">LSTM 神经网络 - 方法步骤</h3>
      <p>LSTM 神经网络法的一般步骤为:</p>
      <ol className="list-decimal list-inside space-y-2 text-gray-700">
        <li>
          <strong>数据预处理:</strong> 对时序数据进行标准化或归一化处理，以适应神经网络模型。
        </li>
        <li>
          <strong>构建和训练 LSTM 模型:</strong> 使用训练集数据对模型进行训练，通过优化算法调整模型参数，使其能够有效捕捉数据中的时间依赖关系。
        </li>
        <li>
          <strong>模型预测:</strong> 使用训练好的模型进行预测。
        </li>
      </ol>
    </div>
  );
};

export default Intro;
