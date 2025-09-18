import React, { useState, useEffect } from "react";
import { useExperiment } from "../../contexts/ExperimentContext";
import { BarChart3, Settings, Play, TrendingUp, CheckCircle, Info, Calculator, Clock, BarChart, ArrowRight, ArrowLeft, X } from "lucide-react";

// Mock data for demonstration
const MOCK_PREDICTIONS = [
    { month: "2025-01", predicted: 1850 }, { month: "2025-02", predicted: 2200 },
    { month: "2025-03", predicted: 1920 }, { month: "2025-04", predicted: 1750 },
    { month: "2025-05", predicted: 2100 }, { month: "2025-06", predicted: 2400 },
];
const MOCK_METRICS = { mape: 12.5, rmse: 389, r2: 0.85 };

const MovingAverageModel: React.FC = () => {
  const { state, updateState } = useExperiment();
  const modelRun = state.model_runs.moving_average || { completed: false, params: { window: 3 }, metrics: null };

  const [windowSize, setWindowSize] = useState(modelRun.params.window);
  const [isCalculating, setIsCalculating] = useState(false);

  const handleCalculate = async () => {
    setIsCalculating(true);
    // Simulate calculation
    setTimeout(() => {
      const newModelRun = {
        completed: true,
        params: { window: windowSize },
        metrics: MOCK_METRICS,
      };
      updateState({
        model_runs: {
          ...state.model_runs,
          moving_average: newModelRun,
        }
      });
      setIsCalculating(false);
    }, 1500);
  };

  const renderConfigScreen = () => (
    <div className="space-y-8">
        <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">参数配置</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">选择合适的时间窗口大小，平衡预测的平滑性和敏感性。</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-lg mx-auto">
            <label className="block text-lg font-medium text-gray-700 mb-3">
                时间窗口大小: <span className="text-blue-600 font-bold">{windowSize}</span> 个月
            </label>
            <input
                type="range"
                min="2"
                max="12"
                value={windowSize}
                onChange={(e) => setWindowSize(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <p className="text-sm text-gray-500 mt-2">窗口越大，预测结果越平滑，但对最新变化的反应越慢。</p>
        </div>
        <div className="flex justify-center">
            <button
                onClick={handleCalculate}
                disabled={isCalculating}
                className="flex items-center space-x-2 px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all text-lg font-semibold disabled:bg-gray-400"
            >
                {isCalculating ? (
                    <>
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        <span>正在计算...</span>
                    </>
                ) : (
                    <>
                        <Play className="w-6 h-6" />
                        <span>运行移动平均模型</span>
                    </>
                )}
            </button>
        </div>
    </div>
  );

  const renderResultScreen = () => (
    <div className="space-y-6">
        <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">移动平均法 - 预测完成</h2>
            <p className="text-xl text-gray-600">模型已成功运行！</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <p className="text-green-800">
                已完成移动平均法预测 (窗口大小: {modelRun.params.window}个月)。结果已保存。
            </p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">未来6个月预测结果</h3>
                <div className="space-y-2">
                    {MOCK_PREDICTIONS.map((pred) => (
                        <div key={pred.month} className="flex justify-between p-2 bg-gray-50 rounded">
                            <span>{pred.month}</span>
                            <span className="font-semibold text-blue-600">{pred.predicted.toLocaleString()}件</span>
                        </div>
                    ))}
                </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">模型评估指标</h3>
                <div className="space-y-3">
                    <div className="flex justify-between items-baseline">
                        <span className="text-gray-600">MAPE</span>
                        <span className="text-2xl font-bold text-blue-600">{modelRun.metrics?.mape}%</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                        <span className="text-gray-600">RMSE</span>
                        <span className="text-2xl font-bold text-blue-600">{modelRun.metrics?.rmse}</span>
                    </div>
                    <div className="flex justify-between items-baseline">
                        <span className="text-gray-600">R²</span>
                        <span className="text-2xl font-bold text-blue-600">{modelRun.metrics?.r2}</span>
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

export default MovingAverageModel;