import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import type { AppState } from '../App';
import { Calendar, CheckCircle, Factory, Truck, AlertTriangle, ArrowRight, Calculator, Target, TrendingUp, Package, FileText, BarChart3 } from 'lucide-react';

interface Props {
  appState: AppState;
  updateAppState: (updates: Partial<AppState>) => void;
  completeStep: (step: number) => void;
}

const ProductionPlan: React.FC<Props> = ({ completeStep }) => {
  const location = useLocation();
  const [currentSubStep, setCurrentSubStep] = useState(1);
  const [completedSubSteps, setCompletedSubSteps] = useState<number[]>([]);

  const subSteps = [
    { id: 1, title: '生产计划制定总概述', icon: FileText, path: 'overview' },
    { id: 2, title: '计算生产变量', icon: Calculator, path: 'variables' },
    { id: 3, title: '计算服务水平', icon: Target, path: 'service-level' },
    { id: 4, title: '计算预测量', icon: TrendingUp, path: 'forecast' },
    { id: 5, title: '计算投入量', icon: Package, path: 'input' },
    { id: 6, title: '完整计划表生成', icon: BarChart3, path: 'final-plan' },
  ];

  const handleCompleteSubStep = (stepId: number) => {
    if (!completedSubSteps.includes(stepId)) {
      setCompletedSubSteps([...completedSubSteps, stepId]);
    }
    if (stepId < 6) {
      setCurrentSubStep(stepId + 1);
    } else {
      // 完成所有子步骤，完成整个生产计划步骤
      completeStep(7);
    }
  };

  const getSubStepStatus = (stepId: number) => {
    if (completedSubSteps.includes(stepId)) return 'completed';
    if (stepId === currentSubStep) return 'current';
    if (stepId < currentSubStep) return 'available';
    return 'locked';
  };

  const getSubStepStyles = (stepId: number) => {
    const status = getSubStepStatus(stepId);
    const isActive = stepId === currentSubStep;
    
    switch (status) {
      case 'completed':
        return `bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 ${isActive ? 'ring-2 ring-green-400' : ''}`;
      case 'current':
        return `bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 ${isActive ? 'ring-2 ring-blue-400' : ''}`;
      case 'available':
        return `bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 ${isActive ? 'ring-2 ring-gray-300' : ''}`;
      default:
        return 'bg-gray-25 text-gray-400 cursor-not-allowed border border-gray-100';
    }
  };

  const renderSubStepContent = () => {
    switch (currentSubStep) {
      case 1:
        return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">生产计划制定总概述</h2>
                <p className="text-blue-600 font-medium">了解生产计划制定的整体流程和关键要素</p>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-800 mb-4">生产计划制定流程</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium text-blue-700 mb-3">核心步骤</h4>
                    <ul className="space-y-2 text-blue-600 text-sm">
                      <li>• 分析需求预测结果</li>
                      <li>• 确定生产变量参数</li>
                      <li>• 计算目标服务水平</li>
                      <li>• 制定生产数量计划</li>
                      <li>• 优化资源投入配置</li>
                      <li>• 生成完整执行方案</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-blue-700 mb-3">关键考虑因素</h4>
                    <ul className="space-y-2 text-blue-600 text-sm">
                      <li>• 生产能力约束</li>
                      <li>• 库存成本控制</li>
                      <li>• 客户服务水平</li>
                      <li>• 原材料供应</li>
                      <li>• 季节性需求波动</li>
                      <li>• 市场不确定性</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-semibold text-green-800 mb-2">预测输入</h4>
                  <p className="text-green-700 text-sm">基于LSTM模型的需求预测结果，为生产计划提供数据基础</p>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h4 className="font-semibold text-orange-800 mb-2">约束条件</h4>
                  <p className="text-orange-700 text-sm">生产能力、库存限制、成本预算等现实约束条件</p>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h4 className="font-semibold text-purple-800 mb-2">优化目标</h4>
                  <p className="text-purple-700 text-sm">最小化总成本，同时满足客户需求和服务水平要求</p>
                </div>
              </div>

              <button
                onClick={() => handleCompleteSubStep(1)}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md hover:shadow-lg transition-all font-medium"
              >
                开始制定生产计划
              </button>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <Calculator className="w-8 h-8 text-green-600" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">计算生产变量</h2>
                <p className="text-green-600 font-medium">确定生产计划中的关键变量参数</p>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">生产能力参数</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">日产能力</span>
                        <span className="font-semibold text-gray-900">800台/天</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">月工作日</span>
                        <span className="font-semibold text-gray-900">22天</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">产能利用率</span>
                        <span className="font-semibold text-green-600">85%</span>
                      </div>
                      <div className="flex justify-between items-center border-t pt-2">
                        <span className="text-gray-600 font-medium">月最大产能</span>
                        <span className="font-bold text-gray-900">14,960台</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">成本参数</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">单位生产成本</span>
                        <span className="font-semibold text-gray-900">¥850/台</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">库存持有成本</span>
                        <span className="font-semibold text-gray-900">¥25/台/月</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">缺货成本</span>
                        <span className="font-semibold text-red-600">¥120/台</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-green-800 mb-4">变量计算结果</h3>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium text-green-700 mb-2">生产弹性系数</h4>
                        <div className="bg-white rounded p-3">
                          <div className="text-2xl font-bold text-green-600">1.15</div>
                          <p className="text-sm text-green-600">考虑需求波动的安全系数</p>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-green-700 mb-2">最优批量大小</h4>
                        <div className="bg-white rounded p-3">
                          <div className="text-2xl font-bold text-green-600">2,400台</div>
                          <p className="text-sm text-green-600">基于EOQ模型计算</p>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-green-700 mb-2">提前期</h4>
                        <div className="bg-white rounded p-3">
                          <div className="text-2xl font-bold text-green-600">15天</div>
                          <p className="text-sm text-green-600">从原料到成品的总时间</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleCompleteSubStep(2)}
                className="w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-md hover:shadow-lg transition-all font-medium"
              >
                确认生产变量，进入下一步
              </button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                <Target className="w-8 h-8 text-orange-600" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">计算服务水平</h2>
                <p className="text-orange-600 font-medium">确定客户服务水平和安全库存</p>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-orange-800 mb-4">服务水平目标设定</h3>
                <p className="text-orange-700 mb-4">
                  服务水平是指在给定时间内能够满足客户需求的概率。较高的服务水平意味着更好的客户满意度，
                  但也需要更多的安全库存投入。
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white rounded-lg p-4 border border-orange-200">
                    <h4 className="font-semibold text-orange-800 mb-2">保守型</h4>
                    <div className="text-2xl font-bold text-orange-600 mb-2">95%</div>
                    <p className="text-sm text-orange-600">高安全库存，低缺货风险</p>
                  </div>
                  <div className="bg-orange-100 rounded-lg p-4 border-2 border-orange-400">
                    <h4 className="font-semibold text-orange-800 mb-2">平衡型 ✓</h4>
                    <div className="text-2xl font-bold text-orange-600 mb-2">92%</div>
                    <p className="text-sm text-orange-600">成本与服务的最佳平衡</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 border border-orange-200">
                    <h4 className="font-semibold text-orange-800 mb-2">激进型</h4>
                    <div className="text-2xl font-bold text-orange-600 mb-2">88%</div>
                    <p className="text-sm text-orange-600">低库存成本，较高缺货风险</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">安全库存计算</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">需求标准差</span>
                      <span className="font-semibold text-gray-900">285台</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">提前期</span>
                      <span className="font-semibold text-gray-900">15天</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">安全系数(Z值)</span>
                      <span className="font-semibold text-orange-600">1.41</span>
                    </div>
                    <div className="flex justify-between items-center border-t pt-2">
                      <span className="text-gray-600 font-medium">安全库存</span>
                      <span className="font-bold text-orange-600">1,650台</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">服务水平影响分析</h3>
                  <div className="space-y-4">
                    <div className="bg-green-100 rounded p-3">
                      <h4 className="font-medium text-green-800">客户满意度</h4>
                      <p className="text-sm text-green-700">92%的订单能够及时交付</p>
                    </div>
                    <div className="bg-blue-100 rounded p-3">
                      <h4 className="font-medium text-blue-800">库存成本</h4>
                      <p className="text-sm text-blue-700">月均库存成本约¥41,250</p>
                    </div>
                    <div className="bg-red-100 rounded p-3">
                      <h4 className="font-medium text-red-800">缺货风险</h4>
                      <p className="text-sm text-red-700">8%的概率出现缺货情况</p>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleCompleteSubStep(3)}
                className="w-full px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 shadow-md hover:shadow-lg transition-all font-medium"
              >
                确认服务水平，继续计算预测量
              </button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">计算预测量</h2>
                <p className="text-purple-600 font-medium">基于需求预测结果计算生产数量</p>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-purple-800 mb-4">LSTM预测结果回顾</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { month: '2025-01', demand: 1920 },
                    { month: '2025-02', demand: 2350 },
                    { month: '2025-03', demand: 1850 },
                    { month: '2025-04', demand: 1780 },
                    { month: '2025-05', demand: 2180 },
                    { month: '2025-06', demand: 2520 },
                  ].map((item, index) => (
                    <div key={index} className="bg-white rounded p-3 text-center">
                      <div className="text-sm text-purple-600">{item.month}</div>
                      <div className="text-lg font-bold text-purple-800">{item.demand.toLocaleString()}台</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">生产数量计算</h3>
                  <div className="space-y-4">
                    {[
                      { month: '2025-01', demand: 1920, safety: 1650, production: 1950 },
                      { month: '2025-02', demand: 2350, safety: 1650, production: 2380 },
                      { month: '2025-03', demand: 1850, safety: 1650, production: 1880 },
                      { month: '2025-04', demand: 1780, safety: 1650, production: 1810 },
                      { month: '2025-05', demand: 2180, safety: 1650, production: 2210 },
                      { month: '2025-06', demand: 2520, safety: 1650, production: 2550 },
                    ].map((item, index) => (
                      <div key={index} className="bg-white rounded p-3">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium">{item.month}</span>
                          <span className="text-purple-600 font-bold">{item.production.toLocaleString()}台</span>
                        </div>
                        <div className="text-xs text-gray-500">
                          需求: {item.demand.toLocaleString()} + 安全库存调整: {item.production - item.demand}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-purple-100 border border-purple-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-purple-800 mb-4">预测量汇总</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-purple-700">总预测需求</span>
                        <span className="font-bold text-purple-900">12,600台</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-purple-700">总生产计划</span>
                        <span className="font-bold text-purple-900">12,780台</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-purple-700">安全库存缓冲</span>
                        <span className="font-bold text-purple-900">180台</span>
                      </div>
                      <div className="flex justify-between items-center border-t pt-2">
                        <span className="text-purple-700 font-medium">平均月产量</span>
                        <span className="font-bold text-purple-900">2,130台</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h4 className="font-semibold text-green-800 mb-2">产能验证</h4>
                    <div className="flex justify-between items-center">
                      <span className="text-green-700">月最大产能</span>
                      <span className="font-bold text-green-800">14,960台</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-green-700">最高月需求</span>
                      <span className="font-bold text-green-800">2,550台</span>
                    </div>
                    <div className="text-sm text-green-600 mt-2">
                      ✓ 产能充足，可以满足所有预测需求
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleCompleteSubStep(4)}
                className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 shadow-md hover:shadow-lg transition-all font-medium"
              >
                确认预测量，计算投入量
              </button>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
                <Package className="w-8 h-8 text-indigo-600" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">计算投入量</h2>
                <p className="text-indigo-600 font-medium">确定原材料、人力和设备资源需求</p>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-indigo-800 mb-4">原材料需求</h3>
                  <div className="space-y-3">
                    <div className="bg-white rounded p-3">
                      <div className="text-sm text-indigo-600">钢材</div>
                      <div className="text-lg font-bold text-indigo-800">2,556吨</div>
                      <div className="text-xs text-indigo-500">每台需2kg</div>
                    </div>
                    <div className="bg-white rounded p-3">
                      <div className="text-sm text-indigo-600">电子元件</div>
                      <div className="text-lg font-bold text-indigo-800">38,340套</div>
                      <div className="text-xs text-indigo-500">每台需3套</div>
                    </div>
                    <div className="bg-white rounded p-3">
                      <div className="text-sm text-indigo-600">包装材料</div>
                      <div className="text-lg font-bold text-indigo-800">12,780套</div>
                      <div className="text-xs text-indigo-500">每台需1套</div>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-green-800 mb-4">人力资源</h3>
                  <div className="space-y-3">
                    <div className="bg-white rounded p-3">
                      <div className="text-sm text-green-600">生产工人</div>
                      <div className="text-lg font-bold text-green-800">120人</div>
                      <div className="text-xs text-green-500">标准班次配置</div>
                    </div>
                    <div className="bg-white rounded p-3">
                      <div className="text-sm text-green-600">技术人员</div>
                      <div className="text-lg font-bold text-green-800">15人</div>
                      <div className="text-xs text-green-500">质量控制和维护</div>
                    </div>
                    <div className="bg-white rounded p-3">
                      <div className="text-sm text-green-600">管理人员</div>
                      <div className="text-lg font-bold text-green-800">8人</div>
                      <div className="text-xs text-green-500">生产调度和协调</div>
                    </div>
                  </div>
                </div>

                <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-orange-800 mb-4">设备资源</h3>
                  <div className="space-y-3">
                    <div className="bg-white rounded p-3">
                      <div className="text-sm text-orange-600">生产线</div>
                      <div className="text-lg font-bold text-orange-800">4条</div>
                      <div className="text-xs text-orange-500">每条200台/天</div>
                    </div>
                    <div className="bg-white rounded p-3">
                      <div className="text-sm text-orange-600">检测设备</div>
                      <div className="text-lg font-bold text-orange-800">8台</div>
                      <div className="text-xs text-orange-500">质量检测</div>
                    </div>
                    <div className="bg-white rounded p-3">
                      <div className="text-sm text-orange-600">包装设备</div>
                      <div className="text-lg font-bold text-orange-800">2台</div>
                      <div className="text-xs text-orange-500">自动包装线</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">投入成本分析</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-800">月度投入成本</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">原材料成本</span>
                        <span className="font-semibold text-gray-900">¥1,278万</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">人工成本</span>
                        <span className="font-semibold text-gray-900">¥86万</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">设备折旧</span>
                        <span className="font-semibold text-gray-900">¥45万</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">能源消耗</span>
                        <span className="font-semibold text-gray-900">¥32万</span>
                      </div>
                      <div className="flex justify-between items-center border-t pt-2">
                        <span className="text-gray-700 font-medium">总投入成本</span>
                        <span className="font-bold text-gray-900">¥1,441万</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium text-gray-800">资源利用率</h4>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-gray-600">生产线利用率</span>
                          <span className="font-semibold text-gray-900">85%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-green-600 h-2 rounded-full" style={{ width: '85%' }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-gray-600">人员利用率</span>
                          <span className="font-semibold text-gray-900">92%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-blue-600 h-2 rounded-full" style={{ width: '92%' }}></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <span className="text-gray-600">设备利用率</span>
                          <span className="font-semibold text-gray-900">78%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="bg-orange-600 h-2 rounded-full" style={{ width: '78%' }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleCompleteSubStep(5)}
                className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all font-medium"
              >
                确认投入量，生成完整计划表
              </button>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center">
                <BarChart3 className="w-8 h-8 text-teal-600" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">完整计划表生成</h2>
                <p className="text-teal-600 font-medium">生成详细的生产执行计划</p>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <h3 className="text-xl font-semibold text-green-800">生产计划制定完成</h3>
                </div>
                <p className="text-green-700">
                  恭喜！您已成功完成整个需求预测与生产计划决策流程。
                  系统已基于LSTM模型的预测结果生成了详细的生产计划。
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">未来6个月生产计划</h3>
                  
                  <div className="space-y-4">
                    {[
                      { month: '2025年1月', demand: '1,920台', production: '1,950台', status: 'safe' },
                      { month: '2025年2月', demand: '2,350台', production: '2,380台', status: 'safe' },
                      { month: '2025年3月', demand: '1,850台', production: '1,880台', status: 'safe' },
                      { month: '2025年4月', demand: '1,780台', production: '1,810台', status: 'safe' },
                      { month: '2025年5月', demand: '2,180台', production: '2,210台', status: 'safe' },
                      { month: '2025年6月', demand: '2,520台', production: '2,550台', status: 'warning' },
                    ].map((item, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <Calendar className="w-4 h-4 text-gray-600" />
                          <span className="font-medium">{item.month}</span>
                        </div>
                        <div className="flex items-center space-x-6 text-sm">
                          <div>
                            <span className="text-gray-600">需求: </span>
                            <span className="font-medium">{item.demand}</span>
                          </div>
                          <div>
                            <span className="text-gray-600">计划: </span>
                            <span className="font-medium">{item.production}</span>
                          </div>
                          {item.status === 'safe' ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-yellow-600" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">关键指标</h3>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">总产量计划</span>
                        <span className="font-semibold text-gray-900">12,780台</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">预计库存成本</span>
                        <span className="font-semibold text-gray-900">¥41万/月</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">生产线利用率</span>
                        <span className="font-semibold text-green-600">85%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">服务水平</span>
                        <span className="font-semibold text-green-600">92%</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      <Truck className="inline w-5 h-5 mr-2" />
                      执行时间表
                    </h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">原材料采购周期</span>
                        <span className="font-medium">15天</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">生产周期</span>
                        <span className="font-medium">7天</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">质检与包装</span>
                        <span className="font-medium">2天</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">配送时间</span>
                        <span className="font-medium">3天</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-blue-800 mb-3">实验总结</h3>
                    <div className="text-sm text-blue-700 space-y-2">
                      <p>• 通过7个步骤完成了完整的需求预测流程</p>
                      <p>• 学习了多种预测算法及其适用场景</p>
                      <p>• 掌握了评估预测模型质量的关键指标</p>
                      <p>• 体验了从预测到生产计划的决策过程</p>
                      <p>• 完成了详细的生产计划制定全流程</p>
                    </div>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleCompleteSubStep(6)}
                className="w-full px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 shadow-md hover:shadow-lg transition-all font-medium"
              >
                完成生产计划制定
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-8">
      <div className="w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">制定生产计划</h1>
          <p className="text-lg text-gray-600">
            基于需求预测结果，制定合理的生产计划。考虑生产能力、库存成本、
            交货期等因素，优化生产排程和资源配置。
          </p>
        </div>

        <div className="flex gap-8">
          {/* 左侧二级路由导航 */}
          <div className="w-80 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">生产计划步骤</h2>
            <nav className="space-y-2">
              {subSteps.map((step) => {
                const Icon = step.icon;
                const status = getSubStepStatus(step.id);
                const isActive = step.id === currentSubStep;
                const isLocked = status === 'locked';
                
                const content = (
                  <div className={`flex items-center space-x-3 p-3 rounded-lg transition-all ${getSubStepStyles(step.id)}`}>
                    <div className="flex-shrink-0">
                      {status === 'completed' ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <Icon className="w-5 h-5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-medium opacity-60">
                          步骤 {step.id}
                        </span>
                      </div>
                      <p className="font-medium truncate">{step.title}</p>
                    </div>
                    {isActive && <ArrowRight className="w-4 h-4" />}
                    <div className="flex-shrink-0">
                      {status === 'completed' && (
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      )}
                      {status === 'current' && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                      )}
                    </div>
                  </div>
                );

                return (
                  <div key={step.id}>
                    {isLocked ? (
                      content
                    ) : (
                      <button
                        onClick={() => setCurrentSubStep(step.id)}
                        className="w-full text-left"
                        disabled={isLocked}
                      >
                        {content}
                      </button>
                    )}
                  </div>
                );
              })}
            </nav>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">进度</span>
                  <span className="text-sm font-medium text-gray-900">{completedSubSteps.length}/6</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-400 to-blue-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${(completedSubSteps.length / 6) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* 右侧内容区域 */}
          <div className="flex-1 min-h-0">
            {renderSubStepContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductionPlan;