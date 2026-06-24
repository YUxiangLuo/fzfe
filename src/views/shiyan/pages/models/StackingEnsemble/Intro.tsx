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
          常见 Stacking 会使用交叉验证预测训练元模型。本系统面向时间序列销量预测，使用训练数据的前段训练基本模型，并将基本模型对后续留出数据的预测结果作为新的训练数据来训练元模型，从而产生最终的预测结果。
        </p>
      </div>

      <div className="p-6 bg-gradient-to-br from-green-50 to-lime-50 rounded-lg border border-green-200 shadow-sm">
        <h4 className="text-lg font-semibold text-gray-800 mb-3">方法优势</h4>
        <ul className="space-y-2 text-gray-800 leading-relaxed text-base list-disc list-inside">
          <li>能够结合多个不同类型的基本模型，更好地捕捉数据中的不同特征和模式</li>
          <li>使用时间顺序留出数据来减少过拟合和时间泄漏风险</li>
          <li>提供更可靠的预测结果</li>
        </ul>
      </div>

      <div className="p-5 bg-sky-50 rounded-lg border border-sky-200">
        <h4 className="text-base font-semibold text-gray-800 mb-3">本系统实现说明</h4>
        <p className="text-gray-700 leading-relaxed text-base">
          普通K折交叉验证会打乱时间顺序，不适合未来销量预测。本系统按时间顺序拆分 Level-0 和 Level-1：基础模型在前段训练，对后段预测；元模型使用这些留出预测学习非负无截距线性权重，并将权重归一化。样本不足或共线性严重时，系统会回退为 inverse-MAE 权重。
        </p>
      </div>
    </div>
  );
};

export default Intro;
