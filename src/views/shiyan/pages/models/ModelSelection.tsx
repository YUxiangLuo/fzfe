import React from 'react';
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
  CheckCircle2,
} from 'lucide-react';

const CURRENT_STEP = 5;
const MIN_BASE_MODELS_FOR_ENSEMBLE = 2;
const MIN_ENSEMBLE_MODELS_FOR_EVALUATION = 1;

interface ModelOption {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  type: 'basic' | 'ensemble';
  path: string;
}

const models: ModelOption[] = [
  { id: 'moving_average', name: '移动平均法', description: '简单的时间序列预测方法。', icon: LineChart, type: 'basic', path: '/model/moving-average/intro' },
  { id: 'exponential_smoothing', name: '指数平滑法', description: '加权平均，近期数据权重更大。', icon: ChartSpline, type: 'basic', path: '/model/exponential-smoothing/intro' },
  { id: 'arima', name: 'ARIMA模型', description: '经典的统计预测模型。', icon: Sigma, type: 'basic', path: '/model/arima/intro' },
  { id: 'lstm', name: 'LSTM神经网络', description: '先进的深度学习预测模型。', icon: BrainCircuit, type: 'basic', path: '/model/lstm/intro' },
  { id: 'weighted_ensemble', name: '加权平均融合', description: '结合多个模型预测结果。', icon: Scale, type: 'ensemble', path: '/model/weighted-ensemble/intro' },
  { id: 'boosting_ensemble', name: 'Boosting融合', description: '迭代式地提升模型性能。', icon: Sparkles, type: 'ensemble', path: '/model/boosting-ensemble/intro' },
  { id: 'stacking_ensemble', name: 'Stacking融合', description: '多层次模型融合策略。', icon: Layers, type: 'ensemble', path: '/model/stacking-ensemble/intro' },
];

const ModelCard: React.FC<{ model: ModelOption; isCompleted: boolean; isDisabled: boolean; onClick: () => void }> = ({ model, isCompleted, isDisabled, onClick }) => {
  return (
    <div
      onClick={isDisabled ? undefined : onClick}
      className={`relative p-6 rounded-xl border-2 transition-all duration-300 ${
        isDisabled
          ? 'bg-gray-100 cursor-not-allowed'
          : 'bg-white hover:border-blue-500 hover:shadow-lg cursor-pointer'
      } ${isCompleted ? 'border-green-500' : 'border-gray-200'}`}
    >
      {isCompleted && (
        <div className="absolute top-2 right-2 text-green-500">
          <CheckCircle2 className="w-6 h-6" />
        </div>
      )}
      {isDisabled && (
        <div className="absolute top-2 right-2 text-gray-400">
          <Lock className="w-5 h-5" />
        </div>
      )}
      <div className="flex items-center gap-4">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isDisabled ? 'bg-gray-200' : 'bg-blue-50'}`}>
          <model.icon className={`w-7 h-7 ${isDisabled ? 'text-gray-400' : 'text-blue-600'}`} />
        </div>
        <div>
          <h3 className={`font-bold ${isDisabled ? 'text-gray-500' : 'text-gray-900'}`}>{model.name}</h3>
          <p className="text-sm text-gray-500">{model.description}</p>
        </div>
      </div>
    </div>
  );
};


const ModelSelection: React.FC = () => {
  const navigate = useNavigate();
  const { state, updateState } = useExperiment();

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

  return (
    <div className="h-full flex flex-col gap-6 py-4">
      {/* Progress and Info Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex-shrink-0">
        <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-800">请选择一个预测模型开始学习</h2>
            <div className="flex items-center gap-4 text-sm flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-gray-600">基础模型:</span>
                <span className="font-semibold text-blue-600">{baseModelsCompletedCount} / {baseModels.length}</span>
              </div>
              <div className="w-px h-4 bg-gray-300"></div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600">融合模型:</span>
                <span className={`font-semibold ${canAccessEnsemble ? 'text-green-600' : 'text-gray-400'}`}>
                  {ensembleModelsCompletedCount} / {ensembleModels.length}
                </span>
                {!canAccessEnsemble && <Lock className="w-3 h-3 text-gray-400" />}
              </div>
            </div>
        </div>
        {!canAccessEnsemble && (
          <div className="mt-2 flex items-center gap-2 text-xs text-amber-600">
            <Lock className="w-3 h-3" />
            <span>完成至少 {MIN_BASE_MODELS_FOR_ENSEMBLE} 个基础模型后可选择融合模型</span>
          </div>
        )}
      </div>

      {/* Model Cards Area */}
      <div className="flex-1 min-h-0 overflow-y-auto pr-2">
        <div className="space-y-4">
            <div>
                <h3 className="text-base font-semibold text-gray-500 mb-3">基础模型</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {baseModels.map(model => (
                        <ModelCard 
                            key={model.id}
                            model={model}
                            isCompleted={!!completionMap[model.id]}
                            isDisabled={false}
                            onClick={() => navigate(model.path)}
                        />
                    ))}
                </div>
            </div>
            <div>
                <h3 className="text-base font-semibold text-gray-500 mb-3">融合模型</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {ensembleModels.map(model => (
                        <ModelCard 
                            key={model.id}
                            model={model}
                            isCompleted={!!completionMap[model.id]}
                            isDisabled={!canAccessEnsemble}
                            onClick={() => navigate(model.path)}
                        />
                    ))}
                </div>
            </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex-shrink-0">
        <div className="flex justify-between items-center">
          <button
            onClick={handlePrevious}
            className="flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium"
          >
            <ChevronLeft className="w-5 h-5" />
            返回介绍
          </button>

          <div className="text-center">
            {!canProceedToEvaluation && (
              <p className="text-sm text-gray-600">
                完成至少 <strong>{MIN_BASE_MODELS_FOR_ENSEMBLE}个基础模型</strong> 和 <strong>{MIN_ENSEMBLE_MODELS_FOR_EVALUATION}个融合模型</strong> 后可进入下一步
              </p>
            )}
          </div>

          <button
            onClick={handleNext}
            disabled={!canProceedToEvaluation}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed"
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
