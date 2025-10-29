import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExperiment } from '../../contexts/ExperimentContext';
import {
  LineChart,
  ChartSpline,
  Sigma,
  BrainCircuit,
  Scale,
  Sparkles,
  Layers,
  ChevronLeft,
  ChevronRight,
  Lock,
} from 'lucide-react';
import MovingAverageModel from './MovingAverageModel';
import ExponentialSmoothingModel from './ExponentialSmoothingModel';
import ARIMAModel from './ARIMAModel';
import LSTMModel from './LSTMModel';
import WeightedEnsembleModel from './WeightedEnsembleModel';
import BoostingEnsembleModel from './BoostingEnsembleModel';
import StackingEnsembleModel from './StackingEnsembleModel';

const CURRENT_STEP = 5;
const MIN_BASE_MODELS_FOR_ENSEMBLE = 2;
const MIN_ENSEMBLE_MODELS_FOR_EVALUATION = 1;

interface ModelOption {
  id: string;
  name: string;
  icon: React.ElementType;
  type: 'basic' | 'ensemble';
  component: React.FC;
}

const ModelSelection: React.FC = () => {
  const navigate = useNavigate();
  const { state, updateState } = useExperiment();
  const [selectedModelId, setSelectedModelId] = useState<string>('');

  const models: ModelOption[] = [
    { id: 'moving_average', name: '移动平均法', icon: LineChart, type: 'basic', component: MovingAverageModel },
    { id: 'exponential_smoothing', name: '指数平滑法', icon: ChartSpline, type: 'basic', component: ExponentialSmoothingModel },
    { id: 'arima', name: 'ARIMA模型', icon: Sigma, type: 'basic', component: ARIMAModel },
    { id: 'lstm', name: 'LSTM神经网络', icon: BrainCircuit, type: 'basic', component: LSTMModel },
    { id: 'weighted_ensemble', name: '加权平均融合', icon: Scale, type: 'ensemble', component: WeightedEnsembleModel },
    { id: 'boosting_ensemble', name: 'Boosting融合', icon: Sparkles, type: 'ensemble', component: BoostingEnsembleModel },
    { id: 'stacking_ensemble', name: 'Stacking融合', icon: Layers, type: 'ensemble', component: StackingEnsembleModel },
  ];

  const completionMap: Record<string, boolean> = {
    moving_average: state.moving_average_completed,
    exponential_smoothing: state.exponential_smoothing_completed,
    arima: state.arima_completed,
    lstm: state.lstm_completed,
    weighted_ensemble: state.ensemble_weighted_completed,
    boosting_ensemble: state.ensemble_boosting_completed,
    stacking_ensemble: state.ensemble_stacking_completed,
  };

  const baseModels = models.filter(m => m.type === 'basic');
  const ensembleModels = models.filter(m => m.type === 'ensemble');

  const baseModelsCompletedCount = baseModels.filter((model) => completionMap[model.id]).length;
  const ensembleModelsCompletedCount = ensembleModels.filter((model) => completionMap[model.id]).length;

  const canAccessEnsemble = baseModelsCompletedCount >= MIN_BASE_MODELS_FOR_ENSEMBLE;
  const canProceedToEvaluation = baseModelsCompletedCount >= MIN_BASE_MODELS_FOR_ENSEMBLE &&
                                 ensembleModelsCompletedCount >= MIN_ENSEMBLE_MODELS_FOR_EVALUATION;

  const selectedModel = models.find(m => m.id === selectedModelId);
  const SelectedModelComponent = selectedModel?.component;

  const handlePrevious = () => {
    navigate('/model/model-intro');
  };

  const handleNext = () => {
    if (canProceedToEvaluation) {
      updateState({
        highest_completed_step: CURRENT_STEP,
        current_step: CURRENT_STEP + 1,
      });
      navigate('/evaluation');
    }
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedModelId(e.target.value);
  };

  return (
    <div className="h-full flex flex-col gap-4">
      {/* 模型选择区域 - 紧凑布局 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          {/* 模型选择下拉框 */}
          <div className="flex-1">
            <div className="relative">
              <select
                id="model-select"
                value={selectedModelId}
                onChange={handleModelChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white text-gray-900 text-sm"
              >
                <option value="">-- 请选择一个模型 --</option>

                <optgroup label="基础模型">
                  {baseModels.map((model) => {
                    const isCompleted = completionMap[model.id];
                    return (
                      <option key={model.id} value={model.id}>
                        {model.name} {isCompleted ? '✓' : ''}
                      </option>
                    );
                  })}
                </optgroup>

                <optgroup label="融合模型">
                  {ensembleModels.map((model) => {
                    const isCompleted = completionMap[model.id];
                    return (
                      <option
                        key={model.id}
                        value={model.id}
                        disabled={!canAccessEnsemble}
                      >
                        {model.name} {isCompleted ? '✓' : ''} {!canAccessEnsemble ? '🔒' : ''}
                      </option>
                    );
                  })}
                </optgroup>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>

          {/* 进度信息 - 紧凑显示 */}
          <div className="flex items-center gap-4 text-sm flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-gray-600">基础模型:</span>
              <span className="font-semibold text-blue-600">{baseModelsCompletedCount}/4</span>
            </div>
            <div className="w-px h-4 bg-gray-300"></div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600">融合模型:</span>
              <span className={`font-semibold ${canAccessEnsemble ? 'text-green-600' : 'text-gray-400'}`}>
                {ensembleModelsCompletedCount}/3
              </span>
              {!canAccessEnsemble && <Lock className="w-3 h-3 text-gray-400" />}
            </div>
          </div>
        </div>

        {/* 解锁提示 */}
        {!canAccessEnsemble && (
          <div className="mt-2 flex items-center gap-2 text-xs text-amber-600">
            <Lock className="w-3 h-3" />
            <span>完成至少 2 个基础模型后可选择融合模型</span>
          </div>
        )}
      </div>

      {/* 模型组件渲染区域 */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {SelectedModelComponent ? (
          <SelectedModelComponent />
        ) : (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center h-full flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ChartSpline className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">请选择一个预测模型</h3>
            <p className="text-gray-500 text-sm max-w-md mx-auto">
              从上方下拉框中选择一个预测模型，开始配置参数并训练模型。
              建议先完成至少2个基础模型，再尝试融合模型。
            </p>
          </div>
        )}
      </div>

      {/* 底部导航按钮 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex-shrink-0">
        <div className="flex justify-between items-center">
          <button
            onClick={handlePrevious}
            className="flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium"
          >
            <ChevronLeft className="w-5 h-5" />
            上一步
          </button>

          <div className="text-center">
            {!canProceedToEvaluation && (
              <p className="text-sm text-gray-600">
                完成至少 <strong>2个基础模型</strong> 和 <strong>1个融合模型</strong> 后可进入下一步
              </p>
            )}
          </div>

          <button
            onClick={handleNext}
            disabled={!canProceedToEvaluation}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed disabled:hover:bg-gray-300"
          >
            进入结果评估
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModelSelection;
