import React, { useState, useEffect } from "react";
import { useExperiment } from "../../contexts/ExperimentContext";
import { Brain, Play, CheckCircle, Database } from "lucide-react";

// Mock data for demonstration
const MOCK_PREDICTIONS = [
    { month: "2025-01", predicted: 1920 }, { month: "2025-02", predicted: 2350 },
    { month: "2025-03", predicted: 1850 }, { month: "2025-04", predicted: 1780 },
    { month: "2025-05", predicted: 2180 }, { month: "2025-06", predicted: 2520 },
];
const MOCK_METRICS = { mape: 8.2, rmse: 245, r2: 0.92 };

const availableFeatures = [
    { id: "sales_quantity", name: "销售数量", description: "历史销售数量数据", required: true },
    { id: "price", name: "价格", description: "产品价格变化数据", required: false },
    { id: "promotion", name: "促销活动", description: "促销活动标识", required: false },
    { id: "inventory", name: "库存水平", description: "库存数量数据", required: false },
];

const LSTMModel: React.FC = () => {
  const { state, updateState } = useExperiment();
  const modelRun = state.model_runs.lstm || { completed: false, params: { features: ["sales_quantity"] }, metrics: null };

  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(modelRun.params.features);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);

  const handleFeatureToggle = (featureId: string) => {
    if (availableFeatures.find(f => f.id === featureId)?.required) return;
    setSelectedFeatures(prev =>
      prev.includes(featureId)
        ? prev.filter(id => id !== featureId)
        : [...prev, featureId]
    );
  };

  const handleTrainModel = () => {
    setIsTraining(true);
    setTrainingProgress(0);
    const interval = setInterval(() => {
      setTrainingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          const newModelRun = {
            completed: true,
            params: { features: selectedFeatures },
            metrics: MOCK_METRICS,
          };
          updateState({
            model_runs: {
              ...state.model_runs,
              lstm: newModelRun,
            }
          });
          setIsTraining(false);
          return 100;
        }
        return prev + 5;
      });
    }, 100);
  };

  const renderConfigScreen = () => (
    <div className="space-y-8">
        <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">构建LSTM模型</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">选择输入特征，构建适合您数据的LSTM预测模型。</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-2xl mx-auto">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">特征选择</h3>
            <div className="space-y-4">
                {availableFeatures.map(feature => (
                    <div
                        key={feature.id}
                        onClick={() => handleFeatureToggle(feature.id)}
                        className={`p-4 rounded-lg border-2 transition-all ${selectedFeatures.includes(feature.id) ? "border-purple-500 bg-purple-50" : "border-gray-200 hover:border-gray-300"} ${feature.required ? "opacity-75" : "cursor-pointer"}`}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${selectedFeatures.includes(feature.id) ? "border-purple-500 bg-purple-500" : "border-gray-300"}`}>
                                    {selectedFeatures.includes(feature.id) && <CheckCircle className="w-3 h-3 text-white" />}
                                </div>
                                <h4 className="font-semibold text-gray-900">{feature.name}</h4>
                            </div>
                            {feature.required && <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">必需</span>}
                        </div>
                        <p className="text-gray-600 text-sm ml-8 mt-1">{feature.description}</p>
                    </div>
                ))}
            </div>
        </div>
        <div className="flex justify-center">
            <button
                onClick={handleTrainModel}
                disabled={isTraining}
                className="flex items-center space-x-2 px-8 py-4 bg-purple-600 text-white rounded-lg hover:bg-purple-700 shadow-lg hover:shadow-xl transition-all text-lg font-semibold disabled:bg-gray-400"
            >
                {isTraining ? (
                    <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>正在训练... ({trainingProgress}%)</span>
                    </>
                ) : (
                    <>
                        <Brain className="w-6 h-6" />
                        <span>训练LSTM模型</span>
                    </>
                )}
            </button>
        </div>
    </div>
  );

  const renderResultScreen = () => (
    <div className="space-y-6">
        <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">LSTM神经网络 - 训练完成</h2>
            <p className="text-xl text-gray-600">模型已成功训练并保存结果！</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <p className="text-green-800">
                已完成LSTM模型训练 (输入特征: {modelRun.params.features?.join(', ')}).
            </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">未来6个月预测结果</h3>
                <div className="space-y-2">
                    {MOCK_PREDICTIONS.map((pred) => (
                        <div key={pred.month} className="flex justify-between p-2 bg-gray-50 rounded">
                            <span>{pred.month}</span>
                            <span className="font-semibold text-purple-600">{pred.predicted.toLocaleString()}件</span>
                        </div>
                    ))}
                </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">模型评估指标</h3>
                <div className="space-y-3">
                    <div className="flex justify-between items-baseline">
                        <span className="text-gray-600">MAPE</span>
                        <span className="text-2xl font-bold text-purple-600">{modelRun.metrics?.mape}%</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                        <span className="text-gray-600">RMSE</span>
                        <span className="text-2xl font-bold text-purple-600">{modelRun.metrics?.rmse}</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                        <span className="text-gray-600">R²</span>
                        <span className="text-2xl font-bold text-purple-600">{modelRun.metrics?.r2}</span>
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

export default LSTMModel;