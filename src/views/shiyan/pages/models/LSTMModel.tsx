import React, { useState } from "react";
import type { AppState } from "../../App";
import {
  Brain,
  Settings,
  Play,
  Database,
  CheckCircle,
  Target,
  X,
  History,
  ArrowRight,
  ArrowLeft,
  Info,
  BarChart,
  Layers,
  Zap,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

interface Props {
  appState: AppState;
  updateAppState: (updates: Partial<AppState>) => void;
  completeStep: (step: number) => void;
}

const LSTMModel: React.FC<Props> = ({ completeStep }) => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [normalizationMethod, setNormalizationMethod] = useState("minmax");
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([
    "sales_quantity",
  ]);
  const [hiddenUnits, setHiddenUnits] = useState(50);
  const [timeSteps, setTimeSteps] = useState(12);
  const [epochs, setEpochs] = useState(100);
  const [learningRate, setLearningRate] = useState(0.001);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [hasHistory, setHasHistory] = useState(false);
  const [lastPrediction, setLastPrediction] = useState<any>(null);

  const steps = [
    { id: 1, title: "方法介绍", icon: Info },
    { id: 2, title: "数据预处理", icon: Database },
    { id: 3, title: "构建LSTM模型", icon: Layers },
    { id: 4, title: "计算结果", icon: Zap },
  ];

  const availableFeatures = [
    {
      id: "sales_quantity",
      name: "销售数量",
      description: "历史销售数量数据",
      required: true,
    },
    {
      id: "sales_amount",
      name: "销售金额",
      description: "历史销售金额数据",
      required: false,
    },
    {
      id: "price",
      name: "价格",
      description: "产品价格变化数据",
      required: false,
    },
    {
      id: "date_features",
      name: "日期特征",
      description: "月份、季度等时间特征",
      required: false,
    },
    {
      id: "promotion",
      name: "促销活动",
      description: "促销活动标识",
      required: false,
    },
    {
      id: "inventory",
      name: "库存水平",
      description: "库存数量数据",
      required: false,
    },
  ];

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else if (currentStep === 4) {
      handleTrainModel();
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleFeatureToggle = (featureId: string) => {
    const feature = availableFeatures.find((f) => f.id === featureId);
    if (feature?.required) return; // 不能取消必需特征

    setSelectedFeatures((prev) =>
      prev.includes(featureId)
        ? prev.filter((id) => id !== featureId)
        : [...prev, featureId],
    );
  };

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
        return prev + 2;
      });
    }, 100);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setHasHistory(true);
    setLastPrediction({
      timestamp: new Date().toLocaleString("zh-CN"),
      normalizationMethod,
      selectedFeatures,
      hiddenUnits,
      timeSteps,
      epochs,
      learningRate,
      predictions,
      metrics: evaluationMetrics,
    });
    completeStep(5);
  };

  const handleCompleteStep = () => {
    setShowModal(false);
    setHasHistory(true);
    setLastPrediction({
      timestamp: new Date().toLocaleString("zh-CN"),
      normalizationMethod,
      selectedFeatures,
      hiddenUnits,
      timeSteps,
      epochs,
      learningRate,
      predictions,
      metrics: evaluationMetrics,
    });
    completeStep(5);
    navigate("/evaluation");
  };

  // 模拟LSTM预测结果
  const predictions = [
    { month: "2025-01", predicted: 1920, confidence: 0.92 },
    { month: "2025-02", predicted: 2350, confidence: 0.89 },
    { month: "2025-03", predicted: 1850, confidence: 0.91 },
    { month: "2025-04", predicted: 1780, confidence: 0.88 },
    { month: "2025-05", predicted: 2180, confidence: 0.9 },
    { month: "2025-06", predicted: 2520, confidence: 0.87 },
  ];

  // 模拟评估指标
  const evaluationMetrics = {
    mape: 8.2,
    rmse: 245,
    r2: 0.92,
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Brain className="w-10 h-10 text-purple-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                LSTM神经网络
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                长短期记忆网络，一种特殊的循环神经网络，能够学习长期依赖关系，特别适合时间序列预测
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <Brain className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-purple-900 mb-3">
                  记忆机制
                </h3>
                <p className="text-purple-700">
                  通过门控机制控制信息流， 能够选择性地记住重要信息，
                  忘记无关信息
                </p>
              </div>

              <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <Target className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-blue-900 mb-3">
                  长期依赖
                </h3>
                <p className="text-blue-700">
                  解决传统RNN的梯度消失问题， 能够捕捉长期的时间依赖关系，
                  适合复杂模式识别
                </p>
              </div>

              <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-green-900 mb-3">
                  高精度预测
                </h3>
                <p className="text-green-700">
                  在时间序列预测任务中 通常能达到最高的预测精度，
                  特别适合非线性模式
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                LSTM网络结构
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg p-4">
                  <h4 className="font-medium text-gray-800 mb-3">🚪 遗忘门</h4>
                  <ul className="space-y-2 text-gray-600 text-sm">
                    <li>• 决定从细胞状态中丢弃什么信息</li>
                    <li>• 输出0到1之间的数值</li>
                    <li>• 1表示完全保留，0表示完全丢弃</li>
                  </ul>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <h4 className="font-medium text-gray-800 mb-3">📥 输入门</h4>
                  <ul className="space-y-2 text-gray-600 text-sm">
                    <li>• 决定什么新信息被存储在细胞状态中</li>
                    <li>• 包含sigmoid层和tanh层</li>
                    <li>• 选择更新的值和候选值</li>
                  </ul>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <h4 className="font-medium text-gray-800 mb-3">📤 输出门</h4>
                  <ul className="space-y-2 text-gray-600 text-sm">
                    <li>• 决定输出什么值</li>
                    <li>• 基于细胞状态的过滤版本</li>
                    <li>• 通过sigmoid和tanh激活</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
              <h4 className="font-semibold text-purple-800 mb-3">
                🎯 LSTM优势与应用
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-purple-700">
                <div>
                  <h5 className="font-medium mb-2">核心优势：</h5>
                  <ul className="list-disc list-inside space-y-1">
                    <li>解决梯度消失问题</li>
                    <li>学习长期依赖关系</li>
                    <li>处理变长序列</li>
                    <li>自动特征提取</li>
                  </ul>
                </div>
                <div>
                  <h5 className="font-medium mb-2">典型应用：</h5>
                  <ul className="list-disc list-inside space-y-1">
                    <li>时间序列预测</li>
                    <li>自然语言处理</li>
                    <li>语音识别</li>
                    <li>股价预测</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Database className="w-10 h-10 text-blue-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                数据预处理
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                选择合适的数据标准化方法，为LSTM模型训练准备高质量的输入数据
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">
                  标准化方法选择
                </h3>

                <div className="space-y-4">
                  {[
                    {
                      id: "minmax",
                      name: "最小-最大归一化",
                      formula: "X_norm = (X - X_min) / (X_max - X_min)",
                      description: "将数据缩放到[0,1]区间",
                      pros: [
                        "保持数据分布形状",
                        "适合有明确边界的数据",
                        "计算简单快速",
                      ],
                      cons: ["对异常值敏感", "新数据可能超出范围"],
                    },
                    {
                      id: "zscore",
                      name: "Z-score标准化",
                      formula: "X_norm = (X - μ) / σ",
                      description: "将数据转换为均值0，标准差1的分布",
                      pros: [
                        "对异常值相对鲁棒",
                        "适合正态分布数据",
                        "无固定范围限制",
                      ],
                      cons: ["改变数据分布形状", "需要假设数据分布"],
                    },
                  ].map((method) => (
                    <div
                      key={method.id}
                      onClick={() => setNormalizationMethod(method.id)}
                      className={`p-6 rounded-lg border-2 cursor-pointer transition-all ${
                        normalizationMethod === method.id
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-lg font-semibold text-gray-900">
                          {method.name}
                        </h4>
                        {normalizationMethod === method.id && (
                          <CheckCircle className="w-5 h-5 text-blue-600" />
                        )}
                      </div>

                      <div className="bg-gray-50 rounded p-3 mb-3">
                        <div className="text-sm text-gray-600 mb-1">公式：</div>
                        <div className="font-mono text-sm text-gray-900">
                          {method.formula}
                        </div>
                      </div>

                      <p className="text-gray-600 text-sm mb-3">
                        {method.description}
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                        <div>
                          <div className="text-green-600 font-medium mb-1">
                            优点：
                          </div>
                          <ul className="text-green-700 space-y-1">
                            {method.pros.map((pro, index) => (
                              <li key={index}>• {pro}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <div className="text-red-600 font-medium mb-1">
                            缺点：
                          </div>
                          <ul className="text-red-700 space-y-1">
                            {method.cons.map((con, index) => (
                              <li key={index}>• {con}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">
                  数据预处理效果预览
                </h3>

                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium text-gray-800 mb-3">
                      原始数据样本
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="text-center">
                          <div className="text-gray-600">2024-10</div>
                          <div className="font-bold text-gray-900">2,380</div>
                        </div>
                        <div className="text-center">
                          <div className="text-gray-600">2024-11</div>
                          <div className="font-bold text-gray-900">3,150</div>
                        </div>
                        <div className="text-center">
                          <div className="text-gray-600">2024-12</div>
                          <div className="font-bold text-gray-900">2,180</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-800 mb-3">
                      {normalizationMethod === "minmax"
                        ? "最小-最大归一化"
                        : "Z-score标准化"}
                      后
                    </h4>
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        {normalizationMethod === "minmax" ? (
                          <>
                            <div className="text-center">
                              <div className="text-blue-600">2024-10</div>
                              <div className="font-bold text-blue-900">
                                0.42
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-blue-600">2024-11</div>
                              <div className="font-bold text-blue-900">
                                1.00
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-blue-600">2024-12</div>
                              <div className="font-bold text-blue-900">
                                0.18
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="text-center">
                              <div className="text-blue-600">2024-10</div>
                              <div className="font-bold text-blue-900">
                                -0.15
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-blue-600">2024-11</div>
                              <div className="font-bold text-blue-900">
                                1.42
                              </div>
                            </div>
                            <div className="text-center">
                              <div className="text-blue-600">2024-12</div>
                              <div className="font-bold text-blue-900">
                                -0.68
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h4 className="font-semibold text-yellow-800 mb-2">
                      当前选择效果
                    </h4>
                    <p className="text-yellow-700 text-sm">
                      {normalizationMethod === "minmax"
                        ? "数据将被缩放到0-1范围内，保持原始分布形状，适合LSTM网络的sigmoid激活函数。"
                        : "数据将被标准化为均值0、标准差1的分布，有助于加速网络收敛，适合处理不同量级的特征。"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <h4 className="font-semibold text-blue-800 mb-3">
                💡 数据预处理重要性
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
                <div>
                  <h5 className="font-medium mb-2">为什么需要标准化：</h5>
                  <ul className="list-disc list-inside space-y-1">
                    <li>加速神经网络收敛</li>
                    <li>避免梯度爆炸或消失</li>
                    <li>确保特征权重平衡</li>
                    <li>提高数值计算稳定性</li>
                  </ul>
                </div>
                <div>
                  <h5 className="font-medium mb-2">LSTM特殊考虑：</h5>
                  <ul className="list-disc list-inside space-y-1">
                    <li>时间序列数据的连续性</li>
                    <li>避免未来信息泄露</li>
                    <li>保持时间顺序不变</li>
                    <li>适配门控机制的激活函数</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Layers className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                构建LSTM模型
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                选择输入特征和配置网络参数，构建适合您数据的LSTM预测模型
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">
                  特征选择
                </h3>

                <div className="space-y-4">
                  {availableFeatures.map((feature) => (
                    <div
                      key={feature.id}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        selectedFeatures.includes(feature.id)
                          ? "border-green-500 bg-green-50"
                          : "border-gray-200 hover:border-gray-300"
                      } ${feature.required ? "opacity-75" : "cursor-pointer"}`}
                      onClick={() =>
                        !feature.required && handleFeatureToggle(feature.id)
                      }
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-3">
                          <div
                            className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                              selectedFeatures.includes(feature.id)
                                ? "border-green-500 bg-green-500"
                                : "border-gray-300"
                            }`}
                          >
                            {selectedFeatures.includes(feature.id) && (
                              <CheckCircle className="w-3 h-3 text-white" />
                            )}
                          </div>
                          <h4 className="font-semibold text-gray-900">
                            {feature.name}
                          </h4>
                        </div>
                        {feature.required && (
                          <span className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded-full">
                            必需
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 text-sm ml-8">
                        {feature.description}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium text-gray-800 mb-2">
                    已选择特征：{selectedFeatures.length}个
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedFeatures.map((featureId) => {
                      const feature = availableFeatures.find(
                        (f) => f.id === featureId,
                      );
                      return (
                        <span
                          key={featureId}
                          className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm"
                        >
                          {feature?.name}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">
                  网络参数配置
                </h3>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      隐藏层单元数: {hiddenUnits}
                    </label>
                    <input
                      type="range"
                      min="16"
                      max="128"
                      step="16"
                      value={hiddenUnits}
                      onChange={(e) => setHiddenUnits(Number(e.target.value))}
                      className="w-full"
                    />
                    <p className="text-sm text-gray-500 mt-2">
                      更多单元可以学习更复杂的模式，但也增加计算成本
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      时间步长: {timeSteps} 个月
                    </label>
                    <input
                      type="range"
                      min="6"
                      max="24"
                      value={timeSteps}
                      onChange={(e) => setTimeSteps(Number(e.target.value))}
                      className="w-full"
                    />
                    <p className="text-sm text-gray-500 mt-2">
                      模型回看的历史数据长度，影响长期依赖的学习能力
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        训练轮数
                      </label>
                      <input
                        type="number"
                        value={epochs}
                        onChange={(e) => setEpochs(Number(e.target.value))}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        min="50"
                        max="500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        学习率
                      </label>
                      <select
                        value={learningRate}
                        onChange={(e) =>
                          setLearningRate(Number(e.target.value))
                        }
                        className="w-full p-2 border border-gray-300 rounded-md"
                      >
                        <option value={0.01}>0.01 (快速)</option>
                        <option value={0.001}>0.001 (标准)</option>
                        <option value={0.0001}>0.0001 (精细)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-800 mb-2">
                    模型配置总结
                  </h4>
                  <div className="text-green-700 text-sm space-y-1">
                    <div>输入特征: {selectedFeatures.length}个</div>
                    <div>隐藏单元: {hiddenUnits}个</div>
                    <div>时间步长: {timeSteps}个月</div>
                    <div>预计训练时间: 约{Math.ceil(epochs / 20)}分钟</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
              <h4 className="font-semibold text-green-800 mb-3">
                🎯 特征选择建议
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-green-700">
                <div>
                  <h5 className="font-medium mb-2">推荐特征组合：</h5>
                  <ul className="list-disc list-inside space-y-1">
                    <li>
                      <strong>基础组合</strong>: 销售数量 + 日期特征
                    </li>
                    <li>
                      <strong>增强组合</strong>: + 价格 + 促销活动
                    </li>
                    <li>
                      <strong>完整组合</strong>: + 销售金额 + 库存水平
                    </li>
                  </ul>
                </div>
                <div>
                  <h5 className="font-medium mb-2">特征选择原则：</h5>
                  <ul className="list-disc list-inside space-y-1">
                    <li>选择与目标变量相关的特征</li>
                    <li>避免高度相关的冗余特征</li>
                    <li>考虑特征的可获得性</li>
                    <li>平衡模型复杂度和性能</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Zap className="w-10 h-10 text-indigo-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                计算结果
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                基于您的配置开始训练LSTM神经网络模型
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">
                  配置总结
                </h3>

                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">数据预处理</span>
                    <span className="font-semibold text-gray-900">
                      {normalizationMethod === "minmax"
                        ? "最小-最大归一化"
                        : "Z-score标准化"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">输入特征</span>
                    <span className="font-semibold text-gray-900">
                      {selectedFeatures.length}个特征
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">网络结构</span>
                    <span className="font-semibold text-gray-900">
                      {hiddenUnits}单元LSTM
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">时间步长</span>
                    <span className="font-semibold text-gray-900">
                      {timeSteps}个月
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">训练参数</span>
                    <span className="font-semibold text-gray-900">
                      {epochs}轮, lr={learningRate}
                    </span>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-purple-50 rounded-lg">
                  <h4 className="font-medium text-purple-800 mb-2">训练说明</h4>
                  <p className="text-purple-700 text-sm">
                    系统将使用
                    {normalizationMethod === "minmax"
                      ? "最小-最大归一化"
                      : "Z-score标准化"}
                    处理{selectedFeatures.length}个输入特征， 训练{hiddenUnits}
                    单元的LSTM网络{epochs}轮， 预计需要{Math.ceil(epochs / 20)}
                    分钟完成。
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">
                  开始训练
                </h3>

                {!isTraining ? (
                  <div className="text-center">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Play className="w-8 h-8 text-purple-600" />
                    </div>
                    <p className="text-gray-600 mb-6">
                      点击下方按钮开始训练LSTM神经网络模型
                    </p>
                    <button
                      onClick={handleTrainModel}
                      className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 shadow-md hover:shadow-lg transition-all font-medium"
                    >
                      <Play className="w-5 h-5" />
                      <span>开始训练模型</span>
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                      <Brain className="w-8 h-8 text-purple-600" />
                    </div>
                    <p className="text-gray-600 mb-6">正在训练神经网络...</p>
                    <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                      <div
                        className="bg-purple-600 h-3 rounded-full transition-all duration-300"
                        style={{ width: `${trainingProgress}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600 mb-4">
                      <span>
                        Epoch {Math.floor((trainingProgress * epochs) / 100)}/
                        {epochs}
                      </span>
                      <span>{trainingProgress}%</span>
                    </div>
                    <p className="text-sm text-gray-600 text-center">
                      正在学习时间序列模式，请稍候...
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
              <h4 className="font-semibold text-yellow-800 mb-3">
                🔍 训练过程说明
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-yellow-700">
                <div>
                  <h5 className="font-medium mb-2">数据准备：</h5>
                  <p>对选定特征进行标准化处理，构建时间序列样本</p>
                </div>
                <div>
                  <h5 className="font-medium mb-2">网络训练：</h5>
                  <p>通过反向传播算法优化LSTM网络权重参数</p>
                </div>
                <div>
                  <h5 className="font-medium mb-2">模型验证：</h5>
                  <p>在验证集上评估模型性能，防止过拟合</p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
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
                  LSTM神经网络训练完成
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
                  深度学习模型训练完成！网络已学习到复杂的时间序列模式， 使用
                  {selectedFeatures.length}个特征训练了{epochs}轮，
                  以下是高精度预测结果。
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">
                    未来6个月预测结果
                  </h3>

                  <div className="space-y-3">
                    {predictions.map((pred, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-white rounded-lg"
                      >
                        <span className="font-medium">{pred.month}</span>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <div className="text-purple-600 font-semibold">
                              {pred.predicted.toLocaleString()}件
                            </div>
                            <div className="text-xs text-gray-500">
                              置信度: {(pred.confidence * 100).toFixed(0)}%
                            </div>
                          </div>
                          <Target className="w-4 h-4 text-green-500" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2 text-yellow-500" />
                    模型评估指标 (最优)
                  </h3>

                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-green-800">
                          MAPE (平均绝对百分比误差)
                        </h4>
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="text-2xl font-bold text-green-600">
                        {evaluationMetrics.mape}%
                      </div>
                      <p className="text-sm text-green-700">
                        优秀！低于10%为高精度预测
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-white rounded-lg">
                        <div className="text-sm text-purple-600">RMSE</div>
                        <div className="text-lg font-bold text-purple-900">
                          {evaluationMetrics.rmse}
                        </div>
                      </div>
                      <div className="p-3 bg-white rounded-lg">
                        <div className="text-sm text-purple-600">R²</div>
                        <div className="text-lg font-bold text-purple-900">
                          {evaluationMetrics.r2}
                        </div>
                      </div>
                    </div>

                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="text-sm text-blue-600">训练配置</div>
                      <div className="grid grid-cols-2 gap-2 text-xs mt-2">
                        <div>特征数: {selectedFeatures.length}</div>
                        <div>隐藏单元: {hiddenUnits}</div>
                        <div>时间步长: {timeSteps}</div>
                        <div>训练轮数: {epochs}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
                <h4 className="font-semibold text-purple-800 mb-3">
                  LSTM模型优势分析
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-purple-700">
                  <div>
                    <h5 className="font-medium mb-2">核心优势：</h5>
                    <ul className="list-disc list-inside space-y-1">
                      <li>捕捉长期依赖关系</li>
                      <li>自动学习复杂模式</li>
                      <li>处理非线性时间序列</li>
                      <li>预测精度最高</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium mb-2">学习成果：</h5>
                    <ul className="list-disc list-inside space-y-1">
                      <li>识别季节性波动模式</li>
                      <li>学习促销活动影响</li>
                      <li>捕捉消费者行为变化</li>
                      <li>适应市场趋势变化</li>
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

      {/* 进度条 */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = index + 1 === currentStep;
            const isCompleted = index + 1 < currentStep;

            return (
              <div key={step.id} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                      isCompleted
                        ? "bg-green-600 border-green-600 text-white"
                        : isActive
                          ? "bg-purple-600 border-purple-600 text-white"
                          : "bg-gray-100 border-gray-300 text-gray-400"
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : (
                      <Icon className="w-6 h-6" />
                    )}
                  </div>
                  <span
                    className={`mt-2 text-sm font-medium ${
                      isActive
                        ? "text-purple-600"
                        : isCompleted
                          ? "text-green-600"
                          : "text-gray-500"
                    }`}
                  >
                    {step.title}
                  </span>
                </div>

                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-4 ${
                      index + 1 < currentStep ? "bg-green-600" : "bg-gray-300"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 步骤内容 */}
      <div className="flex-1">{renderStepContent()}</div>

      {/* 导航按钮 */}
      <div className="mt-8 flex justify-between items-center">
        <button
          onClick={handlePrev}
          disabled={currentStep === 1}
          className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${
            currentStep === 1
              ? "bg-gray-100 text-gray-400 cursor-not-allowed"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          <ArrowLeft className="w-5 h-5" />
          <span>上一步</span>
        </button>

        <div className="text-center">
          <span className="text-sm text-gray-500">
            {currentStep} / {steps.length}
          </span>
        </div>

        <button
          onClick={handleNext}
          disabled={isTraining}
          className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${
            isTraining
              ? "bg-gray-400 text-white cursor-not-allowed"
              : "bg-purple-600 text-white hover:bg-purple-700 shadow-md hover:shadow-lg"
          }`}
        >
          <span>{currentStep === 4 ? "开始训练" : "下一步"}</span>
          {currentStep === 4 ? (
            <Play className="w-5 h-5" />
          ) : (
            <ArrowRight className="w-5 h-5" />
          )}
        </button>
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
                  <span className="text-gray-600">数据预处理:</span>
                  <span className="font-medium">
                    {lastPrediction.normalizationMethod === "minmax"
                      ? "最小-最大归一化"
                      : "Z-score标准化"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">输入特征:</span>
                  <span className="font-medium">
                    {lastPrediction.selectedFeatures.length}个
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">隐藏单元:</span>
                  <span className="font-medium">
                    {lastPrediction.hiddenUnits}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">时间步长:</span>
                  <span className="font-medium">
                    {lastPrediction.timeSteps}个月
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">训练轮数:</span>
                  <span className="font-medium">{lastPrediction.epochs}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">评估指标</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center p-2 bg-purple-50 rounded">
                  <div className="font-bold text-purple-600">
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

export default LSTMModel;
