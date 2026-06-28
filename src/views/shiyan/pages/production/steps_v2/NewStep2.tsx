import React, { useState } from 'react';
import { TrendingUp, ArrowRight, Calculator, Info, Loader2, Package, AlertCircle } from 'lucide-react';
import { useProductionPlan } from '../ProductionPlanContextV2';
import { useToast } from '../../../shared/hooks/useToast';
import { Toast } from '../../../shared/components/common/Toast';

// 模型名称映射
const MODEL_NAME_MAP: Record<string, string> = {
  'ma': '移动平均（MA）',
  'exp': '指数平滑（ES）',
  'arima': 'ARIMA',
  'lstm': 'LSTM',
  'ensemble_weighted': '加权平均融合',
  'ensemble_boosting': 'Boosting集成',
  'ensemble_stacking': 'Stacking集成',
};

/**
 * Step 2: 需求量、产出量、库存量和缺货量
 *
 * 按照客户文档重构，教学结构：
 * 1. 需求量的定义与重要性
 * 2. 产出量的计算与理解
 * 3. 库存量的计算与意义
 * 4. 缺货量的计算与管理
 * 5. 第二个月的实例应用
 */
const NewStep2: React.FC = () => {
  const { state, updatePeriod2Data, completeCurrentStep } = useProductionPlan();
  const { toast, showToast, hideToast } = useToast();

  const [hasCalculated, setHasCalculated] = useState(false);
  const [isPeriod2Loaded, setIsPeriod2Loaded] = useState(false);
  const [period2DemandValue, setPeriod2DemandValue] = useState<number | null>(null);
  const [isLoadingPrediction, setIsLoadingPrediction] = useState(false);

  // 第2期期初库存 = 第1期期末库存（标准化后为0）
  const period2BeginningInventory = state.period1Data.endingInventory ?? 0;

  // 🆕 第2期产出量 = 第1期投入量（受产能约束限制）
  // 产出量 = min(上月投入量, 产能上限)
  const period1PlannedProduction = state.period1Data.plannedProduction ?? 0;
  const productionCapacity = state.productionCapacity;
  const productionOutput = Math.min(period1PlannedProduction, productionCapacity);
  const isCapacityConstrained = period1PlannedProduction > productionCapacity;

  // 获取第二期预测需求
  const handleLoadPeriod2Demand = async () => {
    const period2Prediction = state.predictions?.[1];
    if (!period2Prediction) {
      return;
    }
    setIsLoadingPrediction(true);
    let demand = Math.round(period2Prediction.prediction);
    if (!Number.isFinite(demand) || demand < 0) {
      console.warn(`第2期预测需求异常(${period2Prediction.prediction})，已修正为0`);
      demand = 0;
    }
    setPeriod2DemandValue(demand);
    setIsPeriod2Loaded(true);
    setIsLoadingPrediction(false);
  };

  // 使用加载的需求值，如果未加载则使用默认值
  const period2Demand = period2DemandValue ?? state.avgDemand;

  // 计算期末库存和缺货
  const calculateInventoryAndStockout = () => {
    const beginningInventory = period2BeginningInventory; // 第2期期初 = 第1期期末
    const endingInventory = beginningInventory + productionOutput - period2Demand;
    const stockout = Math.max(0, -endingInventory);
    const finalInventory = Math.max(0, endingInventory);

    return { endingInventory: finalInventory, stockout };
  };

  const { endingInventory, stockout } = hasCalculated
    ? calculateInventoryAndStockout()
    : { endingInventory: null, stockout: null };

  const handleCalculate = () => {
    setHasCalculated(true);

    // 立即更新MPS表的第2期数据
    const { endingInventory, stockout } = calculateInventoryAndStockout();
    updatePeriod2Data({
      demandForecast: period2Demand,
      beginningInventory: period2BeginningInventory,
      productionOutput,
      endingInventory,
      stockout,
      serviceLevel: null, // 服务水平在步骤3计算
    });
  };

  const handleNext = () => {
    if (!hasCalculated) {
      showToast('请先计算第2期的库存和缺货', 'error');
      return;
    }

    const { endingInventory, stockout } = calculateInventoryAndStockout();

    // 保存第2期数据
    updatePeriod2Data({
      demandForecast: period2Demand,
      beginningInventory: period2BeginningInventory,
      productionOutput,
      endingInventory,
      stockout,
      serviceLevel: null, // 服务水平在步骤3计算
    });

    completeCurrentStep();
  };

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div className="flex items-center space-x-3">
        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
          <Package className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">第2步：需求量、产出量、库存量和缺货量</h3>
          <p className="text-sm text-green-600">Demand, Output, Inventory & Stockout</p>
        </div>
      </div>

      {/* 目的和重要性 */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 rounded-lg p-5">
        <h4 className="font-semibold text-green-900 mb-3 flex items-center space-x-2">
          <Info className="w-5 h-5" />
          <span>目的与重要性</span>
        </h4>
        <div className="space-y-3 text-sm text-green-800">
          <p>
            <strong>目的：</strong>详细计算并分析需求量、产出量、库存量和缺货量，帮助你们掌握如何通过这些量来评估生产计划的有效性。
          </p>
          <p>
            <strong>重要性：</strong>需求量决定了市场的实际需求，而产出量、库存量和缺货量则反映了企业的生产响应能力。通过这些量的计算，可以判断生产计划是否能够有效满足市场需求，并识别潜在的库存管理问题。
          </p>
        </div>
      </div>

      {/* (1) 需求量的定义与重要性 */}
      <div className="bg-white border-2 border-blue-200 rounded-lg p-5">
        <div className="flex items-start space-x-3 mb-4">
          <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">1</div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-800 mb-2">需求量的定义与重要性</h4>
          </div>
        </div>

        <div className="space-y-3 text-sm text-gray-700">
          <p>
            <strong>需求量</strong>是指市场在某一时段内实际需要的产品数量。它直接由市场需求决定，是制定生产计划的出发点。
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-900">
              <strong>⚠️ 重要性：</strong>需求量的准确性至关重要，因为它不仅影响当前的生产安排，还影响库存管理和未来的生产计划。
            </p>
          </div>
          <p>
            在第一个月中假设需求量与产出量相等，这意味着市场需求得到了完全满足，没有出现缺货或库存积压的情况。
          </p>
        </div>
      </div>

      {/* (2) 产出量的计算与理解 */}
      <div className="bg-white border-2 border-green-200 rounded-lg p-5">
        <div className="flex items-start space-x-3 mb-4">
          <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">2</div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-800 mb-2">产出量的计算与理解</h4>
          </div>
        </div>

        <div className="space-y-3 text-sm text-gray-700">
          <p>
            <strong>产出量</strong>是指在一个生产周期结束时，企业实际生产出来的产品数量。在前一步中我们提到，产出量与上个月的投入量密切相关。在我们的生产计划中，第二个月的产出量等于第一个月的投入量（但不超过产能上限），即产出量 = min(上月投入量, 产能上限)。因此，准确的投入量计算对于确保产出量满足市场需求非常关键。
          </p>
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-400 rounded-lg p-4">
            <p className="text-amber-900 font-semibold mb-2">⏱️ 提前期（Lead Time）的影响</p>
            <p className="text-amber-800 text-sm mb-2">
              提前期是指从生产开始到产品完成所需的时间。本实验中提前期为 <strong>1 个月</strong>，这意味着：
            </p>
            <ul className="text-sm text-amber-800 space-y-1 ml-4">
              <li>• 第1个月的投入 → 第2个月才能产出</li>
              <li>• 第2个月的投入 → 第3个月才能产出</li>
              <li>• 因此，第2个月的产出量 = min(第1个月的投入量, 产能上限)</li>
            </ul>
            <p className="text-amber-800 text-sm mt-2">
              这种滞后性要求我们必须提前规划投入量，以应对未来的需求波动。
            </p>
          </div>
        </div>
      </div>

      {/* (3) 库存量的计算与意义 */}
      <div className="bg-white border-2 border-purple-200 rounded-lg p-5">
        <div className="flex items-start space-x-3 mb-4">
          <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">3</div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-800 mb-2">库存量的计算与意义</h4>
          </div>
        </div>

        <div className="space-y-3 text-sm text-gray-700">
          <p>
            <strong>库存量</strong>是指在满足市场需求后，企业在某一时段内剩余的产品数量。合理的库存量管理有助于企业在需求波动时保持稳定的供应，避免因供不应求而导致的缺货情况。
          </p>
          <div className="bg-purple-50 border border-purple-300 rounded-lg p-4">
            <p className="font-semibold text-purple-900 mb-2">计算公式：</p>
            <div className="font-mono text-sm bg-white p-3 rounded border border-purple-200">
              期末库存 = 期初库存 + 产出量 - 实际需求量
            </div>
          </div>
          <p>
            通过这个公式，可以清楚地看出，当产出量大于需求量时，多余的产品将转化为库存。如果我们假设第一个月的产出量刚好等于需求量，那么第一个月的库存量将为 0，这也是我们标准化第一个月的原因之一。
          </p>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-blue-900">
              <strong>💡 注意：</strong>库存量的管理不仅涉及存储成本，还影响企业的现金流。因此，保持适当的库存水平是企业提高运营效率的关键。
            </p>
          </div>
        </div>
      </div>

      {/* (4) 缺货量的计算与管理 */}
      <div className="bg-white border-2 border-red-200 rounded-lg p-5">
        <div className="flex items-start space-x-3 mb-4">
          <div className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">4</div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-800 mb-2">缺货量的计算与管理</h4>
          </div>
        </div>

        <div className="space-y-3 text-sm text-gray-700">
          <p>
            <strong>缺货量</strong>是指当产出量不足以满足市场需求时，企业未能满足的那部分需求。这是企业在制定生产计划时必须尽量避免的情况，因为缺货不仅会导致市场份额的流失，还会影响企业的信誉。
          </p>
          <div className="bg-red-50 border border-red-300 rounded-lg p-4">
            <p className="font-semibold text-red-900 mb-2">计算公式：</p>
            <div className="font-mono text-sm bg-white p-3 rounded border border-red-200">
              缺货量 = max(0, 实际需求量 - 期初库存 - 产出量)
            </div>
          </div>
          <p>
            在第一个月的标准化处理过程中，我们假设缺货量为 0，这意味着企业的生产完全满足了市场需求。然而，在实际生产中，需求波动可能导致缺货的发生，因此在制定生产计划时需要特别注意这一点。
          </p>
        </div>
      </div>

      {/* 第一月标准化回顾 */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
        <h4 className="font-semibold text-amber-900 mb-3">📌 第一月标准化回顾</h4>
        <div className="space-y-2 text-sm text-amber-800">
          <p>在第一个月中，我们采用了标准化处理：</p>
          <ul className="ml-4 space-y-1">
            <li>• <strong>期初库存</strong> = 0（标准化基准）</li>
            <li>• <strong>需求量</strong> = {state.period1Data.demandForecast ?? 'N/A'}（预测需求）</li>
            <li>• <strong>产出量</strong> = {state.period1Data.productionOutput ?? 'N/A'}（假设正好满足需求）</li>
            <li>• <strong>期末库存</strong> = 0（因为产出=需求）</li>
            <li>• <strong>缺货</strong> = 0（无缺货）</li>
          </ul>
        </div>
      </div>

      {/* (5) 第二个月的实例应用 */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-400 rounded-lg p-5">
        <div className="flex items-start space-x-3 mb-4">
          <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">5</div>
          <div className="flex-1">
            <h4 className="font-semibold text-green-900 mb-2">第二个月的实例应用</h4>
            <p className="text-sm text-green-800">
              在第二个月，我们将基于第一个月的产出量和实际需求量来计算库存量和缺货量。这一步的计算结果将直接影响对未来投入量的规划。
            </p>
          </div>
        </div>

        {/* 预测第二期需求按钮 */}
        {!isPeriod2Loaded && (
          <div className="flex justify-center mt-4">
            <button
              type="button"
              onClick={handleLoadPeriod2Demand}
              disabled={isLoadingPrediction || !state.predictions || state.predictions.length < 2}
              className={`flex items-center space-x-2 px-8 py-3 rounded-lg font-medium transition-all ${
                state.predictions && state.predictions.length >= 2 && !isLoadingPrediction
                  ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isLoadingPrediction ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>预测中...</span>
                </>
              ) : (
                <>
                  <TrendingUp className="w-5 h-5" />
                  <span>预测第二期需求</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* 第二期预测结果展示 */}
        {isPeriod2Loaded && period2DemandValue !== null && (
          <div className="mt-4 space-y-4">
            <div className="bg-white border-2 border-green-300 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <div className="text-green-600 text-2xl">✅</div>
                <div className="flex-1">
                  <h5 className="font-semibold text-green-900 mb-3">第二期需求预测成功</h5>

                  {/* 模型信息 */}
                  <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800">
                      🤖 <strong>使用模型</strong>：{MODEL_NAME_MAP[state.selectedBestModel] || state.selectedBestModel}
                    </p>
                  </div>

                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-300">
                    <div className="text-xs text-blue-700 mb-1">第2期需求量</div>
                    <div className="text-3xl font-bold text-blue-900">{period2DemandValue}</div>
                    <div className="text-xs text-blue-600 mt-1">单位：件</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 第二月计算演示 */}
            <div className="bg-white border-2 border-blue-300 rounded-lg p-5">
              <h5 className="font-semibold text-blue-900 mb-4 flex items-center space-x-2">
                <Calculator className="w-5 h-5" />
                <span>第2期计算演示</span>
              </h5>

              <div className="space-y-4">
                {/* 已知数据 */}
                <div>
                  <h6 className="text-sm font-semibold text-gray-700 mb-2">已知数据：</h6>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 p-3 rounded border border-gray-200">
                      <div className="text-xs text-gray-600">第2期期初库存</div>
                      <div className="text-lg font-bold text-gray-900">{period2BeginningInventory}</div>
                      <div className="text-xs text-gray-500 mt-1">= 第1期期末库存</div>
                    </div>
                    <div className="bg-blue-50 p-3 rounded border border-blue-200">
                      <div className="text-xs text-blue-700">第2期需求量</div>
                      <div className="text-lg font-bold text-blue-900">{period2Demand}</div>
                      <div className="text-xs text-blue-600 mt-1">需求预测结果</div>
                    </div>
                  </div>
                </div>

                {/* 产出量计算结果 */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-4">
                  <div className="text-sm font-semibold text-green-900 mb-3">第2期产出量（自动计算）</div>
                  <div className="bg-white rounded-lg p-4 border border-green-300">
                    <div className="font-mono text-sm text-gray-800 space-y-1">
                      <div>产出量 = min(第1期投入量, 产能上限)</div>
                      <div className="ml-4">= min({period1PlannedProduction}, {productionCapacity})</div>
                      <div className="ml-4 text-lg font-bold text-green-900">= {productionOutput}</div>
                    </div>
                  </div>
                  {isCapacityConstrained && (
                    <div className="mt-3 p-3 bg-amber-50 border-l-4 border-amber-400 rounded">
                      <p className="text-sm text-amber-900">
                        ⚠️ <strong>产能受限</strong>：第1期计划投入 {period1PlannedProduction} 单位，但产能上限为 {productionCapacity} 单位，
                        因此实际产出量受到约束。
                      </p>
                    </div>
                  )}
                  {!isCapacityConstrained && period1PlannedProduction > 0 && (
                    <div className="mt-3 p-3 bg-green-50 border-l-4 border-green-400 rounded">
                      <p className="text-sm text-green-900">
                        ✓ <strong>产能充足</strong>：第1期投入量 ({period1PlannedProduction}) 在产能范围内，全部转化为产出。
                      </p>
                    </div>
                  )}
                  <p className="mt-2 text-xs text-gray-600">
                    💡 提示：由于提前期为1个月，第2期的产出来自第1期的投入，但受到产能上限的约束。
                  </p>
                </div>

                {/* 计算按钮 */}
                <button
                  type="button"
                  onClick={handleCalculate}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                >
                  <Calculator className="w-5 h-5" />
                  <span>计算库存量和缺货量</span>
                </button>

                {/* 计算结果 */}
                {hasCalculated && (
                  <div className="space-y-3 animate-fadeIn">
                    <div className="border-t-2 border-gray-200 pt-4">
                      <h6 className="text-sm font-semibold text-gray-700 mb-3">计算过程：</h6>

                      {/* 库存计算 */}
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-3">
                        <div className="text-sm font-semibold text-purple-900 mb-2">库存量计算：</div>
                        <div className="font-mono text-sm text-purple-800 space-y-1">
                          <div>期末库存 = 期初库存 + 产出量 - 实际需求量</div>
                          <div className="ml-4">= {period2BeginningInventory} + {productionOutput} - {period2Demand}</div>
                          <div className="ml-4">= {period2BeginningInventory + productionOutput - period2Demand}</div>
                          <div className="ml-4 font-bold text-purple-900">
                            最终库存 = {endingInventory}
                            {period2BeginningInventory + productionOutput - period2Demand < 0 && (
                              <span className="text-xs ml-2">(负值时取0)</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* 缺货计算 */}
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="text-sm font-semibold text-red-900 mb-2">缺货量计算：</div>
                        <div className="font-mono text-sm text-red-800 space-y-1">
                          <div>缺货量 = max(0, 实际需求量 - 期初库存 - 产出量)</div>
                          <div className="ml-4">
                            = max(0, {period2Demand} - ({period2BeginningInventory} + {productionOutput}))
                          </div>
                          <div className="ml-4">= max(0, {period2Demand - period2BeginningInventory - productionOutput})</div>
                          <div className="ml-4 font-bold text-red-900">
                            缺货量 = {stockout}
                            {stockout! > 0 && <span className="ml-2">⚠️ 发生缺货！</span>}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 结果总结 */}
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-300 rounded-lg p-4">
                      <div className="text-sm font-semibold text-gray-800 mb-3">📋 第2期结果总结：</div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="bg-white p-2 rounded">
                          <span className="text-gray-600">需求量：</span>
                          <span className="font-bold text-gray-900 ml-2">{period2Demand}</span>
                        </div>
                        <div className="bg-white p-2 rounded">
                          <span className="text-gray-600">产出量：</span>
                          <span className="font-bold text-gray-900 ml-2">{productionOutput}</span>
                        </div>
                        <div className="bg-white p-2 rounded">
                          <span className="text-gray-600">期末库存：</span>
                          <span className="font-bold text-purple-700 ml-2">{endingInventory}</span>
                        </div>
                        <div className="bg-white p-2 rounded">
                          <span className="text-gray-600">缺货量：</span>
                          <span className={`font-bold ml-2 ${stockout! > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {stockout}
                          </span>
                        </div>
                      </div>

                      {/* 实例分析 */}
                      <div className="mt-3 p-3 bg-white rounded border border-blue-200">
                        <p className="text-xs text-gray-700">
                          {productionOutput > period2Demand
                            ? `✓ 产出量（${productionOutput}）大于需求量（${period2Demand}），剩余的产品将成为库存（${endingInventory}）。`
                            : productionOutput < period2Demand
                            ? `⚠️ 产出量（${productionOutput}）小于需求量（${period2Demand}），会出现缺货情况（${stockout}），需要在后续生产计划中进行调整。`
                            : `✓ 产出量（${productionOutput}）刚好等于需求量（${period2Demand}），库存和缺货均为0。`
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 关键理解 */}
      <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4">
        <h4 className="font-semibold text-blue-900 mb-2">💡 关键理解</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• 理解<strong>需求量、产出量、库存量与缺货量</strong>之间的关系，是制定生产计划的核心步骤之一</li>
          <li>• 只有通过准确计算这些量，才能合理安排生产，确保企业的市场供应平衡</li>
          <li>• <strong>提前期</strong>（1个月）的存在要求我们必须提前规划投入量</li>
          <li>• 通过这一过程，逐步实现对生产计划的有效管理</li>
        </ul>
      </div>

      {/* 下一步提示 */}
      {hasCalculated && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-800">
            ✓ 已完成第2期的库存和缺货计算，右侧表格已同步更新。请点击“下一步”，我们来学习如何评估“服务水平”。
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
              ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl'
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

export default NewStep2;
