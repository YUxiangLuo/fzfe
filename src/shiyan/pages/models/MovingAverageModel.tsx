import React, { useState } from "react";
import { AppState } from "../../App";
import {
  BarChart3,
  Settings,
  Play,
  TrendingUp,
  CheckCircle,
  Target,
  X,
  History,
  ArrowRight,
  ArrowLeft,
  Info,
  Calculator,
  Clock,
  BarChart,
} from "lucide-react";

interface Props {
  appState: AppState;
  updateAppState: (updates: Partial<AppState>) => void;
  completeStep: (step: number) => void;
}

const MovingAverageModel: React.FC<Props> = ({
  appState,
  updateAppState,
  completeStep,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [windowSize, setWindowSize] = useState(3);
  const [weightType, setWeightType] = useState("simple");
  const [isCalculating, setIsCalculating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [hasHistory, setHasHistory] = useState(false);
  const [lastPrediction, setLastPrediction] = useState<any>(null);

  const steps = [
    { id: 1, title: "方法介绍", icon: Info },
    { id: 2, title: "计算公式", icon: Calculator },
    { id: 3, title: "时间窗口选取", icon: Clock },
    { id: 4, title: "计算结果", icon: BarChart },
  ];

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    } else if (currentStep === 4) {
      handleCalculate();
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCalculate = async () => {
    setIsCalculating(true);
    // 模拟计算过程
    setTimeout(() => {
      setIsCalculating(false);
      setShowModal(true);
    }, 2000);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setHasHistory(true);
    setLastPrediction({
      timestamp: new Date().toLocaleString("zh-CN"),
      windowSize,
      weightType,
      predictions,
      metrics: evaluationMetrics,
    });
    completeStep(5);
  };

  // 模拟移动平均预测结果
  const predictions = [
    { month: "2025-01", predicted: 1850, actual: null },
    { month: "2025-02", predicted: 2200, actual: null },
    { month: "2025-03", predicted: 1920, actual: null },
    { month: "2025-04", predicted: 1750, actual: null },
    { month: "2025-05", predicted: 2100, actual: null },
    { month: "2025-06", predicted: 2400, actual: null },
  ];

  // 模拟评估指标
  const evaluationMetrics = {
    mape: 12.5,
    rmse: 389,
    r2: 0.85,
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <BarChart3 className="w-10 h-10 text-blue-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                移动平均法
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                最简单直观的时间序列预测方法，通过计算过去几个时期的平均值来预测未来
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <Target className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-blue-900 mb-3">
                  简单易懂
                </h3>
                <p className="text-blue-700">
                  计算逻辑清晰，容易理解和解释，
                  适合初学者掌握预测方法的基本原理
                </p>
              </div>

              <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-green-900 mb-3">
                  快速计算
                </h3>
                <p className="text-green-700">
                  计算速度快，资源消耗少， 能够快速获得预测结果，适合实时应用
                </p>
              </div>

              <div className="bg-orange-50 rounded-xl p-6 border border-orange-200">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                  <CheckCircle className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="text-lg font-semibold text-orange-900 mb-3">
                  稳定可靠
                </h3>
                <p className="text-orange-700">
                  对异常值不敏感，预测结果相对稳定， 适合数据相对平稳的场景
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                适用场景
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-800 mb-3">
                    ✅ 适合使用
                  </h4>
                  <ul className="space-y-2 text-gray-600">
                    <li>• 数据相对平稳，无明显趋势</li>
                    <li>• 短期预测需求</li>
                    <li>• 需要快速获得预测结果</li>
                    <li>• 对预测精度要求不是很高</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800 mb-3">
                    ❌ 不适合使用
                  </h4>
                  <ul className="space-y-2 text-gray-600">
                    <li>• 数据有明显的上升或下降趋势</li>
                    <li>• 存在明显的季节性模式</li>
                    <li>• 需要高精度的长期预测</li>
                    <li>• 数据波动性很大</li>
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
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Calculator className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                计算公式
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                了解移动平均法的数学原理和计算方法
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <h3 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
                简单移动平均公式
              </h3>

              <div className="bg-blue-50 rounded-xl p-8 mb-8">
                <div className="text-center">
                  <div className="text-4xl font-mono font-bold text-blue-900 mb-4">
                    MA(t) = (X₁ + X₂ + X₃ + ... + Xₙ) / n
                  </div>
                  <div className="text-lg text-blue-700">
                    其中：MA(t) = t时刻的移动平均值，n = 时间窗口大小
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">
                    参数说明
                  </h4>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-blue-600 font-bold text-sm">
                          X
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          历史观测值
                        </div>
                        <div className="text-sm text-gray-600">
                          过去n个时期的实际销量数据
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-green-600 font-bold text-sm">
                          n
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          时间窗口
                        </div>
                        <div className="text-sm text-gray-600">
                          参与计算平均值的历史数据点数量
                        </div>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                        <span className="text-purple-600 font-bold text-sm">
                          MA
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">预测值</div>
                        <div className="text-sm text-gray-600">
                          下一时期的预测销量
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">
                    计算示例
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="text-sm text-gray-600 mb-3">
                      假设过去5个月的销量数据：
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>1月：</span>
                        <span className="font-mono">1200</span>
                      </div>
                      <div className="flex justify-between">
                        <span>2月：</span>
                        <span className="font-mono">1350</span>
                      </div>
                      <div className="flex justify-between">
                        <span>3月：</span>
                        <span className="font-mono">1180</span>
                      </div>
                      <div className="flex justify-between">
                        <span>4月：</span>
                        <span className="font-mono">1420</span>
                      </div>
                      <div className="flex justify-between">
                        <span>5月：</span>
                        <span className="font-mono">1290</span>
                      </div>
                    </div>
                    <div className="border-t border-gray-300 mt-4 pt-4">
                      <div className="text-sm text-gray-600 mb-2">
                        3期移动平均预测6月销量：
                      </div>
                      <div className="font-mono text-lg text-center bg-white rounded p-2">
                        (1180 + 1420 + 1290) / 3 = 1297
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
              <h4 className="font-semibold text-yellow-800 mb-3">
                💡 关键要点
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-yellow-700">
                <div>
                  <h5 className="font-medium mb-2">窗口大小的影响：</h5>
                  <ul className="list-disc list-inside space-y-1">
                    <li>窗口越大，预测结果越平滑</li>
                    <li>窗口越小，对最新变化反应越敏感</li>
                    <li>通常选择3-12个时期</li>
                  </ul>
                </div>
                <div>
                  <h5 className="font-medium mb-2">计算特点：</h5>
                  <ul className="list-disc list-inside space-y-1">
                    <li>每个历史数据点权重相等</li>
                    <li>只考虑最近n个数据点</li>
                    <li>计算简单，易于实现</li>
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
              <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Clock className="w-10 h-10 text-orange-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                时间窗口选取
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                选择合适的时间窗口大小，平衡预测的平滑性和敏感性
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">
                  参数配置
                </h3>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      时间窗口大小：{windowSize} 个月
                    </label>
                    <div className="flex items-center space-x-4">
                      <input
                        type="range"
                        min="2"
                        max="12"
                        value={windowSize}
                        onChange={(e) => setWindowSize(Number(e.target.value))}
                        className="flex-1"
                      />
                      <span className="text-lg font-semibold text-blue-600 w-8">
                        {windowSize}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      窗口越大，预测结果越平滑，但对最新变化的反应越慢
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      权重类型
                    </label>
                    <div className="space-y-2">
                      {[
                        {
                          id: "simple",
                          name: "简单移动平均",
                          desc: "所有数据点权重相等",
                        },
                        {
                          id: "weighted",
                          name: "加权移动平均",
                          desc: "近期数据权重更大",
                        },
                        {
                          id: "exponential",
                          name: "指数移动平均",
                          desc: "指数递减权重",
                        },
                      ].map((type) => (
                        <label
                          key={type.id}
                          className="flex items-start space-x-3 cursor-pointer"
                        >
                          <input
                            type="radio"
                            name="weightType"
                            value={type.id}
                            checked={weightType === type.id}
                            onChange={(e) => setWeightType(e.target.value)}
                            className="mt-1"
                          />
                          <div>
                            <div className="font-medium text-gray-900">
                              {type.name}
                            </div>
                            <div className="text-sm text-gray-600">
                              {type.desc}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">
                  窗口大小对比
                </h3>

                <div className="space-y-4">
                  {[
                    {
                      size: 3,
                      desc: "高敏感度",
                      color: "bg-red-100 text-red-700",
                      pros: "快速响应变化",
                      cons: "容易受噪声影响",
                    },
                    {
                      size: 6,
                      desc: "平衡选择",
                      color: "bg-yellow-100 text-yellow-700",
                      pros: "平衡性能",
                      cons: "中等响应速度",
                    },
                    {
                      size: 12,
                      desc: "高平滑度",
                      color: "bg-green-100 text-green-700",
                      pros: "结果稳定",
                      cons: "响应变化慢",
                    },
                  ].map((option) => (
                    <div
                      key={option.size}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        windowSize === option.size
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => setWindowSize(option.size)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-900">
                          {option.size}个月窗口
                        </span>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${option.color}`}
                        >
                          {option.desc}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-green-600">
                            ✓ {option.pros}
                          </span>
                        </div>
                        <div>
                          <span className="text-red-600">✗ {option.cons}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <h4 className="font-semibold text-blue-800 mb-3">
                📊 当前配置预览
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h5 className="font-medium text-blue-700 mb-2">
                    选择的参数：
                  </h5>
                  <div className="space-y-1 text-blue-600">
                    <div>时间窗口：{windowSize}个月</div>
                    <div>
                      权重类型：
                      {weightType === "simple"
                        ? "简单移动平均"
                        : weightType === "weighted"
                          ? "加权移动平均"
                          : "指数移动平均"}
                    </div>
                  </div>
                </div>
                <div>
                  <h5 className="font-medium text-blue-700 mb-2">预期效果：</h5>
                  <div className="text-blue-600 text-sm">
                    {windowSize <= 4
                      ? "对最新数据变化敏感，适合快速响应市场变化"
                      : windowSize <= 8
                        ? "平衡的预测效果，既能响应变化又保持稳定"
                        : "平滑的预测结果，适合长期趋势分析"}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <BarChart className="w-10 h-10 text-purple-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                计算结果
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                基于您选择的参数，开始计算移动平均预测结果
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">
                  配置总结
                </h3>

                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">时间窗口大小</span>
                    <span className="font-semibold text-gray-900">
                      {windowSize}个月
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">权重类型</span>
                    <span className="font-semibold text-gray-900">
                      {weightType === "simple"
                        ? "简单移动平均"
                        : weightType === "weighted"
                          ? "加权移动平均"
                          : "指数移动平均"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">预测期数</span>
                    <span className="font-semibold text-gray-900">6个月</span>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-800 mb-2">计算说明</h4>
                  <p className="text-blue-700 text-sm">
                    系统将使用最近{windowSize}个月的历史销售数据， 通过
                    {weightType === "simple"
                      ? "简单"
                      : weightType === "weighted"
                        ? "加权"
                        : "指数"}
                    移动平均法 计算未来6个月的需求预测。
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">
                  开始计算
                </h3>

                {!isCalculating ? (
                  <div className="text-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Play className="w-8 h-8 text-blue-600" />
                    </div>
                    <p className="text-gray-600 mb-6">
                      点击下方按钮开始计算移动平均预测结果
                    </p>
                    <button
                      onClick={handleCalculate}
                      className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md hover:shadow-lg transition-all font-medium"
                    >
                      <Play className="w-5 h-5" />
                      <span>开始计算预测</span>
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                      <Calculator className="w-8 h-8 text-blue-600" />
                    </div>
                    <p className="text-gray-600 mb-6">正在计算移动平均值...</p>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-blue-600 h-3 rounded-full animate-pulse"
                        style={{ width: "70%" }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      请稍候，计算即将完成
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
              <h4 className="font-semibold text-yellow-800 mb-3">
                🔍 预期结果
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-yellow-700">
                <div>
                  <h5 className="font-medium mb-2">预测数据：</h5>
                  <p>未来6个月的销量预测值</p>
                </div>
                <div>
                  <h5 className="font-medium mb-2">评估指标：</h5>
                  <p>MAPE、RMSE、R²等精度指标</p>
                </div>
                <div>
                  <h5 className="font-medium mb-2">可视化图表：</h5>
                  <p>历史数据与预测结果对比</p>
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
                  移动平均法预测完成
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
                  模型训练完成！以下是基于{windowSize}个月
                  {weightType === "simple"
                    ? "简单"
                    : weightType === "weighted"
                      ? "加权"
                      : "指数"}
                  移动平均的预测结果。
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
                          <span className="text-blue-600 font-semibold">
                            {pred.predicted.toLocaleString()}件
                          </span>
                          <TrendingUp className="w-4 h-4 text-green-500" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">
                    模型评估指标
                  </h3>

                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-blue-800">
                          MAPE (平均绝对百分比误差)
                        </h4>
                        <Target className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="text-2xl font-bold text-blue-600">
                        {evaluationMetrics.mape}%
                      </div>
                      <p className="text-sm text-blue-700">
                        数值越小表示预测越准确
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-white rounded-lg">
                        <div className="text-sm text-gray-600">RMSE</div>
                        <div className="text-lg font-bold text-gray-900">
                          {evaluationMetrics.rmse}
                        </div>
                      </div>
                      <div className="p-3 bg-white rounded-lg">
                        <div className="text-sm text-gray-600">R²</div>
                        <div className="text-lg font-bold text-gray-900">
                          {evaluationMetrics.r2}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h4 className="font-semibold text-blue-800 mb-3">
                  模型特点分析
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
                  <div>
                    <h5 className="font-medium mb-2">优势：</h5>
                    <ul className="list-disc list-inside space-y-1">
                      <li>计算简单，易于理解</li>
                      <li>对异常值不敏感</li>
                      <li>适合短期预测</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium mb-2">局限性：</h5>
                    <ul className="list-disc list-inside space-y-1">
                      <li>无法捕捉趋势变化</li>
                      <li>对季节性模式反应迟钝</li>
                      <li>预测精度相对较低</li>
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
                          ? "bg-blue-600 border-blue-600 text-white"
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
                        ? "text-blue-600"
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
          disabled={isCalculating}
          className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${
            isCalculating
              ? "bg-gray-400 text-white cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg"
          }`}
        >
          <span>{currentStep === 4 ? "开始计算" : "下一步"}</span>
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
              <h4 className="font-medium text-gray-900 mb-3">预测配置</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">窗口大小:</span>
                  <span className="font-medium">
                    {lastPrediction.windowSize}个月
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">权重类型:</span>
                  <span className="font-medium">
                    {lastPrediction.weightType === "simple"
                      ? "简单移动平均"
                      : lastPrediction.weightType === "weighted"
                        ? "加权移动平均"
                        : "指数移动平均"}
                  </span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">评估指标</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center p-2 bg-blue-50 rounded">
                  <div className="font-bold text-blue-600">
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

export default MovingAverageModel;
