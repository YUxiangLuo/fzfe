import React, { useEffect } from 'react';
import { Calculator, ArrowRight, CheckCircle } from 'lucide-react';
import { useProductionPlan } from '../ProductionPlanContextV2';

const ConceptStep4: React.FC = () => {
  const { state, fillPeriod2Field, completeCurrentStep } = useProductionPlan();

  // 自动计算并填充计划生产量
  useEffect(() => {
    if (state.period2Data.plannedProduction === null) {
      const demandForecast = state.period2Data.demandForecast || 0;
      const safetyStock = state.period2Data.safetyStock || 0;
      const plannedProduction = demandForecast + safetyStock;
      fillPeriod2Field('plannedProduction', plannedProduction);
    }
  }, []);

  const demandForecast = state.period2Data.demandForecast || 0;
  const safetyStock = state.period2Data.safetyStock || 0;
  const plannedProduction = state.period2Data.plannedProduction || (demandForecast + safetyStock);

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
          <Calculator className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-gray-900">第3列：计划生产量</h3>
          <p className="text-sm text-blue-600">Planned Production</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-800 mb-2">🎯 什么是计划生产量？</h4>
        <p className="text-sm text-blue-700">
          计划生产量是我们下达给生产线的目标生产数量。它不仅要满足预测的市场需求，还需要额外准备安全库存来应对需求波动，从而保障目标服务水平。
        </p>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-semibold text-gray-800 mb-3">计算公式</h4>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center mb-3">
          <p className="text-lg font-mono text-gray-800">
            <span className="font-bold text-blue-600">计划生产量</span> ={' '}
            <span className="font-bold text-green-600">预测需求</span> +{' '}
            <span className="font-bold text-orange-600">安全库存</span>
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-green-50 p-3 rounded border border-green-200">
            <p className="text-gray-600">预测需求</p>
            <p className="text-xl font-bold text-green-600">{demandForecast.toLocaleString()}</p>
          </div>
          <div className="bg-orange-50 p-3 rounded border border-orange-200">
            <p className="text-gray-600">安全库存</p>
            <p className="text-xl font-bold text-orange-600">{safetyStock.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h4 className="font-semibold text-gray-800 mb-3">第2期的计划生产量</h4>
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">计算结果：</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">
                {plannedProduction.toLocaleString()} <span className="text-lg">件</span>
              </p>
              <p className="text-xs text-gray-500 mt-2">
                = {demandForecast.toLocaleString()} + {safetyStock.toLocaleString()} = {plannedProduction.toLocaleString()}
              </p>
            </div>
            {state.period2Data.plannedProduction !== null && (
              <CheckCircle className="w-8 h-8 text-green-600" />
            )}
          </div>
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="font-semibold text-green-800 mb-2">💡 为什么这样计算？</h4>
        <p className="text-sm text-green-700">
          只生产预测需求量是不够的，因为预测不可能100%准确。通过增加安全库存，我们能够应对需求的正常波动，避免缺货，从而达到目标服务水平{(state.targetServiceLevel * 100).toFixed(0)}%。
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-800 mb-2">👉 查看右侧表格</h4>
        <p className="text-sm text-blue-700">
          现在查看右侧MPS表格的<strong className="text-blue-900">第2期第3列（计划生产）</strong>，已经自动填充了 {plannedProduction.toLocaleString()} 件！
        </p>
      </div>

      <button
        onClick={completeCurrentStep}
        className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md hover:shadow-lg transition-all font-medium"
      >
        <span>理解了，学习下一个变量：期初库存</span>
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
};

export default ConceptStep4;
