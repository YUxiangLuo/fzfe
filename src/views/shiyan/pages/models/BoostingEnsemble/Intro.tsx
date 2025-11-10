import React from 'react';

const Intro: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-800 mb-4">Boosting 融合 - 方法步骤</h3>
      </div>

      <div className="p-6 bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg border border-orange-200 shadow-sm">
        <h4 className="text-lg font-semibold text-gray-800 mb-3">Adaboost（Adaptive Boosting）</h4>
        <p className="text-gray-800 leading-relaxed text-base mb-4">
          Adaboost（Adaptive Boosting）是一种自适应的提升算法。其核心思想是用弱学习器组合出强学习器。每个弱学习器在训练时都会关注分类或回归错误的样本，加大这些样本的权重，以使得下一个弱学习器能够更好地学习这些错误样本的特征。
        </p>
        <p className="text-gray-800 leading-relaxed text-base">
          通过这种方式，每个弱学习器都能够对之前的错误进行纠正，从而不断提高整体模型的准确性。在 Adaboost 中，每个弱学习器的权重是通过一定的迭代方式逐步更新得到的，具体来说，每个弱学习器的权重取决于它在前一轮迭代中的误差率或残差。在训练完成后，将所有弱学习器的结果加权组合，得到最终的结果。
        </p>
      </div>

      <div className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-200 shadow-sm">
        <h4 className="text-lg font-semibold text-gray-800 mb-3">算法流程</h4>
        <div className="space-y-3 text-gray-800 leading-relaxed text-base">
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</span>
            <p className="pt-0.5">初始化样本权重，所有样本权重相等。</p>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</span>
            <p className="pt-0.5">训练弱学习器，计算该学习器的误差率。</p>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</span>
            <p className="pt-0.5">根据误差率计算弱学习器的权重。</p>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">4</span>
            <p className="pt-0.5">更新样本权重，增大错误样本的权重，减小正确样本的权重。</p>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">5</span>
            <p className="pt-0.5">重复步骤 2-4，直到达到预设的迭代次数或误差要求。</p>
          </div>
          <div className="flex gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">6</span>
            <p className="pt-0.5">将所有弱学习器的预测结果加权组合，得到最终预测。</p>
          </div>
        </div>
      </div>

      <div className="p-5 bg-green-50 rounded-lg border border-green-200">
        <h4 className="text-base font-semibold text-gray-800 mb-3">方法优势</h4>
        <div className="space-y-2 text-gray-700 leading-relaxed text-base">
          <p>
            <strong>自适应学习：</strong>自动调整样本权重，重点关注难以预测的样本。
          </p>
          <p>
            <strong>误差纠正：</strong>每个新模型都针对前一个模型的错误进行改进。
          </p>
          <p>
            <strong>准确性高：</strong>通过多个弱学习器的组合，能够达到很高的预测精度。
          </p>
        </div>
      </div>
    </div>
  );
};

export default Intro;
