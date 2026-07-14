import React from 'react';

const Intro: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-800 mb-3">Stacking 融合 - 方法步骤</h3>
      </div>

      <div className="p-6 bg-gradient-to-br from-teal-50 to-emerald-50 rounded-lg border border-teal-200 shadow-sm">
        <h4 className="text-lg font-semibold text-gray-800 mb-3">两层架构</h4>
        <p className="text-gray-800 leading-relaxed text-base">
          Stacking 通常可以分为两层，第一层被称为<span className="font-semibold text-teal-700">初级学习器（基学习器）</span>。第二层指<span className="font-semibold text-emerald-700">元学习器（次级学习器）</span>。次级学习器层的输入为初级学习器输出的结果，通过训练输出最终模型结果。
        </p>
      </div>

      <div className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-200 shadow-sm">
        <h4 className="text-lg font-semibold text-gray-800 mb-3">方法原理</h4>
        <p className="text-gray-800 leading-relaxed text-base">
          常见 Stacking 会使用折外预测训练元模型。普通随机K折不满足销量预测的时间因果顺序；本系统用训练前段训练基础模型，再以它们对后段Level-1留出数据的预测训练元模型。
        </p>
      </div>

      <div className="p-6 bg-gradient-to-br from-green-50 to-lime-50 rounded-lg border border-green-200 shadow-sm">
        <h4 className="text-lg font-semibold text-gray-800 mb-3">方法特点</h4>
        <ul className="space-y-2 text-gray-800 leading-relaxed text-base list-disc list-inside">
          <li>能够结合多个不同类型的基本模型，更好地捕捉数据中的不同特征和模式</li>
          <li>使用时间顺序留出数据来减少过拟合和时间泄漏风险</li>
          <li>成员互补且Level-1样本足够时具有改进潜力，但不保证优于单模型或简单平均</li>
        </ul>
      </div>

      <div className="p-5 bg-sky-50 rounded-lg border border-sky-200">
        <h4 className="text-base font-semibold text-gray-800 mb-3">本系统实现说明</h4>
        <p className="text-gray-700 leading-relaxed text-base mb-3">
          本系统按时间顺序拆分Level-0/Level-1：训练点8–15时Level-1通常2–3点，更长时约20%。元模型先拟合非负无截距线性回归，再归一化系数为和为1的权重；这是稳定的凸组合近似，不是直接求解带和约束的最小二乘。当Level-1样本数≤成员数+1，或矩阵奇异、条件数非有限或&gt;10⁶时，系统认为元模型拟合不够稳定，回退为inverse-MAE。成员销量与最终组合结果都截断为不小于0，指标和std_dev使用同一最终结果；评估点不足2个时std_dev使用Level-1组合残差。
        </p>
        <p className="text-gray-700 leading-relaxed text-base">
          Level-0 重训沿用 MA 窗口、ES 的 α，以及 LSTM 的 look_back、epochs、特征和归一化方式；由于子训练段和 Level-1 跨度不同，LSTM 的动态隐藏单元、批大小和输出宽度按单模型的同一规则重算。ARIMA 只沿用用户固定的 d，并在 Level-0 重新执行同一套 AIC/BIC stepwise 搜索，避免把完整训练段选出的 p、q 泄漏给 Level-1。独立评估阶段通常复用完整训练产物；只有 LSTM 直接输出长度不足时，才保持上述单模型配置并重拟合以扩展长度。
        </p>
      </div>
    </div>
  );
};

export default Intro;
