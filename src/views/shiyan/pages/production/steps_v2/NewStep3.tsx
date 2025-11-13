import React, { useState } from 'react';
import { Target, ArrowRight, TrendingUp, Info, BarChart3 } from 'lucide-react';
import { useProductionPlan } from '../ProductionPlanContextV2';
import { useToast } from '@/shared/hooks/useToast';
import { Toast } from '@/shared/components/common/Toast';

/**
 * Step 3: 服务水平
 *
 * 按照客户文档重构，教学结构：
 * 1. 服务水平的定义与重要性
 * 2. 服务水平的计算公式与解释
 */
const NewStep3: React.FC = () => {
  const { state, updatePeriod2Data, completeCurrentStep } = useProductionPlan();
  const { toast, showToast, hideToast } = useToast();

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

    // 立即更新MPS表的第2期数据
    const calculatedServiceLevel = calculateServiceLevel();
    updatePeriod2Data({
      ...state.period2Data,
      serviceLevel: calculatedServiceLevel,
    });
  };

  const handleNext = () => {
    if (!hasCalculated) {
      showToast('请先计算服务水平', 'error');
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

      {/* 目的和重要性 */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-l-4 border-purple-500 rounded-lg p-5">
        <h4 className="font-semibold text-purple-900 mb-3 flex items-center space-x-2">
          <Info className="w-5 h-5" />
          <span>目的与重要性</span>
        </h4>
        <div className="space-y-3 text-sm text-purple-800">
          <p>
            <strong>目的：</strong>引导计算和理解服务水平，评估企业在满足市场需求方面的能力。
          </p>
          <p>
            <strong>重要性：</strong>服务水平是衡量生产计划成功与否的重要指标。它直接影响客户满意度和企业的市场竞争力。通过计算服务水平，企业可以及时调整生产计划，以提高供需匹配的准确性。
          </p>
        </div>
      </div>

      {/* 承上启下 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          在前一步中，我们探讨了<strong>需求量、产出量、库存量和缺货量</strong>之间的关系，这些量的计算帮助我们理解了企业在一个特定时段内的生产与市场需求的匹配情况。现在，我们要进一步探讨一个至关重要的指标——<strong>服务水平</strong>，它将帮助我们评估企业是否能够有效地满足市场需求，并进一步优化生产计划。
        </p>
      </div>

      {/* (1) 服务水平的定义与重要性 */}
      <div className="bg-white border-2 border-purple-200 rounded-lg p-5">
        <div className="flex items-start space-x-3 mb-4">
          <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">1</div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-800 mb-2">服务水平的定义与重要性</h4>
          </div>
        </div>

        <div className="space-y-4">
          {/* 定义 */}
          <div>
            <p className="text-sm text-gray-700 mb-3">
              <strong>服务水平</strong>是衡量企业在某一时段内满足市场需求能力的关键指标。它不仅反映了我们在应对市场需求时的有效性，还直接影响客户满意度和企业的市场竞争力。
            </p>
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <p className="text-sm text-purple-900">
                在前一步中，我们计算了<strong>缺货量</strong>和<strong>库存量</strong>，这两个量是计算服务水平的基础。缺货量表示未能满足的需求，而库存量则反映了我们是否有多余的产品在库存中。通过这些量，我们可以进一步确定企业在一个特定时段内的服务水平。
              </p>
            </div>
          </div>

          {/* 服务水平的重要性 */}
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-300 rounded-lg p-4">
            <h5 className="font-semibold text-purple-900 mb-3">服务水平的重要性：</h5>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-800 text-sm">客户满意度</div>
                  <p className="text-sm text-gray-700 mt-1">
                    服务水平高，客户的需求得到及时满足，满意度自然提高。
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-800 text-sm">市场表现</div>
                  <p className="text-sm text-gray-700 mt-1">
                    较高的服务水平意味着企业能够在竞争中占据优势，保持稳定的市场份额。
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-800 text-sm">库存与缺货管理</div>
                  <p className="text-sm text-gray-700 mt-1">
                    服务水平的高低直接影响企业的库存管理策略和缺货风险。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* (2) 服务水平的计算公式与解释 */}
      <div className="bg-white border-2 border-blue-200 rounded-lg p-5">
        <div className="flex items-start space-x-3 mb-4">
          <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">2</div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-800 mb-2">服务水平的计算公式与解释</h4>
          </div>
        </div>

        <div className="space-y-4">
          {/* 计算公式 */}
          <div className="bg-blue-50 border border-blue-300 rounded-lg p-4">
            <p className="font-semibold text-blue-900 mb-3">服务水平的计算公式如下：</p>
            <div className="bg-white p-4 rounded-lg border-2 border-blue-400 shadow-md">
              <div className="font-mono text-lg font-bold text-blue-900 text-center">
                服务水平 = 1 - (缺货量 / 实际需求量)
              </div>
            </div>
            <p className="text-sm text-blue-800 mt-3">
              这个公式简单明了，计算出的服务水平值<strong>越接近 1</strong>，意味着企业在该时段内满足市场需求的能力越强；反之，服务水平越低，说明企业未能满足的需求越多。
            </p>
          </div>

          {/* 公式解释 */}
          <div>
            <h5 className="font-semibold text-gray-800 mb-2 text-sm">公式解释：</h5>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <div className="font-semibold text-red-900 text-sm mb-1">缺货量</div>
                <p className="text-xs text-red-800">
                  前一步我们计算了缺货量，它表示由于产出量不足而未能满足的需求部分。
                </p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="font-semibold text-green-900 text-sm mb-1">实际需求量</div>
                <p className="text-xs text-green-800">
                  这是市场在该时段内的总需求。
                </p>
              </div>
            </div>
          </div>

          {/* 实例讲解 */}
          <div className="bg-amber-50 border-l-4 border-amber-400 rounded-lg p-4">
            <h5 className="font-semibold text-amber-900 mb-3">📚 实例讲解：</h5>
            <p className="text-sm text-amber-800 mb-3">
              例如，如果在某个月中，企业的实际需求量为 <strong>1000</strong> 单位，而产出量只有 <strong>900</strong> 单位，导致 <strong>100</strong> 单位的缺货，那么服务水平的计算如下：
            </p>
            <div className="bg-white rounded-lg p-4 border border-amber-300">
              <div className="font-mono text-sm text-gray-800 space-y-1">
                <div>服务水平 = 1 - (缺货量 / 实际需求量)</div>
                <div className="ml-4">= 1 - (100 / 1000)</div>
                <div className="ml-4">= 1 - 0.1</div>
                <div className="ml-4 font-bold text-amber-900">= 0.9 = 90%</div>
              </div>
            </div>
            <p className="text-sm text-amber-800 mt-3">
              这意味着在这个月内，企业的服务水平为 <strong>90%</strong>，即 90% 的市场需求得到了满足，而 10% 的需求未能满足。
            </p>
          </div>
        </div>
      </div>

      {/* 与第二步的紧密联系 */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-300 rounded-lg p-5">
        <h4 className="font-semibold text-blue-900 mb-3">🔗 与第二步的紧密联系</h4>
        <p className="text-sm text-blue-800 mb-3">
          服务水平直接基于我们在第二步中计算的<strong>需求量、产出量和缺货量</strong>。具体来说：
        </p>
        <div className="space-y-2 text-sm text-blue-800">
          <div className="flex items-start space-x-2">
            <span className="text-blue-600">•</span>
            <div>
              <strong>需求量：</strong>市场的实际需求是服务水平的基准。
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-blue-600">•</span>
            <div>
              <strong>产出量：</strong>产出量是否能够满足需求决定了缺货量。
            </div>
          </div>
          <div className="flex items-start space-x-2">
            <span className="text-blue-600">•</span>
            <div>
              <strong>缺货量：</strong>缺货量越大，服务水平越低，反之亦然。
            </div>
          </div>
        </div>
        <div className="mt-3 p-3 bg-white rounded-lg border border-blue-200">
          <p className="text-sm text-gray-700">
            通过这些量的紧密联系，服务水平为我们提供了一个整体的、综合的评估工具，帮助我们衡量当前的生产计划是否有效，以及是否需要进行调整。
          </p>
        </div>
      </div>

      {/* 第2期服务水平计算 */}
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 border-2 border-purple-300 rounded-lg p-5">
        <h4 className="font-semibold text-purple-900 mb-4 flex items-center space-x-2">
          <BarChart3 className="w-5 h-5" />
          <span>第2期服务水平计算</span>
        </h4>

        <div className="space-y-4">
          {/* 数据回顾 */}
          <div>
            <h5 className="text-sm font-semibold text-gray-700 mb-2">数据回顾（来自步骤2）：</h5>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white p-3 rounded border border-gray-300">
                <div className="text-xs text-gray-600">第2期需求量</div>
                <div className="text-lg font-bold text-gray-900">{period2Demand}</div>
                <div className="text-xs text-gray-500 mt-1">实际需求</div>
              </div>
              <div className="bg-red-50 p-3 rounded border border-red-200">
                <div className="text-xs text-red-700">第2期缺货量</div>
                <div className="text-lg font-bold text-red-900">{period2Stockout}</div>
                {period2Stockout === 0 ? (
                  <div className="text-xs text-green-600 mt-1">✓ 无缺货</div>
                ) : (
                  <div className="text-xs text-red-600 mt-1">⚠️ 有缺货</div>
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

                <div className="bg-white border-2 border-purple-300 rounded-lg p-4 space-y-3">
                  <div className="font-mono text-sm text-gray-800 space-y-1">
                    <div>服务水平 = 1 - (缺货量 / 实际需求量)</div>
                    <div className="ml-4">= 1 - ({period2Stockout} / {period2Demand})</div>
                    {period2Demand > 0 && (
                      <>
                        <div className="ml-4">= 1 - {(period2Stockout / period2Demand).toFixed(4)}</div>
                        <div className="ml-4 font-bold text-purple-900 text-lg">
                          = {serviceLevel.toFixed(4)} = {(serviceLevel * 100).toFixed(1)}%
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* 结果可视化 */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-sm text-gray-700 mb-2">
                    <span className="font-semibold">第2期服务水平</span>
                    <span className="font-bold text-lg">{(serviceLevel * 100).toFixed(1)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-8 overflow-hidden shadow-inner">
                    <div
                      className={`h-full flex items-center justify-center text-sm font-bold text-white transition-all duration-500 ${
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
                <div className="mt-4 p-4 rounded-lg border-2" style={{
                  backgroundColor: serviceLevel >= 0.99 ? '#f0fdf4' : serviceLevel >= 0.95 ? '#fffbeb' : '#fef2f2',
                  borderColor: serviceLevel >= 0.99 ? '#86efac' : serviceLevel >= 0.95 ? '#fde047' : '#fca5a5',
                }}>
                  <div className="flex items-center space-x-3">
                    <div className="text-3xl">
                      {serviceLevel >= 0.99 ? '✅' : serviceLevel >= 0.95 ? '⚠️' : '❌'}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-lg" style={{
                        color: serviceLevel >= 0.99 ? '#166534' : serviceLevel >= 0.95 ? '#92400e' : '#991b1b',
                      }}>
                        {serviceLevel >= 0.99 ? '优秀' : serviceLevel >= 0.95 ? '良好' : '需要改进'}
                      </div>
                      <div className="text-sm mt-1" style={{
                        color: serviceLevel >= 0.99 ? '#15803d' : serviceLevel >= 0.95 ? '#a16207' : '#b91c1c',
                      }}>
                        {serviceLevel >= 1
                          ? '完美！满足了所有需求，无缺货。'
                          : serviceLevel >= 0.99
                          ? '优秀！服务水平达到目标（≥99%），客户满意度高。'
                          : serviceLevel >= 0.95
                          ? '良好！服务水平在95%以上，但离目标99%仍有差距。'
                          : '服务水平较低（<95%），建议增加产能或安全库存。'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 总结 */}
      <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">💡 关键理解</h4>
        <p className="text-sm text-blue-800 mb-2">
          服务水平是我们衡量生产计划有效性的重要指标。通过与前一步计算的<strong>需求量、产出量、库存量和缺货量</strong>紧密结合，服务水平帮助我们全面评估企业的市场表现，并指导我们在未来制定更加精准和有效的生产计划。
        </p>
      </div>

      {/* 下一步提示 */}
      {hasCalculated && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-800">
            ✓ 已完成第2期的服务水平计算，右侧表格已同步更新。请点击“下一步”，我们来学习下一个关键概念：“预测量”。
          </p>
        </div>
      )}

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

export default NewStep3;
