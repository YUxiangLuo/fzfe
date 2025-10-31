import React, { useEffect } from 'react';
import { Package, ArrowRight } from 'lucide-react';
import { useProductionPlan } from '../ProductionPlanContextV2';

// 步骤5：期初库存（待完整实现）
const ConceptStep5: React.FC = () => {
  const { state, fillPeriod2Field, completeCurrentStep } = useProductionPlan();

  useEffect(() => {
    if (state.period2Data.beginningInventory === null && state.period1Data.endingInventory !== null) {
      // 🔄 第2期的期初库存 = 第1期的期末库存（体现MPS的连续性）
      fillPeriod2Field('beginningInventory', state.period1Data.endingInventory);
    }
  }, [state.period1Data.endingInventory]);

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
          <Package className="w-6 h-6 text-purple-600" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-gray-900">第4列：期初库存</h3>
          <p className="text-sm text-purple-600">Beginning Inventory</p>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-semibold text-gray-800 mb-2">📦 什么是期初库存？</h4>
        <p className="text-sm text-gray-700 mb-3">
          期初库存是每期开始时的可用库存量。它体现了MPS的<strong>连续性</strong>：每期的期初库存等于上一期的期末库存。
        </p>
        <div className="bg-white p-3 rounded border border-gray-200">
          <p className="text-xs text-gray-700 mb-2">
            <strong>📊 第2期的期初库存计算：</strong>
          </p>
          <p className="text-sm text-gray-800">
            第2期期初库存 = 第1期期末库存 = <strong>{state.period1Data.endingInventory !== null ? state.period1Data.endingInventory.toLocaleString() : '-'} 件</strong>
          </p>
          <p className="text-xs text-gray-600 mt-2">
            💡 这就是为什么第1期的运营结果会影响第2期的计划！
          </p>
        </div>
      </div>

      <button
        onClick={completeCurrentStep}
        className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 shadow-md transition-all font-medium"
      >
        <span>继续学习：产出量</span>
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
};

export default ConceptStep5;
