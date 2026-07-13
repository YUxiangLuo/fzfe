import React from 'react';

const InformationCriteriaInfo: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-800 mb-4">信息准则函数法 (AIC/BIC)</h3>
        <p className="text-gray-600">信息准则函数法是统计模型选择中常用的方法，主要包括赤池信息准则（AIC）和贝叶斯信息准则（BIC）。它们用于评估模型的拟合优度和复杂性，帮助选择最佳模型。</p>
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
            AIC值越小，表示模型越好。它鼓励选择拟合优度高且参数较少的模型，以避免过拟合。
          </p>
        </section>

        <section className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800">2. 贝叶斯信息准则 (BIC)</h3>
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
            BIC值越小，表示模型越好。由于其对参数数量的惩罚项中包含了样本大小 <code className="bg-gray-200 p-1 rounded">ln(n)</code>，当样本量较大时，BIC会倾向于选择更简单的模型。
          </p>
        </section>

        <section className="p-5 bg-amber-50 rounded-lg border border-amber-200">
          <h3 className="text-lg font-semibold text-gray-800">AIC 与 BIC 的比较</h3>
          <ul className="list-disc list-inside ml-4 mt-2">
            <li>AIC倾向于选择更复杂的模型，因为它对模型复杂度的惩罚相对较轻。</li>
            <li>BIC倾向于选择更简单的模型，因为它对模型复杂度的惩罚更重，尤其是在样本量较大时。</li>
            <li>在实际应用中，可以同时参考AIC和BIC来选择模型。</li>
          </ul>
        </section>
      </div>
    </div>
  );
};

export default InformationCriteriaInfo;
