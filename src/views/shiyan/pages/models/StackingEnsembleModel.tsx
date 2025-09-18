import React, { useState, useEffect } from "react";
import { useExperiment } from "../../contexts/ExperimentContext";
import { Brain, Play, CheckCircle, Layers } from "lucide-react";

// Mock data for demonstration
const MOCK_PREDICTIONS = [
    { month: "2025-01", predicted: 1925 }, { month: "2025-02", predicted: 2335 },
    { month: "2025-03", predicted: 1855 }, { month: "2025-04", predicted: 1785 },
    { month: "2025-05", predicted: 2175 }, { month: "2025-06", predicted: 2505 },
];
const MOCK_METRICS = { mape: 6.2, rmse: 175, r2: 0.97 };

const StackingEnsembleModel: React.FC = () => {
  const { state, updateState } = useExperiment();
  const modelRun = state.model_runs.stacking_ensemble || { completed: false, params: { base_models: [] }, metrics: null };

  const availableBaseModels = [
    { id: 'moving_average', name: '移动平均法', completed: state.model_runs.moving_average?.completed },
    { id: 'exponential_smoothing', name: '指数平滑法', completed: state.model_runs.exponential_smoothing?.completed },
    { id: 'arima', name: 'ARIMA模型', completed: state.model_runs.arima?.completed },
    { id: 'lstm', name: 'LSTM神经网络', completed: state.model_runs.lstm?.completed },
  ].filter(model => model.completed);

  const [selectedModels, setSelectedModels] = useState<string[]>(modelRun.params.base_models);
  const [isTraining, setIsTraining] = useState(false);

  const handleModelToggle = (modelId: string) => {
    setSelectedModels(prev =>
      prev.includes(modelId)
        ? prev.filter(id => id !== modelId)
        : [...prev, modelId]
    );
  };

  const handleTrainModel = () => {
    setIsTraining(true);
    setTimeout(() => {
      const newModelRun = {
        completed: true,
        params: { base_models: selectedModels },
        metrics: MOCK_METRICS,
      };
      updateState({
        model_runs: {
          ...state.model_runs,
          stacking_ensemble: newModelRun,
        }
      });
      setIsTraining(false);
    }, 2500);
  };

  const renderConfigScreen = () => (
    <div className="space-y-8">
        <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Stacking融合模型</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">选择已完成的基础模型，系统将训练一个元学习器来智能组合它们的预测结果。</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-2xl mx-auto">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">选择用于融合的基础模型</h3>
            <div className="space-y-4">
                {availableBaseModels.map(model => (
                    <div
                        key={model.id}
                        onClick={() => handleModelToggle(model.id)}
                        className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${selectedModels.includes(model.id) ? "border-teal-500 bg-teal-50" : "border-gray-200 hover:border-gray-300"}`}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${selectedModels.includes(model.id) ? "border-teal-500 bg-teal-500" : "border-gray-300"}`}>
                                    {selectedModels.includes(model.id) && <CheckCircle className="w-3 h-3 text-white" />}
                                </div>
                                <h4 className="font-semibold text-gray-900">{model.name}</h4>
                            </div>
                            <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">已完成</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
        <div className="flex justify-center">
            <button
                onClick={handleTrainModel}
                disabled={isTraining || selectedModels.length < 2}
                className="flex items-center space-x-2 px-8 py-4 bg-teal-600 text-white rounded-lg hover:bg-teal-700 shadow-lg hover:shadow-xl transition-all text-lg font-semibold disabled:bg-gray-400"
            >
                {isTraining ? (
                    <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>正在训练...</span>
                    </>
                ) : (
                    <>
                        <Layers className="w-6 h-6" />
                        <span>运行Stacking模型</span>
                    </>
                )}
            </button>
        </div>
        {selectedModels.length < 2 && <p className="text-center text-sm text-gray-500">请至少选择两个模型进行融合。</p>}
    </div>
  );

  const renderResultScreen = () => (
    <div className="space-y-6">
        <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Stacking融合 - 预测完成</h2>
            <p className="text-xl text-gray-600">模型已成功运行并保存结果！</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <p className="text-green-800">
                已完成Stacking融合模型训练 (融合模型: {modelRun.params.base_models?.length}个).
            </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">未来6个月预测结果</h3>
                <div className="space-y-2">
                    {MOCK_PREDICTIONS.map((pred) => (
                        <div key={pred.month} className="flex justify-between p-2 bg-gray-50 rounded">
                            <span>{pred.month}</span>
                            <span className="font-semibold text-teal-600">{pred.predicted.toLocaleString()}件</span>
                        </div>
                    ))}
                </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">模型评估指标</h3>
                <div className="space-y-3">
                    <div className="flex justify-between items-baseline">
                        <span className="text-gray-600">MAPE</span>
                        <span className="text-2xl font-bold text-teal-600">{modelRun.metrics?.mape}%</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                        <span className="text-gray-600">RMSE</span>
                        <span className="text-2xl font-bold text-teal-600">{modelRun.metrics?.rmse}</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                        <span className="text-gray-600">R²</span>
                        <span className="text-2xl font-bold text-teal-600">{modelRun.metrics?.r2}</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        {modelRun.completed ? renderResultScreen() : renderConfigScreen()}
    </div>
  );
};

export default StackingEnsembleModel;