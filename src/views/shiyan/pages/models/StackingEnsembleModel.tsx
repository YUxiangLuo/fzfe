import React, { useState } from "react";
import type { AppState } from "../../App";
import {
  Brain,
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

const StackingEnsembleModel: React.FC<Props> = ({ completeStep }) => {
  const navigate = useNavigate();
  const [metaLearner, setMetaLearner] = useState("linear");
  const [cvFolds, setCvFolds] = useState(5);
  const [useFeatureEngineering, setUseFeatureEngineering] = useState(true);
  const [stackingLayers, setStackingLayers] = useState(2);
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
        return prev + 1.2;
      });
    }, 100);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setHasHistory(true);
    setLastPrediction({
      timestamp: new Date().toLocaleString("zh-CN"),
      metaLearner,
      cvFolds,
      useFeatureEngineering,
      stackingLayers,
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
      metaLearner,
      cvFolds,
      useFeatureEngineering,
      stackingLayers,
      predictions,
      metrics: evaluationMetrics,
    });
    completeStep(5);
    // 跳转到结果评估页面
    navigate("/evaluation");
  };

  // 模拟Stacking预测结果
  const predictions = [
    {
      month: "2025-01",
      predicted: 1925,
      confidence: 0.97,
      baseModels: { ma: 1850, es: 1890, arima: 1880, lstm: 1920 },
      metaPrediction: 1925,
    },
    {
      month: "2025-02",
      predicted: 2335,
      confidence: 0.96,
      baseModels: { ma: 2200, es: 2250, arima: 2280, lstm: 2350 },
      metaPrediction: 2335,
    },
    {
      month: "2025-03",
      predicted: 1855,
      confidence: 0.95,
      baseModels: { ma: 1920, es: 1840, arima: 1820, lstm: 1850 },
      metaPrediction: 1855,
    },
    {
      month: "2025-04",
      predicted: 1785,
      confidence: 0.94,
      baseModels: { ma: 1750, es: 1770, arima: 1750, lstm: 1780 },
      metaPrediction: 1785,
    },
    {
      month: "2025-05",
      predicted: 2175,
      confidence: 0.96,
      baseModels: { ma: 2100, es: 2120, arima: 2150, lstm: 2180 },
      metaPrediction: 2175,
    },
    {
      month: "2025-06",
      predicted: 2505,
      confidence: 0.93,
      baseModels: { ma: 2400, es: 2420, arima: 2450, lstm: 2520 },
      metaPrediction: 2505,
    },
  ];

  // 模拟评估指标
  const evaluationMetrics = {
    mape: 6.2,
    rmse: 175,
    r2: 0.97,
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
                  Stacking融合模型训练完成
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
                  Stacking融合模型训练完成！通过{cvFolds}
                  折交叉验证训练元学习器，
                  成功学习了如何最优地组合基础模型的预测结果，达到了最佳的预测性能。
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
                          <div className="flex items-center space-x-2">
                            <div className="text-teal-600 font-semibold">
                              {pred.predicted.toLocaleString()}件
                            </div>
                            <div className="text-xs text-gray-500">
                              置信度: {(pred.confidence * 100).toFixed(0)}%
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-2 text-xs text-gray-500 mb-2">
                          <div>MA: {pred.baseModels.ma}</div>
                          <div>ES: {pred.baseModels.es}</div>
                          <div>ARIMA: {pred.baseModels.arima}</div>
                          <div>LSTM: {pred.baseModels.lstm}</div>
                        </div>
                        <div className="text-xs text-teal-600 font-medium">
                          元学习器输出: {pred.metaPrediction}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                    <Award className="w-5 h-5 mr-2 text-yellow-500" />
                    模型评估指标 (最优性能)
                  </h3>

                  <div className="space-y-4">
                    <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-teal-800">
                          MAPE (平均绝对百分比误差)
                        </h4>
                        <Award className="w-5 h-5 text-teal-600" />
                      </div>
                      <div className="text-2xl font-bold text-teal-600">
                        {evaluationMetrics.mape}%
                      </div>
                      <p className="text-sm text-teal-700">
                        完美！Stacking达到最优预测精度
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-white rounded-lg">
                        <div className="text-sm text-teal-600">RMSE</div>
                        <div className="text-lg font-bold text-teal-900">
                          {evaluationMetrics.rmse}
                        </div>
                      </div>
                      <div className="p-3 bg-white rounded-lg">
                        <div className="text-sm text-teal-600">R²</div>
                        <div className="text-lg font-bold text-teal-900">
                          {evaluationMetrics.r2}
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <div className="text-sm text-yellow-600">
                        Stacking配置
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                        <div>
                          元学习器:{" "}
                          {metaLearner === "linear"
                            ? "线性回归"
                            : metaLearner === "rf"
                              ? "随机森林"
                              : "XGBoost"}
                        </div>
                        <div>交叉验证: {cvFolds}折</div>
                        <div>
                          特征工程: {useFeatureEngineering ? "启用" : "禁用"}
                        </div>
                        <div>堆叠层数: {stackingLayers}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-teal-50 border border-teal-200 rounded-xl p-6">
                <h4 className="font-semibold text-teal-800 mb-3">
                  Stacking融合模型优势分析
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-teal-700">
                  <div>
                    <h5 className="font-medium mb-2">核心优势：</h5>
                    <ul className="list-disc list-inside space-y-1">
                      <li>元学习器智能组合</li>
                      <li>避免信息泄露</li>
                      <li>最大化模型多样性</li>
                      <li>达到理论最优性能</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium mb-2">技术特点：</h5>
                    <ul className="list-disc list-inside space-y-1">
                      <li>两层学习架构</li>
                      <li>交叉验证防过拟合</li>
                      <li>自动特征选择</li>
                      <li>非线性组合能力</li>
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
          <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center">
            <Brain className="w-6 h-6 text-teal-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Stacking融合模型
            </h1>
            <p className="text-gray-600">Stacking Ensemble with Meta-learner</p>
          </div>
        </div>

        <p className="text-lg text-gray-600">
          Stacking是最先进的集成学习方法，通过训练元学习器来学习如何最优地组合基础模型的预测结果，
          能够发现模型间的复杂关系，实现理论上的最佳预测性能。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6 min-h-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Stacking配置
            </h2>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  元学习器类型
                </label>
                <div className="space-y-2">
                  {[
                    {
                      id: "linear",
                      name: "线性回归",
                      desc: "简单快速，适合线性组合",
                    },
                    {
                      id: "rf",
                      name: "随机森林",
                      desc: "处理非线性关系，鲁棒性强",
                    },
                    {
                      id: "xgb",
                      name: "XGBoost",
                      desc: "强大的梯度提升，性能最优",
                    },
                  ].map((type) => (
                    <label
                      key={type.id}
                      className="flex items-start space-x-3 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="metaLearner"
                        value={type.id}
                        checked={metaLearner === type.id}
                        onChange={(e) => setMetaLearner(e.target.value)}
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    交叉验证折数: {cvFolds}
                  </label>
                  <input
                    type="range"
                    min="3"
                    max="10"
                    step="1"
                    value={cvFolds}
                    onChange={(e) => setCvFolds(Number(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    用于训练元学习器，防止过拟合
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    堆叠层数: {stackingLayers}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="1"
                    value={stackingLayers}
                    onChange={(e) => setStackingLayers(Number(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    多层堆叠可以学习更复杂的组合
                  </p>
                </div>
              </div>

              <div>
                <label className="flex items-center space-x-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useFeatureEngineering}
                    onChange={(e) => setUseFeatureEngineering(e.target.checked)}
                    className="rounded"
                  />
                  <div>
                    <div className="font-medium text-gray-900">
                      启用特征工程
                    </div>
                    <div className="text-sm text-gray-600">
                      为元学习器生成额外的特征
                    </div>
                  </div>
                </label>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Layers className="w-5 h-5 mr-2" />
              Stacking架构可视化
            </h3>

            <div className="bg-gray-50 rounded-lg p-6">
              <div className="space-y-6">
                {/* 第一层：基础模型 */}
                <div>
                  <div className="text-sm text-gray-600 mb-3">
                    第一层：基础模型
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    {[
                      { name: "MA", color: "bg-blue-100 text-blue-600" },
                      { name: "ES", color: "bg-orange-100 text-orange-600" },
                      { name: "ARIMA", color: "bg-green-100 text-green-600" },
                      { name: "LSTM", color: "bg-purple-100 text-purple-600" },
                    ].map((model, index) => (
                      <div key={index} className="text-center">
                        <div
                          className={`w-16 h-16 ${model.color} rounded-lg flex items-center justify-center mx-auto mb-2`}
                        >
                          <span className="text-sm font-bold">
                            {model.name}
                          </span>
                        </div>
                        <div className="text-xs text-gray-600">基础预测</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 箭头 */}
                <div className="flex justify-center">
                  <div className="text-gray-400">
                    <svg
                      className="w-8 h-8"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>

                {/* 第二层：元学习器 */}
                <div>
                  <div className="text-sm text-gray-600 mb-3">
                    第二层：元学习器
                  </div>
                  <div className="flex justify-center">
                    <div className="text-center">
                      <div className="w-20 h-20 bg-teal-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                        <span className="text-sm font-bold text-teal-600">
                          Meta
                        </span>
                      </div>
                      <div className="text-xs text-gray-600">
                        {metaLearner === "linear"
                          ? "线性回归"
                          : metaLearner === "rf"
                            ? "随机森林"
                            : "XGBoost"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* 箭头 */}
                <div className="flex justify-center">
                  <div className="text-gray-400">
                    <svg
                      className="w-8 h-8"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </div>
                </div>

                {/* 最终输出 */}
                <div>
                  <div className="text-sm text-gray-600 mb-3">最终输出</div>
                  <div className="flex justify-center">
                    <div className="text-center">
                      <div className="w-20 h-20 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-2">
                        <span className="text-sm font-bold text-green-600">
                          Final
                        </span>
                      </div>
                      <div className="text-xs text-gray-600">最优预测</div>
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
                  : "bg-teal-600 text-white hover:bg-teal-700 shadow-md hover:shadow-lg"
              }`}
            >
              <Play className="w-5 h-5" />
              <span>{isTraining ? "训练中..." : "开始Stacking训练"}</span>
            </button>

            {isTraining && (
              <div className="mt-4 space-y-3">
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-teal-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${trainingProgress}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>
                    {trainingProgress < 50
                      ? "训练基础模型"
                      : trainingProgress < 80
                        ? "交叉验证"
                        : "训练元学习器"}
                  </span>
                  <span>{trainingProgress.toFixed(0)}%</span>
                </div>
                <p className="text-sm text-gray-600 text-center">
                  正在构建两层学习架构...
                </p>
              </div>
            )}
          </div>

          <div className="bg-teal-50 border border-teal-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-teal-800 mb-3">
              Stacking原理
            </h3>
            <div className="space-y-3 text-sm text-teal-700">
              <div>
                <h4 className="font-medium">两层架构：</h4>
                <ul className="list-disc list-inside space-y-1 mt-1">
                  <li>第一层：基础模型生成预测</li>
                  <li>第二层：元学习器学习组合</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium">关键技术：</h4>
                <ul className="list-disc list-inside space-y-1 mt-1">
                  <li>交叉验证防止过拟合</li>
                  <li>特征工程增强表达</li>
                  <li>非线性组合能力</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium">优势：</h4>
                <p className="text-green-700">✓ 理论最优性能</p>
                <p className="text-green-700">✓ 自动学习最佳组合</p>
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
                  <span className="text-gray-600">元学习器:</span>
                  <span className="font-medium">
                    {lastPrediction.metaLearner === "linear"
                      ? "线性回归"
                      : lastPrediction.metaLearner === "rf"
                        ? "随机森林"
                        : "XGBoost"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">交叉验证:</span>
                  <span className="font-medium">
                    {lastPrediction.cvFolds}折
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">特征工程:</span>
                  <span className="font-medium">
                    {lastPrediction.useFeatureEngineering ? "启用" : "禁用"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">堆叠层数:</span>
                  <span className="font-medium">
                    {lastPrediction.stackingLayers}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">评估指标</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center p-2 bg-teal-50 rounded">
                  <div className="font-bold text-teal-600">
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

export default StackingEnsembleModel;
