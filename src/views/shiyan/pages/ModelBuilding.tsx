import React, { useEffect, useRef } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useExperiment } from '../contexts/ExperimentContext';
import { Check } from 'lucide-react';
import ScenarioIntroduction from './models/ScenarioIntroduction';
import RoleIntroduction from './models/RoleIntroduction';
import DataWindowSelection from './models/DataWindowSelection';
import ModelIntroduction from './models/ModelIntroduction';
import ModelSelection from './models/ModelSelection';

// 常量配置
const CURRENT_STEP = 5;

// 子步骤配置
interface SubStep {
  id: string;
  name: string;
  path: string;
}

const SUB_STEPS: SubStep[] = [
  { id: 'scenario', name: '需求预测情景化', path: '/model/scenario' },
  { id: 'role-intro', name: '市场部经理身份介绍', path: '/model/role-intro' },
  { id: 'window', name: '选择数据时段', path: '/model/window' },
  { id: 'model-intro', name: '需求预测模型介绍', path: '/model/model-intro' },
  { id: 'model-select', name: '需求预测模型选择和应用', path: '/model/model-select' },
];

const ModelBuilding: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { state, recordStepEvent } = useExperiment();
  const hasRecordedStartRef = useRef(false);
  const prevHighestStepRef = useRef(state.highest_completed_step);

  // Record STARTED event only when entering a new step (step > highest_completed_step)
  // Reset ref when state is rolled back (highest_completed_step decreases)
  useEffect(() => {
    if (state.highest_completed_step < prevHighestStepRef.current) {
      hasRecordedStartRef.current = false;
    }
    prevHighestStepRef.current = state.highest_completed_step;

    if (CURRENT_STEP > state.highest_completed_step && !hasRecordedStartRef.current) {
      recordStepEvent(CURRENT_STEP, 'STARTED');
      hasRecordedStartRef.current = true;
    }
  }, [state.highest_completed_step, recordStepEvent]);

  // 默认重定向到第一个子步骤
  useEffect(() => {
    if (location.pathname === '/model' || location.pathname === '/model/') {
      navigate('/model/scenario', { replace: true });
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
      {/* 页面标题 */}
      <div className="px-8 pt-6 pb-4 flex-shrink-0 bg-gray-50">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">步骤 5: 建立需求预测</h1>
        <p className="text-lg text-gray-600">
          通过五个阶段完成需求预测模型的学习、选择和应用
        </p>
      </div>

      {/* 主内容区：左侧导航 + 右侧内容 */}
      <div className="flex gap-6 flex-1 min-h-0 px-8 pb-6">
        {/* 左侧二级步骤导航 */}
        <div className="w-80 flex-shrink-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-full flex flex-col">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex-shrink-0">实验流程</h2>
            <nav className="space-y-3 flex-1 overflow-y-auto">
              {SUB_STEPS.map((step, index) => {
                const isActive = index === currentSubStepIndex;
                const isCompleted = index < currentSubStepIndex;
                const isFuture = index > currentSubStepIndex;

                return (
                  <div key={step.id} className="relative">
                    {/* 步骤项 */}
                    <div
                      className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
                        isActive
                          ? 'bg-blue-50 border-2 border-blue-500'
                          : isCompleted
                          ? 'bg-green-50 border border-green-200'
                          : 'bg-gray-50 border border-gray-200'
                      }`}
                    >
                      {/* 步骤圆圈 */}
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold flex-shrink-0 ${
                          isCompleted
                            ? 'bg-green-500 text-white'
                            : isActive
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-300 text-gray-600'
                        }`}
                      >
                        {isCompleted ? (
                          <Check className="w-4 h-4" />
                        ) : (
                          <span className="text-sm">{index + 1}</span>
                        )}
                      </div>

                      {/* 步骤名称 */}
                      <div
                        className={`text-sm font-medium ${
                          isActive
                            ? 'text-blue-700'
                            : isCompleted
                            ? 'text-green-700'
                            : 'text-gray-600'
                        }`}
                      >
                        {step.name}
                      </div>
                    </div>

                    {/* 连接线 */}
                    {index < SUB_STEPS.length - 1 && (
                      <div
                        className={`absolute left-6 top-11 w-0.5 h-3 ${
                          isCompleted ? 'bg-green-500' : 'bg-gray-300'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </nav>
          </div>
        </div>

        {/* 右侧内容区域 */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          <Routes>
            <Route path="scenario" element={<ScenarioIntroduction />} />
            <Route path="role-intro" element={<RoleIntroduction />} />
            <Route path="window" element={<DataWindowSelection />} />
            <Route path="model-intro" element={<ModelIntroduction />} />
            <Route path="model-select" element={<ModelSelection />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default ModelBuilding;
