import React from 'react';

const Intro: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-800 mb-4">Boosting 融合 - 方法步骤</h3>
      </div>

      <div className="p-6 bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg border border-orange-200 shadow-sm">
        <h4 className="text-lg font-semibold text-gray-800 mb-3">Boosting 与残差提升</h4>
        <p className="text-gray-800 leading-relaxed text-base mb-4">
          Boosting 的核心思想是用多个弱学习器串行组合成更强的学习器。后续模型不再重复学习全部目标，而是重点修正前面模型没有解释好的部分。
        </p>
        <p className="text-gray-800 leading-relaxed text-base mb-4">
          AdaBoost 是经典代表，它通过调整样本权重关注难预测样本。本系统面向时间序列销量预测，基础模型通常不支持样本权重，因此采用残差提升：每一轮训练候选模型去拟合当前残差，并选择验证残差下降最多的模型加入加法组合。
        </p>
        <p className="text-gray-800 leading-relaxed text-base">
          在平方误差损失下，拟合残差可以理解为梯度提升的一个直观版本；本系统保留“逐步修正误差”的教学核心，同时兼容 MA、ES、ARIMA、LSTM 等异构时间序列模型。
        </p>
      </div>

      <div className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-200 shadow-sm">
        <h4 className="text-lg font-semibold text-gray-800 mb-3">算法流程</h4>
        <div className="space-y-3 text-gray-800 leading-relaxed text-base">
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
            <p className="pt-0.5">按时间顺序留出验证段，让全部候选拟合原始销量；候选输出先截断为非负，再选择验证RMSE最低者作为第一阶段，系数固定为1。</p>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
            <p className="pt-0.5">计算当前组合模型的残差（真实值 - 当前预测值）。</p>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
            <p className="pt-0.5">遍历候选基础模型，分别训练它们拟合当前残差。</p>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">4</span>
            <p className="pt-0.5">选择使验证残差RMSE最低且确有改善的模型；第二阶段起按默认学习率0.3加入，同一种模型类型可以重复入选。</p>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">5</span>
            <p className="pt-0.5">重复残差计算和候选选择，直到达到最大轮数或不再改善。</p>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">6</span>
            <p className="pt-0.5">在完整训练区间重训：第一阶段销量输出截断为非负，后续有符号残差输出不截断；累加后最终物理销量再截断为不小于0。</p>
          </div>
        </div>
      </div>

      <div className="p-5 bg-green-50 rounded-lg border border-green-200">
        <h4 className="text-base font-semibold text-gray-800 mb-3">方法特点</h4>
        <div className="space-y-2 text-gray-700 leading-relaxed text-base">
          <p>
            <strong>残差修正：</strong>后续模型重点学习前面模型尚未解释的误差。
          </p>
          <p>
            <strong>异构互补：</strong>可以用不同类型模型逐步修正线性、平滑或非线性误差。
          </p>
          <p>
            <strong>精度潜力：</strong>如果残差含有其他候选模型可学习的结构，组合可能改善；若验证段太短或主要是噪声，也可能退化。
          </p>
        </div>
      </div>

      <div className="p-5 bg-sky-50 rounded-lg border border-sky-200">
        <h4 className="text-base font-semibold text-gray-800 mb-3">本系统实现说明</h4>
        <p className="text-gray-700 leading-relaxed text-base mb-3">
          页面中的 Boosting 指残差提升融合，不是 AdaBoost 的样本权重更新流程。训练点8–15时通常只留末尾2–3点作内部验证，更长时约留20%。同一验证段反复用于每轮贪心选择，这是兼容小数据的折中，可能产生选择过拟合；若没有候选模型继续改善，则提前停止。评估点不足2个时，std_dev使用最终内部验证残差估计。
        </p>
        <p className="text-gray-700 leading-relaxed text-base mb-3">
          候选仍使用已完成单模型的核心配置：MA 窗口、ES 的 α、ARIMA 的 d，以及 LSTM 的 look_back、epochs、特征与归一化方式。候选筛选只能用内部前段，因此 ARIMA 从第一轮起都会针对当前训练目标和数据段重新搜索 p、q；第一轮目标仍是原销量，第二轮起才改为当前有符号残差并保留负修正。第一阶段在完整训练段可直接复用原销量基础模型，后续阶段则按残差模型链重新训练。
        </p>
        <p className="text-gray-700 leading-relaxed text-base">
          更新训练段残差时，序列开头尚无样本内拟合值的位置按“零修正”处理，即保留原残差。例如 MA 必须先凑满完整窗口，LSTM 必须先凑满 look_back；系统不会为这些位置临时改用较短窗口或读取未来值。
        </p>
      </div>
    </div>
  );
};

export default Intro;
