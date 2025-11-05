import React, { useState } from 'react';
import { Factory, ArrowRight, Info } from 'lucide-react';
import { useProductionPlan } from '../ProductionPlanContextV2';
import {
  CAPACITY_SCENARIOS,
  calculateCapacityByScenario,
  type CapacityScenario,
} from '../utils/productionCapacityHelper';

/**
 * Step 1: 规划总览
 * - 介绍MPS概念、流程结构、关键术语
 * - 用户输入参数（预测期数、目标服务水平、产能场景）
 * - 初始库存固定为0（标准化基准）
 */
const NewStep1: React.FC = () => {
  const { state, updateParameters, updateCapacity, fillPeriod1Data, completeCurrentStep } = useProductionPlan();

  const [forecastPeriods, setForecastPeriods] = useState(state.forecastPeriods);
  const [targetServiceLevel, setTargetServiceLevel] = useState(state.targetServiceLevel);
  const [selectedScenario, setSelectedScenario] = useState<CapacityScenario>(state.capacityScenario);
  const [hasTouchedForecast, setHasTouchedForecast] = useState(false);

  const avgDemand = state.demoPrediction;

  // 🔒 根据客户需求：第一月标准化，初始库存固定为 0
  const INITIAL_INVENTORY = 0;

  const getScenarioBorderClass = (scenarioId: CapacityScenario) => {
    if (selectedScenario === scenarioId) {
      const scenario = CAPACITY_SCENARIOS.find(s => s.id === scenarioId);
      if (scenario?.color === 'red') return 'border-2 border-red-400 bg-red-50';
      if (scenario?.color === 'blue') return 'border-2 border-blue-400 bg-blue-50';
      if (scenario?.color === 'green') return 'border-2 border-green-400 bg-green-50';
    }
    return 'border border-gray-200 hover:bg-gray-50';
  };

  const isForecastPeriodValid = forecastPeriods >= 2;

  const handleNext = () => {
    setHasTouchedForecast(true);

    if (!isForecastPeriodValid) {
      return;
    }

    // 保存参数
    const zScore = {
      0.90: 1.28,
      0.95: 1.65,
      0.98: 2.05,
      0.99: 2.33,
    }[targetServiceLevel] || 1.65;

    updateParameters({
      forecastPeriods,
      initialInventory: INITIAL_INVENTORY, // 固定为 0
      targetServiceLevel,
      safetyStockZScore: zScore,
    });

    // 计算并保存产能
    const capacity = calculateCapacityByScenario(selectedScenario, avgDemand);
    updateCapacity({
      mode: 'scenario',
      scenario: selectedScenario,
      calculatedValue: capacity,
    });

    // 🆕 填充第一期的标准化参考数据
    // 根据客户需求：第一期作为参考基准，采用标准化设置（初始库存=0，缺货=0）
    const stdDev = state.demoStdDev;
    const safetyStock = Math.round(zScore * stdDev);

    fillPeriod1Data({
      demandForecast: avgDemand, // 实际需求 = 平均需求
      safetyStock: safetyStock, // 安全库存
      plannedProduction: avgDemand, // 投入量 = 平均需求（简化）
      beginningInventory: INITIAL_INVENTORY, // 期初库存 = 0（标准化）
      productionOutput: avgDemand, // 产出量 = 平均需求（假设正好满足）
      endingInventory: INITIAL_INVENTORY, // 期末库存 = 0（标准化：产出=需求）
      stockout: 0, // 缺货 = 0（标准化假设）
      serviceLevel: 1.0, // 服务水平 = 100%
    });

    completeCurrentStep();
  };

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div className="flex items-center space-x-3">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
          <Factory className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">第1步：规划总览</h3>
          <p className="text-sm text-blue-600">Master Production Schedule Overview</p>
        </div>
      </div>

      {/* 客户需求：页面目标 */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 rounded-lg p-5">
        <h4 className="font-semibold text-blue-900 mb-3 flex items-center space-x-2">
          <Info className="w-5 h-5" />
          <span>流程说明</span>
        </h4>
        <p className="text-sm text-blue-800 leading-relaxed mb-3">
          本向导将带您按顺序完成 MPS（主生产计划）制定。
          <br />
          每一步会逐步解锁并计算：
        </p>
        <div className="flex items-center space-x-2 text-sm font-medium text-blue-900 bg-white/50 px-4 py-2 rounded-lg">
          <span>投入量</span>
          <ArrowRight className="w-4 h-4" />
          <span>产出量</span>
          <ArrowRight className="w-4 h-4" />
          <span>库存</span>
          <ArrowRight className="w-4 h-4" />
          <span>缺货</span>
          <ArrowRight className="w-4 h-4" />
          <span>服务水平</span>
        </div>
      </div>

      {/* 关键解释模块 */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h5 className="font-semibold text-gray-800 mb-2">⏱️ 时间单位</h5>
          <p className="text-sm text-gray-700">
            <strong>月</strong> - 每个期间代表一个月
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h5 className="font-semibold text-gray-800 mb-2">🚚 提前期（Lead Time）</h5>
          <p className="text-sm text-gray-700">
            <strong>1 个月</strong> - 本月投入 → 下月才能产出
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h5 className="font-semibold text-gray-800 mb-2">📌 第一月标准化</h5>
          <p className="text-sm text-gray-700">
            初始库存=<strong>0</strong>、缺货=<strong>0</strong>
            <br />
            真实动态从第二月起体现
          </p>
        </div>
      </div>

      {/* 参数设置 */}
      <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
        <h4 className="font-semibold text-gray-800 mb-4">📋 设置生产计划参数</h4>

        <div className="space-y-5">
          {/* 预测期数 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              预测期数（计划多少期）
            </label>
            <input
              type="number"
              min="2"
              max="12"
              value={forecastPeriods}
              onChange={(e) => {
                setForecastPeriods(Number(e.target.value));
                setHasTouchedForecast(true);
              }}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                hasTouchedForecast && !isForecastPeriodValid
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-300'
              }`}
            />
            {hasTouchedForecast && !isForecastPeriodValid && (
              <p className="mt-1 text-sm text-red-600">预测期数至少需要2期</p>
            )}
            <p className="mt-1 text-xs text-gray-500">推荐设置 4-8 期</p>
          </div>

          {/* 目标服务水平 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              目标服务水平
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[0.90, 0.95, 0.98, 0.99].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setTargetServiceLevel(level)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    targetServiceLevel === level
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {(level * 100).toFixed(0)}%
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              服务水平越高，安全库存越高，缺货风险越低。推荐 95%
            </p>
          </div>

          {/* 产能场景选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              产能约束场景
            </label>
            <div className="grid md:grid-cols-3 gap-3">
              {CAPACITY_SCENARIOS.map((scenario) => (
                <button
                  key={scenario.id}
                  type="button"
                  onClick={() => setSelectedScenario(scenario.id)}
                  className={`p-4 rounded-lg transition-all text-left ${getScenarioBorderClass(scenario.id)}`}
                >
                  <div className="font-semibold text-gray-900 mb-1">{scenario.label}</div>
                  <div className="text-xs text-gray-600 mb-2">{scenario.description}</div>
                  <div className="text-xs font-medium text-gray-700">
                    产能 = 平均需求 × {scenario.multiplier}
                  </div>
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              产能场景决定了每期的最大产出能力。推荐选择"正常"场景。
            </p>
          </div>
        </div>
      </div>

      {/* 下一步按钮 */}
      <div className="flex justify-end pt-4">
        <button
          type="button"
          onClick={handleNext}
          disabled={!isForecastPeriodValid}
          className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${
            isForecastPeriodValid
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl'
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

export default NewStep1;
