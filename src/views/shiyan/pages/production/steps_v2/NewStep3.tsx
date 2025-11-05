import React, { useState } from 'react';
import { Target, ArrowRight, TrendingUp, Info } from 'lucide-react';
import { useProductionPlan } from '../ProductionPlanContextV2';

/**
 * Step 3: 服务水平
 * - 定义服务水平的概念
 * - 学习服务水平的计算公式
 * - 理解服务水平与缺货的关系
 */
const NewStep3: React.FC = () => {
  const { state, updatePeriod2Data, completeCurrentStep } = useProductionPlan();

  const [hasCalculated, setHasCalculated] = useState(false);

  const period2Demand = state.period2Data.demandForecast ?? 0;
  const period2Stockout = state.period2Data.stockout ?? 0;

  // 计算服务水平
  const calculateServiceLevel = (): number => {
    if (period2Demand === 0) return 1.0; // 需求为0时，服务水平定义为100%
    return Math.max(0, (period2Demand - period2Stockout) / period2Demand);
  };

  const serviceLevel = hasCalculated ? calculateServiceLevel() : null;

  const handleCalculate = () => {
    setHasCalculated(true);
  };

  const handleNext = () => {
    if (!hasCalculated) {
      alert('请先计算服务水平');
      return;
    }

    const calculatedServiceLevel = calculateServiceLevel();

    // 保存第2期服务水平数据
    updatePeriod2Data({
      ...state.period2Data,
      serviceLevel: calculatedServiceLevel,
    });

    completeCurrentStep();
  };

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div className="flex items-center space-x-3">
        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
          <Target className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">第3步：服务水平</h3>
          <p className="text-sm text-purple-600">Service Level</p>
        </div>
      </div>

      {/* 学习目标 */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-l-4 border-purple-500 rounded-lg p-5">
        <h4 className="font-semibold text-purple-900 mb-3 flex items-center space-x-2">
          <Info className="w-5 h-5" />
          <span>学习目标</span>
        </h4>
        <ul className="text-sm text-purple-800 space-y-2">
          <li>• 理解服务水平的商业意义</li>
          <li>• 掌握服务水平的计算公式</li>
          <li>• 认识服务水平与缺货的反向关系</li>
        </ul>
      </div>

      {/* 服务水平概念 */}
      <div className="bg-white border-2 border-purple-200 rounded-lg p-5">
        <h4 className="font-semibold text-gray-800 mb-4">📊 什么是服务水平？</h4>

        <div className="space-y-4">
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h5 className="font-semibold text-purple-900 mb-2">定义：</h5>
            <p className="text-sm text-purple-800 leading-relaxed">
              <strong>服务水平（Service Level）</strong>是衡量企业满足客户需求能力的关键指标，
              表示在某一期间内<strong>成功满足需求的比例</strong>。
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h5 className="font-semibold text-blue-900 mb-2">商业意义：</h5>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>100% 服务水平</strong>：所有需求都得到满足，无缺货</li>
              <li>• <strong>95% 服务水平</strong>：95%的需求被满足，5%缺货</li>
              <li>• <strong>服务水平越高</strong>：客户满意度越高，但库存成本也越高</li>
              <li>• <strong>目标服务水平</strong>：企业需要在服务质量和成本之间找到平衡</li>
            </ul>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h5 className="font-semibold text-amber-900 mb-2">计算公式：</h5>
            <div className="space-y-2">
              <div className="bg-white p-3 rounded border border-amber-300">
                <div className="font-mono text-sm text-gray-800 text-center">
                  服务水平 = (实际需求 - 缺货) / 实际需求
                </div>
              </div>
              <div className="text-center text-gray-600 text-sm">或者</div>
              <div className="bg-white p-3 rounded border border-amber-300">
                <div className="font-mono text-sm text-gray-800 text-center">
                  服务水平 = 1 - (缺货 / 实际需求)
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 第2期服务水平计算 */}
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-300 rounded-lg p-5">
        <h4 className="font-semibold text-purple-900 mb-4 flex items-center space-x-2">
          <TrendingUp className="w-5 h-5" />
          <span>第2期服务水平计算</span>
        </h4>

        <div className="space-y-4">
          {/* 数据回顾 */}
          <div>
            <h5 className="text-sm font-semibold text-gray-700 mb-2">数据回顾（来自步骤2）：</h5>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-3 rounded border border-gray-200">
                <div className="text-xs text-gray-600">第2期实际需求</div>
                <div className="text-lg font-bold text-gray-900">{period2Demand}</div>
              </div>
              <div className="bg-red-50 p-3 rounded border border-red-200">
                <div className="text-xs text-red-600">第2期缺货</div>
                <div className="text-lg font-bold text-red-900">{period2Stockout}</div>
                {period2Stockout === 0 && (
                  <div className="text-xs text-green-600 mt-1">✓ 无缺货</div>
                )}
              </div>
            </div>
          </div>

          {/* 计算按钮 */}
          <button
            type="button"
            onClick={handleCalculate}
            className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors flex items-center justify-center space-x-2"
          >
            <Target className="w-5 h-5" />
            <span>计算服务水平</span>
          </button>

          {/* 计算结果 */}
          {hasCalculated && serviceLevel !== null && (
            <div className="space-y-3 animate-fadeIn">
              <div className="border-t-2 border-purple-200 pt-4">
                <h5 className="text-sm font-semibold text-gray-700 mb-3">计算过程：</h5>

                <div className="bg-white border border-purple-300 rounded-lg p-4 space-y-3">
                  <div className="font-mono text-sm text-gray-800 space-y-1">
                    <div>服务水平 = 1 - (缺货 / 实际需求)</div>
                    <div className="ml-4">= 1 - ({period2Stockout} / {period2Demand})</div>
                    {period2Demand > 0 && (
                      <>
                        <div className="ml-4">= 1 - {(period2Stockout / period2Demand).toFixed(4)}</div>
                        <div className="ml-4 font-bold text-purple-900">
                          = {serviceLevel.toFixed(4)} = {(serviceLevel * 100).toFixed(1)}%
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* 结果可视化 */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm text-gray-700 mb-2">
                    <span>服务水平</span>
                    <span className="font-bold">{(serviceLevel * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                    <div
                      className={`h-full flex items-center justify-center text-xs font-bold text-white transition-all duration-500 ${
                        serviceLevel >= 0.95
                          ? 'bg-gradient-to-r from-green-500 to-emerald-600'
                          : serviceLevel >= 0.90
                          ? 'bg-gradient-to-r from-yellow-500 to-amber-600'
                          : 'bg-gradient-to-r from-red-500 to-rose-600'
                      }`}
                      style={{ width: `${serviceLevel * 100}%` }}
                    >
                      {serviceLevel > 0.15 && `${(serviceLevel * 100).toFixed(1)}%`}
                    </div>
                  </div>
                </div>

                {/* 评估 */}
                <div className="mt-4 p-3 rounded-lg border-2" style={{
                  backgroundColor: serviceLevel >= 0.99 ? '#f0fdf4' : serviceLevel >= 0.95 ? '#fffbeb' : '#fef2f2',
                  borderColor: serviceLevel >= 0.99 ? '#86efac' : serviceLevel >= 0.95 ? '#fde047' : '#fca5a5',
                }}>
                  <div className="flex items-center space-x-2">
                    <div className="text-2xl">
                      {serviceLevel >= 0.99 ? '✅' : serviceLevel >= 0.95 ? '⚠️' : '❌'}
                    </div>
                    <div>
                      <div className="font-semibold" style={{
                        color: serviceLevel >= 0.99 ? '#166534' : serviceLevel >= 0.95 ? '#92400e' : '#991b1b',
                      }}>
                        {serviceLevel >= 0.99 ? '优秀' : serviceLevel >= 0.95 ? '良好' : '需要改进'}
                      </div>
                      <div className="text-xs" style={{
                        color: serviceLevel >= 0.99 ? '#15803d' : serviceLevel >= 0.95 ? '#a16207' : '#b91c1c',
                      }}>
                        {serviceLevel === 1
                          ? '完美！满足了所有需求，无缺货。'
                          : serviceLevel >= 0.99
                          ? '服务水平达到目标（≥99%），客户满意度高。'
                          : serviceLevel >= 0.95
                          ? '服务水平尚可（95%+），但离目标99%仍有差距。'
                          : '服务水平较低，建议增加产能或提高库存。'}
                      </div>
                    </div>
                  </div>
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
          <li>• <strong>服务水平 ↑</strong> → 缺货 ↓ → 客户满意度 ↑</li>
          <li>• <strong>服务水平 ↓</strong> → 缺货 ↑ → 客户流失风险 ↑</li>
          <li>• 企业通常设定目标服务水平（本系统目标：99%），作为生产计划的约束条件</li>
          <li>• 下一步我们将学习如何通过<strong>安全库存</strong>来提高服务水平</li>
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
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl'
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

export default NewStep3;
