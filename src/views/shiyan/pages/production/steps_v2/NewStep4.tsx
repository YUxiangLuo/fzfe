import React, { useState } from 'react';
import { Shield, ArrowRight, Calculator, Info } from 'lucide-react';
import { useProductionPlan } from '../ProductionPlanContextV2';
import { useToast } from '../../../hooks/useToast';
import Toast from '../../../components/Common/Toast';

/**
 * Step 4: 预测量
 * - 引入安全库存的概念
 * - 理解预测量的构成：预测量 = 实际需求 + 安全库存
 * - 学习如何通过安全库存提高服务水平
 */
const NewStep4: React.FC = () => {
  const { state, updatePeriod2Data, completeCurrentStep, fillPeriod1Data } = useProductionPlan();
  const toast = useToast();

  const [hasCalculated, setHasCalculated] = useState(false);

  const period2Demand = state.period2Data.demandForecast ?? 0;
  const targetServiceLevel = state.targetServiceLevel;
  const zScore = state.safetyStockZScore;

  // 使用预测接口返回的真实标准差
  const calculateSafetyStock = (): number => {
    // 优先使用predictions[1]的标准差（第2期）
    const secondPrediction = state.predictions?.[1];
    if (secondPrediction) {
      const stdDev = secondPrediction.std_dev;
      const safetyStock = Math.round(zScore * stdDev);
      return Math.max(0, safetyStock);
    }
    // 如果没有预测数据，使用简化估算
    const avgDemand = state.avgDemand;
    const stdDev = avgDemand * 0.2;
    const safetyStock = Math.round(zScore * stdDev);
    return Math.max(0, safetyStock);
  };

  // 获取第2期的标准差（用于显示）
  const period2StdDev = state.predictions?.[1]?.std_dev ?? state.avgDemand * 0.2;

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
      const period1StdDev = period1Prediction.std_dev;
      const period1SafetyStock = Math.round(state.safetyStockZScore * period1StdDev);
      fillPeriod1Data({
        ...state.period1Data,
        safetyStock: period1SafetyStock,
      });
    }
  };

  const handleNext = () => {
    if (!hasCalculated) {
      toast.showToast('请先计算安全库存和预测量', 'error');
      return;
    }

    const calculatedSafetyStock = calculateSafetyStock();
    const calculatedForecastQuantity = period2Demand + calculatedSafetyStock;

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
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">第4步：预测量</h3>
          <p className="text-sm text-amber-600">Forecast Quantity with Safety Stock</p>
        </div>
      </div>

      {/* 学习目标 */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-500 rounded-lg p-5">
        <h4 className="font-semibold text-amber-900 mb-3 flex items-center space-x-2">
          <Info className="w-5 h-5" />
          <span>学习目标</span>
        </h4>
        <ul className="text-sm text-amber-800 space-y-2">
          <li>• 理解安全库存的概念和作用</li>
          <li>• 掌握预测量的计算方法</li>
          <li>• 认识安全库存如何提高服务水平</li>
        </ul>
      </div>

      {/* 安全库存概念 */}
      <div className="bg-white border-2 border-amber-200 rounded-lg p-5">
        <h4 className="font-semibold text-gray-800 mb-4">🛡️ 什么是安全库存？</h4>

        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h5 className="font-semibold text-amber-900 mb-2">定义：</h5>
            <p className="text-sm text-amber-800 leading-relaxed">
              <strong>安全库存（Safety Stock）</strong>是为了应对需求不确定性而额外保留的库存。
              它像一个<strong>缓冲垫</strong>，在需求突然增加或供应延迟时，保护企业免于缺货。
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h5 className="font-semibold text-blue-900 mb-2">为什么需要安全库存？</h5>
            <div className="text-sm text-blue-800 space-y-2">
              <div className="flex items-start space-x-2">
                <span className="text-blue-600 font-bold">❌</span>
                <div>
                  <strong>没有安全库存：</strong>需求稍有波动就可能缺货，服务水平不稳定
                </div>
              </div>
              <div className="flex items-start space-x-2">
                <span className="text-green-600 font-bold">✅</span>
                <div>
                  <strong>有安全库存：</strong>能够吸收需求波动，保持稳定的高服务水平
                </div>
              </div>
            </div>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h5 className="font-semibold text-purple-900 mb-2">安全库存计算：</h5>
            <div className="space-y-2">
              <div className="bg-white p-3 rounded border border-purple-300">
                <div className="font-mono text-sm text-gray-800 text-center">
                  安全库存 = Z分数 × 需求标准差
                </div>
              </div>
              <div className="text-xs text-purple-800 space-y-1">
                <div>• <strong>Z分数</strong>：基于目标服务水平的统计参数（您设置的目标：{(targetServiceLevel * 100).toFixed(0)}% → Z = {zScore.toFixed(1)}）</div>
                <div>• <strong>需求标准差</strong>：需求波动的度量（从预测模型获得：σ = {period2StdDev.toFixed(1)}）</div>
                <div className="mt-2 p-2 bg-purple-100 rounded">
                  💡 <strong>服务水平越高</strong> → Z分数越大 → 安全库存越多 → 成本越高
                </div>
              </div>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h5 className="font-semibold text-green-900 mb-2">预测量构成：</h5>
            <div className="bg-white p-3 rounded border border-green-300">
              <div className="font-mono text-sm text-gray-800 text-center font-bold">
                预测量 = 实际需求 + 安全库存
              </div>
            </div>
            <p className="text-xs text-green-800 mt-2">
              预测量是我们实际应该准备的库存量，包括满足预期需求的部分和应对不确定性的安全库存。
            </p>
          </div>
        </div>
      </div>

      {/* 第2期计算 */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 rounded-lg p-5">
        <h4 className="font-semibold text-amber-900 mb-4 flex items-center space-x-2">
          <Calculator className="w-5 h-5" />
          <span>第2期安全库存与预测量计算</span>
        </h4>

        <div className="space-y-4">
          {/* 参数回顾 */}
          <div>
            <h5 className="text-sm font-semibold text-gray-700 mb-2">参数设置：</h5>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white p-3 rounded border border-gray-200">
                <div className="text-xs text-gray-600">目标服务水平</div>
                <div className="text-lg font-bold text-gray-900">{(targetServiceLevel * 100).toFixed(0)}%</div>
              </div>
              <div className="bg-white p-3 rounded border border-gray-200">
                <div className="text-xs text-gray-600">Z分数</div>
                <div className="text-lg font-bold text-gray-900">{zScore.toFixed(1)}</div>
              </div>
              <div className="bg-blue-50 p-3 rounded border border-blue-200">
                <div className="text-xs text-blue-600">第2期实际需求</div>
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
                <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 mb-3">
                  <div className="text-sm font-semibold text-amber-900 mb-2">步骤2：计算安全库存</div>
                  <div className="font-mono text-sm text-amber-800 space-y-1">
                    <div>安全库存 = Z分数 × 需求标准差</div>
                    <div className="ml-4">= {zScore.toFixed(1)} × {period2StdDev.toFixed(1)}</div>
                    <div className="ml-4">= {(zScore * period2StdDev).toFixed(1)}</div>
                    <div className="ml-4 font-bold text-amber-900">≈ {safetyStock}（取整）</div>
                  </div>
                </div>

                {/* 步骤3：计算预测量 */}
                <div className="bg-green-50 border border-green-300 rounded-lg p-4">
                  <div className="text-sm font-semibold text-green-900 mb-2">步骤3：计算预测量</div>
                  <div className="font-mono text-sm text-green-800 space-y-1">
                    <div>预测量 = 实际需求 + 安全库存</div>
                    <div className="ml-4">= {period2Demand} + {safetyStock}</div>
                    <div className="ml-4 font-bold text-green-900">= {forecastQuantity}</div>
                  </div>
                </div>

                {/* 结果可视化 */}
                <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-green-50 border-2 border-green-300 rounded-lg">
                  <h5 className="text-sm font-semibold text-gray-800 mb-3">📊 预测量构成可视化：</h5>

                  <div className="space-y-2">
                    {/* 实际需求部分 */}
                    <div>
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>实际需求</span>
                        <span>{period2Demand} ({((period2Demand / forecastQuantity) * 100).toFixed(1)}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-xs font-bold text-white"
                          style={{ width: `${(period2Demand / forecastQuantity) * 100}%` }}
                        >
                          实际需求 {period2Demand}
                        </div>
                      </div>
                    </div>

                    {/* 安全库存部分 */}
                    <div>
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span>安全库存（缓冲）</span>
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

                {/* 说明 */}
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-sm text-blue-900">
                    💡 <strong>关键洞察：</strong>
                    如果我们只准备{period2Demand}的库存（仅满足预期需求），需求波动时就会缺货。
                    通过增加{safetyStock}的安全库存，我们能够以{(targetServiceLevel * 100).toFixed(0)}%的概率应对需求不确定性，
                    大幅提高服务水平。
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
          <li>• <strong>安全库存</strong>是应对不确定性的保险</li>
          <li>• <strong>预测量</strong>（需求+安全库存）才是真正应该准备的量</li>
          <li>• <strong>目标服务水平越高</strong> → 安全库存越多 → 成本越高，需要权衡</li>
          <li>• 下一步我们将学习如何确定<strong>投入量</strong>来满足预测量</li>
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
              ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white hover:from-amber-700 hover:to-orange-700 shadow-lg hover:shadow-xl'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          <span>下一步</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={toast.hideToast}
      />
    </div>
  );
};

export default NewStep4;
