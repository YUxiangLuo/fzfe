import React, { useState, useEffect } from "react";
import { useExperiment } from "../../contexts/ExperimentContext";
import { TrendingUp, Play, CheckCircle } from "lucide-react";

// Mock data for demonstration
const MOCK_METRICS = { mape: 11.3, rmse: 356, r2: 0.87 };

const ExponentialSmoothingModel: React.FC = () => {
  const { state, updateState } = useExperiment();
  const modelRun = state.model_runs.exponential_smoothing || { completed: false, params: {}, metrics: null };

  const [alpha, setAlpha] = useState(modelRun.params.alpha || 0.5);
  const [isTraining, setIsTraining] = useState(false);
  const [showResult, setShowResult] = useState(modelRun.completed);

  useEffect(() => {
    setShowResult(state.model_runs.exponential_smoothing?.completed || false);
    setAlpha(state.model_runs.exponential_smoothing?.params.alpha || 0.5);
  }, [state.model_runs.exponential_smoothing]);

  const handleTrainModel = () => {
    setIsTraining(true);
    setTimeout(() => {
      const newModelRun = {
        completed: true,
        params: { alpha },
        metrics: MOCK_METRICS,
      };
      updateState({
        model_runs: {
          ...state.model_runs,
          exponential_smoothing: newModelRun,
        }
      });
      setIsTraining(false);
    }, 1500);
  };

  const renderConfigScreen = () => (
    <div className="space-y-8">
        <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">指数平滑法</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">配置平滑系数 (alpha)，alpha越大，对近期数据的权重越高。</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-lg mx-auto">
            <label className="block text-lg font-medium text-gray-700 mb-2">
                平滑系数 (α): <span className="text-orange-600 font-bold">{alpha.toFixed(2)}</span>
            </label>
            <input
                type="range"
                min="0.01"
                max="1.0"
                step="0.01"
                value={alpha}
                onChange={(e) => setAlpha(Number(e.target.value))}
                className="w-full"
            />
        </div>
        <div className="flex justify-center">
            <button
                onClick={handleTrainModel}
                disabled={isTraining}
                className="flex items-center space-x-2 px-8 py-4 bg-orange-600 text-white rounded-lg hover:bg-orange-700 shadow-lg transition-all text-lg font-semibold disabled:bg-gray-400"
            >
                {isTraining ? "正在计算..." : <><Play className="w-6 h-6" /><span>运行指数平滑模型</span></>}
            </button>
        </div>
    </div>
  );

  const renderResultScreen = () => (
    <div className="space-y-6 text-center">
        <h2 className="text-3xl font-bold text-gray-900">指数平滑法 - 预测完成</h2>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-green-800">已完成指数平滑法 (α={modelRun.params.alpha?.toFixed(2)})模型训练。</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-md mx-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">模型评估指标</h3>
            <div className="space-y-3">
                <div className="flex justify-between items-baseline"><span className="text-gray-600">MAPE</span><span className="text-2xl font-bold text-orange-600">{modelRun.metrics?.mape}%</span></div>
                <div className="flex justify-between items-baseline"><span className="text-gray-600">RMSE</span><span className="text-2xl font-bold text-orange-600">{modelRun.metrics?.rmse}</span></div>
                <div className="flex justify-between items-baseline"><span className="text-gray-600">R²</span><span className="text-2xl font-bold text-orange-600">{modelRun.metrics?.r2}</span></div>
            </div>
        </div>
    </div>
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        {showResult ? renderResultScreen() : renderConfigScreen()}
    </div>
  );
};

export default ExponentialSmoothingModel;