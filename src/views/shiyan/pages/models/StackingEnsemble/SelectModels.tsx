import React from 'react';
import { useExperiment } from '../../../contexts/ExperimentContext';
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
    { id: 'lstm', name: 'LSTM神经网络', completed: state.lstm_completed },
  ].filter(m => m.completed);

  const handleToggle = (modelId: string) => {
    const newSelection = selectedModels.includes(modelId)
      ? selectedModels.filter(id => id !== modelId)
      : [...selectedModels, modelId];
    setSelectedModels(newSelection);
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">Stacking 融合 - 选择基础模型</h3>
      <p className="mb-4">
        请选择进行融合预测的模型（至少选择两个基础模型）。
      </p>
      <div className="space-y-2">
        {completedModels.length > 0 ? (
          completedModels.map(model => (
            <div key={model.id} className="flex items-center">
              <input
                id={model.id}
                name="basemodel"
                type="checkbox"
                className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                checked={selectedModels.includes(model.id)}
                onChange={() => handleToggle(model.id)}
              />
              <label htmlFor={model.id} className="ml-3 block text-sm font-medium text-gray-700">
                {model.name}
              </label>
            </div>
          ))
        ) : (
          <p className="text-gray-500">没有已完成的基础模型可供选择。</p>
        )}
      </div>
      {error && (
        <div className="mt-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
          <AlertTriangle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default SelectModels;
