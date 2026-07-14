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
          首先进行<strong>数据准备</strong>：系统识别数值与类别字段，自动把目标销量作为历史数值输入；仅用训练区间拟合数值缩放器和类别One-Hot编码器，再按look_back切出历史窗口，并以未来连续horizon期销量作为标签。评估区间不会参与预处理器拟合。
        </p>
      </div>

      <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200 shadow-sm">
        <p className="text-gray-800 leading-relaxed text-base">
          定义<strong>模型架构</strong>时，需要确定输入特征数量、LSTM 层数、隐藏单元数以及输出步数。本系统使用两层 LSTM 加全连接层，隐藏单元数会根据训练样本量和编码后的特征数量动态确定。
        </p>
      </div>

      <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200 shadow-sm">
        <p className="text-gray-800 leading-relaxed text-base mb-4">
          使用<strong>均方误差（MSE）</strong>作为损失函数，<strong>Adam 优化器</strong>进行参数优化。
        </p>
        <p className="text-gray-800 leading-relaxed text-base">
          <strong>系统内部训练参数</strong>包括最大训练轮数（当前默认 20 轮）、动态批量大小、初始学习率（0.001）和学习率衰减率（0.98）；这些参数由系统控制，训练页主要让用户选择归一化方式和输入特征。
        </p>
      </div>

      <div className="p-6 bg-gradient-to-br from-sky-50 to-blue-50 rounded-lg border border-sky-200 shadow-sm">
        <p className="text-gray-800 leading-relaxed text-base">
          <strong>本系统实现说明：</strong>训练评估与生产预测都采用直接多步预测，一次性输出整个预测区间的销量，而不是先预测一步再递归。预测输入只包含截止点前最后look_back行历史数据，不读取未来特征路径。若训练或生产重训的数据窗口过短、无法支撑既定多步输出长度，系统不会改用递归单步，而是报错提示扩大数据窗口后重试。
        </p>
      </div>

      <div className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg border border-amber-200 shadow-sm">
        <p className="text-gray-800 leading-relaxed text-base">
          <strong>训练过程</strong>：按时间顺序（shuffle=false）将样本分批输入模型，以MSE反向传播更新参数。为尽量保留小样本，本系统不再切验证集；EarlyStopping监控训练loss，耐心轮数按总epochs动态取2–6，并恢复训练loss最低时的权重。这能缩短平台期训练，但不能提供验证集早停的泛化保证。
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
