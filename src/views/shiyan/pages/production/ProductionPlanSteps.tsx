import React, { useRef, useEffect } from 'react';
import { CheckCircle, Circle, Lock, RotateCcw } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ProductionPlanProvider, useProductionPlan } from './ProductionPlanContextV2';
import { useExperiment } from '../../contexts/ExperimentContext.zustand';
import { useToast } from '../../shared/hooks/useToast';
import { Toast } from '../../shared/components/common/Toast';
import { useConfirm } from '../../shared/contexts/ConfirmContext';
import MPSTableViewV2 from './components/MPSTableViewV2';
import NewStep1 from './steps_v2/NewStep1';
import NewStep2 from './steps_v2/NewStep2';
import NewStep3 from './steps_v2/NewStep3';
import NewStep4 from './steps_v2/NewStep4';
import NewStep5 from './steps_v2/NewStep5';
import CompletePlanView from './steps_v2/CompletePlanView';

type PlanViewMode = 'learning' | 'complete';

const COMPLETE_PLAN_STEP_ID = 6;

const ProductionPlanContent: React.FC = () => {
  const navigate = useNavigate();
  const { state, goToStep, resetAll, saveMPSDataToGlobal } = useProductionPlan();
  const { state: experimentState, updateState } = useExperiment();
  const { toast, showToast, hideToast } = useToast();
  const { confirm } = useConfirm();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const previousHasCompletedPlanRef = useRef(state.completedSteps.includes(5));
  const [viewMode, setViewMode] = React.useState<PlanViewMode>(() =>
    state.completedSteps.includes(5) ? 'complete' : 'learning'
  );

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [state.currentStep]);

  const learningSteps = [
    { id: 1, title: '规划总览', component: NewStep1 },
    { id: 2, title: '生产变量', component: NewStep2 },
    { id: 3, title: '服务水平', component: NewStep3 },
    { id: 4, title: '预测量', component: NewStep4 },
    { id: 5, title: '投入量', component: NewStep5 },
  ];
  const displaySteps = [
    ...learningSteps,
    { id: COMPLETE_PLAN_STEP_ID, title: '完整计划' },
  ];

  const hasCompletedLearningSteps = state.completedSteps.includes(5);
  const shouldShowCompletePlanTeaching = viewMode === 'complete' && hasCompletedLearningSteps;
  const CurrentStepComponent = shouldShowCompletePlanTeaching
    ? CompletePlanView
    : learningSteps[state.currentStep - 1]?.component || NewStep1;

  const completedCount = learningSteps.filter((step) => state.completedSteps.includes(step.id)).length;
  const progressRatio = Math.min(1, completedCount / learningSteps.length);

  React.useEffect(() => {
    const hasCompletedPlan = state.completedSteps.includes(5);
    const wasCompleted = previousHasCompletedPlanRef.current;

    if (!hasCompletedPlan) {
      setViewMode('learning');
    } else if (!wasCompleted) {
      setViewMode('complete');
    }

    previousHasCompletedPlanRef.current = hasCompletedPlan;
  }, [state.completedSteps]);

  const getStepStatus = (stepId: number) => {
    if (stepId === COMPLETE_PLAN_STEP_ID) {
      if (shouldShowCompletePlanTeaching) return 'current';
      if (hasCompletedLearningSteps) return 'completed';
      return 'locked';
    }

    if (viewMode === 'learning' && stepId === state.currentStep) return 'current';
    if (state.completedSteps.includes(stepId)) return 'completed';
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

  const handleStepNavigation = (stepId: number) => {
    if (stepId === COMPLETE_PLAN_STEP_ID) {
      setViewMode('complete');
      goToStep(5);
      return;
    }

    setViewMode('learning');
    goToStep(stepId);
  };

  const handleResetLearning = async () => {
    const confirmed = await confirm({
      title: '重新学习生产计划？',
      message: '这只会重置当前页面的本地学习进度和临时计算状态，方便你重新演练 5 个学习步骤；不会删除服务器上已经保存的生产计划结果，刷新页面后仍会恢复已保存数据。',
      confirmText: '重新学习本页',
      cancelText: '取消',
      variant: 'warning',
    });

    if (!confirmed) return;

    resetAll();
    setViewMode('learning');
    showToast('已重置本页学习进度；服务器已保存的生产计划数据未删除。', 'info');
  };

  const getStepTitle = (stepId: number, status: string) => {
    if (status === 'locked') return '请先完成前面的步骤';
    if (stepId === COMPLETE_PLAN_STEP_ID) return '查看完整生产计划';
    if (status === 'completed') return '点击回看此学习步骤';
    if (status === 'current') return '当前正在查看';
    return '';
  };

  // 完成生产计划并进入测验
  const handleComplete = async () => {
    const nextRoute = experimentState.quiz_about_plan_completed ? '/report' : '/quiz-plan';

    try {
      // 避免在保存进行中提前进入测验，防止出现“未保存即跳转”的竞态。
      if (state.isSaving) {
        console.log('⏳ MPS数据仍在保存中，请稍后重试进入测验');
        showToast('数据仍在保存中，请稍候再进入测验', 'info');
        return;
      }

      // 如果尚未确认保存成功，进入测验前再尝试一次保存
      if (!state.hasSavedToGlobal) {
        console.log('🔄 检测到MPS尚未确认保存，正在尝试保存...');
        try {
          await saveMPSDataToGlobal(updateState);
          console.log('✅ MPS保存成功');
        } catch (retryErr) {
          console.error('❌ 保存失败，已阻止进入测验:', retryErr);
          showToast('生产计划数据保存失败，请重试后再进入测验', 'error');
          return;
        }
      }

      console.log('📊 更新步骤进度：完成步骤7');
      await updateState({
        highest_completed_step: 7,
        current_step: 7,
      }, { forceSync: true, throwOnSyncError: true });
      console.log('✅ 步骤进度已更新');
      navigate(nextRoute);
    } catch (err) {
      console.error('更新步骤进度失败:', err);
      showToast('步骤进度更新失败，请稍后重试', 'error');
    }
  };

  return (
    <div className="h-full flex flex-col gap-3">
      {/* 横向步骤导航 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-4 py-3 flex-shrink-0">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-base font-semibold text-gray-900 whitespace-nowrap">学习步骤</h2>
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-100 rounded-full px-2.5 py-1 whitespace-nowrap">
              {completedCount} / {learningSteps.length} 完成
            </span>
          </div>
          <div className="flex-1 min-w-[180px] h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-500 ease-out"
              style={{ width: `${progressRatio * 100}%` }}
            />
          </div>
          <button
            type="button"
            onClick={handleResetLearning}
            className="inline-flex items-center space-x-1 px-2.5 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
            title="仅重置当前页面的本地学习进度，不删除服务器已保存的生产计划"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>重新学习本页</span>
          </button>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {displaySteps.map((step) => {
            const status = getStepStatus(step.id);
            const canNavigate = status === 'completed' || status === 'available' || status === 'current';
            return (
              <button
                key={step.id}
                onClick={() => canNavigate && handleStepNavigation(step.id)}
                disabled={!canNavigate}
                className={`flex-shrink-0 flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-all min-w-[104px] text-sm ${getStepStyles(step.id)} ${
                  canNavigate ? 'hover:shadow-md cursor-pointer' : ''
                }`}
                title={getStepTitle(step.id, status)}
              >
                {getStepIcon(step.id)}
                <span className="font-medium leading-tight">{step.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 下方：概念学习 + MPS表格 */}
      {shouldShowCompletePlanTeaching && state.isCompletePlanTeachingHidden ? (
        // 完整计划表教学内容已隐藏：全屏显示MPS表格 + 完成按钮
        <div className="flex-1 min-h-0 overflow-hidden">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 h-full flex flex-col">
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
        <div className="flex gap-4 flex-1 min-h-0 overflow-hidden">
          {/* 左侧：概念学习区（可滚动） */}
          <div ref={scrollContainerRef} className="flex-1 min-w-0 h-full overflow-y-auto">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <CurrentStepComponent />
            </div>
          </div>

          {/* 右侧：MPS表格（固定高度，表格内容可滚动） */}
          <div className="flex-1 min-w-0 h-full overflow-y-auto">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 h-full flex flex-col">
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
  const navigate = useNavigate();
  const { state: experimentState, ui, productSalesData } = useExperiment();

  if (!experimentState.selected_best_model) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <h2 className="text-xl font-semibold text-gray-900">请先完成最佳模型选择</h2>
          <p className="mt-2 text-sm text-gray-600">
            生产计划需要基于评估页中选定的最佳模型生成预测结果。
          </p>
          <button
            type="button"
            onClick={() => navigate('/evaluation')}
            className="mt-4 px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            返回结果评估
          </button>
        </div>
      </div>
    );
  }

  const selectedBestModel = experimentState.selected_best_model;

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
  if (ui.isLoadingSales) {
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
      persistedState={experimentState}
    >
      <ProductionPlanContent />
    </ProductionPlanProvider>
  );
};

export default ProductionPlanSteps;
