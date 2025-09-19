import React from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { useExperiment } from '../contexts/ExperimentContext';
import { Brain, TrendingUp, BarChart3, ArrowRight, Lock } from 'lucide-react';
import MovingAverageModel from './models/MovingAverageModel';
import ExponentialSmoothingModel from './models/ExponentialSmoothingModel';
import WeightedEnsembleModel from './models/WeightedEnsembleModel';
import BoostingEnsembleModel from './models/BoostingEnsembleModel';
import StackingEnsembleModel from './models/StackingEnsembleModel';
import LSTMModel from './models/LSTMModel';
import ARIMAModel from './models/ARIMAModel';

const ModelBuilding: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { state, updateState } = useExperiment();

  const completionMap: Record<string, boolean> = {
    moving_average: Boolean(state.movingAverage.completed),
    exponential_smoothing: Boolean(state.exponentialSmoothing.completed),
    arima: Boolean(state.arima.completed),
    lstm: Boolean(state.lstm.completed),
    weighted_ensemble: Boolean(state.ensembleWeighted.completed),
    boosting_ensemble: Boolean(state.ensembleBoosting.completed),
    stacking_ensemble: Boolean(state.ensembleStacking.completed),
  };

  const models = [
    { id: 'moving_average', name: '移动平均法', path: 'ma', icon: BarChart3, type: 'basic' },
    { id: 'exponential_smoothing', name: '指数平滑法', path: 'es', icon: TrendingUp, type: 'basic' },
    { id: 'arima', name: 'ARIMA模型', path: 'arima', icon: TrendingUp, type: 'basic' },
    { id: 'lstm', name: 'LSTM神经网络', path: 'lstm', icon: Brain, type: 'basic' },
    { id: 'weighted_ensemble', name: '加权平均融合', path: 'weighted', icon: BarChart3, type: 'ensemble' },
    { id: 'boosting_ensemble', name: 'Boosting融合', path: 'boosting', icon: Brain, type: 'ensemble' },
    { id: 'stacking_ensemble', name: 'Stacking融合', path: 'stacking', icon: Brain, type: 'ensemble' },
  ];

  const baseModelsCompletedCount = ['moving_average', 'exponential_smoothing', 'arima', 'lstm']
    .filter((id) => completionMap[id]).length;

  const ensembleModelsCompletedCount = ['weighted_ensemble', 'boosting_ensemble', 'stacking_ensemble']
    .filter((id) => completionMap[id]).length;

  const canAccessEnsemble = baseModelsCompletedCount >= 2;
  const canAccessEvaluation = ensembleModelsCompletedCount >= 1;

  const handleEvaluationClick = () => {
    if (canAccessEvaluation) {
      updateState({ 
          highest_completed_step: 5,
          current_step: 6,
      });
      navigate('/evaluation');
    }
  };

  const DefaultModelContent = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">预测模型中心</h2>
        <p className="text-gray-600 mb-6">请从左侧导航栏中选择一个预测模型开始。您需要先完成至少两个基础模型，才能解锁融合模型。</p>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">🎯 您的任务</h3>
          <div className="text-blue-700 space-y-2">
            <p>• <strong>分析市场需求</strong>：基于历史销售数据，预测未来6个月的市场需求。</p>
            <p>• <strong>选择预测方法</strong>：从多种预测算法中选择最适合的方法，确保预测准确性。</p>
            <p>• <strong>解锁高级模型</strong>：完成基础模型以解锁更强大的融合模型技术。</p>
          </div>
        </div>
    </div>
  );

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
          <div className="w-80 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">基础模型</h2>
            <p className="text-sm text-gray-500 mb-4">已完成: {baseModelsCompletedCount} / 4</p>
            <nav className="space-y-2">
              {models.filter(m => m.type === 'basic').map(model => (
                <Link key={model.id} to={`/model/${model.path}`} className={`flex items-center space-x-3 p-3 rounded-lg transition-all ${location.pathname.endsWith('/' + model.path) ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}`}>
                  <model.icon className="w-5 h-5" />
                  <span>{model.name}</span>
                </Link>
              ))}
            </nav>

            <h2 className="text-lg font-semibold text-gray-900 mb-2 mt-6">融合模型</h2>
            <p className="text-sm text-gray-500 mb-4">{canAccessEnsemble ? `已完成: ${ensembleModelsCompletedCount} / 3` : '完成2个基础模型后解锁'}</p>
            <nav className="space-y-2">
              {models.filter(m => m.type === 'ensemble').map(model => (
                <Link key={model.id} to={canAccessEnsemble ? `/model/${model.path}` : '#'} className={`flex items-center space-x-3 p-3 rounded-lg transition-all ${!canAccessEnsemble ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : location.pathname.endsWith('/' + model.path) ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'}`}>
                  <model.icon className="w-5 h-5" />
                  <span>{model.name}</span>
                  {!canAccessEnsemble && <Lock className="w-4 h-4 ml-auto" />}
                </Link>
              ))}
            </nav>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <button
                onClick={handleEvaluationClick}
                disabled={!canAccessEvaluation}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-lg transition-all font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                <TrendingUp className="w-5 h-5" />
                <span>进入结果评估</span>
              </button>
              <p className="text-xs text-gray-500 mt-2 text-center">
                {!canAccessEvaluation && '完成1个融合模型后解锁'}
              </p>
            </div>
          </div>

          <div className="flex-1 min-h-0">
            <Routes>
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
