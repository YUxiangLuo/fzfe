import React, { useState } from 'react';
import { PlayCircle, ArrowRight, Calculator, Info, Zap } from 'lucide-react';
import { useProductionPlan } from '../ProductionPlanContextV2';

/**
 * Step 5: 投入量（核心公式）
 * - 学习MPS的核心公式：投入量 = 预测量 - 期初库存
 * - 理解投入-产出-库存的动态平衡
 * - 考虑提前期：本期投入 → 下期产出
 */
const NewStep5: React.FC = () => {
  const { state, updatePeriod2Data, completeCurrentStep } = useProductionPlan();

  const [hasCalculated, setHasCalculated] = useState(false);

  const avgDemand = state.avgDemand;

  // 第2期数据（已在前面步骤计算）
  const period2Demand = state.period2Data.demandForecast ?? avgDemand;
  const period2SafetyStock = state.period2Data.safetyStock ?? 0;
  const period2EndingInventory = state.period2Data.endingInventory ?? 0;

  // 第3期预测（简化：与第2期相同）
  const period3Demand = avgDemand;
  const period3SafetyStock = period2SafetyStock; // 安全库存保持一致
  const period3ForecastQuantity = period3Demand + period3SafetyStock;

  // 第3期期初库存 = 第2期期末库存
  const period3BeginningInventory = period2EndingInventory;

  // 计算第2期投入量（将在第3期产出）
  const calculatePlannedProduction = (): number => {
    const plannedProduction = Math.max(0, period3ForecastQuantity - period3BeginningInventory);
    return plannedProduction;
  };

  const plannedProduction = hasCalculated ? calculatePlannedProduction() : null;

  const handleCalculate = () => {
    setHasCalculated(true);

    // 立即更新MPS表的第2期数据
    const calculatedPlannedProduction = calculatePlannedProduction();
    updatePeriod2Data({
      ...state.period2Data,
      plannedProduction: calculatedPlannedProduction,
    });
  };

  const handleNext = () => {
    if (!hasCalculated) {
      alert('请先计算投入量');
      return;
    }

    const calculatedPlannedProduction = calculatePlannedProduction();

    // 保存第2期投入量数据
    updatePeriod2Data({
      ...state.period2Data,
      plannedProduction: calculatedPlannedProduction,
    });

    completeCurrentStep();
  };

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div className="flex items-center space-x-3">
        <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
          <PlayCircle className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">第5步：投入量（核心公式）</h3>
          <p className="text-sm text-indigo-600">Planned Production - The Core MPS Formula</p>
        </div>
      </div>

      {/* 学习目标 */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-l-4 border-indigo-500 rounded-lg p-5">
        <h4 className="font-semibold text-indigo-900 mb-3 flex items-center space-x-2">
          <Info className="w-5 h-5" />
          <span>学习目标</span>
        </h4>
        <ul className="text-sm text-indigo-800 space-y-2">
          <li>• 掌握MPS的核心计算公式</li>
          <li>• 理解投入量与预测量、库存的关系</li>
          <li>• 认识提前期对生产计划的影响</li>
        </ul>
      </div>

      {/* 核心公式 */}
      <div className="bg-white border-2 border-indigo-200 rounded-lg p-5">
        <h4 className="font-semibold text-gray-800 mb-4 flex items-center space-x-2">
          <Zap className="w-6 h-6 text-yellow-500" />
          <span>MPS核心公式</span>
        </h4>

        <div className="space-y-4">
          <div className="bg-gradient-to-r from-indigo-100 to-purple-100 border-2 border-indigo-400 rounded-lg p-5">
            <div className="text-center">
              <div className="text-sm text-indigo-700 mb-2">MPS主生产计划的核心公式：</div>
              <div className="bg-white p-4 rounded-lg border-2 border-indigo-300 shadow-lg">
                <div className="font-mono text-xl font-bold text-indigo-900">
                  投入量 = 预测量 - 期初库存
                </div>
              </div>
              <div className="text-xs text-indigo-600 mt-3">
                （注意：本期投入 → 下期产出，提前期 = 1个月）
              </div>
            </div>
          </div>

          {/* 公式解释 */}
          <div className="grid md:grid-cols-3 gap-3">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h5 className="font-semibold text-blue-900 text-sm mb-1">预测量</h5>
              <p className="text-xs text-blue-800">
                下期需要准备的总量<br />
                = 实际需求 + 安全库存
              </p>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <h5 className="font-semibold text-purple-900 text-sm mb-1">期初库存</h5>
              <p className="text-xs text-purple-800">
                下期开始时已有的库存<br />
                = 本期期末库存
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <h5 className="font-semibold text-green-900 text-sm mb-1">投入量</h5>
              <p className="text-xs text-green-800">
                本期应该投入生产的量<br />
                下期才能产出使用
              </p>
            </div>
          </div>

          {/* 逻辑链路 */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h5 className="font-semibold text-amber-900 mb-2 text-sm">💡 逻辑链路：</h5>
            <div className="space-y-2 text-sm text-amber-800">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</div>
                <div>根据<strong>下期需求</strong>和<strong>目标服务水平</strong>，计算<strong>预测量</strong></div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</div>
                <div>查看下期开始时会有多少<strong>期初库存</strong>（本期期末库存）</div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</div>
                <div>计算需要<strong>补充多少</strong>才能满足预测量 → 这就是<strong>投入量</strong></div>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">4</div>
                <div><strong>本期投入</strong> → 生产1个月（提前期）→ <strong>下期产出</strong></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 第2期投入量计算 */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-300 rounded-lg p-5">
        <h4 className="font-semibold text-indigo-900 mb-4 flex items-center space-x-2">
          <Calculator className="w-5 h-5" />
          <span>第2期投入量计算（将在第3期产出）</span>
        </h4>

        <div className="space-y-4">
          {/* 数据准备 */}
          <div>
            <h5 className="text-sm font-semibold text-gray-700 mb-2">步骤1：准备第3期的数据</h5>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-blue-50 p-3 rounded border border-blue-200">
                <div className="text-xs text-blue-600">第3期实际需求</div>
                <div className="text-lg font-bold text-blue-900">{period3Demand}</div>
              </div>
              <div className="bg-amber-50 p-3 rounded border border-amber-200">
                <div className="text-xs text-amber-600">第3期安全库存</div>
                <div className="text-lg font-bold text-amber-900">{period3SafetyStock}</div>
              </div>
              <div className="bg-green-50 p-3 rounded border border-green-200">
                <div className="text-xs text-green-600">第3期预测量</div>
                <div className="text-lg font-bold text-green-900">{period3ForecastQuantity}</div>
                <div className="text-xs text-green-600 mt-1">= {period3Demand} + {period3SafetyStock}</div>
              </div>
            </div>
          </div>

          <div>
            <h5 className="text-sm font-semibold text-gray-700 mb-2">步骤2：确定第3期期初库存</h5>
            <div className="bg-purple-50 p-3 rounded border border-purple-200">
              <div className="text-xs text-purple-600">第3期期初库存 = 第2期期末库存</div>
              <div className="text-lg font-bold text-purple-900">{period3BeginningInventory}</div>
            </div>
          </div>

          {/* 计算按钮 */}
          <button
            type="button"
            onClick={handleCalculate}
            className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center space-x-2"
          >
            <Calculator className="w-5 h-5" />
            <span>应用核心公式计算投入量</span>
          </button>

          {/* 计算结果 */}
          {hasCalculated && plannedProduction !== null && (
            <div className="space-y-3 animate-fadeIn">
              <div className="border-t-2 border-indigo-200 pt-4">
                <h5 className="text-sm font-semibold text-gray-700 mb-3">计算过程：</h5>

                <div className="bg-white border-2 border-indigo-400 rounded-lg p-4 space-y-2">
                  <div className="font-mono text-sm text-gray-800 space-y-1">
                    <div className="font-bold text-indigo-900 mb-2">第2期投入量 = 第3期预测量 - 第3期期初库存</div>
                    <div className="ml-4">= {period3ForecastQuantity} - {period3BeginningInventory}</div>
                    <div className="ml-4 text-lg font-bold text-indigo-900">= {plannedProduction}</div>
                  </div>
                </div>

                {/* 可视化流程 */}
                <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-indigo-200 rounded-lg">
                  <h5 className="text-sm font-semibold text-gray-800 mb-3">📊 投入-产出时间线：</h5>

                  <div className="space-y-3">
                    {/* 第2期 */}
                    <div className="bg-white border border-indigo-300 rounded-lg p-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-xs text-gray-600">第2期（本期）</div>
                          <div className="font-bold text-indigo-900">投入生产</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-gray-600">投入量</div>
                          <div className="text-2xl font-bold text-indigo-600">{plannedProduction}</div>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center space-x-2 text-xs text-gray-500">
                        <PlayCircle className="w-4 h-4" />
                        <span>开始生产，需要1个月（提前期）...</span>
                      </div>
                    </div>

                    {/* 箭头 */}
                    <div className="flex justify-center">
                      <div className="text-indigo-400">
                        ↓ 生产周期（1个月）
                      </div>
                    </div>

                    {/* 第3期 */}
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-400 rounded-lg p-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="text-xs text-green-600">第3期（下期）</div>
                          <div className="font-bold text-green-900">产出使用</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-green-600">产出量</div>
                          <div className="text-2xl font-bold text-green-600">{plannedProduction}</div>
                        </div>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <div className="text-gray-600">期初库存</div>
                          <div className="font-bold">{period3BeginningInventory}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">产出</div>
                          <div className="font-bold text-green-600">+{plannedProduction}</div>
                        </div>
                        <div>
                          <div className="text-gray-600">可用总量</div>
                          <div className="font-bold text-blue-600">{period3BeginningInventory + plannedProduction}</div>
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-green-200">
                        <div className="text-xs text-green-700">
                          ✓ 可用总量 ({period3BeginningInventory + plannedProduction})
                          {period3BeginningInventory + plannedProduction >= period3ForecastQuantity
                            ? ` ≥ 预测量 (${period3ForecastQuantity})，满足需求！`
                            : ` < 预测量 (${period3ForecastQuantity})，可能缺货！`
                          }
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 关键洞察 */}
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-sm text-blue-900">
                    💡 <strong>关键洞察：</strong>
                    我们在第2期投入{plannedProduction}，经过1个月的生产周期，在第3期获得{plannedProduction}的产出。
                    结合第3期期初库存{period3BeginningInventory}，总共有{period3BeginningInventory + plannedProduction}可用，
                    {period3BeginningInventory + plannedProduction >= period3ForecastQuantity
                      ? '能够满足'
                      : '无法满足'
                    }第3期的预测量{period3ForecastQuantity}。
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 关键理解 */}
      <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">💡 关键理解</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>投入量 = 预测量 - 期初库存</strong>是MPS的核心公式</li>
          <li>• 必须考虑<strong>提前期</strong>：本期投入 → 下期产出</li>
          <li>• 投入量不能为负：如果期初库存已充足，投入量 = 0</li>
          <li>• 下一步我们将生成完整的多期MPS计划表</li>
        </ul>
      </div>

      {/* 下一步按钮 */}
      <div className="flex justify-end pt-4">
        <button
          type="button"
          onClick={handleNext}
          disabled={!hasCalculated}
          className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${
            hasCalculated
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 shadow-lg hover:shadow-xl'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          <span>下一步</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default NewStep5;
