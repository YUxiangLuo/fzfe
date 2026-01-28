import React, { useState } from 'react';
import { Target, ArrowRight, Calculator, Info, BarChart2, Shield } from 'lucide-react';
import { useProductionPlan } from '../ProductionPlanContextV2';
import { useToast } from '../../../shared/hooks/useToast';
import { Toast } from '../../../shared/components/common/Toast';
import { validateAndFixStdDev } from '../utils/predictionValidator';
import { STD_DEV_ESTIMATION } from '../config/mpsConstants';

/**
 * Step 4: 预测量
 *
 * 按照客户文档重构，教学结构：
 * 1. 预测量的定义与重要性
 * 2. 预测量的计算公式与解释
 * 3. 预测量在生产计划中的应用
 */
const NewStep4: React.FC = () => {
  const { state, updatePeriod2Data, completeCurrentStep, fillPeriod1Data } = useProductionPlan();
  const { toast, showToast, hideToast } = useToast();

  const [hasCalculated, setHasCalculated] = useState(false);

  const period2Demand = state.period2Data.demandForecast ?? 0;
  const targetServiceLevel = state.targetServiceLevel;
  const zScore = state.safetyStockZScore;

  // 使用预测接口返回的真实标准差
  const calculateSafetyStock = (): number => {
    // 优先使用predictions[1]的标准差（第2期）
    const secondPrediction = state.predictions?.[1];
    if (secondPrediction) {
      // 🛡️ 使用验证函数确保标准差有效
      const validationResult = validateAndFixStdDev(
        secondPrediction.std_dev,
        period2Demand,
        1 // 第2期索引为1
      );

      // 输出警告信息（如有）
      validationResult.warnings.forEach(warning => {
        console.warn(`⚠️ ${warning}`);
      });

      const safetyStock = Math.round(zScore * validationResult.value);
      return Math.max(0, safetyStock);
    }
    // 如果没有预测数据，使用简化估算
    const avgDemand = state.avgDemand;
    const stdDev = avgDemand * STD_DEV_ESTIMATION.FALLBACK_RATIO;
    const safetyStock = Math.round(zScore * stdDev);
    return Math.max(0, safetyStock);
  };

  // 获取第2期的标准差（用于显示）
  const period2StdDev = state.predictions?.[1]?.std_dev ?? state.avgDemand * STD_DEV_ESTIMATION.FALLBACK_RATIO;

  const safetyStock = hasCalculated ? calculateSafetyStock() : null;
  const forecastQuantity = hasCalculated && safetyStock !== null
    ? period2Demand + safetyStock
    : null;

  const handleCalculate = () => {
    setHasCalculated(true);

    // 立即更新MPS表的第2期数据
    const calculatedSafetyStock = calculateSafetyStock();
    updatePeriod2Data({
      ...state.period2Data,
      safetyStock: calculatedSafetyStock,
    });

    // 同时填充第1期的安全库存（使用predictions[0]的标准差）
    const period1Prediction = state.predictions?.[0];
    if (period1Prediction) {
      const period1Demand = state.period1Data.demandForecast ?? 0;

      // 🛡️ 使用验证函数确保标准差有效
      const validationResult = validateAndFixStdDev(
        period1Prediction.std_dev,
        period1Demand,
        0 // 第1期索引为0
      );

      // 输出警告信息（如有）
      validationResult.warnings.forEach(warning => {
        console.warn(`⚠️ ${warning}`);
      });

      const period1SafetyStock = Math.round(state.safetyStockZScore * validationResult.value);
      fillPeriod1Data({
        ...state.period1Data,
        safetyStock: period1SafetyStock,
      });
    }
  };

  const handleNext = () => {
    if (!hasCalculated) {
      showToast('请先计算安全库存和预测量', 'error');
      return;
    }

    const calculatedSafetyStock = calculateSafetyStock();

    // 保存第2期数据
    updatePeriod2Data({
      ...state.period2Data,
      safetyStock: calculatedSafetyStock,
    });

    completeCurrentStep();
  };

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div className="flex items-center space-x-3">
        <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-600 rounded-full flex items-center justify-center">
          <BarChart2 className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">第4步：预测量</h3>
          <p className="text-sm text-amber-600">Forecast Quantity</p>
        </div>
      </div>

      {/* 目的和重要性 */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-500 rounded-lg p-5">
        <h4 className="font-semibold text-amber-900 mb-3 flex items-center space-x-2">
          <Info className="w-5 h-5" />
          <span>目的与重要性</span>
        </h4>
        <div className="space-y-3 text-sm text-amber-800">
          <p>
            <strong>目的：</strong>帮助你们准确计算预测量，为生产计划的下一步提供明确的指导依据。
          </p>
          <p>
            <strong>重要性：</strong>预测量结合了需求预测和安全库存，是生产计划制定的核心数据。准确的预测量能够帮助企业合理安排生产任务，避免过度生产或不足，进而优化库存管理和生产资源配置。
          </p>
        </div>
      </div>

      {/* 承上启下 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          在前几步中，我们已经详细讨论了<strong>需求量、产出量、库存量、缺货量和服务水平</strong>之间的关系，并了解了如何通过这些关键量的计算来衡量企业满足市场需求的能力。现在，我们将进一步探讨<strong>预测量</strong>的概念及其在生产计划中的核心作用。
        </p>
      </div>

      {/* (1) 预测量的定义与重要性 */}
      <div className="bg-white border-2 border-amber-200 rounded-lg p-5">
        <div className="flex items-start space-x-3 mb-4">
          <div className="w-8 h-8 bg-amber-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">1</div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-800 mb-2">预测量的定义与重要性</h4>
          </div>
        </div>

        <div className="space-y-4">
          {/* 定义 */}
          <div>
            <p className="text-sm text-gray-700 mb-3">
              <strong>预测量</strong>是指企业在未来某一时段内，预计需要生产的产品数量。它是生产计划的核心，因为它直接决定了企业在未来一段时间内的生产安排。准确的预测量不仅能够帮助企业合理安排生产，满足市场需求，还能有效控制库存，避免过度生产或缺货。
            </p>
          </div>

          {/* 预测量的重要性 */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-300 rounded-lg p-4">
            <h5 className="font-semibold text-amber-900 mb-3">预测量的重要性：</h5>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-800 text-sm">精准生产安排</div>
                  <p className="text-sm text-gray-700 mt-1">
                    预测量为企业提供了生产计划的基础数据，有助于精准安排生产任务。
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-800 text-sm">库存管理</div>
                  <p className="text-sm text-gray-700 mt-1">
                    通过准确的预测量，企业可以避免库存积压或不足，从而提高运营效率。
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-purple-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-800 text-sm">风险控制</div>
                  <p className="text-sm text-gray-700 mt-1">
                    预测量还可以帮助企业应对市场需求的不确定性，降低因需求波动带来的风险。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* (2) 预测量的计算公式与解释 */}
      <div className="bg-white border-2 border-blue-200 rounded-lg p-5">
        <div className="flex items-start space-x-3 mb-4">
          <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">2</div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-800 mb-2">预测量的计算公式与解释</h4>
          </div>
        </div>

        <div className="space-y-4">
          {/* 引言 */}
          <p className="text-sm text-gray-700">
            在实际生产中，预测量通常由两个关键部分组成：<strong>需求预测结果</strong>和<strong>安全库存</strong>。在前面的步骤中，已经提到，需求预测结果是基于历史数据和市场趋势的分析结果，而安全库存是为了应对需求波动和供应链不确定性而设立的额外库存。
          </p>

          {/* 计算公式 */}
          <div className="bg-blue-50 border border-blue-300 rounded-lg p-4">
            <p className="font-semibold text-blue-900 mb-3">预测量的计算公式：</p>
            <div className="bg-white p-4 rounded-lg border-2 border-blue-400 shadow-md">
              <div className="font-mono text-lg font-bold text-blue-900 text-center">
                预测量 = 需求预测结果 + 安全库存
              </div>
            </div>
          </div>

          {/* 安全库存计算方法 */}
          <div className="bg-purple-50 border border-purple-300 rounded-lg p-4">
            <h5 className="font-semibold text-purple-900 mb-3 flex items-center space-x-2">
              <Shield className="w-5 h-5" />
              <span>安全库存的计算方法：</span>
            </h5>
            <div className="bg-white p-3 rounded border border-purple-300 mb-3">
              <div className="font-mono text-sm text-gray-800 text-center">
                安全库存 = Z分数 × 需求标准差
              </div>
            </div>
            <div className="text-xs text-purple-800 space-y-1">
              <div>• <strong>Z分数</strong>：基于目标服务水平的统计参数（目标：{(targetServiceLevel * 100).toFixed(0)}% → Z = {zScore.toFixed(1)}）</div>
              <div>• <strong>需求标准差</strong>：需求波动的度量（从预测模型获得）</div>
            </div>
          </div>

          {/* 细节解释 */}
          <div>
            <h5 className="font-semibold text-gray-800 mb-2 text-sm">细节解释：</h5>
            <div className="space-y-2">
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="font-semibold text-green-900 text-sm mb-1">需求预测结果</div>
                <p className="text-xs text-green-800">
                  这是基于市场分析、历史数据以及其他预测模型得出的未来需求量。它反映了企业对未来市场需求的预期。
                </p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="font-semibold text-amber-900 text-sm mb-1">安全库存</div>
                <p className="text-xs text-amber-800">
                  前面提到，安全库存用于应对需求的不确定性。它是在需求预测结果的基础上额外增加的一部分库存，以防止因需求超出预期而出现的缺货情况。
                </p>
              </div>
            </div>
          </div>

          {/* 实例讲解 */}
          <div className="bg-green-50 border-l-4 border-green-400 rounded-lg p-4">
            <h5 className="font-semibold text-green-900 mb-3">📚 实例讲解：</h5>
            <p className="text-sm text-green-800 mb-3">
              例如，假设在某一月份的需求预测结果为 <strong>1000</strong> 单位，安全库存为 <strong>200</strong> 单位，那么该月份的预测量计算如下：
            </p>
            <div className="bg-white rounded-lg p-4 border border-green-300">
              <div className="font-mono text-sm text-gray-800 space-y-1">
                <div>预测量 = 需求预测结果 + 安全库存</div>
                <div className="ml-4">= 1000 + 200</div>
                <div className="ml-4 font-bold text-green-900">= 1200 单位</div>
              </div>
            </div>
            <p className="text-sm text-green-800 mt-3">
              这意味着，为了确保能够应对可能的需求波动，我们预计在该月份需要生产 <strong>1200</strong> 单位的产品。
            </p>
          </div>

          {/* 与前几步的关联 */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              预测量的计算直接依赖于在前几步中得出的结果，特别是<strong>需求预测结果</strong>和<strong>服务水平</strong>。
            </p>
          </div>
        </div>
      </div>

      {/* (3) 预测量在生产计划中的应用 */}
      <div className="bg-white border-2 border-green-200 rounded-lg p-5">
        <div className="flex items-start space-x-3 mb-4">
          <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">3</div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-800 mb-2">预测量在生产计划中的应用</h4>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            一旦确定了预测量，它将作为制定生产计划的核心依据。预测量决定了企业在未来时段内的生产目标，直接影响投入量的计算和生产资源的配置。
          </p>

          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</div>
              <div className="flex-1">
                <div className="font-semibold text-gray-800 text-sm">指导生产投入</div>
                <p className="text-sm text-gray-700 mt-1">
                  预测量为企业提供了未来的生产目标，企业可以根据预测量来安排生产任务、调配资源。
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</div>
              <div className="flex-1">
                <div className="font-semibold text-gray-800 text-sm">控制库存与成本</div>
                <p className="text-sm text-gray-700 mt-1">
                  通过预测量的精确计算，企业能够有效控制库存水平，避免过度生产或不足，减少库存成本。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 第2期预测量计算 */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 rounded-lg p-5">
        <h4 className="font-semibold text-amber-900 mb-4 flex items-center space-x-2">
          <Calculator className="w-5 h-5" />
          <span>第2期预测量计算</span>
        </h4>

        <div className="space-y-4">
          {/* 参数回顾 */}
          <div>
            <h5 className="text-sm font-semibold text-gray-700 mb-2">已知数据：</h5>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white p-3 rounded border border-gray-300">
                <div className="text-xs text-gray-600">目标服务水平</div>
                <div className="text-lg font-bold text-gray-900">{(targetServiceLevel * 100).toFixed(0)}%</div>
              </div>
              <div className="bg-white p-3 rounded border border-gray-300">
                <div className="text-xs text-gray-600">Z分数</div>
                <div className="text-lg font-bold text-gray-900">{zScore.toFixed(1)}</div>
              </div>
              <div className="bg-blue-50 p-3 rounded border border-blue-200">
                <div className="text-xs text-blue-700">第2期需求预测</div>
                <div className="text-lg font-bold text-blue-900">{period2Demand}</div>
              </div>
            </div>
          </div>

          {/* 计算按钮 */}
          <button
            type="button"
            onClick={handleCalculate}
            className="w-full px-4 py-3 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors flex items-center justify-center space-x-2"
          >
            <Calculator className="w-5 h-5" />
            <span>计算安全库存和预测量</span>
          </button>

          {/* 计算结果 */}
          {hasCalculated && safetyStock !== null && forecastQuantity !== null && (
            <div className="space-y-3 animate-fadeIn">
              <div className="border-t-2 border-amber-200 pt-4">
                <h5 className="text-sm font-semibold text-gray-700 mb-3">计算过程：</h5>

                {/* 步骤1：获取需求标准差 */}
                <div className="bg-white border border-gray-300 rounded-lg p-4 mb-3">
                  <div className="text-sm font-semibold text-gray-800 mb-2">步骤1：获取需求标准差</div>
                  <div className="font-mono text-sm text-gray-700 space-y-1">
                    <div>需求标准差（从预测模型）</div>
                    <div className="ml-4 font-bold">σ = {period2StdDev.toFixed(1)}</div>
                  </div>
                </div>

                {/* 步骤2：计算安全库存 */}
                <div className="bg-purple-50 border border-purple-300 rounded-lg p-4 mb-3">
                  <div className="text-sm font-semibold text-purple-900 mb-2">步骤2：计算安全库存</div>
                  <div className="font-mono text-sm text-purple-800 space-y-1">
                    <div>安全库存 = Z分数 × 需求标准差</div>
                    <div className="ml-4">= {zScore.toFixed(1)} × {period2StdDev.toFixed(1)}</div>
                    <div className="ml-4">= {(zScore * period2StdDev).toFixed(1)}</div>
                    <div className="ml-4 font-bold text-purple-900">≈ {safetyStock}（取整）</div>
                  </div>
                </div>

                {/* 步骤3：计算预测量 */}
                <div className="bg-green-50 border-2 border-green-400 rounded-lg p-4">
                  <div className="text-sm font-semibold text-green-900 mb-2">步骤3：计算预测量</div>
                  <div className="font-mono text-sm text-green-800 space-y-1">
                    <div>预测量 = 需求预测结果 + 安全库存</div>
                    <div className="ml-4">= {period2Demand} + {safetyStock}</div>
                    <div className="ml-4 font-bold text-green-900 text-lg">= {forecastQuantity}</div>
                  </div>
                </div>

                {/* 结果可视化 */}
                <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-green-50 border-2 border-green-300 rounded-lg">
                  <h5 className="text-sm font-semibold text-gray-800 mb-3">📊 预测量构成可视化：</h5>

                  <div className="space-y-2">
                    {/* 需求预测部分 */}
                    <div>
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>需求预测结果</span>
                        <span>{period2Demand} ({((period2Demand / forecastQuantity) * 100).toFixed(1)}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-xs font-bold text-white"
                          style={{ width: `${(period2Demand / forecastQuantity) * 100}%` }}
                        >
                          需求预测 {period2Demand}
                        </div>
                      </div>
                    </div>

                    {/* 安全库存部分 */}
                    <div>
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>安全库存（应对不确定性）</span>
                        <span>{safetyStock} ({((safetyStock / forecastQuantity) * 100).toFixed(1)}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-amber-500 to-orange-600 flex items-center justify-center text-xs font-bold text-white"
                          style={{ width: `${(safetyStock / forecastQuantity) * 100}%` }}
                        >
                          安全库存 {safetyStock}
                        </div>
                      </div>
                    </div>

                    {/* 总预测量 */}
                    <div className="pt-2 border-t-2 border-gray-300">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-gray-800">总预测量</span>
                        <span className="text-2xl font-bold text-green-700">{forecastQuantity}</span>
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
          预测量是生产计划的核心，它不仅基于我们前几步计算出的<strong>需求预测结果</strong>和<strong>服务水平</strong>，还直接影响企业的生产安排和库存管理。通过准确的预测量计算，能够更好地应对市场需求的不确定性，提高企业的生产效率和市场竞争力。
        </p>
      </div>

      {/* 下一步提示 */}
      {hasCalculated && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-800">
            ✓ 已完成第2期的预测量计算，右侧表格已同步更新。请点击“下一步”，我们来学习最后一个核心变量：“投入量”。
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
              ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:from-amber-700 hover:to-orange-700 shadow-lg hover:shadow-xl'
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

export default NewStep4;
