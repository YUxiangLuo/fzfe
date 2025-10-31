import React, { useEffect, useMemo } from 'react';
import { TrendingDown, ArrowRight } from 'lucide-react';
import { useProductionPlan } from '../ProductionPlanContextV2';

const ConceptStep7: React.FC = () => {
  const { state, fillPeriod2Field, completeCurrentStep } = useProductionPlan();

  const beginningInventory =
    state.period2Data.beginningInventory ??
    state.period1Data.endingInventory ??
    state.initialInventory;
  const productionOutput = state.period2Data.productionOutput ?? null;
  const demandForecast = state.period2Data.demandForecast ?? null;
  const previousStockout = state.period1Data.stockout ?? 0;

  const availableInventory = useMemo(() => {
    if (productionOutput === null) return beginningInventory;
    return beginningInventory + productionOutput;
  }, [beginningInventory, productionOutput]);

  const totalDemand = useMemo(() => {
    if (demandForecast === null) return previousStockout;
    return previousStockout + demandForecast;
  }, [previousStockout, demandForecast]);

  useEffect(() => {
    if (productionOutput === null || demandForecast === null) {
      return;
    }

    let endingInventory = availableInventory - totalDemand;
    let stockout = 0;

    if (endingInventory < 0) {
      stockout = Math.abs(endingInventory);
      endingInventory = 0;
    }

    if (state.period2Data.endingInventory !== endingInventory) {
      fillPeriod2Field('endingInventory', endingInventory);
    }
    if (state.period2Data.stockout !== stockout) {
      fillPeriod2Field('stockout', stockout);
    }
  }, [
    availableInventory,
    demandForecast,
    fillPeriod2Field,
    productionOutput,
    state.period2Data.endingInventory,
    state.period2Data.stockout,
    totalDemand,
  ]);

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

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-semibold text-gray-800 mb-2">📊 什么是期末库存和缺货？</h4>
        <p className="text-sm text-gray-700 mb-3">
          期末库存是本期结束时剩余的产品数量。如果可用库存不足以满足需求，就会产生<strong>缺货</strong>，影响客户满意度和服务水平。
        </p>
        <div className="bg-white p-3 rounded border border-gray-200">
          <p className="text-xs text-gray-700 mb-2"><strong>计算步骤：</strong></p>
          <p className="text-xs text-gray-700 mb-1">
            1️⃣ 可用库存 = 期初库存 + 本期产出
          </p>
          <p className="text-xs text-gray-700 mb-1 ml-4">
            = {beginningInventory.toLocaleString()} + {state.period2Data.productionOutput?.toLocaleString() ?? '0'} = {availableInventory.toLocaleString()}
          </p>
          <p className="text-xs text-gray-700 mb-1">
            2️⃣ 总需求 = 上期缺货（需要补） + 本期预测需求
          </p>
          <p className="text-xs text-gray-700 mb-1 ml-4">
            = {previousStockout.toLocaleString()} + {demandForecast?.toLocaleString() ?? '0'} = {totalDemand.toLocaleString()}
          </p>
          {previousStockout > 0 && (
            <p className="text-xs text-orange-600 mb-1 ml-4">
              ⚠️ 上期有 {previousStockout.toLocaleString()} 件缺货，本期必须先补上
            </p>
          )}
          <p className="text-xs text-gray-700 mb-1">
            3️⃣ 期末库存 = 可用库存 - 总需求
          </p>
          <p className="text-xs text-gray-700 ml-4">
            = {availableInventory.toLocaleString()} - {totalDemand.toLocaleString()} ={' '}
            <strong className="text-cyan-600">
              {state.period2Data.endingInventory?.toLocaleString() ?? '0'}
            </strong>
          </p>
          {state.period2Data.stockout !== null && state.period2Data.stockout > 0 && (
            <p className="text-xs text-red-600 mt-2 font-semibold">
              ❌ 出现缺货 {state.period2Data.stockout.toLocaleString()} 件！下一期需要补货。
            </p>
          )}
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-semibold text-gray-800 mb-2">🔄 MPS的连续性</h4>
        <p className="text-xs text-gray-700">
          MPS是一个<strong>滚动计划</strong>。如果本期产能不足导致缺货，这个缺货会成为下期的"债务"，下期必须优先补上。
          这就是为什么生产投入量要加上"上期缺货"，期末库存要减去"上期缺货"的原因。
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
