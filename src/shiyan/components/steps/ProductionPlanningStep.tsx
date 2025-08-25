import React, { useState } from 'react';
import { Cog, Package, Truck, Calendar, AlertTriangle } from 'lucide-react';

interface ProductionPlanningStepProps {
  data: any;
  onUpdate: (data: any) => void;
}

const ProductionPlanningStep: React.FC<ProductionPlanningStepProps> = ({ data, onUpdate }) => {
  const [planningHorizon, setPlanningHorizon] = useState(data.planningHorizon || '6months');
  const [constraints, setConstraints] = useState(data.constraints || {
    productionCapacity: '1000',
    inventory: '500',
    leadTime: '14',
    safetyStock: '100'
  });
  const [strategy, setStrategy] = useState(data.strategy || 'chase');

  const handleConstraintChange = (key: string, value: string) => {
    const newConstraints = { ...constraints, [key]: value };
    setConstraints(newConstraints);
    onUpdate({ ...data, constraints: newConstraints });
  };

  const handleStrategyChange = (newStrategy: string) => {
    setStrategy(newStrategy);
    onUpdate({ ...data, strategy: newStrategy });
  };

  const handleHorizonChange = (horizon: string) => {
    setPlanningHorizon(horizon);
    onUpdate({ ...data, planningHorizon: horizon });
  };

  // Mock forecast data
  const forecastData = [
    { month: '1月', forecast: 850, production: 900, inventory: 150 },
    { month: '2月', forecast: 920, production: 950, inventory: 180 },
    { month: '3月', forecast: 780, production: 800, inventory: 200 },
    { month: '4月', forecast: 1100, production: 1000, inventory: 100 },
    { month: '5月', forecast: 950, production: 1050, inventory: 200 },
    { month: '6月', forecast: 880, production: 900, inventory: 220 }
  ];

  const strategies = [
    {
      id: 'chase',
      name: '追逐策略',
      description: '调整生产以精确匹配需求',
      pros: ['较低库存成本', '对需求变化响应迅速'],
      cons: ['较高招聘/解雇成本', '产能利用率问题']
    },
    {
      id: 'level',
      name: '水平策略',
      description: '保持恒定的生产率',
      pros: ['稳定的劳动力', '可预测的成本'],
      cons: ['较高库存成本', '缺货风险']
    },
    {
      id: 'hybrid',
      name: '混合策略',
      description: '追逐和水平策略的结合',
      pros: ['平衡的方法', '灵活性'],
      cons: ['更复杂的规划', '中等成本']
    }
  ];

  const calculatePlanMetrics = () => {
    const totalForecast = forecastData.reduce((sum, item) => sum + item.forecast, 0);
    const totalProduction = forecastData.reduce((sum, item) => sum + item.production, 0);
    const avgInventory = forecastData.reduce((sum, item) => sum + item.inventory, 0) / forecastData.length;
    const capacityUtilization = (totalProduction / (parseInt(constraints.productionCapacity) * 6)) * 100;

    return {
      totalForecast,
      totalProduction,
      avgInventory: Math.round(avgInventory),
      capacityUtilization: Math.round(capacityUtilization)
    };
  };

  const metrics = calculatePlanMetrics();

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">生产计划</h2>
        <p className="text-gray-600">
          基于您的需求预测创建生产计划，考虑产能约束、
          库存水平和业务目标。
        </p>
      </div>

      {/* Planning Horizon */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center space-x-2 mb-4">
          <Calendar className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">规划周期</h3>
        </div>
        
        <div className="flex space-x-4">
          {['3months', '6months', '12months'].map((horizon) => (
            <button
              key={horizon}
              onClick={() => handleHorizonChange(horizon)}
              className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                planningHorizon === horizon
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {horizon === '3months' ? '3个月' : horizon === '6months' ? '6个月' : '12个月'}
            </button>
          ))}
        </div>
      </div>

      {/* Production Constraints */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center space-x-2 mb-4">
          <Cog className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">生产约束</h3>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              月产能
            </label>
            <input
              type="number"
              value={constraints.productionCapacity}
              onChange={(e) => handleConstraintChange('productionCapacity', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="单位/月"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              当前库存
            </label>
            <input
              type="number"
              value={constraints.inventory}
              onChange={(e) => handleConstraintChange('inventory', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="库存单位"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              交货期（天）
            </label>
            <input
              type="number"
              value={constraints.leadTime}
              onChange={(e) => handleConstraintChange('leadTime', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="天数"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              安全库存
            </label>
            <input
              type="number"
              value={constraints.safetyStock}
              onChange={(e) => handleConstraintChange('safetyStock', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="最小单位"
            />
          </div>
        </div>
      </div>

      {/* Production Strategy */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center space-x-2 mb-4">
          <Package className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">生产策略</h3>
        </div>
        
        <div className="grid md:grid-cols-3 gap-4">
          {strategies.map((strategyOption) => (
            <div
              key={strategyOption.id}
              onClick={() => handleStrategyChange(strategyOption.id)}
              className={`cursor-pointer p-4 rounded-lg border-2 transition-all ${
                strategy === strategyOption.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <h4 className="font-semibold text-gray-900 mb-2">{strategyOption.name}</h4>
              <p className="text-sm text-gray-600 mb-3">{strategyOption.description}</p>
              
              <div className="mb-3">
                <p className="text-xs font-medium text-green-700 mb-1">优点：</p>
                <ul className="text-xs text-green-600 space-y-1">
                  {strategyOption.pros.map((pro, index) => (
                    <li key={index}>• {pro}</li>
                  ))}
                </ul>
              </div>
              
              <div>
                <p className="text-xs font-medium text-red-700 mb-1">缺点：</p>
                <ul className="text-xs text-red-600 space-y-1">
                  {strategyOption.cons.map((con, index) => (
                    <li key={index}>• {con}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Production Plan Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center space-x-2 mb-4">
          <Truck className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">生产计划概览</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-900">月份</th>
                <th className="text-right py-3 px-4 font-medium text-gray-900">预测需求</th>
                <th className="text-right py-3 px-4 font-medium text-gray-900">计划生产</th>
                <th className="text-right py-3 px-4 font-medium text-gray-900">期末库存</th>
                <th className="text-center py-3 px-4 font-medium text-gray-900">状态</th>
              </tr>
            </thead>
            <tbody>
              {forecastData.map((row, index) => (
                <tr key={index} className="border-b border-gray-100">
                  <td className="py-3 px-4 font-medium">{row.month}</td>
                  <td className="py-3 px-4 text-right">{row.forecast.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right">{row.production.toLocaleString()}</td>
                  <td className="py-3 px-4 text-right">{row.inventory.toLocaleString()}</td>
                  <td className="py-3 px-4 text-center">
                    {row.inventory < parseInt(constraints.safetyStock) ? (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-red-100 text-red-800">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        库存不足
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                        ✓ 正常
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Plan Metrics */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">计划绩效指标</h3>
        
        <div className="grid md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-blue-900">总预测需求</p>
            <p className="text-2xl font-bold text-blue-900">{metrics.totalForecast.toLocaleString()}</p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-green-900">计划生产</p>
            <p className="text-2xl font-bold text-green-900">{metrics.totalProduction.toLocaleString()}</p>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-purple-900">平均库存</p>
            <p className="text-2xl font-bold text-purple-900">{metrics.avgInventory.toLocaleString()}</p>
          </div>
          
          <div className="bg-orange-50 p-4 rounded-lg">
            <p className="text-sm font-medium text-orange-900">产能利用率</p>
            <p className="text-2xl font-bold text-orange-900">{metrics.capacityUtilization}%</p>
          </div>
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">计划分析</h4>
          <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-700">
            <div>
              <p className="mb-2">
                <strong>策略：</strong> {strategies.find(s => s.id === strategy)?.name}
              </p>
              <p>
                <strong>规划周期：</strong> {planningHorizon === '3months' ? '3个月' : planningHorizon === '6months' ? '6个月' : '12个月'}
              </p>
            </div>
            <div>
              <p className="mb-2">
                <strong>服务水平：</strong> {metrics.avgInventory >= parseInt(constraints.safetyStock) ? '高' : '中等'}
              </p>
              <p>
                <strong>效率：</strong> {metrics.capacityUtilization > 85 ? '高' : metrics.capacityUtilization > 70 ? '良好' : '中等'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductionPlanningStep;