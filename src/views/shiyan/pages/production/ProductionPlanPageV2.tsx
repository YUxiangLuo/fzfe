import React, { useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useExperiment } from '../../contexts/ExperimentContext.zustand';
import ProductionScenarioIntroduction from './ProductionScenarioIntroduction';
import ProductionRoleIntroduction from './ProductionRoleIntroduction';
import ProductionPlanSteps from './ProductionPlanSteps';
import { useStepStartRecorder } from '../../hooks/useStepStartRecorder';

// 常量配置
const CURRENT_STEP = 7;

// 子步骤配置
interface SubStep {
  id: string;
  name: string;
  path: string;
}

const SUB_STEPS: SubStep[] = [
  { id: 'scenario', name: '生产计划决策情景化', path: '/production/scenario' },
  { id: 'role-intro', name: '生产部经理身份介绍', path: '/production/role-intro' },
  { id: 'steps', name: '制定生产计划', path: '/production/steps' },
];

const ProductionPlanPageV2: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { state, recordStepEvent } = useExperiment();
  useStepStartRecorder(CURRENT_STEP, state.highest_completed_step, recordStepEvent);

  // 默认重定向到第一个子步骤
  useEffect(() => {
    if (location.pathname === '/production' || location.pathname === '/production/') {
      navigate('/production/scenario', { replace: true });
    }
  }, [location.pathname, navigate]);

  // 获取当前激活的子步骤索引
  const getCurrentSubStepIndex = (): number => {
    const currentPath = location.pathname;
    const index = SUB_STEPS.findIndex(step => currentPath.startsWith(step.path));
    return index >= 0 ? index : 0;
  };

  const currentSubStepIndex = getCurrentSubStepIndex();

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* 页面标题和横向导航 */}
      <div className="px-8 py-3 flex-shrink-0 bg-gray-50 border-b border-gray-200/70">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-bold text-gray-900 whitespace-nowrap">步骤 7: 制定生产计划</h1>

          {/* 横向二级导航 */}
          <div className="flex items-center justify-end gap-1.5 flex-1 overflow-x-auto">
            {SUB_STEPS.map((step, index) => {
              const isActive = index === currentSubStepIndex;
              const isCompleted = index < currentSubStepIndex;

              return (
                <React.Fragment key={step.id}>
                  <div className="flex items-center gap-1.5 px-1.5 py-1 whitespace-nowrap">
                    <span
                      className={`text-xs font-medium transition-colors ${
                        isActive
                          ? 'text-gray-900 font-semibold'
                          : isCompleted
                          ? 'text-gray-600'
                          : 'text-gray-400'
                      }`}
                    >
                      {index + 1}. {step.name}
                    </span>
                  </div>
                  {index < SUB_STEPS.length - 1 && (
                    <span className="text-gray-300 mx-1">/</span>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 min-h-0 px-8 py-4 overflow-y-auto">
        <Routes>
          <Route path="scenario" element={<ProductionScenarioIntroduction />} />
          <Route path="role-intro" element={<ProductionRoleIntroduction />} />
          <Route path="steps" element={<ProductionPlanSteps />} />
        </Routes>
      </div>
    </div>
  );
};

export default ProductionPlanPageV2;
