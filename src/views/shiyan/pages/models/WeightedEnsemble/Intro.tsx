import React from 'react';

const Intro: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-800 mb-4">加权平均融合 - 方法步骤</h3>
      </div>

      <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200 shadow-sm">
        <h4 className="text-lg font-semibold text-gray-800 mb-3">验证残差MSE倒数加权法</h4>
        <p className="text-gray-800 leading-relaxed text-base mb-4">
          验证残差MSE倒数加权法是一种常见的组合预测权重确定方法。它借鉴逆方差加权思想，通过验证集残差均方误差的大小确定权重，即对MSE较小的模型赋以高权重。
        </p>
        <p className="text-gray-800 leading-relaxed text-base">
          MSE反映误差平方的平均大小。与只看去均值后的残差方差相比，MSE还会保留系统性高估或低估造成的误差；只有残差近似无偏时，它才与误差方差接近。
        </p>
      </div>

      <div className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-200 shadow-sm">
        <h4 className="text-lg font-semibold text-gray-800 mb-3">公式说明</h4>
        <div className="space-y-4 text-gray-800 leading-relaxed text-base">
          <div>
            <p className="mb-2">其中，MSE<sub>i</sub> 即模型 i 在验证集上的残差均方误差：</p>
            <div className="bg-white p-4 rounded border border-blue-200 font-mono text-center">
              MSE<sub>i</sub> = (1/n)Σ(y<sub>真实</sub> - y<sub>预测,i</sub>)<sup>2</sup>
            </div>
          </div>

          <div>
            <p className="mb-2">模型 i 的权重 w<sub>i</sub> 计算公式为：</p>
            <div className="bg-white p-4 rounded border border-blue-200 font-mono text-center">
              v<sub>i</sub> = [1/(MSE<sub>i</sub> + ε)] / Σ[1/(MSE<sub>j</sub> + ε)]
              <br />w<sub>i</sub> = ρv<sub>i</sub> + (1-ρ)/K, ρ=n/(n+K+1)
            </div>
            <p className="mt-3 text-sm text-gray-700">
              v<sub>i</sub> 是MSE倒数归一化后的候选权重，n是内部时间验证点数，K是成员模型数，ρ是由样本数决定的启发式收缩系数，而不是经过统计估计的可靠度。ε不是固定的任意小数，而是随目标数据尺度调整的数值稳定项，用于避免MSE接近0时倒数溢出。
            </p>
          </div>

          <div>
            <p className="mb-2">最终预测值为各模型预测值的加权平均：</p>
            <div className="bg-white p-4 rounded border border-blue-200 font-mono text-center">
              y<sub>最终</sub> = Σ(w<sub>i</sub> × y<sub>i</sub>)
            </div>
          </div>
        </div>
      </div>

      <div className="p-5 bg-green-50 rounded-lg border border-green-200">
        <h4 className="text-base font-semibold text-gray-800 mb-3">方法特点</h4>
        <div className="space-y-2 text-gray-700 leading-relaxed text-base">
          <p>
            <strong>训练期数据驱动权重：</strong>系统根据内部时间验证段的残差MSE计算一次权重；产物用于预测时权重保持固定，只有重新训练才会更新。
          </p>
          <p>
            <strong>分散模型风险：</strong>当成员误差不完全同步时，组合可能比单一成员更稳定；这不是必然保证。
          </p>
          <p>
            <strong>简单易实现：</strong>计算方法直观明了，易于理解和实施。
          </p>
        </div>
      </div>

      <div className="p-5 bg-sky-50 rounded-lg border border-sky-200">
        <h4 className="text-base font-semibold text-gray-800 mb-3">本系统实现说明</h4>
        <p className="text-gray-700 leading-relaxed text-base mb-3">
          系统按模型数、样本量和所有成员的可训练条件动态留出时间末段。先用带数据尺度 ε 的 1/MSE 得到候选权重，再按验证点数决定的启发式系数向等权组合收缩，避免短验证段把权重几乎全押在单一成员。本实现仍不估计成员误差协方差。
        </p>
        <p className="text-gray-700 leading-relaxed text-base">
          内部验证只继承用户选择的 MA 窗口、ES α、ARIMA d 与 LSTM 历史特征/归一化。ARIMA 阶数和 LSTM 的 look-back、容量、批大小、轮数都按当前前缀重新推导，避免完整训练段的信息泄漏；LSTM 不接收任何已知未来特征。名义 95% 范围与名义 99% 上侧误差复用计算权重的同一个时间留出段的一次固定预测原点跨 horizon 组合残差，并继承成员逐 horizon 增长形状；它们明确标记为未校准、无覆盖率保证。独立评估真实值不参与估计，最终销量区间限制为非负并保证包含点预测。
        </p>
      </div>
    </div>
  );
};

export default Intro;
