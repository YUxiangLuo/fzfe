import React, { useState } from 'react';
import { TrendingUp, ArrowRight, Calculator, Info } from 'lucide-react';
import { useProductionPlan } from '../ProductionPlanContextV2';

/**
 * Step 2: 生产变量（基础四列）
 * - 理解核心四个变量：实际需求、产出量、库存、缺货
 * - 掌握第一月标准化规则
 * - 学习第二月计算逻辑
 */
const NewStep2: React.FC = () => {
  const { state, updatePeriod2Data, completeCurrentStep } = useProductionPlan();

  const [productionOutput, setProductionOutput] = useState(state.period2Data.productionOutput ?? 0);
  const [hasCalculated, setHasCalculated] = useState(false);

  const avgDemand = state.demoPrediction;
  const period2Demand = avgDemand; // 第2期实际需求等于平均需求

  // 计算期末库存和缺货
  const calculateInventoryAndStockout = () => {
    const beginningInventory = state.initialInventory; // 第2期期初 = 第1期期末 = 初始库存
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
  };

  const handleNext = () => {
    if (!hasCalculated) {
      alert('请先计算第2期的库存和缺货');
      return;
    }

    const { endingInventory, stockout } = calculateInventoryAndStockout();

    // 保存第2期数据
    updatePeriod2Data({
      demandForecast: period2Demand,
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
          <TrendingUp className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">第2步：生产变量（基础四列）</h3>
          <p className="text-sm text-green-600">Core Production Variables</p>
        </div>
      </div>

      {/* 学习目标 */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-500 rounded-lg p-5">
        <h4 className="font-semibold text-green-900 mb-3 flex items-center space-x-2">
          <Info className="w-5 h-5" />
          <span>学习目标</span>
        </h4>
        <ul className="text-sm text-green-800 space-y-2">
          <li>• 理解核心四个变量的定义和关系</li>
          <li>• 掌握第一月的标准化规则</li>
          <li>• 学习第二月的库存和缺货计算逻辑</li>
        </ul>
      </div>

      {/* 变量定义 */}
      <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
        <h4 className="font-semibold text-gray-800 mb-4">📊 核心变量定义</h4>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
              <h5 className="font-semibold text-gray-800">实际需求</h5>
            </div>
            <p className="text-sm text-gray-700">
              该期实际的市场需求量（需求预测结果）
            </p>
          </div>

          <div className="bg-white border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-8 h-8 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
              <h5 className="font-semibold text-gray-800">产出量</h5>
            </div>
            <p className="text-sm text-gray-700">
              该期实际生产完成的产品数量（上期投入 → 本期产出，提前期1月）
            </p>
          </div>

          <div className="bg-white border border-purple-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
              <h5 className="font-semibold text-gray-800">库存（期末库存）</h5>
            </div>
            <p className="text-sm text-gray-700">
              该期结束时剩余的库存量
              <br />
              <span className="font-mono text-xs bg-purple-50 px-2 py-1 rounded mt-1 inline-block">
                = 期初库存 + 产出量 - 实际需求
              </span>
            </p>
          </div>

          <div className="bg-white border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <div className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center text-sm font-bold">4</div>
              <h5 className="font-semibold text-gray-800">缺货</h5>
            </div>
            <p className="text-sm text-gray-700">
              无法满足的需求量（库存不足时发生）
              <br />
              <span className="font-mono text-xs bg-red-50 px-2 py-1 rounded mt-1 inline-block">
                = max(0, 实际需求 - 可用库存)
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* 第一月标准化规则 */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
        <h4 className="font-semibold text-amber-900 mb-3">📌 第一月标准化规则</h4>
        <div className="space-y-2 text-sm text-amber-800">
          <p>为了简化学习，第1期作为<strong>参考基准</strong>，采用标准化设置：</p>
          <ul className="ml-4 space-y-1">
            <li>• <strong>期初库存</strong> = {state.initialInventory}（您设置的初始库存）</li>
            <li>• <strong>实际需求</strong> = {avgDemand}（平均需求）</li>
            <li>• <strong>产出量</strong> = {avgDemand}（假设正好满足需求）</li>
            <li>• <strong>期末库存</strong> = {state.initialInventory}（保持不变）</li>
            <li>• <strong>缺货</strong> = 0（无缺货）</li>
          </ul>
          <p className="mt-3 font-medium">
            ⚠️ 真实的动态计算从<strong>第2期</strong>开始！
          </p>
        </div>
      </div>

      {/* 第二月计算演示 */}
      <div className="bg-white border-2 border-blue-300 rounded-lg p-5">
        <h4 className="font-semibold text-blue-900 mb-4 flex items-center space-x-2">
          <Calculator className="w-5 h-5" />
          <span>第2期计算演示</span>
        </h4>

        <div className="space-y-4">
          {/* 已知数据 */}
          <div>
            <h5 className="text-sm font-semibold text-gray-700 mb-2">已知数据：</h5>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 p-3 rounded border border-gray-200">
                <div className="text-xs text-gray-600">第2期期初库存</div>
                <div className="text-lg font-bold text-gray-900">{state.initialInventory}</div>
                <div className="text-xs text-gray-500 mt-1">= 第1期期末库存</div>
              </div>
              <div className="bg-blue-50 p-3 rounded border border-blue-200">
                <div className="text-xs text-blue-600">第2期实际需求</div>
                <div className="text-lg font-bold text-blue-900">{period2Demand}</div>
                <div className="text-xs text-blue-500 mt-1">需求预测结果</div>
              </div>
            </div>
          </div>

          {/* 产出量输入 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              第2期产出量（请输入）
            </label>
            <input
              type="number"
              min="0"
              value={productionOutput}
              onChange={(e) => {
                setProductionOutput(Number(e.target.value));
                setHasCalculated(false);
              }}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="输入产出量"
            />
            <p className="mt-1 text-xs text-gray-500">
              💡 提示：产出量来自上期投入（提前期1月）。尝试输入 {avgDemand} 或其他值看看效果。
            </p>
          </div>

          {/* 计算按钮 */}
          <button
            type="button"
            onClick={handleCalculate}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
          >
            <Calculator className="w-5 h-5" />
            <span>计算期末库存和缺货</span>
          </button>

          {/* 计算结果 */}
          {hasCalculated && (
            <div className="space-y-3 animate-fadeIn">
              <div className="border-t-2 border-gray-200 pt-4">
                <h5 className="text-sm font-semibold text-gray-700 mb-3">计算过程：</h5>

                {/* 库存计算 */}
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-3">
                  <div className="text-sm font-semibold text-purple-900 mb-2">期末库存计算：</div>
                  <div className="font-mono text-sm text-purple-800 space-y-1">
                    <div>期末库存 = 期初库存 + 产出量 - 实际需求</div>
                    <div className="ml-4">= {state.initialInventory} + {productionOutput} - {period2Demand}</div>
                    <div className="ml-4">= {state.initialInventory + productionOutput - period2Demand}</div>
                    <div className="ml-4 font-bold text-purple-900">
                      最终库存 = {endingInventory}
                      {state.initialInventory + productionOutput - period2Demand < 0 && (
                        <span className="text-xs ml-2">(负值时取0)</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* 缺货计算 */}
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="text-sm font-semibold text-red-900 mb-2">缺货计算：</div>
                  <div className="font-mono text-sm text-red-800 space-y-1">
                    <div>缺货 = max(0, 实际需求 - 可用库存)</div>
                    <div className="ml-4">
                      = max(0, {period2Demand} - ({state.initialInventory} + {productionOutput}))
                    </div>
                    <div className="ml-4">= max(0, {period2Demand - state.initialInventory - productionOutput})</div>
                    <div className="ml-4 font-bold text-red-900">
                      缺货 = {stockout}
                      {stockout! > 0 && <span className="ml-2">⚠️ 发生缺货！</span>}
                    </div>
                  </div>
                </div>
              </div>

              {/* 结果总结 */}
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-300 rounded-lg p-4">
                <div className="text-sm font-semibold text-gray-800 mb-2">📋 第2期结果总结：</div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-gray-600">实际需求：</span>
                    <span className="font-bold text-gray-900 ml-2">{period2Demand}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">产出量：</span>
                    <span className="font-bold text-gray-900 ml-2">{productionOutput}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">期末库存：</span>
                    <span className="font-bold text-purple-700 ml-2">{endingInventory}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">缺货：</span>
                    <span className={`font-bold ml-2 ${stockout! > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {stockout}
                    </span>
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
          <li>• <strong>库存</strong>是缓冲器：吸收供需波动</li>
          <li>• <strong>缺货</strong>发生时：库存不足以满足需求</li>
          <li>• <strong>产出量</strong>受上期投入影响：提前期为1个月</li>
          <li>• 这四个变量构成了MPS的基础框架</li>
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
              ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl'
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

export default NewStep2;
