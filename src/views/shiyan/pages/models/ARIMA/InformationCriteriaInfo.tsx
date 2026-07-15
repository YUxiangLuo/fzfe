import React from 'react';

const InformationCriteriaInfo: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-800 mb-4">信息准则函数法（AIC、AICc 与 BIC）</h3>
        <p className="text-gray-600">AIC、AICc 与 BIC 都用于在同一数据和似然口径下比较候选模型。本系统实际只以 AICc 作为 ARIMA stepwise 搜索目标；AIC 与 BIC 在此作为理解复杂度惩罚差异的背景知识。</p>
      </div>
      <div className="space-y-4 text-gray-700">
        <section className="p-6 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800">1. 赤池信息准则 (AIC)</h3>
          <p className="mt-2">
            AIC（Akaike Information Criterion）是由日本统计学家赤池弘次提出的，用于衡量统计模型的相对质量。它在评估模型时，不仅考虑了模型对数据的拟合程度，还考虑了模型的复杂性。
          </p>
          <div className="my-4 p-4 bg-white rounded-lg shadow-sm">
            <code className="text-base font-mono text-gray-800">AIC = 2k - 2ln(L)</code>
          </div>
          <ul className="list-disc list-inside ml-4 mt-2">
            <li><code className="bg-gray-200 p-1 rounded">k</code> 是模型中独立参数的数量。</li>
            <li><code className="bg-gray-200 p-1 rounded">L</code> 是模型的最大似然值。</li>
          </ul>
          <p className="mt-2">
            在同一数据和似然口径的候选之间，AIC越小越受偏好。复杂度惩罚可以控制过拟合风险，但不能保证避免过拟合。
          </p>
        </section>

        <section className="p-6 bg-gradient-to-br from-sky-50 to-indigo-50 rounded-lg border border-sky-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800">2. 小样本修正赤池信息准则 (AICc)</h3>
          <p className="mt-2">
            当样本量相对参数数目不大时，AICc 在 AIC 上增加有限样本修正项；样本量增大时，该修正逐渐趋近于零。
          </p>
          <div className="my-4 p-4 bg-white rounded-lg shadow-sm">
            <code className="text-base font-mono text-gray-800">AICc = AIC + 2k(k+1) / (n-k-1)</code>
          </div>
          <p className="mt-2">
            公式要求 n&gt;k+1；本系统还会按差分后有效样本数收紧 p/q 搜索边界，避免在小样本上放入过多参数。
          </p>
        </section>

        <section className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800">3. 贝叶斯信息准则 (BIC)</h3>
          <p className="mt-2">
            BIC（Bayesian Information Criterion）又称施瓦茨信息准则（Schwarz Information Criterion, SIC），是由吉迪恩·施瓦茨提出的。与AIC类似，BIC也用于模型选择，但它对模型复杂度的惩罚更重。
          </p>
          <div className="my-4 p-4 bg-white rounded-lg shadow-sm">
            <code className="text-base font-mono text-gray-800">BIC = k ln(n) - 2ln(L)</code>
          </div>
          <ul className="list-disc list-inside ml-4 mt-2">
            <li><code className="bg-gray-200 p-1 rounded">k</code> 是模型中独立参数的数量。</li>
            <li><code className="bg-gray-200 p-1 rounded">n</code> 是观测值的数量（样本大小）。</li>
            <li><code className="bg-gray-200 p-1 rounded">L</code> 是模型的最大似然值。</li>
          </ul>
          <p className="mt-2">
            在可比候选之间，BIC越小越受偏好。其参数惩罚包含样本量 <code className="bg-gray-200 p-1 rounded">ln(n)</code>，通常比AIC更偏向简单模型。
          </p>
        </section>

        <section className="p-5 bg-amber-50 rounded-lg border border-amber-200">
          <h3 className="text-lg font-semibold text-gray-800">AIC 与 BIC 的比较</h3>
          <ul className="list-disc list-inside ml-4 mt-2">
            <li>AIC倾向于选择更复杂的模型，因为它对模型复杂度的惩罚相对较轻。</li>
            <li>BIC倾向于选择更简单的模型，因为它对模型复杂度的惩罚更重，尤其是在样本量较大时。</li>
            <li>AIC、AICc 与 BIC 代表不同选择目标；当前系统不会再运行一次 BIC 搜索，也不会用 BIC 事后替换 AICc 优胜模型。</li>
          </ul>
        </section>

        <section className="p-5 bg-sky-50 rounded-lg border border-sky-200">
          <h3 className="text-lg font-semibold text-gray-800">本系统如何使用 AICc</h3>
          <p className="mt-2">
            用户固定 d 后，系统在差分后有效样本量自适应的 p/q 边界内运行一次 AICc stepwise 搜索；它不保证访问边界内每个组合。
          </p>
          <p className="mt-2">
            系统检查 AICc 优胜模型的收敛状态，必要时提高迭代上限重试，并记录自由度修正的 Ljung–Box 残差诊断。信息准则只比较候选模型的相对质量，不能替代独立评估和残差诊断。
          </p>
        </section>
      </div>
    </div>
  );
};

export default InformationCriteriaInfo;
