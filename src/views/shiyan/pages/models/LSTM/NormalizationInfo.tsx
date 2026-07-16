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
          在机器学习和深度学习中，不同特征的数值范围可能差异很大。数据标准化可以减轻不同尺度对优化过程的影响，通常有助于模型训练更加稳定高效。
        </p>
        <p className="text-gray-800 leading-relaxed text-base">
          对于神经网络，合适的尺度通常有助于优化过程更稳定；但缩放不能单独保证消除梯度爆炸或梯度消失。本系统还在 Adam 中使用 clipnorm=1.0 控制梯度范数。
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
            <strong>特点：</strong>用训练区间的最小值和最大值做线性变换，因此训练范围内的值通常落在 [0,1]。评估或未来值超出训练范围时，变换结果可小于0或大于1。
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
            <strong>特点：</strong>用训练均值和标准差做线性变换，使训练样本的该数值列均值约为0、标准差约为1；它不会改变分布形状，也不会自动产生标准正态分布。
          </p>
          <p className="leading-relaxed">
            <strong>适用场景：</strong>不希望把特征限制在固定区间，或更关心相对训练均值的偏离程度时。
          </p>
          <p className="leading-relaxed">
            <strong>优点：</strong>没有固定上下界，超出训练范围的新值仍可自然表示为更大的正负标准分数。
          </p>
          <p className="leading-relaxed">
            <strong>缺点：</strong>均值和标准差都受异常值影响，因此普通Z-score并不是稳健缩放方法；变换后的数据也没有固定范围。
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
            <strong>使用 Z-score 标准化：</strong>当不需要固定范围，并希望按训练均值与标准差表达相对偏离时。若离群值明显，两种方法都应先检查数据质量；本系统未实现RobustScaler。
          </p>
        </div>
      </div>

      <div className="p-5 bg-sky-50 rounded-lg border border-sky-200">
        <h4 className="text-base font-semibold text-gray-800 mb-2">本系统的拟合边界</h4>
        <p className="text-gray-700 leading-relaxed text-base">
          MinMax或Z-score参数只从训练区间计算；类别字段不做数值缩放，而是只用训练区间拟合One-Hot编码器。评估区间不会参与这些参数的估计。
        </p>
      </div>
    </div>
  );
};

export default NormalizationInfo;
