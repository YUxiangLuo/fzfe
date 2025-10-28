import React, { useEffect, useRef } from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { useExperiment } from '../contexts/ExperimentContext';
import {
  LineChart,
  ChartSpline,
  Sigma,
  BrainCircuit,
  Scale,
  Sparkles,
  Layers,
  TrendingUp,
  Lock,
  CalendarRange,
  type LucideIcon,
} from 'lucide-react';
import MovingAverageModel from './models/MovingAverageModel';
import ExponentialSmoothingModel from './models/ExponentialSmoothingModel';
import WeightedEnsembleModel from './models/WeightedEnsembleModel';
import BoostingEnsembleModel from './models/BoostingEnsembleModel';
import StackingEnsembleModel from './models/StackingEnsembleModel';
import LSTMModel from './models/LSTMModel';
import ARIMAModel from './models/ARIMAModel';
import { DOWNLOAD_SERVER_BASE_URL } from '../../../config/appConfig';
import DataWindowSelection from './models/DataWindowSelection';

// 常量配置
const CURRENT_STEP = 5;
const MIN_BASE_MODELS_FOR_ENSEMBLE = 2;
const MIN_ENSEMBLE_MODELS_FOR_EVALUATION = 1;
const TOTAL_BASE_MODELS = 4;
const TOTAL_ENSEMBLE_MODELS = 3;

// 路径常量
const PATHS = {
  MODEL_ROOT: '/model',
  WINDOW: '/model/window',
  EVALUATION: '/evaluation',
} as const;

// 模型配置类型
interface ModelConfig {
  id: string;
  name: string;
  path: string;
  icon: LucideIcon;
  type: 'basic' | 'ensemble';
}

interface DataPreparationRoute {
  id: string;
  name: string;
  path: string;
  icon: LucideIcon;
}

// 数据准备路由配置
const DATA_PREPARATION_ROUTES: DataPreparationRoute[] = [
  {
    id: 'data_window',
    name: '选择数据时段',
    path: 'window',
    icon: CalendarRange,
  },
];

// 模型配置
const MODELS: ModelConfig[] = [
  { id: 'moving_average', name: '移动平均法', path: 'ma', icon: LineChart, type: 'basic' },
  { id: 'exponential_smoothing', name: '指数平滑法', path: 'es', icon: ChartSpline, type: 'basic' },
  { id: 'arima', name: 'ARIMA模型', path: 'arima', icon: Sigma, type: 'basic' },
  { id: 'lstm', name: 'LSTM神经网络', path: 'lstm', icon: BrainCircuit, type: 'basic' },
  { id: 'weighted_ensemble', name: '加权平均融合', path: 'weighted', icon: Scale, type: 'ensemble' },
  { id: 'boosting_ensemble', name: 'Boosting融合', path: 'boosting', icon: Sparkles, type: 'ensemble' },
  { id: 'stacking_ensemble', name: 'Stacking融合', path: 'stacking', icon: Layers, type: 'ensemble' },
];

const ModelBuilding: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { state, updateState, recordStepEvent } = useExperiment();
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

  const completionMap: Record<string, boolean> = {
    moving_average: state.moving_average_completed,
    exponential_smoothing: state.exponential_smoothing_completed,
    arima: state.arima_completed,
    lstm: state.lstm_completed,
    weighted_ensemble: state.ensemble_weighted_completed,
    boosting_ensemble: state.ensemble_boosting_completed,
    stacking_ensemble: state.ensemble_stacking_completed,
  };

  const {
    data_window_train_start_index: trainStart,
    data_window_train_end_index: trainEnd,
    data_window_evaluate_start_index: evalStart,
    data_window_evaluate_end_index: evalEnd,
  } = state;

  const hasValidDataWindow =
    trainStart !== null &&
    trainEnd !== null &&
    evalStart !== null &&
    evalEnd !== null &&
    trainStart <= trainEnd &&
    evalStart <= evalEnd &&
    trainEnd < evalStart;

  const baseModels = MODELS.filter(m => m.type === 'basic');
  const ensembleModels = MODELS.filter(m => m.type === 'ensemble');

  const baseModelsCompletedCount = baseModels.filter((model) => completionMap[model.id]).length;
  const ensembleModelsCompletedCount = ensembleModels.filter((model) => completionMap[model.id]).length;

  const canAccessEnsemble = baseModelsCompletedCount >= MIN_BASE_MODELS_FOR_ENSEMBLE;
  const canAccessEvaluation = ensembleModelsCompletedCount >= MIN_ENSEMBLE_MODELS_FOR_EVALUATION;

  const handleEvaluationClick = () => {
    if (canAccessEvaluation) {
      updateState({
          highest_completed_step: CURRENT_STEP,
          current_step: CURRENT_STEP + 1,
      });
      navigate(PATHS.EVALUATION);
    }
  };

  // 通用导航项渲染组件
  const renderNavigationItem = (model: ModelConfig, isDisabled: boolean) => {
    const isActive = location.pathname.endsWith('/' + model.path);
    const Icon = model.icon;
    const isCompleted = completionMap[model.id] ?? false;

    const ItemContent = (
      <div className="flex items-center gap-3">
        <span className={`w-2 h-2 rounded-full ${isCompleted ? 'bg-green-500' : 'bg-transparent'}`} />
        <Icon className="w-5 h-5" />
        <span>{model.name}</span>
      </div>
    );

    const activeClasses = 'bg-blue-50 text-blue-700';
    const normalClasses = 'text-gray-700 hover:bg-gray-50';
    const disabledClasses = 'bg-gray-100 text-gray-400 cursor-not-allowed';

    if (isDisabled) {
      return (
        <div
          key={model.id}
          className={`flex items-center justify-between p-3 rounded-lg ${disabledClasses}`}
        >
          {ItemContent}
          <Lock className="w-4 h-4" />
        </div>
      );
    }

    return (
      <Link
        key={model.id}
        to={`/model/${model.path}`}
        className={`flex items-center justify-between p-3 rounded-lg transition-all ${isActive ? activeClasses : normalClasses}`}
      >
        {ItemContent}
      </Link>
    );
  };

  const RoleIntroPanel = () => (
    <div className="h-full flex items-center justify-center">
      <div className="relative w-full max-w-4xl">
        <img
          src={`${DOWNLOAD_SERVER_BASE_URL}/images/yuceqingjing.png`}
          alt="角色扮演情境提示"
          className="w-full h-auto rounded-2xl shadow-xl object-contain"
        />
        <button
          onClick={() => navigate(PATHS.WINDOW)}
          className="absolute top-4 right-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md transition-colors"
        >
          我已了解，选择数据时段
        </button>
      </div>
    </div>
  );

  const DefaultModelContent = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">预测模型中心</h2>
        <p className="text-gray-600 mb-6">
          请先在“选择数据时段”中配置训练与评估区间，随后完成基础模型以解锁融合模型。
        </p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">🎯 您的任务</h3>
          <div className="text-blue-700 space-y-2">
            <p>• <strong>分析市场需求</strong>：基于历史销售数据，预测未来6个月的市场需求。</p>
            <p>• <strong>准备数据区间</strong>：先划分训练与评估所需的历史区间，构建可信的测试集。</p>
            <p>• <strong>选择预测方法</strong>：完成基础模型后解锁更强大的融合模型技术。</p>
          </div>
        </div>
    </div>
  );

  const sanitizedPath = location.pathname.replace(/\/+$/, '');
  const shouldShowRoleIntro = sanitizedPath === PATHS.MODEL_ROOT;

  useEffect(() => {
    if (!hasValidDataWindow) {
      const isSetupRoute = sanitizedPath === PATHS.MODEL_ROOT || sanitizedPath === PATHS.WINDOW;
      if (!isSetupRoute) {
        navigate(PATHS.WINDOW, { replace: true });
      }
    }
  }, [hasValidDataWindow, sanitizedPath, navigate]);

  if (shouldShowRoleIntro) {
    return (
      <div className="p-8">
        <div className="w-full">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">步骤 5: 预测模型建立</h1>
            <p className="text-lg text-gray-600">
              进入预测模型之前，请先了解您在企业中的角色定位与任务背景。
            </p>
          </div>

          <RoleIntroPanel />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">步骤 5: 预测模型建立</h1>
          <p className="text-lg text-gray-600">
            选择合适的预测算法来分析产品需求。每种方法都有其特点和适用场景。
          </p>
        </div>

        <div className="flex gap-8">
          <div className="w-80 bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">数据准备</h2>
              <nav className="space-y-2">
                {DATA_PREPARATION_ROUTES.map((route) => {
                  const isActive = location.pathname.endsWith('/' + route.path);
                  const Icon = route.icon;
                  return (
                    <Link
                      key={route.id}
                      to={`/model/${route.path}`}
                      className={`flex items-center space-x-3 p-3 rounded-lg transition-all ${isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}`}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{route.name}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">基础模型</h2>
              <p className="text-sm text-gray-500 mb-4">已完成: {baseModelsCompletedCount} / {TOTAL_BASE_MODELS}</p>
              <nav className="space-y-2">
                {baseModels.map((model) => renderNavigationItem(model, !hasValidDataWindow))}
              </nav>
              {!hasValidDataWindow && (
                <p className="mt-2 text-xs text-gray-500">
                  完成数据时段配置后即可解锁基础模型。
                </p>
              )}
            </div>

            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">融合模型</h2>
              <p className="text-sm text-gray-500 mb-4">{canAccessEnsemble ? `已完成: ${ensembleModelsCompletedCount} / ${TOTAL_ENSEMBLE_MODELS}` : `完成${MIN_BASE_MODELS_FOR_ENSEMBLE}个基础模型后解锁`}</p>
              <nav className="space-y-2">
                {ensembleModels.map((model) => renderNavigationItem(model, !canAccessEnsemble))}
              </nav>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={handleEvaluationClick}
                disabled={!canAccessEvaluation}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-lg transition-all font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <TrendingUp className="w-5 h-5" />
                <span>进入结果评估</span>
              </button>
              <p className="text-xs text-gray-500 mt-2 text-center">
                {!canAccessEvaluation && `完成${MIN_ENSEMBLE_MODELS_FOR_EVALUATION}个融合模型后解锁`}
              </p>
            </div>
          </div>

          <div className="flex-1 min-h-0">
            <Routes>
              <Route path="window" element={<DataWindowSelection />} />
              <Route index element={<DefaultModelContent />} />
              <Route path="ma" element={<MovingAverageModel />} />
              <Route path="es" element={<ExponentialSmoothingModel />} />
              <Route path="arima" element={<ARIMAModel />} />
              <Route path="lstm" element={<LSTMModel />} />
              {canAccessEnsemble && (
                <>
                  <Route path="weighted" element={<WeightedEnsembleModel />} />
                  <Route path="boosting" element={<BoostingEnsembleModel />} />
                  <Route path="stacking" element={<StackingEnsembleModel />} />
                </>
              )}
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelBuilding;
