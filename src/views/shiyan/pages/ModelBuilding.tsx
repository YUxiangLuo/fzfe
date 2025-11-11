import React, { useEffect, useRef, useMemo } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useExperiment } from '../contexts/ExperimentContext';
import { Check } from 'lucide-react';
import ScenarioIntroduction from './models/ScenarioIntroduction';
import RoleIntroduction from './models/RoleIntroduction';
import DataWindowSelection from './models/DataWindowSelection';
import ModelIntroductionFlow from './models/ModelIntroductionFlow';
import ModelSelection from './models/ModelSelection';
import EnsembleModelIntroductionFlow from './models/EnsembleModelIntroductionFlow';
import EnsembleModelSelection from './models/EnsembleModelSelection';
import MovingAverageModelRoutes from './models/MovingAverage';
import ExponentialSmoothingModelRoutes from './models/ExponentialSmoothing';
import ARIMAModelRoutes from './models/ARIMA';
import LSTMModelRoutes from './models/LSTM';
import WeightedEnsembleModelRoutes from './models/WeightedEnsemble';
import BoostingEnsembleModelRoutes from './models/BoostingEnsemble';
import StackingEnsembleModelRoutes from './models/StackingEnsemble';

const CURRENT_STEP = 5;

// New dynamic sub-step configuration
const SUB_STEPS_CONFIG = {
  STATIC_PREFIX: [
    { id: 'scenario', name: '情景介绍', path: '/model/scenario' },
    { id: 'role-intro', name: '角色介绍', path: '/model/role-intro' },
    { id: 'window', name: '选择数据时段', path: '/model/window' },
    { id: 'model-intro', name: '基础模型介绍与选择', path: '/model/model-intro' },
  ],
  DYNAMIC_SUFFIX: [
    { id: 'model-select', name: '基础模型训练', path: '/model/model-select' },
    { id: 'ensemble-intro', name: '融合模型介绍与选择', path: '/model/ensemble-intro' },
    { id: 'ensemble-select', name: '融合模型训练', path: '/model/ensemble-select' },
  ],
};

const modelRoutes = [
  { path: 'moving-average/*', element: <MovingAverageModelRoutes /> },
  { path: 'exponential-smoothing/*', element: <ExponentialSmoothingModelRoutes /> },
  { path: 'arima/*', element: <ARIMAModelRoutes /> },
  { path: 'lstm/*', element: <LSTMModelRoutes /> },
  { path: 'weighted-ensemble/*', element: <WeightedEnsembleModelRoutes /> },
  { path: 'boosting-ensemble/*', element: <BoostingEnsembleModelRoutes /> },
  { path: 'stacking-ensemble/*', element: <StackingEnsembleModelRoutes /> },
];

const ModelBuilding: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { state, recordStepEvent } = useExperiment();
  const hasRecordedStartRef = useRef(false);
  const prevHighestStepRef = useRef(state.highest_completed_step);

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

  useEffect(() => {
    // This effect should only redirect if the user lands on the base path,
    // not on any of the sub-routes.
    if (location.pathname === '/model' || location.pathname === '/model/') {
      navigate('/model/scenario', { replace: true });
    }
  }, [location.pathname, navigate]);

  const subSteps = useMemo(() => {
    const { STATIC_PREFIX, DYNAMIC_SUFFIX } = SUB_STEPS_CONFIG;
    if (state.selected_base_models.length > 0) {
      return [...STATIC_PREFIX, ...DYNAMIC_SUFFIX];
    }
    return STATIC_PREFIX;
  }, [state.selected_base_models]);

  const getCurrentSubStepIndex = (): number => {
    const currentPath = location.pathname;
    const isInModelDetails = modelRoutes.some(route =>
      currentPath.startsWith(`/model/${route.path.replace('/*', '')}`)
    );

    if (isInModelDetails) {
      const isEnsemble = ['weighted-ensemble', 'boosting-ensemble', 'stacking-ensemble'].some(p => currentPath.includes(p));
      if (isEnsemble) return subSteps.findIndex(s => s.id === 'ensemble-select');
      return subSteps.findIndex(s => s.id === 'model-select');
    }

    const index = subSteps.findIndex(step => currentPath.startsWith(step.path));
    return index >= 0 ? index : 0;
  };

  const currentSubStepIndex = getCurrentSubStepIndex();

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-8 pt-6 pb-4 flex-shrink-0 bg-gray-50">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-2xl font-bold text-gray-900 whitespace-nowrap">步骤 5: 建立需求预测</h1>
          <div className="flex items-center gap-2 flex-1 overflow-x-auto">
            {subSteps.map((step, index) => {
              const isActive = index === currentSubStepIndex;
              const isCompleted = index < currentSubStepIndex;
              return (
                <React.Fragment key={step.id}>
                  <div className="flex items-center gap-2 px-2 py-1 whitespace-nowrap">
                    <span
                      className={`text-sm font-medium transition-colors ${
                        isActive ? 'text-gray-900 font-semibold' : isCompleted ? 'text-gray-600' : 'text-gray-400'
                      }`}
                    >
                      {index + 1}. {step.name}
                    </span>
                  </div>
                  {index < subSteps.length - 1 && (
                    <span className="text-gray-300 mx-1">/</span>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 px-8 pb-6 overflow-y-auto">
        <Routes>
          <Route path="scenario" element={<ScenarioIntroduction />} />
          <Route path="role-intro" element={<RoleIntroduction />} />
          <Route path="window" element={<DataWindowSelection />} />
          <Route path="model-intro" element={<ModelIntroductionFlow />} />
          <Route path="model-select" element={<ModelSelection />} />
          <Route path="ensemble-intro" element={<EnsembleModelIntroductionFlow />} />
          <Route path="ensemble-select" element={<EnsembleModelSelection />} />
          {modelRoutes.map(route => (
            <Route key={route.path} path={route.path} element={route.element} />
          ))}
        </Routes>
      </div>
    </div>
  );
};

export default ModelBuilding;
