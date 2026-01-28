import React, { useState } from 'react';
import { PlayCircle, ArrowRight, Calculator, Info, Zap } from 'lucide-react';
import { useProductionPlan } from '../ProductionPlanContextV2';
import { useToast } from '../../../shared/hooks/useToast';
import { Toast } from '../../../shared/components/common/Toast';

/**
 * Step 5: 投入量
 *
 * 按照客户文档重构，教学结构：
 * 1. 投入量的定义与重要性
 * 2. 投入量的计算公式与解释
 * 3. 投入量在生产计划中的应用
 *
 * 核心公式：投入量 = 预测量 - 上月库存量 + 上月缺货量
 */
const NewStep5: React.FC = () => {
  const { state, updatePeriod2Data, completeCurrentStep } = useProductionPlan();
  const { toast, showToast, hideToast } = useToast();

  const [hasCalculated, setHasCalculated] = useState(false);

  const avgDemand = state.avgDemand;

  // 第2期预测量（已在Step4计算）
  const period2DemandForecast = state.period2Data.demandForecast ?? avgDemand;
  const period2SafetyStock = state.period2Data.safetyStock ?? 0;
  const period2ForecastQuantity = period2DemandForecast + period2SafetyStock;

  // 第1期（上月）的库存量和缺货量
  const period1EndingInventory = state.period1Data.endingInventory ?? 0;
  const period1Stockout = state.period1Data.stockout ?? 0;

  // 计算第2期投入量
  // 公式：投入量 = 预测量 - 上月库存量 + 上月缺货量
  const calculatePlannedProduction = (): number => {
    const plannedProduction = Math.max(
      0,
      period2ForecastQuantity - period1EndingInventory + period1Stockout
    );
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
      showToast('请先计算投入量', 'error');
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
          <h3 className="text-xl font-bold text-gray-900">第5步：投入量</h3>
          <p className="text-sm text-indigo-600">Planned Production</p>
        </div>
      </div>

      {/* 承上启下 */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-indigo-500 rounded-lg p-5">
        <p className="text-sm text-gray-700 leading-relaxed">
          欢迎来到生产计划制定的<strong>最后一步</strong>。在之前的步骤中，我们已经详细讨论了<strong>需求量、产出量、库存量、缺货量、服务水平和预测量</strong>，并逐步构建了生产计划的核心框架。现在，我们将探讨<strong>投入量的计算方法</strong>，这是最终确定生产计划的重要一步。投入量直接决定了未来的产出量和整体生产安排。
        </p>
      </div>

      {/* Section 1: 投入量的定义与重要性 */}
      <div className="bg-white border-2 border-blue-200 rounded-lg p-5">
        <div className="flex items-start space-x-3 mb-4">
          <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
            1
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-800 mb-2">投入量的定义与重要性</h4>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            <strong>投入量</strong>是指在某一时段内，企业计划投入生产的资源或产品数量。它直接决定了未来的产出量，影响着库存水平、市场供给和整体生产效率。准确计算投入量对于确保企业能够按时满足市场需求、避免生产过剩或不足至关重要。
          </p>

          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                1
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-800 text-sm">满足市场需求</div>
                <p className="text-sm text-gray-700 mt-1">
                  投入量直接决定了未来的产出量，影响企业是否能够满足市场需求。
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                2
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-800 text-sm">控制库存</div>
                <p className="text-sm text-gray-700 mt-1">
                  投入量的合理规划有助于企业保持适当的库存水平，减少库存成本。
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                3
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-800 text-sm">资源配置</div>
                <p className="text-sm text-gray-700 mt-1">
                  准确的投入量计算可以优化企业的资源配置，提升生产效率和市场竞争力。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: 投入量的计算公式与解释 */}
      <div className="bg-white border-2 border-green-200 rounded-lg p-5">
        <div className="flex items-start space-x-3 mb-4">
          <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
            2
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-800 mb-2">投入量的计算公式与解释</h4>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            在实际操作中，投入量的计算不仅依赖于预测量，还要考虑<strong>上个月的库存量和缺货量</strong>。之前已经计算了预测量，它是生产计划的核心依据。现在，我们将结合上个月的库存量和缺货量，来确定当前月的投入量。
          </p>

          {/* 核心公式 */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-400 rounded-lg p-5">
            <div className="text-sm text-green-700 mb-3 text-center font-semibold">
              投入量的计算公式：
            </div>
            <div className="bg-white p-4 rounded-lg border-2 border-green-400 shadow-md">
              <div className="font-mono text-lg font-bold text-green-900 text-center">
                投入量 = 预测量 - 上月库存量 + 上月缺货量
              </div>
            </div>
          </div>

          {/* 细节解释 */}
          <div className="space-y-3">
            <div className="bg-blue-50 border-l-4 border-blue-400 rounded p-3">
              <div className="font-semibold text-blue-900 text-sm mb-1">• 预测量</div>
              <p className="text-sm text-blue-800">
                前一步中已经详细计算了预测量，它反映了企业对未来市场需求的预期，并考虑了安全库存的影响。
              </p>
            </div>

            <div className="bg-purple-50 border-l-4 border-purple-400 rounded p-3">
              <div className="font-semibold text-purple-900 text-sm mb-1">• 上月库存量</div>
              <p className="text-sm text-purple-800">
                这是上个月生产结束后剩余的产品数量，能够在当前月直接用于满足需求。如果上月有库存，当前月的投入量可以相应减少。
              </p>
            </div>

            <div className="bg-red-50 border-l-4 border-red-400 rounded p-3">
              <div className="font-semibold text-red-900 text-sm mb-1">• 上月缺货量</div>
              <p className="text-sm text-red-800">
                上月未能满足的需求量会在当前月被优先考虑，因此需要在当前月的投入量中补充这一部分。
              </p>
            </div>
          </div>

          {/* 固定实例讲解 */}
          <div className="bg-amber-50 border-l-4 border-amber-400 rounded-lg p-4">
            <h5 className="font-semibold text-amber-900 mb-3">📚 实例讲解：</h5>
            <p className="text-sm text-amber-800 mb-3">
              例如，假设<strong>第二个月</strong>的预测量为 <strong>1200</strong> 单位，上月（即第一个月）的库存量为 <strong>100</strong> 单位，缺货量为 <strong>50</strong> 单位，那么第二个月的投入量计算如下：
            </p>
            <div className="bg-white rounded-lg p-4 border border-amber-300">
              <div className="font-mono text-sm text-gray-800 space-y-1">
                <div>投入量 = 预测量 - 上月库存量 + 上月缺货量</div>
                <div className="ml-4">= 1200 - 100 + 50</div>
                <div className="ml-4 font-bold text-amber-900">= 1150 单位</div>
              </div>
            </div>
            <p className="text-sm text-amber-800 mt-3">
              这意味着在第二个月，企业需要投入 <strong>1150</strong> 单位的资源或产品进行生产，以确保未来的市场需求能够得到满足。
            </p>
          </div>

          {/* 关键提示 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="text-sm text-blue-800 space-y-2">
              <div>
                <strong>• 预测量的可靠性：</strong>前一步中计算出的预测量，如果精准可靠，那么当前月的投入量也会更加准确。
              </div>
              <div>
                <strong>• 库存与缺货的影响：</strong>通过合理管理库存和缺货，企业可以优化投入量的计算，减少不必要的生产浪费和库存成本。
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: 投入量在生产计划中的应用 */}
      <div className="bg-white border-2 border-indigo-200 rounded-lg p-5">
        <div className="flex items-start space-x-3 mb-4">
          <div className="w-8 h-8 bg-indigo-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
            3
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-800 mb-2">投入量在生产计划中的应用</h4>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            一旦确定了投入量，企业就可以制定具体的生产计划，安排生产任务，并合理调配资源。投入量不仅影响当前月的生产安排，还将对未来月份的生产和库存管理产生重要影响。
          </p>

          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                1
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-800 text-sm">指导生产任务</div>
                <p className="text-sm text-gray-700 mt-1">
                  投入量直接决定了企业在未来时段内的生产任务和目标。
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                2
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-800 text-sm">资源优化配置</div>
                <p className="text-sm text-gray-700 mt-1">
                  准确的投入量计算可以帮助企业合理配置生产资源，提高生产效率，降低运营成本。
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                3
              </div>
              <div className="flex-1">
                <div className="font-semibold text-gray-800 text-sm">风险管理</div>
                <p className="text-sm text-gray-700 mt-1">
                  通过合理的投入量规划，企业可以有效应对市场需求的不确定性，减少因过度生产或不足而带来的风险。
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-l-4 border-indigo-400 rounded-lg p-4 mt-4">
            <p className="text-sm text-indigo-800">
              💡 投入量是生产计划制定的最后一步，也是最终决定生产任务的重要一环。通过准确计算投入量能够确保企业在未来的生产中既能满足市场需求，又能有效控制库存和生产成本，从而提升整体运营效率和市场竞争力。
            </p>
          </div>
        </div>
      </div>

      {/* 第2期投入量计算 */}
      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-indigo-300 rounded-lg p-5">
        <h4 className="font-semibold text-indigo-900 mb-4 flex items-center space-x-2">
          <Calculator className="w-5 h-5" />
          <span>第2期投入量计算</span>
        </h4>

        <div className="space-y-4">
          {/* 数据准备 */}
          <div>
            <h5 className="text-sm font-semibold text-gray-700 mb-2">已知数据：</h5>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-green-50 p-3 rounded border border-green-200">
                <div className="text-xs text-green-600">第2期预测量</div>
                <div className="text-lg font-bold text-green-900">{period2ForecastQuantity}</div>
                <div className="text-xs text-green-600 mt-1">
                  = 需求预测 + 安全库存
                </div>
              </div>
              <div className="bg-purple-50 p-3 rounded border border-purple-200">
                <div className="text-xs text-purple-600">第1期库存量</div>
                <div className="text-lg font-bold text-purple-900">{period1EndingInventory}</div>
                <div className="text-xs text-purple-600 mt-1">上月期末库存</div>
              </div>
              <div className="bg-red-50 p-3 rounded border border-red-200">
                <div className="text-xs text-red-600">第1期缺货量</div>
                <div className="text-lg font-bold text-red-900">{period1Stockout}</div>
                <div className="text-xs text-red-600 mt-1">上月缺货</div>
              </div>
            </div>
          </div>

          {/* 计算按钮 */}
          <button
            type="button"
            onClick={handleCalculate}
            className="w-full px-4 py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center justify-center space-x-2"
          >
            <Calculator className="w-5 h-5" />
            <span>计算投入量</span>
          </button>

          {/* 计算结果 */}
          {hasCalculated && plannedProduction !== null && (
            <div className="space-y-3 animate-fadeIn">
              <div className="border-t-2 border-indigo-200 pt-4">
                <h5 className="text-sm font-semibold text-gray-700 mb-3">计算过程：</h5>

                <div className="bg-white border-2 border-indigo-400 rounded-lg p-4 space-y-2">
                  <div className="font-mono text-sm text-gray-800 space-y-1">
                    <div className="font-bold text-indigo-900 mb-2">
                      第2期投入量 = 预测量 - 上月库存量 + 上月缺货量
                    </div>
                    <div className="ml-4">= {period2ForecastQuantity} - {period1EndingInventory} + {period1Stockout}</div>
                    <div className="ml-4 text-lg font-bold text-indigo-900">= {plannedProduction}</div>
                  </div>
                </div>

                {/* 结果说明 */}
                <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg">
                  <h5 className="text-sm font-semibold text-green-900 mb-2">📊 结果说明：</h5>
                  <div className="text-sm text-green-800 space-y-2">
                    <p>
                      ✓ 第2期需要投入 <strong className="text-lg">{plannedProduction}</strong> 单位进行生产
                    </p>
                    {period1EndingInventory > 0 && (
                      <p>
                        • 由于第1期有 {period1EndingInventory} 库存，可以减少当前投入
                      </p>
                    )}
                    {period1Stockout > 0 && (
                      <p>
                        • 由于第1期有 {period1Stockout} 缺货，需要在本期补充
                      </p>
                    )}
                    <p className="pt-2 border-t border-green-200">
                      💡 这个投入量将帮助企业满足第2期的市场需求，同时考虑了上月的库存和缺货情况，确保生产计划的准确性和有效性。
                    </p>
                  </div>
                </div>

                {/* MPS表格已填充提示 */}
                <div className="mt-3 p-3 bg-white rounded-lg border border-indigo-200">
                  <p className="text-sm text-gray-700">
                    📋 <strong>MPS表第二排已填充</strong>：投入量 = {plannedProduction}
                  </p>
                  <p className="text-xs text-gray-600 mt-2">
                    💡 查看右侧MPS表格，可以看到第2期的投入量已经自动填充
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 结尾引导 */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-l-4 border-indigo-500 rounded-lg p-5">
        <p className="text-sm text-gray-700 leading-relaxed">
          ✓ 已完成第2期的投入量计算，右侧表格已同步更新。您已完成了第二个月的所有手动计算！请点击“下一步”，我们将为您生成并展示完整的生产计划表。
        </p>
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
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}
    </div>
  );
};

export default NewStep5;
