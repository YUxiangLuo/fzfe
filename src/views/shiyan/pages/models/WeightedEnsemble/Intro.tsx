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
          一般来说每种单项预测模型的预测精度不同，MSE是反映预测误差大小的一个指标。与只看残差方差相比，MSE还会惩罚系统性高估或低估，因此更适合本系统的未来销量预测任务。
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
        <h4 className="text-base font-semibold text-gray-800 mb-3">方法优势</h4>
        <div className="space-y-2 text-gray-700 leading-relaxed text-base">
          <p>
            <strong>自适应权重分配：</strong>根据各模型的预测精度自动调整权重，精度高的模型获得更大权重。
          </p>
          <p>
            <strong>提高预测稳定性：</strong>通过融合多个模型的预测结果，降低单一模型的偏差和波动。
          </p>
          <p>
            <strong>简单易实现：</strong>计算方法直观明了，易于理解和实施。
          </p>
        </div>
      </div>

      <div className="p-5 bg-sky-50 rounded-lg border border-sky-200">
        <h4 className="text-base font-semibold text-gray-800 mb-3">本系统实现说明</h4>
        <p className="text-gray-700 leading-relaxed text-base">
          系统按时间顺序从训练区间中留出一段权重验证集，计算各基础模型在该验证段上的残差均方误差，并按MSE倒数归一化得到权重。这是逆方差加权思想在预测误差可能有偏时的教学化改写；在残差近似无偏时，MSE与方差口径一致。
        </p>
      </div>
    </div>
  );
};

export default Intro;
