import React, { useState } from "react";
import { AppState } from "../../App";
import {
  BarChart3,
  Settings,
  Play,
  Layers,
  CheckCircle,
  Award,
  X,
  History,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

interface Props {
  appState: AppState;
  updateAppState: (updates: Partial<AppState>) => void;
  completeStep: (step: number) => void;
}

const WeightedEnsembleModel: React.FC<Props> = ({ completeStep }) => {
  const navigate = useNavigate();
  const [maWeight, setMaWeight] = useState(0.2);
  const [esWeight, setEsWeight] = useState(0.3);
  const [arimaWeight, setArimaWeight] = useState(0.3);
  const [lstmWeight, setLstmWeight] = useState(0.2);
  const [optimizationMethod, setOptimizationMethod] = useState("mse");
  const [isTraining, setIsTraining] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [hasHistory, setHasHistory] = useState(false);
  const [lastPrediction, setLastPrediction] = useState<any>(null);

  // 确保权重总和为1
  const normalizeWeights = () => {
    const total = maWeight + esWeight + arimaWeight + lstmWeight;
    if (total !== 1) {
      const factor = 1 / total;
      setMaWeight((prev) => prev * factor);
      setEsWeight((prev) => prev * factor);
      setArimaWeight((prev) => prev * factor);
      setLstmWeight((prev) => prev * factor);
    }
  };

  const handleTrainModel = async () => {
    normalizeWeights();
    setIsTraining(true);
    // 模拟训练过程
    setTimeout(() => {
      setIsTraining(false);
      setShowModal(true);
    }, 3000);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setHasHistory(true);
    setLastPrediction({
      timestamp: new Date().toLocaleString("zh-CN"),
      maWeight,
      esWeight,
      arimaWeight,
      lstmWeight,
      optimizationMethod,
      predictions,
      metrics: evaluationMetrics,
    });
    completeStep(5);
    completeStep(5);
  };

  const handleCompleteStep = () => {
    setShowModal(false);
    setHasHistory(true);
    setLastPrediction({
      timestamp: new Date().toLocaleString("zh-CN"),
      maWeight,
      esWeight,
      arimaWeight,
      lstmWeight,
      optimizationMethod,
      predictions,
      metrics: evaluationMetrics,
    });
    completeStep(5);
    // 跳转到结果评估页面
    navigate("/evaluation");
  };

  // 模拟加权融合预测结果
  const predictions = [
    {
      month: "2025-01",
      predicted: 1905,
      ma: 1850,
      es: 1890,
      arima: 1880,
      lstm: 1920,
    },
    {
      month: "2025-02",
      predicted: 2290,
      ma: 2200,
      es: 2250,
      arima: 2280,
      lstm: 2350,
    },
    {
      month: "2025-03",
      predicted: 1835,
      ma: 1920,
      es: 1840,
      arima: 1820,
      lstm: 1850,
    },
    {
      month: "2025-04",
      predicted: 1765,
      ma: 1750,
      es: 1770,
      arima: 1750,
      lstm: 1780,
    },
    {
      month: "2025-05",
      predicted: 2135,
      ma: 2100,
      es: 2120,
      arima: 2150,
      lstm: 2180,
    },
    {
      month: "2025-06",
      predicted: 2465,
      ma: 2400,
      es: 2420,
      arima: 2450,
      lstm: 2520,
    },
  ];

  // 模拟评估指标
  const evaluationMetrics = {
    mape: 7.8,
    rmse: 228,
    r2: 0.94,
  };

  return (
    <div className="h-full">
      {/* 预测结果弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <h2 className="text-xl font-semibold text-green-800">
                  加权平均融合模型训练完成
                </h2>
              </div>
              <button
                onClick={handleCloseModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                <p className="text-green-700">
                  融合模型训练完成！通过优化权重组合，成功整合了多个基础模型的预测能力，
                  显著提升了预测精度和稳定性。
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">
                    未来6个月预测结果
                  </h3>

                  <div className="space-y-3">
                    {predictions.map((pred, index) => (
                      <div key={index} className="p-3 bg-white rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{pred.month}</span>
                          <div className="text-indigo-600 font-semibold">
                            {pred.predicted.toLocaleString()}件
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-xs text-gray-500">
                          <div>MA: {pred.ma}</div>
                          <div>ES: {pred.es}</div>
                          <div>ARIMA: {pred.arima}</div>
                          <div>LSTM: {pred.lstm}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                    <Award className="w-5 h-5 mr-2 text-yellow-500" />
                    模型评估指标 (融合优化)
                  </h3>

                  <div className="space-y-4">
                    <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-indigo-800">
                          MAPE (平均绝对百分比误差)
                        </h4>
                        <Award className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div className="text-2xl font-bold text-indigo-600">
                        {evaluationMetrics.mape}%
                      </div>
                      <p className="text-sm text-indigo-700">
                        优秀！融合模型显著提升精度
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-white rounded-lg">
                        <div className="text-sm text-indigo-600">RMSE</div>
                        <div className="text-lg font-bold text-indigo-900">
                          {evaluationMetrics.rmse}
                        </div>
                      </div>
                      <div className="p-3 bg-white rounded-lg">
                        <div className="text-sm text-indigo-600">R²</div>
                        <div className="text-lg font-bold text-indigo-900">
                          {evaluationMetrics.r2}
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <div className="text-sm text-yellow-600">
                        最优权重组合
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                        <div>MA: {(maWeight * 100).toFixed(1)}%</div>
                        <div>ES: {(esWeight * 100).toFixed(1)}%</div>
                        <div>ARIMA: {(arimaWeight * 100).toFixed(1)}%</div>
                        <div>LSTM: {(lstmWeight * 100).toFixed(1)}%</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6">
                <h4 className="font-semibold text-indigo-800 mb-3">
                  加权融合模型优势分析
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-indigo-700">
                  <div>
                    <h5 className="font-medium mb-2">融合优势：</h5>
                    <ul className="list-disc list-inside space-y-1">
                      <li>结合多模型优点</li>
                      <li>降低单一模型风险</li>
                      <li>提高预测稳定性</li>
                      <li>自动权重优化</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium mb-2">应用价值：</h5>
                    <ul className="list-disc list-inside space-y-1">
                      <li>提升预测精度</li>
                      <li>增强模型鲁棒性</li>
                      <li>适应复杂场景</li>
                      <li>降低决策风险</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="flex justify-center space-x-4">
                <button
                  onClick={handleCloseModal}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              加权平均融合模型
            </h1>
            <p className="text-gray-600">Weighted Average Ensemble</p>
          </div>
        </div>

        <p className="text-lg text-gray-600">
          加权平均融合模型通过为不同基础模型分配最优权重，将多个预测结果进行加权组合，
          充分利用各模型的优势，显著提升预测精度和稳定性。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6 min-h-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              权重配置
            </h2>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    移动平均法权重: {(maWeight * 100).toFixed(1)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={maWeight}
                    onChange={(e) => setMaWeight(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    指数平滑法权重: {(esWeight * 100).toFixed(1)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={esWeight}
                    onChange={(e) => setEsWeight(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    ARIMA模型权重: {(arimaWeight * 100).toFixed(1)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={arimaWeight}
                    onChange={(e) => setArimaWeight(Number(e.target.value))}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    LSTM神经网络权重: {(lstmWeight * 100).toFixed(1)}%
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={lstmWeight}
                    onChange={(e) => setLstmWeight(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-sm text-gray-600 mb-2">
                  权重总和:{" "}
                  {(
                    (maWeight + esWeight + arimaWeight + lstmWeight) *
                    100
                  ).toFixed(1)}
                  %
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div className="flex h-3 rounded-full overflow-hidden">
                    <div
                      className="bg-blue-500"
                      style={{ width: `${maWeight * 100}%` }}
                    ></div>
                    <div
                      className="bg-orange-500"
                      style={{ width: `${esWeight * 100}%` }}
                    ></div>
                    <div
                      className="bg-green-500"
                      style={{ width: `${arimaWeight * 100}%` }}
                    ></div>
                    <div
                      className="bg-purple-500"
                      style={{ width: `${lstmWeight * 100}%` }}
                    ></div>
                  </div>
                </div>
                <div className="flex justify-between text-xs text-gray-500 mt-2">
                  <span>MA</span>
                  <span>ES</span>
                  <span>ARIMA</span>
                  <span>LSTM</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  权重优化方法
                </label>
                <select
                  value={optimizationMethod}
                  onChange={(e) => setOptimizationMethod(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="mse">最小均方误差 (MSE)</option>
                  <option value="mae">最小平均绝对误差 (MAE)</option>
                  <option value="mape">最小平均绝对百分比误差 (MAPE)</option>
                  <option value="equal">等权重平均</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Layers className="w-5 h-5 mr-2" />
              融合架构可视化
            </h3>

            <div className="bg-gray-50 rounded-lg p-6">
              <div className="grid grid-cols-4 gap-4 mb-6">
                {[
                  {
                    name: "MA",
                    color: "bg-blue-100 text-blue-600",
                    weight: maWeight,
                  },
                  {
                    name: "ES",
                    color: "bg-orange-100 text-orange-600",
                    weight: esWeight,
                  },
                  {
                    name: "ARIMA",
                    color: "bg-green-100 text-green-600",
                    weight: arimaWeight,
                  },
                  {
                    name: "LSTM",
                    color: "bg-purple-100 text-purple-600",
                    weight: lstmWeight,
                  },
                ].map((model, index) => (
                  <div key={index} className="text-center">
                    <div
                      className={`w-16 h-16 ${model.color} rounded-lg flex items-center justify-center mx-auto mb-2`}
                    >
                      <span className="text-sm font-bold">{model.name}</span>
                    </div>
                    <div className="text-xs text-gray-600">
                      {(model.weight * 100).toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-center mb-4">
                <div className="text-center">
                  <div className="w-20 h-20 bg-indigo-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                    <span className="text-sm font-bold text-indigo-600">
                      融合
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">加权平均</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6 min-h-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              模型训练
            </h3>

            <button
              onClick={handleTrainModel}
              disabled={isTraining}
              className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all ${
                isTraining
                  ? "bg-gray-400 text-white cursor-not-allowed"
                  : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg"
              }`}
            >
              <Play className="w-5 h-5" />
              <span>{isTraining ? "优化中..." : "开始权重优化"}</span>
            </button>

            {isTraining && (
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-full animate-pulse"
                    style={{ width: "80%" }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600 mt-2 text-center">
                  正在优化权重组合...
                </p>
              </div>
            )}
          </div>

          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-indigo-800 mb-3">
              融合原理
            </h3>
            <div className="space-y-3 text-sm text-indigo-700">
              <div>
                <h4 className="font-medium">数学公式：</h4>
                <p className="font-mono bg-white p-2 rounded mt-1 text-xs">
                  Y = w₁×Y₁ + w₂×Y₂ + w₃×Y₃ + w₄×Y₄
                </p>
              </div>
              <div>
                <h4 className="font-medium">权重约束：</h4>
                <ul className="list-disc list-inside space-y-1 mt-1">
                  <li>∑wᵢ = 1 (权重和为1)</li>
                  <li>wᵢ ≥ 0 (权重非负)</li>
                  <li>通过优化算法确定最优权重</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium">优势：</h4>
                <p className="text-green-700">✓ 降低方差，提高稳定性</p>
                <p className="text-green-700">✓ 结合多模型优点</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 历史预测记录 */}
      {hasHistory && lastPrediction && (
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <History className="w-5 h-5 text-gray-600" />
            <h3 className="text-lg font-semibold text-gray-900">
              最近预测记录
            </h3>
            <span className="text-sm text-gray-500">
              ({lastPrediction.timestamp})
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">权重配置</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">移动平均法:</span>
                  <span className="font-medium">
                    {(lastPrediction.maWeight * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">指数平滑法:</span>
                  <span className="font-medium">
                    {(lastPrediction.esWeight * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">ARIMA模型:</span>
                  <span className="font-medium">
                    {(lastPrediction.arimaWeight * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">LSTM神经网络:</span>
                  <span className="font-medium">
                    {(lastPrediction.lstmWeight * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">优化方法:</span>
                  <span className="font-medium">
                    {lastPrediction.optimizationMethod.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">评估指标</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center p-2 bg-indigo-50 rounded">
                  <div className="font-bold text-indigo-600">
                    {lastPrediction.metrics.mape}%
                  </div>
                  <div className="text-gray-600">MAPE</div>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded">
                  <div className="font-bold text-gray-900">
                    {lastPrediction.metrics.rmse}
                  </div>
                  <div className="text-gray-600">RMSE</div>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded">
                  <div className="font-bold text-gray-900">
                    {lastPrediction.metrics.r2}
                  </div>
                  <div className="text-gray-600">R²</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeightedEnsembleModel;
