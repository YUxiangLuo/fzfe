import React, { useRef, useEffect } from 'react';
import { CheckCircle, Circle, Lock, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ProductionPlanProvider, useProductionPlan } from './ProductionPlanContextV2';
import { useExperiment } from '../../contexts/ExperimentContext.zustand';
import { useToast } from '../../shared/hooks/useToast';
import { Toast } from '../../shared/components/common/Toast';
import MPSTableViewV2 from './components/MPSTableViewV2';
import NewStep1 from './steps_v2/NewStep1';
import NewStep2 from './steps_v2/NewStep2';
import NewStep3 from './steps_v2/NewStep3';
import NewStep4 from './steps_v2/NewStep4';
import NewStep5 from './steps_v2/NewStep5';
import NewStep6 from './steps_v2/NewStep6';

const ProductionPlanContent: React.FC = () => {
  const navigate = useNavigate();
  const { state, resetAll, saveMPSDataToGlobal } = useProductionPlan();
  const { state: experimentState, updateState } = useExperiment();
  const { toast, showToast, hideToast } = useToast();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [state.currentStep]);

  const steps = [
    { id: 1, title: '规划总览', component: NewStep1 },
    { id: 2, title: '生产变量', component: NewStep2 },
    { id: 3, title: '服务水平', component: NewStep3 },
    { id: 4, title: '预测量', component: NewStep4 },
    { id: 5, title: '投入量', component: NewStep5 },
    { id: 6, title: '完整计划表', component: NewStep6 },
  ];

  const CurrentStepComponent = steps[state.currentStep - 1]?.component || NewStep1;

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
    if (status === 'completed') return 'bg-green-50 border-green-300 text-green-800 cursor-default';
    if (status === 'current') return 'bg-blue-50 border-blue-400 text-blue-800 ring-2 ring-blue-300';
    if (status === 'available') return 'bg-gray-50 border-gray-300 text-gray-700 cursor-default';
    return 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed';
  };

  // 完成生产计划并进入测验
  const handleComplete = async () => {
    const nextRoute = experimentState.quiz_about_plan_completed ? '/report' : '/quiz-plan';

    try {
      // 避免在保存进行中提前进入测验，防止出现“未保存即跳转”的竞态。
      if (state.isSaving) {
        console.log('⏳ MPS数据仍在保存中，请稍后重试进入测验');
        return;
      }

      // 如果尚未确认保存成功，进入测验前再尝试一次保存
      if (!state.hasSavedToGlobal) {
        console.log('🔄 检测到MPS尚未确认保存，正在尝试保存...');
        try {
          await saveMPSDataToGlobal(updateState);
          console.log('✅ MPS保存成功');
        } catch (retryErr) {
          console.error('⚠️ 保存失败，但将继续进入测验:', retryErr);
          showToast('生产计划数据保存失败，但您可以继续进入测验', 'error');
          // 继续执行，不阻止用户进入测验
        }
      }

      console.log('📊 更新步骤进度：完成步骤7');
      await updateState({
        highest_completed_step: 7,
        current_step: 7,
      });
      console.log('✅ 步骤进度已更新');
      navigate(nextRoute);
    } catch (err) {
      console.error('更新步骤进度失败:', err);
      // 即使失败也继续导航
      navigate(nextRoute);
    }
  };

  return (
    <div className="h-full flex flex-col gap-4">
      {/* 横向步骤导航 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900">学习步骤</h2>
          <button
            type="button"
            onClick={() => resetAll()}
            className="inline-flex items-center space-x-1 px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>重置</span>
          </button>
        </div>

        {/* 进度指示器 */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>学习进度</span>
            <span className="font-semibold text-blue-600">
              {state.completedSteps.length} / {steps.length} 完成
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500 ease-out"
              style={{ width: `${(state.completedSteps.length / steps.length) * 100}%` }}
            />
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {steps.map((step) => (
            <button
              key={step.id}
              // onClick is removed to prevent navigation.
              disabled={getStepStatus(step.id) === 'locked'}
              className={`flex-shrink-0 flex flex-col items-center space-y-2 px-4 py-3 rounded-lg border transition-all min-w-[110px] ${getStepStyles(step.id)}`}
            >
              {getStepIcon(step.id)}
              <div className="text-center">
                <p className="font-medium text-sm leading-tight">{step.title}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 下方：概念学习 + MPS表格 */}
      {state.currentStep === 6 && state.isStep6TeachingHidden ? (
        // Step6教学内容已隐藏：全屏显示MPS表格 + 完成按钮
        <div className="flex-1 min-h-0 overflow-hidden">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-full flex flex-col">
            <div className="mb-4 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    主生产计划表（MPS）- 完整视图
                  </h2>
                  <p className="text-sm text-gray-600">
                    完整的生产计划表，包含所有{state.forecastPeriods}期的详细数据
                  </p>
                </div>
                {/* Button moved to bottom right */}
              </div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              <MPSTableViewV2 />
            </div>
            <div className="mt-4 flex justify-end flex-shrink-0">
              <button
                type="button"
                onClick={handleComplete}
                disabled={state.isSaving}
                className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors shadow-lg ${
                  state.isSaving
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                <CheckCircle className="w-5 h-5" />
                <span>{state.isSaving ? '正在保存数据，请稍候...' : '完成生产计划，进入测验'}</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        // 正常布局：左侧教学内容 + 右侧MPS表格
        <div className="flex gap-6 flex-1 min-h-0 overflow-hidden">
          {/* 左侧：概念学习区（可滚动） */}
          <div ref={scrollContainerRef} className="flex-1 min-w-0 h-full overflow-y-auto">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <CurrentStepComponent />
            </div>
          </div>

          {/* 右侧：MPS表格（固定高度，表格内容可滚动） */}
          <div className="flex-1 min-w-0 h-full overflow-y-auto">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-full flex flex-col">
              <div className="mb-4 flex-shrink-0">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  主生产计划表（MPS）
                </h2>
                <p className="text-sm text-gray-600">
                  期1作为参考示例，期2用于渐进式学习，随着学习进度逐步填充完整
                </p>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto">
                <MPSTableViewV2 />
              </div>
            </div>
          </div>
        </div>
      )}
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

// 包装Provider，从全局状态获取真实数据
const ProductionPlanSteps: React.FC = () => {
  const { state: experimentState, productSalesData, isLoadingSales } = useExperiment();

  // 从全局状态获取真实模型
  const selectedBestModel = experimentState.selected_best_model || 'lstm';

  // 📊 从历史销量数据计算真实的平均需求
  const avgDemand = React.useMemo(() => {
    if (!productSalesData?.monthlySales || productSalesData.monthlySales.length === 0) {
      console.warn('⚠️ 无历史销量数据，使用默认平均需求 1050');
      return 1050; // 后备默认值
    }

    const validSales = productSalesData.monthlySales
      .map((item) => item.sales)
      .filter((value): value is number => value != null && Number.isFinite(value));

    if (validSales.length === 0) {
      console.warn('⚠️ 历史销量数据均为空，使用默认平均需求 1050');
      return 1050;
    }

    const totalSales = validSales.reduce((sum, sales) => sum + sales, 0);
    const average = totalSales / validSales.length;

    console.log(`📊 计算真实平均需求: ${average.toFixed(2)} (基于${validSales.length}个月的历史数据)`);
    console.log(`📦 产品信息: ${productSalesData.meta.name} (${productSalesData.meta.unit})`);
    return Math.round(average);
  }, [productSalesData]);

  // 🔄 等待销量数据加载完成
  if (isLoadingSales) {
    return (
      <div className="h-full flex items-center justify-center">
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
    >
      <ProductionPlanContent />
    </ProductionPlanProvider>
  );
};

export default ProductionPlanSteps;
