import React, { useState } from "react";
import type { AppState } from "../../App";
import {
  Brain,
  Settings,
  Play,
  Zap,
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

const BoostingEnsembleModel: React.FC<Props> = ({ completeStep }) => {
  const navigate = useNavigate();
  const [nEstimators, setNEstimators] = useState(100);
  const [learningRate, setLearningRate] = useState(0.1);
  const [maxDepth, setMaxDepth] = useState(3);
  const [boostingType, setBoostingType] = useState("gradient");
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [hasHistory, setHasHistory] = useState(false);
  const [lastPrediction, setLastPrediction] = useState<any>(null);

  const handleTrainModel = async () => {
    setIsTraining(true);
    setTrainingProgress(0);

    // 模拟训练过程
    const interval = setInterval(() => {
      setTrainingProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsTraining(false);
          setShowModal(true);
          return 100;
        }
        return prev + 1.5;
      });
    }, 80);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setHasHistory(true);
    setLastPrediction({
      timestamp: new Date().toLocaleString("zh-CN"),
      nEstimators,
      learningRate,
      maxDepth,
      boostingType,
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
      nEstimators,
      learningRate,
      maxDepth,
      boostingType,
      predictions,
      metrics: evaluationMetrics,
    });
    completeStep(5);
    // 跳转到结果评估页面
    navigate("/evaluation");
  };

  // 模拟Boosting预测结果
  const predictions = [
    {
      month: "2025-01",
      predicted: 1915,
      confidence: 0.95,
      contribution: [0.3, 0.25, 0.25, 0.2],
    },
    {
      month: "2025-02",
      predicted: 2320,
      confidence: 0.93,
      contribution: [0.2, 0.3, 0.3, 0.2],
    },
    {
      month: "2025-03",
      predicted: 1845,
      confidence: 0.94,
      contribution: [0.25, 0.25, 0.3, 0.2],
    },
    {
      month: "2025-04",
      predicted: 1775,
      confidence: 0.92,
      contribution: [0.35, 0.2, 0.25, 0.2],
    },
    {
      month: "2025-05",
      predicted: 2165,
      confidence: 0.94,
      contribution: [0.2, 0.3, 0.25, 0.25],
    },
    {
      month: "2025-06",
      predicted: 2485,
      confidence: 0.91,
      contribution: [0.15, 0.25, 0.35, 0.25],
    },
  ];

  // 模拟评估指标
  const evaluationMetrics = {
    mape: 6.9,
    rmse: 198,
    r2: 0.96,
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
                  Boosting融合模型训练完成
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
                  Boosting融合模型训练完成！通过{nEstimators}
                  个弱学习器的序列化训练，
                  每个后续模型都专注于修正前面模型的预测误差，实现了卓越的预测性能。
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">
                    未来6个月预测结果
                  </h3>

                  <div className="space-y-3">
                    {predictions.map((pred, index) => {
                      const [modelTrend = 0, seasonalTrend = 0, promotionImpact = 0, otherFactors = 0] = pred.contribution ?? [];
                      return (
                        <div key={index} className="p-3 bg-white rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{pred.month}</span>
                          <div className="flex items-center space-x-2">
                            <div className="text-red-600 font-semibold">
                              {pred.predicted.toLocaleString()}件
                            </div>
                            <div className="text-xs text-gray-500">
                              置信度: {(pred.confidence * 100).toFixed(0)}%
                            </div>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="flex h-2 rounded-full overflow-hidden">
                            <div
                              className="bg-blue-500"
                              style={{
                                width: `${modelTrend * 100}%`,
                              }}
                            ></div>
                            <div
                              className="bg-orange-500"
                              style={{
                                width: `${seasonalTrend * 100}%`,
                              }}
                            ></div>
                            <div
                              className="bg-green-500"
                              style={{
                                width: `${promotionImpact * 100}%`,
                              }}
                            ></div>
                            <div
                              className="bg-purple-500"
                              style={{
                                width: `${otherFactors * 100}%`,
                              }}
                            ></div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          模型贡献度分布
                        </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                    <Award className="w-5 h-5 mr-2 text-yellow-500" />
                    模型评估指标 (顶级性能)
                  </h3>

                  <div className="space-y-4">
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-red-800">
                          MAPE (平均绝对百分比误差)
                        </h4>
                        <Award className="w-5 h-5 text-red-600" />
                      </div>
                      <div className="text-2xl font-bold text-red-600">
                        {evaluationMetrics.mape}%
                      </div>
                      <p className="text-sm text-red-700">
                        卓越！Boosting显著提升预测精度
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-white rounded-lg">
                        <div className="text-sm text-red-600">RMSE</div>
                        <div className="text-lg font-bold text-red-900">
                          {evaluationMetrics.rmse}
                        </div>
                      </div>
                      <div className="p-3 bg-white rounded-lg">
                        <div className="text-sm text-red-600">R²</div>
                        <div className="text-lg font-bold text-red-900">
                          {evaluationMetrics.r2}
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <div className="text-sm text-yellow-600">训练配置</div>
                      <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                        <div>学习器数量: {nEstimators}</div>
                        <div>学习率: {learningRate}</div>
                        <div>最大深度: {maxDepth}</div>
                        <div>
                          类型:{" "}
                          {boostingType === "gradient"
                            ? "梯度提升"
                            : "AdaBoost"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                <h4 className="font-semibold text-red-800 mb-3">
                  Boosting融合模型优势分析
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-red-700">
                  <div>
                    <h5 className="font-medium mb-2">核心优势：</h5>
                    <ul className="list-disc list-inside space-y-1">
                      <li>序列化错误修正</li>
                      <li>自适应权重调整</li>
                      <li>强大的拟合能力</li>
                      <li>处理复杂模式</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium mb-2">学习机制：</h5>
                    <ul className="list-disc list-inside space-y-1">
                      <li>专注于困难样本</li>
                      <li>逐步提升性能</li>
                      <li>减少偏差和方差</li>
                      <li>集成多个弱学习器</li>
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
          <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
            <Brain className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Boosting融合模型
            </h1>
            <p className="text-gray-600">Gradient Boosting Ensemble</p>
          </div>
        </div>

        <p className="text-lg text-gray-600">
          Boosting是一种序列化集成学习方法，通过训练多个弱学习器，
          每个后续模型都专注于修正前面模型的预测误差，实现强大的预测性能。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6 min-h-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Boosting参数配置
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Boosting类型
                </label>
                <div className="space-y-2">
                  {[
                    {
                      id: "gradient",
                      name: "梯度提升 (Gradient Boosting)",
                      desc: "基于梯度下降的boosting方法",
                    },
                    {
                      id: "adaboost",
                      name: "AdaBoost",
                      desc: "自适应提升算法",
                    },
                  ].map((type) => (
                    <label
                      key={type.id}
                      className="flex items-start space-x-3 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="boostingType"
                        value={type.id}
                        checked={boostingType === type.id}
                        onChange={(e) => setBoostingType(e.target.value)}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-medium text-gray-900">
                          {type.name}
                        </div>
                        <div className="text-sm text-gray-600">{type.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    弱学习器数量: {nEstimators}
                  </label>
                  <input
                    type="range"
                    min="50"
                    max="200"
                    step="10"
                    value={nEstimators}
                    onChange={(e) => setNEstimators(Number(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    更多学习器通常提升性能，但增加计算成本
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    学习率: {learningRate}
                  </label>
                  <input
                    type="range"
                    min="0.01"
                    max="0.3"
                    step="0.01"
                    value={learningRate}
                    onChange={(e) => setLearningRate(Number(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    控制每个学习器的贡献程度
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    最大深度: {maxDepth}
                  </label>
                  <input
                    type="range"
                    min="2"
                    max="8"
                    step="1"
                    value={maxDepth}
                    onChange={(e) => setMaxDepth(Number(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    限制每个弱学习器的复杂度
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Zap className="w-5 h-5 mr-2" />
              Boosting训练过程可视化
            </h3>

            <div className="bg-gray-50 rounded-lg p-6">
              <div className="space-y-4">
                <div className="text-sm text-gray-600 mb-4">序列化训练过程</div>

                {[1, 2, 3, 4].map((step) => (
                  <div key={step} className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                      <span className="text-sm font-bold text-red-600">
                        M{step}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        弱学习器 {step}
                      </div>
                      <div className="text-xs text-gray-600">
                        {step === 1
                          ? "基础预测"
                          : `修正前${step - 1}个模型的误差`}
                      </div>
                    </div>
                    {step < 4 && (
                      <div className="text-red-500">
                        <Zap className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                ))}

                <div className="mt-6 pt-4 border-t border-gray-200">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <span className="text-sm font-bold text-green-600">
                        Final
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        最终预测
                      </div>
                      <div className="text-xs text-gray-600">
                        所有弱学习器的加权组合
                      </div>
                    </div>
                  </div>
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
                  : "bg-red-600 text-white hover:bg-red-700 shadow-md hover:shadow-lg"
              }`}
            >
              <Play className="w-5 h-5" />
              <span>{isTraining ? "训练中..." : "开始Boosting训练"}</span>
            </button>

            {isTraining && (
              <div className="mt-4 space-y-3">
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-red-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${trainingProgress}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>
                    学习器 {Math.floor((trainingProgress * nEstimators) / 100)}/
                    {nEstimators}
                  </span>
                  <span>{trainingProgress.toFixed(0)}%</span>
                </div>
                <p className="text-sm text-gray-600 text-center">
                  正在序列化训练弱学习器...
                </p>
              </div>
            )}
          </div>

          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-red-800 mb-3">
              Boosting原理
            </h3>
            <div className="space-y-3 text-sm text-red-700">
              <div>
                <h4 className="font-medium">核心思想：</h4>
                <p className="text-red-600 mt-1">
                  将多个弱学习器组合成强学习器
                </p>
              </div>
              <div>
                <h4 className="font-medium">训练过程：</h4>
                <ul className="list-disc list-inside space-y-1 mt-1">
                  <li>训练第一个弱学习器</li>
                  <li>计算预测误差</li>
                  <li>调整样本权重</li>
                  <li>训练下一个学习器</li>
                  <li>重复直到达到目标</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium">优势：</h4>
                <p className="text-green-700">✓ 逐步减少偏差</p>
                <p className="text-green-700">✓ 强大的学习能力</p>
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
              <h4 className="font-medium text-gray-900 mb-3">模型配置</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Boosting类型:</span>
                  <span className="font-medium">
                    {lastPrediction.boostingType === "gradient"
                      ? "梯度提升"
                      : "AdaBoost"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">弱学习器数量:</span>
                  <span className="font-medium">
                    {lastPrediction.nEstimators}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">学习率:</span>
                  <span className="font-medium">
                    {lastPrediction.learningRate}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">最大深度:</span>
                  <span className="font-medium">{lastPrediction.maxDepth}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">评估指标</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center p-2 bg-red-50 rounded">
                  <div className="font-bold text-red-600">
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

export default BoostingEnsembleModel;
