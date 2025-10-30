import React, { useEffect } from 'react';
import { TrendingDown, ArrowRight } from 'lucide-react';
import { useProductionPlan } from '../ProductionPlanContextV2';

const ConceptStep7: React.FC = () => {
  const { state, fillPeriod2Field, completeCurrentStep } = useProductionPlan();

  useEffect(() => {
    if (state.period2Data.endingInventory === null) {
      const beginning = state.period2Data.beginningInventory || 0;
      const output = state.period2Data.productionOutput || 0;
      const demand = state.period2Data.demandForecast || 0;

      let endingInventory = beginning + output - demand;
      let stockout = 0;

      if (endingInventory < 0) {
        stockout = Math.abs(endingInventory);
        endingInventory = 0;
      }

      fillPeriod2Field('endingInventory', endingInventory);
      fillPeriod2Field('stockout', stockout);
    }
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <div className="w-12 h-12 bg-cyan-100 rounded-full flex items-center justify-center">
          <TrendingDown className="w-6 h-6 text-cyan-600" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-gray-900">第6-7列：期末库存与缺货</h3>
          <p className="text-sm text-cyan-600">Ending Inventory & Stockout</p>
        </div>
      </div>

      <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
        <p className="text-sm text-cyan-700">
          期末库存 = 期初库存 + 产出量 - 预测需求。如果为负，则产生缺货。
        </p>
      </div>

      <button
        onClick={completeCurrentStep}
        className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 shadow-md transition-all font-medium"
      >
        <span>继续学习：服务水平</span>
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
};

export default ConceptStep7;
