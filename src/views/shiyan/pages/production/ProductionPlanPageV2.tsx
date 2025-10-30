import React from 'react';
import { CheckCircle, Circle, Lock } from 'lucide-react';
import { ProductionPlanProvider, useProductionPlan } from './ProductionPlanContextV2';
import { useExperiment } from '../../contexts/ExperimentContext';
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

      {/* 横向步骤导航 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">学习步骤</h2>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {steps.map((step) => (
            <button
              key={step.id}
              onClick={() => {
                const status = getStepStatus(step.id);
                if (status !== 'locked') goToStep(step.id);
              }}
              disabled={getStepStatus(step.id) === 'locked'}
              className={`flex-shrink-0 flex flex-col items-center space-y-2 px-4 py-3 rounded-lg border transition-all min-w-[110px] ${getStepStyles(step.id)}`}
            >
              {getStepIcon(step.id)}
              <div className="text-center">
                <div className="text-xs font-medium opacity-60 mb-1">步骤 {step.id}</div>
                <p className="font-medium text-xs leading-tight">{step.title}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 下方：概念学习 + MPS表格 */}
      <div className="flex gap-6">
        {/* 左侧：概念学习区（60%） */}
        <div className="w-3/5">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <CurrentStepComponent />
          </div>
        </div>

        {/* 右侧：MPS表格（40%） */}
        <div className="w-2/5">
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

// 包装Provider，从全局状态获取真实数据
const ProductionPlanPageV2: React.FC = () => {
  const { state: experimentState, productSalesData, isLoadingSales } = useExperiment();

  // 从全局状态获取真实模型
  const selectedBestModel = experimentState.selected_best_model || 'lstm';

  // 📊 从历史销量数据计算真实的平均需求
  const avgDemand = React.useMemo(() => {
    if (!productSalesData?.monthlySales || productSalesData.monthlySales.length === 0) {
      console.warn('⚠️ 无历史销量数据，使用默认平均需求 1050');
      return 1050; // 后备默认值
    }

    const totalSales = productSalesData.monthlySales.reduce((sum, item) => sum + item.sales, 0);
    const average = totalSales / productSalesData.monthlySales.length;

    console.log(`📊 计算真实平均需求: ${average.toFixed(2)} (基于${productSalesData.monthlySales.length}个月的历史数据)`);
    console.log(`📦 产品信息: ${productSalesData.meta.name} (${productSalesData.meta.unit})`);
    return Math.round(average);
  }, [productSalesData]);

  // 📊 计算标准差（用于演示数据）
  const stdDevDemand = React.useMemo(() => {
    if (!productSalesData?.monthlySales || productSalesData.monthlySales.length < 2) {
      return Math.round(avgDemand * 0.05); // 默认使用平均值的5%
    }

    const sales = productSalesData.monthlySales.map(item => item.sales);
    const mean = avgDemand;
    const variance = sales.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / sales.length;
    const stdDev = Math.sqrt(variance);

    console.log(`📊 计算历史标准差: ${stdDev.toFixed(2)}`);
    return Math.round(stdDev);
  }, [productSalesData, avgDemand]);

  // 🔄 等待销量数据加载完成
  if (isLoadingSales) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg font-medium text-gray-700">正在加载产品销量数据...</p>
          <p className="text-sm text-gray-500 mt-2">准备生产计划参数</p>
        </div>
      </div>
    );
  }

  return (
    <ProductionPlanProvider
      initialModel={selectedBestModel}
      avgDemand={avgDemand}
      stdDevDemand={stdDevDemand}
    >
      <ProductionPlanContent />
    </ProductionPlanProvider>
  );
};

export default ProductionPlanPageV2;
