import React, { useEffect, useMemo } from 'react';
import { Calculator, ArrowRight, CheckCircle } from 'lucide-react';
import { useProductionPlan } from '../ProductionPlanContextV2';

const ConceptStep4: React.FC = () => {
  const { state, fillPeriod2Field, completeCurrentStep } = useProductionPlan();

  const demandForecast = state.period2Data.demandForecast ?? null;
  const safetyStock = state.period2Data.safetyStock ?? null;
  const previousStockout = state.period1Data.stockout ?? 0;
  const inferredBeginningInventory =
    state.period2Data.beginningInventory ??
    state.period1Data.endingInventory ??
    state.initialInventory;

  const computedPlannedProduction = useMemo(() => {
    if (demandForecast === null || safetyStock === null) return null;
    return Math.max(
      0,
      demandForecast + safetyStock + previousStockout - inferredBeginningInventory
    );
  }, [demandForecast, safetyStock, previousStockout, inferredBeginningInventory]);

  // 自动计算并填充计划生产量
  useEffect(() => {
    if (computedPlannedProduction === null) {
      return;
    }

    if (state.period2Data.plannedProduction !== computedPlannedProduction) {
      fillPeriod2Field('plannedProduction', computedPlannedProduction);
    }
  }, [computedPlannedProduction, state.period2Data.plannedProduction, fillPeriod2Field]);

  const demandForDisplay = demandForecast ?? 0;
  const safetyForDisplay = safetyStock ?? 0;
  const plannedProduction =
    state.period2Data.plannedProduction ?? (computedPlannedProduction ?? 0);

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

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-semibold text-gray-800 mb-2">🎯 什么是计划生产量？</h4>
        <p className="text-sm text-gray-700">
          计划生产量是我们下达给生产线的目标生产数量。它不仅要满足预测的市场需求，还要补足上一期的缺货，并在满足需求后保留足够的安全库存。
        </p>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-semibold text-gray-800 mb-3">计算公式</h4>
        <div className="bg-white border border-gray-200 rounded-lg p-4 text-center mb-3">
          <p className="text-lg font-mono text-gray-800">
            <span className="font-bold text-blue-600">计划生产量</span> ={' '}
            <span className="font-bold text-green-600">预测需求</span> +{' '}
            <span className="font-bold text-orange-600">安全库存</span> +{' '}
            <span className="font-bold text-purple-600">上期缺货</span> -{' '}
            <span className="font-bold text-cyan-600">可用期初库存</span>
          </p>
          <p className="text-xs text-gray-500 mt-2">若结果小于 0，则取 0，表示库存充足无需生产。</p>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-white border border-gray-200 p-3 rounded">
            <p className="text-gray-600">预测需求</p>
            <p className="text-xl font-bold text-green-600">{demandForDisplay.toLocaleString()}</p>
          </div>
          <div className="bg-white border border-gray-200 p-3 rounded">
            <p className="text-gray-600">安全库存</p>
            <p className="text-xl font-bold text-orange-600">{safetyForDisplay.toLocaleString()}</p>
          </div>
          <div className="bg-white border border-gray-200 p-3 rounded">
            <p className="text-gray-600">需要补的缺货</p>
            <p className="text-xl font-bold text-purple-600">
              {previousStockout.toLocaleString()}
            </p>
          </div>
          <div className="bg-white border border-gray-200 p-3 rounded">
            <p className="text-gray-600">可用期初库存</p>
            <p className="text-xl font-bold text-cyan-600">
              {inferredBeginningInventory.toLocaleString()}
            </p>
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
              {computedPlannedProduction !== null && (
                <p className="text-xs text-gray-500 mt-2">
                  = {demandForDisplay.toLocaleString()} + {safetyForDisplay.toLocaleString()} +{' '}
                  {previousStockout.toLocaleString()} - {inferredBeginningInventory.toLocaleString()}
                </p>
              )}
            </div>
            {state.period2Data.plannedProduction !== null && (
              <CheckCircle className="w-8 h-8 text-green-600" />
            )}
          </div>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-semibold text-gray-800 mb-2">💡 为什么这样计算？</h4>
        <p className="text-sm text-gray-700">
          只生产预测需求量是不够的，还需要考虑上一期是否有缺货，以及期初已经有多少库存。这样才能在满足需求后仍保留{(
            state.targetServiceLevel * 100
          ).toFixed(0)}
          % 服务水平所需的安全库存。
        </p>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-semibold text-gray-800 mb-2">👉 查看右侧表格</h4>
        <p className="text-sm text-gray-700">
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
