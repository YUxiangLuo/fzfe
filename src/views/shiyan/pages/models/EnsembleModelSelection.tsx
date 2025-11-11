import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useExperiment } from '../../contexts/ExperimentContext.zustand';
import {
  Scale,
  Sparkles,
  Layers,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  PartyPopper,
} from 'lucide-react';

// Full ensemble model list to get details from
const allEnsembleModels = [
  { id: 'weighted_ensemble', name: '加权平均融合', description: '结合多个模型预测结果。', icon: Scale, path: '/model/weighted-ensemble/intro' },
  { id: 'boosting_ensemble', name: 'Boosting融合', description: '迭代式地提升模型性能。', icon: Sparkles, path: '/model/boosting-ensemble/intro' },
  { id: 'stacking_ensemble', name: 'Stacking融合', description: '多层次模型融合策略。', icon: Layers, path: '/model/stacking-ensemble/intro' },
];

const ModelCard: React.FC<{ model: any; isCompleted: boolean; onClick: () => void }> = ({ model, isCompleted, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`relative p-6 rounded-xl border-2 transition-all duration-300 bg-white hover:border-purple-500 hover:shadow-lg cursor-pointer ${
        isCompleted ? 'border-green-500' : 'border-gray-200'
      }`}
    >
      {isCompleted && (
        <div className="absolute top-2 right-2 text-green-500">
          <CheckCircle2 className="w-6 h-6" />
        </div>
      )}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-lg flex items-center justify-center bg-purple-50">
          <model.icon className="w-7 h-7 text-purple-600" />
        </div>
        <div>
          <h3 className="font-bold text-gray-900">{model.name}</h3>
          <p className="text-sm text-gray-500">{model.description}</p>
        </div>
      </div>
    </div>
  );
};

const EnsembleModelSelection: React.FC = () => {
  const navigate = useNavigate();
  const { state, updateState } = useExperiment();

  // Filter the models to be displayed based on user's selection
  const selectedModelDetails = allEnsembleModels.filter(model => state.selected_ensemble_models.includes(model.id));

  // Check completion status of selected models
  const completionMap: Record<string, boolean> = {
    weighted_ensemble: state.ensemble_weighted_completed,
    boosting_ensemble: state.ensemble_boosting_completed,
    stacking_ensemble: state.ensemble_stacking_completed,
  };

  const allSelectedCompleted = selectedModelDetails.length > 0 && selectedModelDetails.every(model => completionMap[model.id]);

  const handlePrevious = () => {
    navigate('/model/ensemble-intro');
  };

  const handleNext = async () => {
    if (allSelectedCompleted) {
      await updateState({
        highest_completed_step: 5, // Mark step 5 as fully completed
        current_step: 6,
      });
      navigate('/evaluation');
    }
  };

  const renderModelExecutionView = () => (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex-shrink-0">
        <h2 className="text-lg font-semibold text-gray-800">请完成您选择的融合模型</h2>
        <p className="text-sm text-gray-500 mt-1">点击下方的卡片进入每个模型的详细步骤。</p>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pr-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          {selectedModelDetails.map(model => (
            <ModelCard
              key={model.id}
              model={model}
              isCompleted={!!completionMap[model.id]}
              onClick={() => navigate(model.path)}
            />
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex-shrink-0">
        <div className="flex justify-between items-center">
          <button
            onClick={handlePrevious}
            className="flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium"
          >
            <ChevronLeft className="w-5 h-5" />
            返回
          </button>
          <p className="text-sm text-gray-600">
            请完成所有已选模型的学习与训练
          </p>
          <div style={{ width: '120px' }}></div>
        </div>
      </div>
    </>
  );

  const renderCompletionView = () => (
    <>
      <div className="flex-1 flex flex-col items-center justify-center text-center bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <PartyPopper className="w-16 h-16 text-green-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">恭喜！模型构建阶段已全部完成！</h2>
        <p className="text-gray-600 max-w-md">
          您已成功完成所有基础模型和融合模型的训练。现在，您可以进入实验的下一步，对所有模型的预测结果进行综合评估。
        </p>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex-shrink-0 mt-6">
        <div className="flex justify-between items-center">
          <button
            onClick={handlePrevious}
            className="flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium"
          >
            <ChevronLeft className="w-5 h-5" />
            返回
          </button>
          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            进入结果评估
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="h-full flex flex-col gap-6 py-4">
      {allSelectedCompleted ? renderCompletionView() : renderModelExecutionView()}
    </div>
  );
};

export default EnsembleModelSelection;