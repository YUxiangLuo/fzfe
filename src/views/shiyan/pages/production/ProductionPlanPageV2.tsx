import React from 'react';
import { CheckCircle, Circle, Lock } from 'lucide-react';
import { ProductionPlanProvider, useProductionPlan } from './ProductionPlanContextV2';
import MPSTableView from './components/MPSTableView';
import ConceptStep1 from './steps/ConceptStep1';
import ConceptStep2 from './steps/ConceptStep2';
import ConceptStep3 from './steps/ConceptStep3';
import ConceptStep4 from './steps/ConceptStep4';
import ConceptStep5 from './steps/ConceptStep5';
import ConceptStep6 from './steps/ConceptStep6';
import ConceptStep7 from './steps/ConceptStep7';
import ConceptStep8 from './steps/ConceptStep8';
import ConceptStep9 from './steps/ConceptStep9';

const ProductionPlanContent: React.FC = () => {
  const { state, goToStep } = useProductionPlan();

  const steps = [
    { id: 1, title: 'MPS概述', component: ConceptStep1 },
    { id: 2, title: '需求预测', component: ConceptStep2 },
    { id: 3, title: '安全库存', component: ConceptStep3 },
    { id: 4, title: '计划生产', component: ConceptStep4 },
    { id: 5, title: '期初库存', component: ConceptStep5 },
    { id: 6, title: '产出量', component: ConceptStep6 },
    { id: 7, title: '期末库存', component: ConceptStep7 },
    { id: 8, title: '缺货与服务水平', component: ConceptStep8 },
    { id: 9, title: '生成完整计划', component: ConceptStep9 },
  ];

  const CurrentStepComponent = steps[state.currentStep - 1]?.component || ConceptStep1;

  const getStepStatus = (stepId: number) => {
    if (state.completedSteps.includes(stepId)) return 'completed';
    if (stepId === state.currentStep) return 'current';
    if (stepId < state.currentStep) return 'available';
    return 'locked';
  };

  const getStepIcon = (stepId: number) => {
    const status = getStepStatus(stepId);
    if (status === 'completed') return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (status === 'current') return <Circle className="w-5 h-5 text-blue-600 fill-blue-600" />;
    if (status === 'locked') return <Lock className="w-4 h-4 text-gray-400" />;
    return <Circle className="w-5 h-5 text-gray-400" />;
  };

  const getStepStyles = (stepId: number) => {
    const status = getStepStatus(stepId);
    if (status === 'completed') return 'bg-green-50 border-green-300 text-green-800 cursor-pointer hover:bg-green-100';
    if (status === 'current') return 'bg-blue-50 border-blue-400 text-blue-800 ring-2 ring-blue-300';
    if (status === 'available') return 'bg-gray-50 border-gray-300 text-gray-700 cursor-pointer hover:bg-gray-100';
    return 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed';
  };

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">步骤 7: 制定生产计划</h1>
        <p className="text-gray-600">
          通过渐进式学习，逐步理解主生产计划表（MPS）的每一列如何生成
        </p>
      </div>

      <div className="flex gap-6">
        {/* 左侧：步骤导航 + 概念学习区 */}
        <div className="w-1/3 space-y-6">
          {/* 步骤导航 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">学习步骤</h2>
            <div className="space-y-2">
              {steps.map((step) => (
                <button
                  key={step.id}
                  onClick={() => {
                    const status = getStepStatus(step.id);
                    if (status !== 'locked') goToStep(step.id);
                  }}
                  disabled={getStepStatus(step.id) === 'locked'}
                  className={`w-full flex items-center space-x-3 p-3 rounded-lg border transition-all ${getStepStyles(step.id)}`}
                >
                  {getStepIcon(step.id)}
                  <div className="flex-1 text-left">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-medium opacity-60">步骤 {step.id}</span>
                    </div>
                    <p className="font-medium text-sm">{step.title}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* 概念学习区 */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <CurrentStepComponent />
          </div>
        </div>

        {/* 右侧：MPS表格（始终可见，渐进式填充） */}
        <div className="flex-1">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                主生产计划表（MPS）
              </h2>
              <p className="text-sm text-gray-600">
                随着您的学习进度，第2期的数据会逐步填充完整
              </p>
            </div>
            <MPSTableView />
          </div>
        </div>
      </div>
    </div>
  );
};

// 包装Provider
const ProductionPlanPageV2: React.FC = () => {
  return (
    <ProductionPlanProvider>
      <ProductionPlanContent />
    </ProductionPlanProvider>
  );
};

export default ProductionPlanPageV2;
