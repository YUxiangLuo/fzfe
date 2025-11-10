import React, { useEffect, useRef } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useExperiment } from '../contexts/ExperimentContext';
import { Check } from 'lucide-react';
import ScenarioIntroduction from './models/ScenarioIntroduction';
import RoleIntroduction from './models/RoleIntroduction';
import DataWindowSelection from './models/DataWindowSelection';
import ModelIntroduction from './models/ModelIntroduction';
import ModelSelection from './models/ModelSelection';
import MovingAverageModelRoutes from './models/MovingAverage';
import ExponentialSmoothingModelRoutes from './models/ExponentialSmoothing';
import ARIMAModelRoutes from './models/ARIMA';
import LSTMModelRoutes from './models/LSTM';
import WeightedEnsembleModelRoutes from './models/WeightedEnsemble';
import BoostingEnsembleModelRoutes from './models/BoostingEnsemble';
import StackingEnsembleModelRoutes from './models/StackingEnsemble';

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

    // 检查是否在模型详情页面（任何模型的子路径）
    const modelPaths = [
      '/model/moving-average',
      '/model/exponential-smoothing',
      '/model/arima',
      '/model/lstm',
      '/model/weighted-ensemble',
      '/model/boosting-ensemble',
      '/model/stacking-ensemble'
    ];

    const isInModelDetails = modelPaths.some(path => currentPath.startsWith(path));
    if (isInModelDetails) {
      // 返回最后一步的索引（模型选择和应用）
      return SUB_STEPS.length - 1;
    }

    const index = SUB_STEPS.findIndex(step => currentPath.startsWith(step.path));
    return index >= 0 ? index : 0;
  };

  const currentSubStepIndex = getCurrentSubStepIndex();

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* 页面标题和横向导航 */}
      <div className="px-8 pt-6 pb-4 flex-shrink-0 bg-gray-50">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900 whitespace-nowrap">步骤 5: 建立需求预测</h1>

          {/* 横向二级导航 */}
          <div className="flex items-center gap-2 flex-1 overflow-x-auto">
            {SUB_STEPS.map((step, index) => {
              const isActive = index === currentSubStepIndex;
              const isCompleted = index < currentSubStepIndex;

              return (
                <React.Fragment key={step.id}>
                  <div className="flex items-center gap-2 px-2 py-1 whitespace-nowrap">
                    <span
                      className={`text-sm font-medium transition-colors ${
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
      <div className="flex-1 min-h-0 px-8 pb-6 overflow-y-auto">
        <Routes>
          <Route path="scenario" element={<ScenarioIntroduction />} />
          <Route path="role-intro" element={<RoleIntroduction />} />
          <Route path="window" element={<DataWindowSelection />} />
          <Route path="model-intro" element={<ModelIntroduction />} />
          <Route path="model-select" element={<ModelSelection />} />
          <Route path="moving-average/*" element={<MovingAverageModelRoutes />} />
          <Route path="exponential-smoothing/*" element={<ExponentialSmoothingModelRoutes />} />
          <Route path="arima/*" element={<ARIMAModelRoutes />} />
          <Route path="lstm/*" element={<LSTMModelRoutes />} />
          <Route path="weighted-ensemble/*" element={<WeightedEnsembleModelRoutes />} />
          <Route path="boosting-ensemble/*" element={<BoostingEnsembleModelRoutes />} />
          <Route path="stacking-ensemble/*" element={<StackingEnsembleModelRoutes />} />
        </Routes>
      </div>
    </div>
  );
};

export default ModelBuilding;
