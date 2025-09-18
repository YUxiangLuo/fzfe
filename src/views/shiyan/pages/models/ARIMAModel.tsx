import React, { useState, useEffect } from "react";
import { useExperiment } from "../../contexts/ExperimentContext";
import { TrendingUp, Play, CheckCircle } from "lucide-react";

// Mock data for demonstration
const MOCK_METRICS = { mape: 10.1, rmse: 312, r2: 0.88 };

const ARIMAModel: React.FC = () => {
  const { state, updateState } = useExperiment();
  const modelRun = state.model_runs.arima || { completed: false, params: {}, metrics: null };

  const [p, setP] = useState(modelRun.params.p || 5);
  const [d, setD] = useState(modelRun.params.d || 1);
  const [q, setQ] = useState(modelRun.params.q || 0);
  const [isTraining, setIsTraining] = useState(false);
  const [showResult, setShowResult] = useState(modelRun.completed);

  useEffect(() => {
    setShowResult(state.model_runs.arima?.completed || false);
    setP(state.model_runs.arima?.params.p || 5);
    setD(state.model_runs.arima?.params.d || 1);
    setQ(state.model_runs.arima?.params.q || 0);
  }, [state.model_runs.arima]);

  const handleTrainModel = () => {
    setIsTraining(true);
    setTimeout(() => {
      const newModelRun = {
        completed: true,
        params: { p, d, q },
        metrics: MOCK_METRICS,
      };
      updateState({
        model_runs: {
          ...state.model_runs,
          arima: newModelRun,
        }
      });
      setIsTraining(false);
    }, 1500);
  };

  const renderConfigScreen = () => (
    <div className="space-y-8">
        <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">ARIMA 模型</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">配置ARIMA(p, d, q)模型的参数以进行时间序列预测。</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-2xl mx-auto space-y-6">
            <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">自回归阶数 (p): <span className="text-blue-600 font-bold">{p}</span></label>
                <input type="range" min="0" max="10" value={p} onChange={(e) => setP(Number(e.target.value))} className="w-full" />
            </div>
            <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">差分阶数 (d): <span className="text-blue-600 font-bold">{d}</span></label>
                <input type="range" min="0" max="2" value={d} onChange={(e) => setD(Number(e.target.value))} className="w-full" />
            </div>
            <div>
                <label className="block text-lg font-medium text-gray-700 mb-2">移动平均阶数 (q): <span className="text-blue-600 font-bold">{q}</span></label>
                <input type="range" min="0" max="5" value={q} onChange={(e) => setQ(Number(e.target.value))} className="w-full" />
            </div>
        </div>
        <div className="flex justify-center">
            <button
                onClick={handleTrainModel}
                disabled={isTraining}
                className="flex items-center space-x-2 px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-lg transition-all text-lg font-semibold disabled:bg-gray-400"
            >
                {isTraining ? "正在训练..." : <><Play className="w-6 h-6" /><span>运行ARIMA模型</span></>}
            </button>
        </div>
    </div>
  );

  const renderResultScreen = () => (
    <div className="space-y-6 text-center">
        <h2 className="text-3xl font-bold text-gray-900">ARIMA - 预测完成</h2>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-green-800">已完成ARIMA({modelRun.params.p}, {modelRun.params.d}, {modelRun.params.q})模型训练。</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 max-w-md mx-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">模型评估指标</h3>
            <div className="space-y-3">
                <div className="flex justify-between items-baseline"><span className="text-gray-600">MAPE</span><span className="text-2xl font-bold text-blue-600">{modelRun.metrics?.mape}%</span></div>
                <div className="flex justify-between items-baseline"><span className="text-gray-600">RMSE</span><span className="text-2xl font-bold text-blue-600">{modelRun.metrics?.rmse}</span></div>
                <div className="flex justify-between items-baseline"><span className="text-gray-600">R²</span><span className="text-2xl font-bold text-blue-600">{modelRun.metrics?.r2}</span></div>
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

export default ARIMAModel;