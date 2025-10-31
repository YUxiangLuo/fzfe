import React, { useEffect } from 'react';
import { Shield, ArrowRight, CheckCircle } from 'lucide-react';
import { useProductionPlan } from '../ProductionPlanContextV2';

const ConceptStep3: React.FC = () => {
  const { state, fillPeriod2Field, completeCurrentStep } = useProductionPlan();

  // 自动计算并填充安全库存
  useEffect(() => {
    if (state.period2Data.safetyStock === null) {
      const safetyStock = Math.round(state.safetyStockZScore * state.demoStdDev);
      fillPeriod2Field('safetyStock', safetyStock);
    }
  }, []);

  const safetyStock = state.period2Data.safetyStock || Math.round(state.safetyStockZScore * state.demoStdDev);

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
          <Shield className="w-6 h-6 text-orange-600" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-gray-900">第2列：安全库存</h3>
          <p className="text-sm text-orange-600">Safety Stock</p>
        </div>
      </div>

      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <h4 className="font-semibold text-orange-800 mb-2">🛡️ 什么是安全库存？</h4>
        <p className="text-sm text-orange-700 mb-2">
          安全库存是用于应对需求不确定性的缓冲库存。由于预测不可能100%准确，我们需要额外准备一些库存来应对预测误差和突发需求波动，从而保障目标服务水平。
        </p>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-semibold text-gray-800 mb-3">计算公式</h4>
        <div className="bg-white border border-gray-200 rounded-lg p-3 text-center mb-3">
          <p className="text-lg font-mono text-gray-800">
            <span className="font-bold text-orange-600">安全库存</span> ={' '}
            <span className="font-bold text-blue-600">Z分数</span> ×{' '}
            <span className="font-bold text-purple-600">预测标准差 σ</span>
          </p>
        </div>
        <div className="space-y-2 text-sm text-gray-700">
          <p>
            • <strong>Z分数</strong>：根据目标服务水平{(state.targetServiceLevel * 100).toFixed(0)}%确定，Z = {state.safetyStockZScore}
          </p>
          <p>
            • <strong>预测标准差 σ</strong>：来自 <strong>步骤2</strong> 中模型的预测区间，衡量预测值的波动性。
            当前模型给出的 σ = {state.demoStdDev.toFixed(2)}
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h4 className="font-semibold text-gray-800 mb-3">第2期的安全库存</h4>
        <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">计算结果：</p>
              <p className="text-3xl font-bold text-orange-600 mt-1">
                {safetyStock.toLocaleString()} <span className="text-lg">件</span>
              </p>
              <p className="text-xs text-gray-500 mt-2">
                = {state.safetyStockZScore} × {state.demoStdDev.toFixed(2)} ≈ {safetyStock}
              </p>
            </div>
            {state.period2Data.safetyStock !== null && (
              <CheckCircle className="w-8 h-8 text-green-600" />
            )}
          </div>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-semibold text-gray-800 mb-2">👉 查看右侧表格</h4>
        <p className="text-sm text-gray-700">
          现在查看右侧MPS表格的<strong className="text-blue-900">第2期第2列（安全库存）</strong>，已经自动填充了 {safetyStock} 件！
        </p>
      </div>

      <button
        onClick={completeCurrentStep}
        className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 shadow-md hover:shadow-lg transition-all font-medium"
      >
        <span>理解了，学习下一个变量：计划生产</span>
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
};

export default ConceptStep3;
