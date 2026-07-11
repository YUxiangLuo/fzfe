import React from 'react';

const NormalizationInfo: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-800 mb-4">标准化介绍</h3>
      </div>

      <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200 shadow-sm">
        <h4 className="text-lg font-semibold text-gray-800 mb-3">为什么需要数据标准化？</h4>
        <p className="text-gray-800 leading-relaxed text-base mb-4">
          在机器学习和深度学习中，不同特征的数值范围可能差异很大。数据标准化可以消除量纲影响，使模型训练更加稳定高效。
        </p>
        <p className="text-gray-800 leading-relaxed text-base">
          对于神经网络模型，标准化还能加速梯度下降的收敛速度，防止梯度爆炸或梯度消失问题。
        </p>
      </div>

      <div className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-200 shadow-sm">
        <h4 className="text-lg font-semibold text-gray-800 mb-3">最小-最大归一化（Min-Max Normalization）</h4>
        <div className="my-4 p-4 bg-white rounded-lg shadow-sm">
          <code className="text-base font-mono text-gray-800">
            X' = (X - X<sub>min</sub>) / (X<sub>max</sub> - X<sub>min</sub>)
          </code>
        </div>
        <div className="space-y-3 text-gray-800 text-base">
          <p className="leading-relaxed">
            <strong>特点：</strong>将数据线性变换到 [0, 1] 区间，保持原始数据的分布形状。
          </p>
          <p className="leading-relaxed">
            <strong>适用场景：</strong>当需要将数据压缩到特定范围时，例如神经网络的激活函数输入、图像像素值处理等。
          </p>
          <p className="leading-relaxed">
            <strong>优点：</strong>简单直观，适合数据分布相对均匀的情况。
          </p>
          <p className="leading-relaxed">
            <strong>缺点：</strong>对异常值敏感，一个极端值可能导致其他数据被压缩到很小的区间。
          </p>
        </div>
      </div>

      <div className="p-6 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200 shadow-sm">
        <h4 className="text-lg font-semibold text-gray-800 mb-3">Z-score 标准化（Z-score Standardization）</h4>
        <div className="my-4 p-4 bg-white rounded-lg shadow-sm">
          <code className="text-base font-mono text-gray-800">
            X' = (X - μ) / σ
          </code>
        </div>
        <div className="space-y-2 text-gray-700 text-base mb-3">
          <p><strong>μ</strong>：数据的均值（mean）</p>
          <p><strong>σ</strong>：数据的标准差（standard deviation）</p>
        </div>
        <div className="space-y-3 text-gray-800 text-base">
          <p className="leading-relaxed">
            <strong>特点：</strong>将数据缩放为均值为 0、标准差为 1。它只改变数据的量纲和中心位置，并不会改变数据的分布形状。
          </p>
          <p className="leading-relaxed">
            <strong>适用场景：</strong>当数据的最大值和最小值未知，或数据中存在离群值时使用。
          </p>
          <p className="leading-relaxed">
            <strong>优点：</strong>相比最小-最大归一化，个别极端值不会把其余数据压缩到很窄的区间，量程更稳定。
          </p>
          <p className="leading-relaxed">
            <strong>缺点：</strong>标准化后的数据没有固定的取值范围，可能不适合某些特定算法。
          </p>
        </div>
      </div>

      <div className="p-5 bg-amber-50 rounded-lg border border-amber-200">
        <h4 className="text-base font-semibold text-gray-800 mb-2">选择建议</h4>
        <div className="space-y-2 text-gray-700 leading-relaxed text-base">
          <p>
            <strong>使用最小-最大归一化：</strong>当数据分布相对均匀，没有明显异常值，且需要将数据限制在特定范围时。
          </p>
          <p>
            <strong>使用 Z-score 标准化：</strong>当数据中存在离群值，或不确定数据的取值范围时，这种方法更加稳健。
          </p>
        </div>
      </div>
    </div>
  );
};

export default NormalizationInfo;
