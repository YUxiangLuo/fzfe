import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useExperiment } from '../contexts/ExperimentContext';
import { Calendar, CheckCircle, Factory, Truck, AlertTriangle, ArrowRight, Calculator, Target, TrendingUp, Package, FileText, BarChart3 } from 'lucide-react';

const ProductionPlan: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { updateState, state } = useExperiment();
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

  const handleCompleteSubStep = async (stepId: number) => {
    if (!completedSubSteps.includes(stepId)) {
      setCompletedSubSteps([...completedSubSteps, stepId]);
    }
    if (stepId < 6) {
      setCurrentSubStep(stepId + 1);
    } else {
      await updateState({
        highest_completed_step: 7,
      });

      navigate('/quiz-plan');
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
                <Factory className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">企业大脑：主生产计划 (MPS)</h2>
                <p className="text-blue-600 font-medium">探索企业如何平衡客户需求与生产能力</p>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-800 mb-3">🎯 什么是主生产计划 (Master Production Schedule)？</h3>
                <p className="text-blue-700">
                  主生产计划 (MPS) 是连接企业战略目标与生产执行的桥梁。它是一个详细的计划，明确说明了在特定时间段内，<strong>需要生产哪些最终产品</strong>、<strong>生产多少</strong>以及<strong>何时生产</strong>。MPS 不是一个简单的销售预测，而是一个综合考虑了市场需求、现有订单、库存水平和生产能力的切实可行的生产指令。
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800 mb-2">核心输入1：需求预测</h4>
                  <p className="text-gray-700 text-sm">基于您选择的最佳模型（如LSTM）预测的未来市场需求量。</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800 mb-2">核心输入2：生产能力</h4>
                  <p className="text-gray-700 text-sm">包括设备产能、人力资源和原材料供应等现实约束条件。</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-800 mb-2">核心输入3：库存策略</h4>
                  <p className="text-gray-700 text-sm">期望的期末库存水平、安全库存量以及库存持有成本。</p>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-green-800 mb-3">💡 为什么 MPS 至关重要？</h3>
                <ul className="space-y-2 text-green-700 text-sm list-disc list-inside">
                  <li><strong>稳定生产</strong>：避免因需求波动导致生产线频繁启停，提高生产效率。</li>
                  <li><strong>控制库存</strong>：防止库存积压或缺货，优化现金流，降低仓储成本。</li>
  
                <li><strong>提升客户满意度</strong>：确保按时交付订单，提高企业信誉。</li>
                  <li><strong>指导物料采购</strong>：为物料需求计划 (MRP) 提供准确的输入，确保原材料及时到位。</li>
                </ul>
              </div>

              <button
                onClick={() => handleCompleteSubStep(1)}
                className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md hover:shadow-lg transition-all font-medium"
              >
                <span>下一步：计算生产变量</span>
                <ArrowRight className="w-5 h-5" />
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
                <p className="text-green-600 font-medium">理解生产计划的核心平衡公式</p>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-green-800 mb-3">四大核心生产变量</h3>
                <p className="text-green-700 mb-4">
                  一个成功的生产计划，本质上是在以下四个关键变量之间寻求最佳平衡。
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-lg border border-green-200">
                    <h4 className="font-semibold text-green-900">① 预测需求量 (Demand)</h4>
                    <p className="text-sm text-green-800">您通过数据模型预测出的、未来市场可能需要的产品数量。</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-green-200">
                    <h4 className="font-semibold text-green-900">② 计划产出量 (Production)</h4>
                    <p className="text-sm text-green-800">我们根据需求和产能，主动决定要生产的产品数量。</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-green-200">
                    <h4 className="font-semibold text-green-900">③ 库存量 (Inventory)</h4>
                    <p className="text-sm text-green-800">仓库中现有的产品数量，是连接生产与销售的缓冲带。</p>
                  </div>
                  <div className="bg-white p-4 rounded-lg border border-green-200">
                    <h4 className="font-semibold text-green-900">④ 缺货量 (Shortage)</h4>
                    <p className="text-sm text-green-800">当库存和产出无法满足需求时，产生的供应缺口。</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">库存平衡公式</h3>
                <p className="text-gray-600 mb-4">
                  这四个变量通过一个基础的库存平衡公式紧密联系在一起，这是制定任何生产计划的基石：
                </p>
                <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                  <p className="text-lg font-mono text-gray-800">
                    <span className="font-bold text-blue-600">期末库存</span> = 
                    <span className="text-gray-600"> 期初库存</span> + 
                    <span className="font-bold text-green-600"> 计划产出</span> - 
                    <span className="font-bold text-red-600"> 预测需求</span>
                  </p>
                </div>
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="bg-blue-50 p-3 rounded-lg">
                        <p className="font-semibold text-blue-800">如果 <strong>期末库存 ≥ 0</strong></p>
                        <p className="text-blue-700">恭喜，库存足以满足需求，没有缺货。期末库存值就是月底仓库里剩余的产品数量。</p>
                    </div>
                    <div className="bg-red-50 p-3 rounded-lg">
                        <p className="font-semibold text-red-800">如果 <strong>期末库存 &lt; 0</strong></p>
                        <p className="text-red-700">注意，产生了缺货！缺货量就是期末库存的绝对值。例如，-50就代表缺货50件。</p>
                    </div>
                </div>
              </div>

              <button
                onClick={() => handleCompleteSubStep(2)}
                className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-md hover:shadow-lg transition-all font-medium"
              >
                <span>我已理解，开始计算服务水平</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <Target className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">计算服务水平</h2>
                <p className="text-blue-600 font-medium">量化我们满足客户需求的能力</p>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-800 mb-3">🎯 什么是服务水平 (Service Level)？</h3>
                <p className="text-blue-700">
                  服务水平是一个关键绩效指标 (KPI)，它衡量的是在客户需要时，我们能多大程度上成功满足他们的需求。简单来说，它就是“有货率”或“订单满足率”的量化体现。服务水平越高，客户满意度越高，但通常也意味着更高的库存成本。
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">服务水平计算公式</h3>
                <p className="text-gray-600 mb-4">
                  计算服务水平的核心在于“缺货率”，即需求中有多少比例我们没能满足。公式如下：
                </p>
                <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                  <p className="text-lg font-mono text-gray-800">
                    <span className="font-bold text-blue-600">服务水平</span> = 
                    <span className="text-gray-600"> 1</span> - 
                    <span className="font-bold text-red-600"> (缺货量 / 实际需求量)</span>
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">举个例子</h3>
                <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3 text-sm">
                  <p>• 假设某月，市场对您的产品总需求为 <strong>1,000</strong> 件。</p>
                  <p>• 由于生产或库存原因，您最终只交付了 <strong>920</strong> 件，产生了 <strong>80</strong> 件的缺货。</p>
                  <p>• <strong>缺货率</strong> = 80 / 1,000 = 0.08 (或 8%)</p>
                  <p className="border-t border-gray-200 pt-3 mt-3 font-semibold">
                    • <strong>服务水平</strong> = 1 - 0.08 = 0.92，即 <span className="text-xl text-blue-600">92%</span>。
                  </p>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-green-800 mb-3">💡 关键权衡：成本 vs 满意度</h3>
                <p className="text-green-700 text-sm">
                  追求100%的服务水平在现实中几乎是不可能的，且成本极高。企业的目标是在<strong>库存持有成本</strong>（为维持高服务水平而预备的安全库存）和<strong>缺货成本</strong>（因缺货导致的销售损失和客户流失）之间找到最佳平衡点。
                </p>
              </div>

              <button
                onClick={() => handleCompleteSubStep(3)}
                className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md hover:shadow-lg transition-all font-medium"
              >
                <span>我已理解，开始计算预测量</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">计算计划生产量</h2>
                <p className="text-blue-600 font-medium">为不确定性做好准备</p>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-800 mb-3">🎯 什么是计划生产量 (Planned Production)？</h3>
                <p className="text-blue-700">
                  计划生产量并不是简单地等于你的需求预测量。为了应对预测不准确或供应延迟等突发状况，我们需要在预测的基础上增加一个缓冲，这个缓冲就是“安全库存”。因此，计划生产量是预测需求与安全库存的总和，是下达给生产线的最终指令。
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">计划生产量计算公式</h3>
                <p className="text-gray-600 mb-4">
                  这个公式帮助我们将风险管理融入生产计划中：
                </p>
                <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                  <p className="text-lg font-mono text-gray-800">
                    <span className="font-bold text-blue-600">计划生产量</span> = 
                    <span className="font-bold text-green-600"> 需求预测结果</span> + 
                    <span className="font-bold text-orange-600"> 安全库存</span>
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">举个例子</h3>
                <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3 text-sm">
                  <p>• 您的模型预测下个月的需求是 <strong>2,000</strong> 件。</p>
                  <p>• 根据您设定的服务水平目标，计算出需要 <strong>150</strong> 件的安全库存来应对潜在的需求波动。</p>
                  <p className="border-t border-gray-200 pt-3 mt-3 font-semibold">
                    • <strong>计划生产量</strong> = 2,000 + 150 = <span className="text-xl text-blue-600">2,150</span> 件。
                  </p>
                   <p className="text-xs text-gray-500 pt-2">
                    这意味着您将向工厂下达生产2,150件的指令，即使预测需求只有2,000件。多出的150件就是为了保障服务水平。
                  </p>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-green-800 mb-3">💡 安全库存：应对不确定性的保险</h3>
                <p className="text-green-700 text-sm">
                  安全库存是生产计划中的“保险丝”。它的大小直接关联到您设定的服务水平。越高的服务水平目标，就需要越多的安全库存来保障，这也会相应增加库存持有成本。
                </p>
              </div>

              <button
                onClick={() => handleCompleteSubStep(4)}
                className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md hover:shadow-lg transition-all font-medium"
              >
                <span>我已理解，开始计算投入量</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <Package className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">计算生产投入量</h2>
                <p className="text-blue-600 font-medium">连接过去、现在与未来的生产决策</p>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-800 mb-3">🎯 什么是生产投入量 (Production Input)？</h3>
                <p className="text-blue-700">
                  “生产投入量”指的是您在当前生产周期（例如本月）需要实际安排生产的产品数量。它不是简单地等于您的“计划生产量”，而是动态调整后的结果，因为它必须考虑上个周期的“遗产”——即剩余的库存和未满足的缺货。
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">生产投入量计算公式</h3>
                <p className="text-gray-600 mb-4">
                  这个公式确保了生产的连续性和对历史情况的修正：
                </p>
                <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
                  <p className="text-lg font-mono text-gray-800">
                    <span className="font-bold text-blue-600">生产投入量</span> = 
                    <span className="font-bold text-green-600"> 计划生产量</span> - 
                    <span className="font-bold text-orange-600"> 上期期末库存</span> +
                    <span className="font-bold text-red-600"> 上期缺货量</span>
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">举个例子</h3>
                <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3 text-sm">
                  <p>• 根据上一步，您本月的<strong>计划生产量</strong>（含安全库存）为 <strong>2,150</strong> 件。</p>
                  <p>• 假设上月底盘点，仓库里还剩下 <strong>200</strong> 件产品 (<strong>上期期末库存</strong>)。</p>
                  <p>• 同时，上月有 <strong>50</strong> 件的订单因缺货未能满足 (<strong>上期缺货量</strong>)。</p>
                  <p className="border-t border-gray-200 pt-3 mt-3 font-semibold">
                    • <strong>生产投入量</strong> = 2,150 - 200 + 50 = <span className="text-xl text-blue-600">2,000</span> 件。
                  </p>
                   <p className="text-xs text-gray-500 pt-2">
                    这意味着，您本月实际需要下达生产2,000件的指令。这个数量既满足了本月的计划，又利用了现有库存并补上了上月的缺口。
                  </p>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-green-800 mb-3">💡 为什么不能只看预测？</h3>
                <p className="text-green-700 text-sm">
                  只看预测会导致生产与实际脱节。不考虑现有库存会造成积压和资金浪费；不理会上期缺货则会损害客户关系和市场信誉。这个公式确保了生产计划的平稳和可持续性。
                </p>
              </div>

              <button
                onClick={() => handleCompleteSubStep(5)}
                className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md hover:shadow-lg transition-all font-medium"
              >
                <span>我已理解，生成完整计划表</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <BarChart3 className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-gray-900">完整计划表生成</h2>
                <p className="text-blue-600 font-medium">总览您的生产决策全景</p>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-blue-800 mb-3">📊 您将看到什么？</h3>
                <p className="text-blue-700 mb-4">
                  您将看到一张完整的生产计划表，其中展示了整个预测时段内的各项关键数据。这张表格将包括：
                </p>
                <ul className="space-y-2 text-sm text-blue-600 list-disc list-inside">
                  <li><strong>计划生产量</strong>：每个月基于需求预测和安全库存的生产计划目标。</li>
                  <li><strong>投入量</strong>：根据计划和历史数据，每个月计划投入生产的实际数量。</li>
                  <li><strong>产出量</strong>：根据投入量推导出的每个月的产出数量。</li>
                  <li><strong>库存量</strong>：产出量减去实际需求量后的剩余产品数量。</li>
                  <li><strong>缺货量</strong>：当产出量不足以满足需求时的缺货情况。</li>
                  <li><strong>服务水平</strong>：衡量企业满足市场需求能力的指标。</li>
                </ul>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-green-800 mb-3">💡 观察与分析</h3>
                <p className="text-green-700 mb-4">
                  看到这张完整的生产计划表后，希望你能够通过观察每个月的数据变化，进一步理解生产计划制定的逻辑与关联。你们可以看到：
                </p>
                <ul className="space-y-2 text-sm text-green-600 list-disc list-inside">
                    <li><strong>需求变化如何影响投入量</strong>：随着需求的变化，投入量将如何相应调整。</li>
                    <li><strong>服务水平的动态变化</strong>：通过不同月份的服务水平，了解生产计划的有效性。</li>
                    <li><strong>库存与缺货的管理</strong>：观察每个月的库存和缺货情况，分析这些量如何影响企业的整体运营。</li>
                </ul>
              </div>

              {/* This is a placeholder for the actual data table that would be generated */}
              <div className="border border-gray-200 rounded-lg p-4">
                 <h4 className="text-center font-semibold text-gray-700">生产计划表示例</h4>
                 <p className="text-center text-sm text-gray-500 mt-2">（此处将根据您的计算生成实际数据表格）</p>
              </div>

              <button
                onClick={() => handleCompleteSubStep(6)}
                className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-md hover:shadow-lg transition-all font-medium"
              >
                <CheckCircle className="w-5 h-5" />
                <span>完成生产计划制定</span>
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
