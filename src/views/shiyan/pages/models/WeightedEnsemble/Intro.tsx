import React from 'react';

const Intro: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-800 mb-4">加权平均融合 - 方法步骤</h3>
      </div>

      <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200 shadow-sm">
        <h4 className="text-lg font-semibold text-gray-800 mb-3">方差倒数法</h4>
        <p className="text-gray-800 leading-relaxed text-base mb-4">
          方差倒数法也称为预测误差平方和倒数法，这是一种常见的用来给组合预测模型确定权系数的方法，它是通过误差平方和的大小确定权重，即对误差平方和小的模型赋以高权重。
        </p>
        <p className="text-gray-800 leading-relaxed text-base">
          一般来说每种单项预测模型的预测精度不同，预测误差平方和是反映预测精度的一个指标。预测误差平方和越大，表明该项预测模型的预测精度越低，从而它在组合预测中的重要性就降低。重要性的降低表现为它在组合预测模型的组合预测中应赋予较小的加权系数。
        </p>
      </div>

      <div className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-200 shadow-sm">
        <h4 className="text-lg font-semibold text-gray-800 mb-3">公式说明</h4>
        <div className="space-y-4 text-gray-800 leading-relaxed text-base">
          <div>
            <p className="mb-2">其中，Q<sub>i</sub> 即真实值与预测值之间差值的平方和：</p>
            <div className="bg-white p-4 rounded border border-blue-200 font-mono text-center">
              Q<sub>i</sub> = Σ(y<sub>真实</sub> - y<sub>预测,i</sub>)<sup>2</sup>
            </div>
          </div>

          <div>
            <p className="mb-2">模型 i 的权重 w<sub>i</sub> 计算公式为：</p>
            <div className="bg-white p-4 rounded border border-blue-200 font-mono text-center">
              w<sub>i</sub> = (1/Q<sub>i</sub>) / Σ(1/Q<sub>j</sub>)
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
    </div>
  );
};

export default Intro;
