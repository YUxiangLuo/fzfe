import React from 'react';
import { useExperiment } from '../../../contexts/ExperimentContext.zustand';
import { AlertTriangle } from 'lucide-react';

export interface SelectModelsProps {
  selectedModels: string[];
  setSelectedModels: (models: string[]) => void;
  error: string | null;
}

const SelectModels: React.FC<SelectModelsProps> = ({ selectedModels, setSelectedModels, error }) => {
  const { state } = useExperiment();

  const completedModels = [
    { id: 'moving_average', name: '移动平均法', completed: state.moving_average_completed },
    { id: 'exponential_smoothing', name: '指数平滑法', completed: state.exponential_smoothing_completed },
    { id: 'arima', name: 'ARIMA模型', completed: state.arima_completed },
    { id: 'lstm', name: 'LSTM模型', completed: state.lstm_completed },
  ].filter(m => m.completed);

  const handleToggle = (modelId: string) => {
    const newSelection = selectedModels.includes(modelId)
      ? selectedModels.filter(id => id !== modelId)
      : [...selectedModels, modelId];
    setSelectedModels(newSelection);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-800 mb-3">加权平均融合 - 选择基础模型</h3>
        <p className="text-gray-600 text-base leading-relaxed">
          请选择进行融合预测的模型（至少选择两个基础模型）。
        </p>
      </div>

      <div className="p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg border border-purple-200 shadow-sm">
        <label className="block text-lg font-semibold text-gray-800 mb-4">
          可用的基础模型:
        </label>
        <div className="space-y-3">
          {completedModels.length > 0 ? (
            completedModels.map(model => (
              <label
                key={model.id}
                htmlFor={model.id}
                className="flex items-center p-3 bg-white rounded-lg border-2 border-gray-200 hover:border-purple-300 transition-colors cursor-pointer"
              >
                <input
                  id={model.id}
                  name="basemodel"
                  type="checkbox"
                  className="h-5 w-5 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                  checked={selectedModels.includes(model.id)}
                  onChange={() => handleToggle(model.id)}
                />
                <span
                  className="ml-4 text-base text-gray-800 cursor-pointer flex-1"
                >
                  {model.name}
                </span>
              </label>
            ))
          ) : (
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-gray-700 text-base">
                没有已完成的基础模型可供选择。请先完成至少两个基础模型的训练。
              </p>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-4 rounded-lg border border-red-200">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default SelectModels;
