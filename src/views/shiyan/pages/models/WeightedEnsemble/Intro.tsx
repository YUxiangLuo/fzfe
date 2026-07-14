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
              w<sub>i</sub> = [1/(MSE<sub>i</sub> + ε)] / Σ[1/(MSE<sub>j</sub> + ε)]
            </div>
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
            <strong>自适应权重分配：</strong>根据各模型的预测精度自动调整权重，精度高的模型获得更大权重。
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
          系统按时间顺序留出末段验证集：训练点8–15时通常留2–3点，更长时约留20%。每个成员只用前段训练，再计算验证MSE，按1/(MSE+10⁻⁹)归一化权重。本实现没有估计成员误差协方差，短验证段也会使权重波动；成员销量预测先截断为不小于0，组合结果也做非负兜底，指标和std_dev使用同一最终预测。评估点不足2个时，std_dev使用内部验证组合残差估计。
        </p>
        <p className="text-gray-700 leading-relaxed text-base">
          内部验证保持成员的必要定义一致：MA 沿用窗口、ES 沿用 α，LSTM 沿用 look_back、epochs、特征和归一化配置；由于样本段与预测跨度改变，LSTM 的动态隐藏单元、批大小和输出宽度按单模型的同一规则重算。ARIMA 只沿用用户固定的 d，并在验证段之前的数据上重新执行同一套 AIC/BIC stepwise 搜索；若直接使用完整训练段选出的 p、q，会让留出段间接参与自己的预测。独立评估通常复用完整训练产物；仅当 LSTM 已保存的直接预测长度不足时，才保持上述单模型配置并在完整训练段重新拟合、扩展输出长度。
        </p>
      </div>
    </div>
  );
};

export default Intro;
