import React from 'react';

const LSTMMethodInfo: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-800 mb-4">LSTM建模方法介绍</h3>
      </div>

      <div className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-200 shadow-sm">
        <p className="text-gray-800 leading-relaxed text-base mb-4">
          构建 LSTM 模型的流程包括以下几个步骤：
        </p>
        <p className="text-gray-800 leading-relaxed text-base">
          首先进行<strong>数据准备</strong>：系统识别数值与类别字段，自动把目标销量作为历史数值输入；外部评估区间不会参与预处理器拟合。有限时间验证模式选择训练轮数时，临时预处理器和临时网络容量都只依据内部验证起点前可见的数据；选定轮数后再用完整训练区间重新推导最终容量并拟合预处理器和网络。随后按look_back切出历史窗口，并以未来连续horizon期销量作为标签。
        </p>
      </div>

      <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200 shadow-sm">
        <p className="text-gray-800 leading-relaxed text-base mb-3">
          定义<strong>模型架构</strong>时，需要确定输入特征数量、历史窗口、隐藏单元数以及输出步数。本系统使用单层 LSTM 加线性输出层，并用可用监督窗口数约束参数总量。
        </p>
        <p className="text-gray-800 leading-relaxed text-base">
          设训练点数为 N、预测跨度为 h、编码后特征数为 f：look-back 先取 clamp(⌊N/4⌋, 2, 12)，再为至少4个监督窗口让出空间；单层网络参数量按 P=4u(u+f+1)+(u+1)h 计算，并从 u∈{'{2,4,8,16}'} 中选择不超过数据预算的最大隐藏单元数。教学演示模式最多使用4个隐藏单元。
        </p>
      </div>

      <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200 shadow-sm">
        <p className="text-gray-800 leading-relaxed text-base mb-4">
          使用<strong>均方误差（MSE）</strong>作为损失函数，<strong>Adam 优化器</strong>进行参数优化。
        </p>
        <p className="text-gray-800 leading-relaxed text-base">
          <strong>系统内部训练参数</strong>包括动态 look-back、隐藏单元、批量大小、最大轮数和早停耐心值；它们由样本窗数、预测跨度与特征维度确定，训练页只让用户选择数值缩放方式和输入特征。
        </p>
      </div>

      <div className="p-6 bg-gradient-to-br from-sky-50 to-blue-50 rounded-lg border border-sky-200 shadow-sm">
        <p className="text-gray-800 leading-relaxed text-base">
          <strong>本系统实现说明：</strong>训练评估与生产预测都采用直接多步预测，一次性输出整个预测区间。预测输入只包含截止点前由当前数据规模推导出的最近历史窗口，不读取未来特征路径。窗口不足时明确报错，不改用另一种预测策略。
        </p>
      </div>

      <div className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg border border-amber-200 shadow-sm">
        <p className="text-gray-800 leading-relaxed text-base mb-3">
          <strong>训练过程</strong>：有限时间验证模式把末段监督窗口作为时间验证集，并隔离 horizon-1 个相邻窗口以降低标签重叠泄漏；EarlyStopping 监控验证 loss。选定最佳轮数后，以该轮数在全部窗口重拟合最终模型。若监督窗口不足 20 个，则进入不宣称验证性能的教学演示模式。这里的“有限”强调它只承担教学性的轮数选择，不代表生产级泛化验证。
        </p>
        <p className="text-gray-800 leading-relaxed text-base">
          标准差、名义95%范围和名义99%上侧误差估计来自临时时间验证模型在各输出 horizon 上的未截断 actual-prediction 残差；区间和上侧误差直接取经验分位数，因此不会把稳定偏差误判为零风险。但同一小段数据还用于 EarlyStopping，最终模型也会重拟合，所以输出明确标记为“未校准、无覆盖率保证”。教学演示模式没有独立验证残差，会明确标记为训练历史回退估计。销量输出的范围上下界与点预测同步限制为非负并保证包含点预测；有符号残差学习仍保留原始负值。
        </p>
      </div>

      <div className="p-5 bg-indigo-50 rounded-lg border border-indigo-200">
        <h4 className="text-base font-semibold text-gray-800 mb-3">LSTM 模型优势</h4>
        <div className="space-y-2 text-gray-700 leading-relaxed text-base">
          <p>
            <strong>长期依赖捕捉能力：</strong>LSTM 的门控记忆结构能够缓解传统 RNN 在长序列上的梯度消失，使模型更有机会学习较长时间跨度的依赖，但不能保证完全消除该问题。
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
