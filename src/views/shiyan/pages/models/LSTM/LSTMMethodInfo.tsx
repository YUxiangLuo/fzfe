import React from 'react';

const LSTMMethodInfo: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-800 mb-4">构建LSTM方法介绍</h3>
      </div>

      <div className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-200 shadow-sm">
        <p className="text-gray-800 leading-relaxed text-base mb-4">
          构建 LSTM 模型的流程包括以下几个步骤：
        </p>
        <p className="text-gray-800 leading-relaxed text-base">
          首先，进行<strong>数据准备</strong>，这涉及到从文件或数据库加载时间序列数据，预处理数据以确保其格式正确，例如将年份和月份转换为单一的日期特征，并提取相关的数值特征（如销售金额、销售数量和价格）。然后对这些特征进行归一化处理，使数据在同一量级，并划分时间窗口，生成训练集和测试集。
        </p>
      </div>

      <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200 shadow-sm">
        <p className="text-gray-800 leading-relaxed text-base">
          定义<strong>模型架构</strong>时，需要确定输入特征的数量（如日期数值、销售金额、销售数量和价格，共 4 个特征），LSTM 层数（如 3 层）和每层的隐藏单元数（如 288 个），以及输出特征的数量（如 1 个）。模型中还需要设置全连接层以处理 LSTM 层的输出。
        </p>
      </div>

      <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200 shadow-sm">
        <p className="text-gray-800 leading-relaxed text-base mb-4">
          使用<strong>均方误差（MSE）</strong>作为损失函数，<strong>Adam 优化器</strong>进行参数优化。
        </p>
        <p className="text-gray-800 leading-relaxed text-base">
          <strong>训练参数</strong>包括最大训练轮数（如 20 轮）、批量大小（如 6）、初始学习率（如 0.01）和学习率衰减率（如 0.99）。
        </p>
      </div>

      <div className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg border border-amber-200 shadow-sm">
        <p className="text-gray-800 leading-relaxed text-base">
          <strong>训练过程</strong>：将训练数据分批输入模型，计算预测值和实际值之间的损失，通过反向传播更新模型参数。
        </p>
      </div>

      <div className="p-5 bg-indigo-50 rounded-lg border border-indigo-200">
        <h4 className="text-base font-semibold text-gray-800 mb-3">LSTM 模型优势</h4>
        <div className="space-y-2 text-gray-700 leading-relaxed text-base">
          <p>
            <strong>长期依赖捕捉能力：</strong>LSTM 能够有效捕捉时间序列数据中的长期依赖关系，克服传统 RNN 的梯度消失问题。
          </p>
          <p>
            <strong>灵活的特征处理：</strong>可以同时处理多个相关特征，自动学习特征之间的复杂关系。
          </p>
          <p>
            <strong>适应性强：</strong>通过调整网络结构和超参数，可以适应不同复杂度的时间序列预测任务。
          </p>
        </div>
      </div>
    </div>
  );
};

export default LSTMMethodInfo;
