import React, { useEffect } from 'react';
import { Package, ArrowRight } from 'lucide-react';
import { useProductionPlan } from '../ProductionPlanContextV2';

// 步骤5：期初库存（待完整实现）
const ConceptStep5: React.FC = () => {
  const { state, fillPeriod2Field, completeCurrentStep } = useProductionPlan();

  useEffect(() => {
    if (state.period2Data.beginningInventory === null) {
      // 第2期的期初库存就是设置的期初库存
      fillPeriod2Field('beginningInventory', state.initialInventory);
    }
  }, []);

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

      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
        <p className="text-sm text-purple-700">
          期初库存是每期开始时的可用库存量。对于第2期，它等于我们设置的期初库存 {state.initialInventory} 件。
        </p>
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
