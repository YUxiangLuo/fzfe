import React, { useState } from 'react';
import { Factory, ArrowRight } from 'lucide-react';
import { useProductionPlan } from '../ProductionPlanContextV2';
import {
  CAPACITY_SCENARIOS,
  calculateCapacityByScenario,
  type CapacityScenario,
} from '../utils/productionCapacityHelper';

const ConceptStep1: React.FC = () => {
  const { state, updateParameters, updateCapacity, completeCurrentStep } = useProductionPlan();

  const [forecastPeriods, setForecastPeriods] = useState(state.forecastPeriods);
  const [initialInventory, setInitialInventory] = useState(state.initialInventory);
  const [targetServiceLevel, setTargetServiceLevel] = useState(state.targetServiceLevel);
  const [selectedScenario, setSelectedScenario] = useState<CapacityScenario>(state.capacityScenario);

  // 计算平均需求（基于演示数据）
  const avgDemand = state.demoPrediction;

  // 获取当前场景的样式类
  const getScenarioBorderClass = (scenarioId: CapacityScenario) => {
    if (selectedScenario === scenarioId) {
      const scenario = CAPACITY_SCENARIOS.find(s => s.id === scenarioId);
      if (scenario?.color === 'red') return 'border-2 border-red-400 bg-red-50';
      if (scenario?.color === 'blue') return 'border-2 border-blue-400 bg-blue-50';
      if (scenario?.color === 'green') return 'border-2 border-green-400 bg-green-50';
    }
    return 'border border-gray-200 hover:bg-gray-50';
  };

  const handleNext = () => {
    // 保存参数
    const zScore = {
      0.90: 1.28,
      0.95: 1.65,
      0.98: 2.05,
      0.99: 2.33,
    }[targetServiceLevel] || 1.65;

    updateParameters({
      forecastPeriods,
      initialInventory,
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

    completeCurrentStep();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
          <Factory className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-gray-900">主生产计划（MPS）概述</h3>
          <p className="text-sm text-blue-600">Master Production Schedule</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-800 mb-2">🎯 什么是MPS？</h4>
        <p className="text-sm text-blue-700">
          主生产计划（MPS）是连接企业战略目标与生产执行的桥梁。它详细规定了在特定时间段内，<strong>需要生产哪些产品、生产多少、何时生产</strong>。MPS综合考虑了市场需求、库存水平和生产能力，是企业生产管理的核心工具。
        </p>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-semibold text-gray-800 mb-3">设置生产计划参数</h4>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              预测期数（计划多少期）
            </label>
            <input
              type="number"
              min="3"
              max="12"
              value={forecastPeriods}
              onChange={(e) => setForecastPeriods(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">通常选择6-12期（月）</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              期初库存（件）
            </label>
            <input
              type="number"
              min="0"
              value={initialInventory}
              onChange={(e) => setInitialInventory(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">当前仓库中的产品数量</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              目标服务水平
            </label>
            <select
              value={targetServiceLevel}
              onChange={(e) => setTargetServiceLevel(Number(e.target.value))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value={0.90}>90% (低成本，允许一定缺货)</option>
              <option value={0.95}>95% (均衡选择，推荐)</option>
              <option value={0.98}>98% (高服务水平)</option>
              <option value={0.99}>99% (极高要求，高库存成本)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              服务水平越高，安全库存越多，库存成本越高
            </p>
          </div>
        </div>
      </div>

      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-semibold text-gray-800 mb-3">工厂产能状况（请选择场景）</h4>
        <p className="text-xs text-gray-600 mb-4">
          产能决定了工厂每期最多能生产多少件产品。选择不同的产能场景，可以体验产能约束对生产计划的影响。
        </p>

        <div className="space-y-3">
          {CAPACITY_SCENARIOS.map((scenario) => {
            const calculatedCapacity = calculateCapacityByScenario(scenario.id, avgDemand);
            const isSelected = selectedScenario === scenario.id;

            return (
              <div
                key={scenario.id}
                onClick={() => setSelectedScenario(scenario.id)}
                className={`cursor-pointer p-4 rounded-lg border-2 transition-all ${getScenarioBorderClass(scenario.id)}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          isSelected
                            ? scenario.color === 'red'
                              ? 'border-red-500 bg-red-500'
                              : scenario.color === 'blue'
                              ? 'border-blue-500 bg-blue-500'
                              : 'border-green-500 bg-green-500'
                            : 'border-gray-300 bg-white'
                        }`}
                      >
                        {isSelected && <div className="w-2 h-2 bg-white rounded-full" />}
                      </div>
                      <h5 className="font-semibold text-gray-900">{scenario.name}</h5>
                      <span
                        className={`px-2 py-0.5 text-xs rounded ${
                          scenario.riskLevel === 'high'
                            ? 'bg-red-100 text-red-700'
                            : scenario.riskLevel === 'medium'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {scenario.badge}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-1">{scenario.description}</p>
                    <p className="text-xs text-gray-600 mb-2">
                      <strong>计算产能</strong>: {calculatedCapacity.toLocaleString()} 件/期
                      （平均需求 {avgDemand.toLocaleString()} × {scenario.multiplier}）
                    </p>
                    {scenario.recommendation && (
                      <p className="text-xs text-gray-600">{scenario.recommendation}</p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-3 bg-blue-50 border border-blue-200 rounded p-3">
          <p className="text-xs text-blue-700">
            💡 <strong>提示</strong>：选择"产能正常"场景可以获得最佳的学习体验。产能紧张会导致频繁缺货，产能充裕则很少遇到约束。
          </p>
        </div>
      </div>

      <button
        onClick={handleNext}
        className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md hover:shadow-lg transition-all font-medium"
      >
        <span>开始学习第一个变量：需求预测</span>
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
};

export default ConceptStep1;
