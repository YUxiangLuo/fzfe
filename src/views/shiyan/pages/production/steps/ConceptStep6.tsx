import React, { useEffect, useState } from 'react';
import { Factory, ArrowRight, AlertTriangle } from 'lucide-react';
import { useProductionPlan } from '../ProductionPlanContextV2';
import { applyCapacityConstraint } from '../utils/productionCapacityHelper';

const ConceptStep6: React.FC = () => {
  const { state, fillPeriod2Field, completeCurrentStep } = useProductionPlan();

  const [constraintInfo, setConstraintInfo] = useState<{
    isConstrained: boolean;
    capacityUtilization: number;
    shortfall: number;
  } | null>(null);

  const plannedProduction = state.period2Data.plannedProduction ?? 0;
  const beginningInventory =
    state.period2Data.beginningInventory ??
    state.period1Data.endingInventory ??
    state.initialInventory;
  const previousStockout = state.period1Data.stockout ?? 0;

  useEffect(() => {
    if (state.period2Data.plannedProduction === null) {
      return;
    }

    const result = applyCapacityConstraint(
      state.period2Data.plannedProduction,
      state.productionCapacity
    );

    if (state.period2Data.productionOutput !== result.actualOutput) {
      fillPeriod2Field('productionOutput', result.actualOutput);
    }

    setConstraintInfo((prev) => {
      if (
        prev &&
        prev.isConstrained === result.isConstrained &&
        Math.abs(prev.capacityUtilization - result.capacityUtilization) < 1e-6 &&
        Math.abs(prev.shortfall - result.shortfall) < 1e-6
      ) {
        return prev;
      }
      return {
        isConstrained: result.isConstrained,
        capacityUtilization: result.capacityUtilization,
        shortfall: result.shortfall,
      };
    });
  }, [
    fillPeriod2Field,
    state.period2Data.plannedProduction,
    state.period2Data.productionOutput,
    state.productionCapacity,
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
          <Factory className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-gray-900">第5列：产出量</h3>
          <p className="text-sm text-indigo-600">Production Output</p>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-semibold text-gray-800 mb-2">📊 什么是产出量？</h4>
        <p className="text-sm text-gray-700 mb-3">
          产出量是考虑了<strong>产能约束</strong>后，工厂实际能够生产的数量。它与"需要生产的量"可能不同，因为工厂的产能是有限的。
        </p>
        <div className="bg-white p-3 rounded border border-gray-200">
          <p className="text-xs text-gray-700 mb-2">
            <strong>计算步骤：</strong>
          </p>
          <p className="text-xs text-gray-700 mb-1">
            1️⃣ 计划生产量（上一步已计算） ={' '}
            {state.period2Data.plannedProduction !== null
              ? state.period2Data.plannedProduction.toLocaleString()
              : plannedProduction.toLocaleString()}{' '}
            件
          </p>
          {previousStockout > 0 && (
            <p className="text-xs text-orange-600 mb-1 ml-4">
              ⚠️ 含上期缺货 {previousStockout.toLocaleString()} 件，需要在本期补足
            </p>
          )}
          <p className="text-xs text-gray-700">
            2️⃣ <strong>实际产出 = min(计划生产量, 产能)</strong> = min(
            {state.period2Data.plannedProduction !== null
              ? state.period2Data.plannedProduction.toLocaleString()
              : plannedProduction.toLocaleString()}
            , {state.productionCapacity.toLocaleString()}) ={' '}
            <strong className="text-indigo-600">
              {state.period2Data.productionOutput?.toLocaleString() ?? '0'}
            </strong>
          </p>
        </div>
      </div>

      {constraintInfo && (
        <>
          {constraintInfo.isConstrained ? (
            <div className="bg-white border border-red-200 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <AlertTriangle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-gray-900 mb-1">⚠️ 产能约束生效</h4>
                  <p className="text-sm text-gray-700 mb-2">
                    本期需要生产 {plannedProduction.toLocaleString()} 件，但产能只有{' '}
                    {state.productionCapacity.toLocaleString()} 件。
                    实际只能生产 {state.period2Data.productionOutput?.toLocaleString() ?? '0'} 件，
                    <strong> 产能缺口 {constraintInfo.shortfall.toLocaleString()} 件</strong>。
                  </p>
                  {previousStockout > 0 && (
                    <p className="text-xs text-gray-600 mb-1">
                      （含上期缺货 {previousStockout.toLocaleString()} 件需要补货）
                    </p>
                  )}
                  <p className="text-xs text-gray-600">
                    💡 这会导致库存不足，可能出现缺货，影响服务水平。
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-800 mb-1">✓ 产能充足</h4>
              <p className="text-sm text-gray-700">
                本期需要生产 {plannedProduction.toLocaleString()} 件，产能为{' '}
                {state.productionCapacity.toLocaleString()} 件，产能利用率为{' '}
                <strong>{(constraintInfo.capacityUtilization * 100).toFixed(1)}%</strong>，生产能力充足。
              </p>
            </div>
          )}
        </>
      )}

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-semibold text-gray-800 mb-2">🏭 产能约束的重要性</h4>
        <p className="text-xs text-gray-700">
          在真实的生产环境中，工厂的产能是有限的（人员、设备、时间等限制）。MPS必须考虑产能约束，否则计划无法执行。
          如果经常遇到产能不足，企业需要考虑增加产能（加班、扩产、外包等）或调整需求预期。
        </p>
      </div>

      <button
        onClick={completeCurrentStep}
        className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-md transition-all font-medium"
      >
        <span>继续学习：期末库存</span>
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
};

export default ConceptStep6;
