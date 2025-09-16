import React, { useState } from "react";
import { AppState } from "../../App";
import {
  TrendingUp,
  Settings,
  Play,
  BarChart,
  CheckCircle,
  Target,
  X,
  History,
  ArrowRight,
  ArrowLeft,
  Info,
  Calculator,
  Sliders,
  BarChart3,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

interface Props {
  appState: AppState;
  updateAppState: (updates: Partial<AppState>) => void;
  completeStep: (step: number) => void;
}

const ExponentialSmoothingModel: React.FC<Props> = ({ completeStep }) => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [alpha, setAlpha] = useState(0.3);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [hasHistory, setHasHistory] = useState(false);
  const [lastPrediction, setLastPrediction] = useState<any>(null);

  const steps = [
    { id: 1, title: "方法介绍", icon: Info },
    { id: 2, title: "计算公式", icon: Calculator },
    { id: 3, title: "平滑系数选择", icon: Sliders },
    { id: 4, title: "计算结果", icon: BarChart3 },
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
    }, 2500);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setHasHistory(true);
    setLastPrediction({
      timestamp: new Date().toLocaleString("zh-CN"),
      alpha,
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
      alpha,
      predictions,
      metrics: evaluationMetrics,
    });
    completeStep(5);
    // 跳转到结果评估页面
    navigate("/evaluation");
  };

  // 模拟指数平滑预测结果
  const predictions = [
    { month: "2025-01", predicted: 1890, trend: "stable" },
    { month: "2025-02", predicted: 2250, trend: "up" },
    { month: "2025-03", predicted: 1840, trend: "down" },
    { month: "2025-04", predicted: 1770, trend: "down" },
    { month: "2025-05", predicted: 2120, trend: "up" },
    { month: "2025-06", predicted: 2420, trend: "up" },
  ];

  // 模拟评估指标
  const evaluationMetrics = {
    mape: 11.3,
    rmse: 356,
    r2: 0.87,
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <TrendingUp className="w-10 h-10 text-orange-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                指数平滑法
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                一种加权移动平均方法，对近期观测值赋予更高的权重，能够快速响应数据变化
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-orange-50 rounded-xl p-6 border border-orange-200">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6 text-orange-600" />
                </div>
                <h3 className="text-lg font-semibold text-orange-900 mb-3">
                  权重递减
                </h3>
                <p className="text-orange-700">
                  对近期数据赋予更高权重， 随时间推移权重呈指数递减，
                  更好地反映最新趋势
                </p>
              </div>

              <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <Target className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-green-900 mb-3">
                  快速响应
                </h3>
                <p className="text-green-700">
                  能够快速适应数据变化， 对市场波动反应敏感， 适合动态环境预测
                </p>
              </div>

              <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <CheckCircle className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-blue-900 mb-3">
                  参数可调
                </h3>
                <p className="text-blue-700">
                  通过调整平滑系数， 可以控制对历史数据的依赖程度，
                  灵活适应不同场景
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                与移动平均法的对比
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-800 mb-3">
                    🔥 指数平滑法优势
                  </h4>
                  <ul className="space-y-2 text-gray-600">
                    <li>• 对近期数据权重更高</li>
                    <li>• 能够快速响应变化</li>
                    <li>• 支持趋势和季节性</li>
                    <li>• 参数可以灵活调整</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800 mb-3">
                    📊 移动平均法特点
                  </h4>
                  <ul className="space-y-2 text-gray-600">
                    <li>• 所有历史数据权重相等</li>
                    <li>• 预测结果更加平滑</li>
                    <li>• 对异常值不敏感</li>
                    <li>• 计算更加简单</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
              <h4 className="font-semibold text-orange-800 mb-3">
                🎯 最佳应用场景
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-orange-700">
                <div>
                  <h5 className="font-medium mb-2">适合使用：</h5>
                  <ul className="list-disc list-inside space-y-1">
                    <li>需求变化较快的产品</li>
                    <li>有轻微趋势的时间序列</li>
                    <li>需要快速响应市场变化</li>
                    <li>短期预测需求</li>
                  </ul>
                </div>
                <div>
                  <h5 className="font-medium mb-2">典型应用：</h5>
                  <ul className="list-disc list-inside space-y-1">
                    <li>库存管理优化</li>
                    <li>销售预测</li>
                    <li>需求计划</li>
                    <li>实时预测更新</li>
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
                了解指数平滑法的数学原理和不同类型的计算方法
              </p>
            </div>

            <div className="space-y-8">
              {/* 简单指数平滑 */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
                <h3 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
                  简单指数平滑公式
                </h3>

                <div className="bg-orange-50 rounded-xl p-8 mb-6">
                  <div className="text-center">
                    <div className="text-4xl font-mono font-bold text-orange-900 mb-4">
                      S(t) = α × X(t) + (1-α) × S(t-1)
                    </div>
                    <div className="text-lg text-orange-700">
                      其中：S(t) = t时刻的平滑值，α = 平滑系数 (0 &lt; α &lt; 1)
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
                        <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                          <span className="text-orange-600 font-bold text-sm">
                            α
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            平滑系数
                          </div>
                          <div className="text-sm text-gray-600">
                            控制对最新观测值的权重，取值0-1
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                          <span className="text-blue-600 font-bold text-sm">
                            X
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            实际观测值
                          </div>
                          <div className="text-sm text-gray-600">
                            当前时期的实际销量数据
                          </div>
                        </div>
                      </div>
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                          <span className="text-purple-600 font-bold text-sm">
                            S
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            平滑值
                          </div>
                          <div className="text-sm text-gray-600">
                            经过平滑处理的预测值
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
                        假设α=0.3，历史数据：
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>1月实际：</span>
                          <span className="font-mono">1200</span>
                        </div>
                        <div className="flex justify-between">
                          <span>1月平滑：</span>
                          <span className="font-mono">1200</span>
                        </div>
                        <div className="flex justify-between">
                          <span>2月实际：</span>
                          <span className="font-mono">1350</span>
                        </div>
                      </div>
                      <div className="border-t border-gray-300 mt-4 pt-4">
                        <div className="text-sm text-gray-600 mb-2">
                          2月平滑值计算：
                        </div>
                        <div className="font-mono text-sm text-center bg-white rounded p-2 mb-2">
                          S(2) = 0.3×1350 + 0.7×1200 = 1245
                        </div>
                        <div className="text-xs text-gray-500 text-center">
                          新数据权重30%，历史权重70%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
              <h4 className="font-semibold text-yellow-800 mb-3">
                💡 关键理解
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-yellow-700">
                <div>
                  <h5 className="font-medium mb-2">权重分布特点：</h5>
                  <ul className="list-disc list-inside space-y-1">
                    <li>最新数据权重 = α</li>
                    <li>上期数据权重 = α(1-α)</li>
                    <li>权重呈指数递减</li>
                    <li>理论上考虑所有历史数据</li>
                  </ul>
                </div>
                <div>
                  <h5 className="font-medium mb-2">参数选择指导：</h5>
                  <ul className="list-disc list-inside space-y-1">
                    <li>α接近1：快速响应，适合波动大</li>
                    <li>α接近0：平滑效果强，适合稳定</li>
                    <li>通常α取值0.1-0.3</li>
                    <li>可通过历史数据优化确定</li>
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
              <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Sliders className="w-10 h-10 text-purple-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                平滑系数选择
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                选择合适的平滑系数，平衡预测的响应速度和稳定性
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
                      α (平滑系数)：{alpha}
                    </label>
                    <div className="flex items-center space-x-4">
                      <input
                        type="range"
                        min="0.1"
                        max="0.9"
                        step="0.1"
                        value={alpha}
                        onChange={(e) => setAlpha(Number(e.target.value))}
                        className="flex-1"
                      />
                      <span className="text-lg font-semibold text-orange-600 w-8">
                        {alpha}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      控制对最新观测值的权重，值越大对新数据反应越敏感
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">
                  权重分布可视化
                </h3>

                <div className="space-y-4">
                  <div className="text-sm text-gray-600 mb-4">
                    数据点权重分布 (α = {alpha})
                  </div>
                  {[1, 2, 3, 4, 5].map((period) => {
                    const weight = Math.pow(1 - alpha, period - 1) * alpha;
                    const widthPercent = (weight / alpha) * 100;

                    return (
                      <div key={period} className="flex items-center space-x-3">
                        <span className="text-sm w-16">T-{period}</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-4">
                          <div
                            className="bg-orange-500 h-4 rounded-full transition-all"
                            style={{ width: `${widthPercent}%` }}
                          ></div>
                        </div>
                        <span className="text-sm w-16 text-right">
                          {(weight * 100).toFixed(1)}%
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-6 pt-6 border-t border-gray-200">
                  <h4 className="font-medium text-gray-900 mb-3">
                    参数效果对比
                  </h4>
                  <div className="space-y-3">
                    {[
                      {
                        alpha: 0.1,
                        desc: "高平滑度",
                        color: "bg-blue-100 text-blue-700",
                        effect: "稳定但响应慢",
                      },
                      {
                        alpha: 0.3,
                        desc: "平衡选择",
                        color: "bg-green-100 text-green-700",
                        effect: "平衡响应和稳定",
                      },
                      {
                        alpha: 0.7,
                        desc: "高敏感度",
                        color: "bg-red-100 text-red-700",
                        effect: "快速响应但波动大",
                      },
                    ].map((option) => (
                      <div
                        key={option.alpha}
                        className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          Math.abs(alpha - option.alpha) < 0.1
                            ? "border-orange-500 bg-orange-50"
                            : "border-gray-200 hover:border-gray-300"
                        }`}
                        onClick={() => setAlpha(option.alpha)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-gray-900">
                            α = {option.alpha}
                          </span>
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${option.color}`}
                          >
                            {option.desc}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {option.effect}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
              <h4 className="font-semibold text-purple-800 mb-3">
                🎯 当前配置预览
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h5 className="font-medium text-purple-700 mb-2">
                    选择的参数：
                  </h5>
                  <div className="space-y-1 text-purple-600">
                    <div>平滑类型：简单指数平滑</div>
                    <div>α (平滑系数)：{alpha}</div>
                  </div>
                </div>
                <div>
                  <h5 className="font-medium text-purple-700 mb-2">
                    预期效果：
                  </h5>
                  <div className="text-purple-600 text-sm">
                    {alpha <= 0.3
                      ? "平滑的预测结果，对异常值不敏感，适合稳定环境"
                      : alpha <= 0.6
                        ? "平衡的响应速度，既能跟踪变化又保持稳定"
                        : "快速响应数据变化，适合动态市场环境"}
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
              <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <BarChart3 className="w-10 h-10 text-indigo-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                计算结果
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                基于您选择的参数，开始计算指数平滑预测结果
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">
                  配置总结
                </h3>

                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">平滑类型</span>
                    <span className="font-semibold text-gray-900">
                      简单指数平滑
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">α (平滑系数)</span>
                    <span className="font-semibold text-gray-900">{alpha}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">预测期数</span>
                    <span className="font-semibold text-gray-900">6个月</span>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-orange-50 rounded-lg">
                  <h4 className="font-medium text-orange-800 mb-2">计算说明</h4>
                  <p className="text-orange-700 text-sm">
                    系统将使用简单指数平滑法， 基于α={alpha}
                    的平滑系数计算未来6个月的需求预测。
                    {alpha > 0.5
                      ? "较高的α值将使预测快速响应最新变化。"
                      : "较低的α值将产生更平滑的预测结果。"}
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">
                  开始计算
                </h3>

                {!isCalculating ? (
                  <div className="text-center">
                    <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Play className="w-8 h-8 text-orange-600" />
                    </div>
                    <p className="text-gray-600 mb-6">
                      点击下方按钮开始计算指数平滑预测结果
                    </p>
                    <button
                      onClick={handleCalculate}
                      className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 shadow-md hover:shadow-lg transition-all font-medium"
                    >
                      <Play className="w-5 h-5" />
                      <span>开始计算预测</span>
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                      <Calculator className="w-8 h-8 text-orange-600" />
                    </div>
                    <p className="text-gray-600 mb-6">正在计算指数平滑值...</p>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className="bg-orange-600 h-3 rounded-full animate-pulse"
                        style={{ width: "75%" }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      正在应用平滑系数进行计算
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
                  <p>未来6个月的平滑预测值，体现权重递减特性</p>
                </div>
                <div>
                  <h5 className="font-medium mb-2">趋势分析：</h5>
                  <p>识别上升、下降或平稳的趋势变化</p>
                </div>
                <div>
                  <h5 className="font-medium mb-2">精度评估：</h5>
                  <p>MAPE、RMSE等指标评估预测质量</p>
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
                  指数平滑法预测完成
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
                  简单指数平滑模型训练完成！
                  模型已学习到数据的平滑模式，对近期数据赋予了更高的权重。
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
                            <div className="text-orange-600 font-semibold">
                              {pred.predicted.toLocaleString()}件
                            </div>
                            <div
                              className={`w-2 h-2 rounded-full ${
                                pred.trend === "up"
                                  ? "bg-green-500"
                                  : pred.trend === "down"
                                    ? "bg-red-500"
                                    : "bg-gray-500"
                              }`}
                            ></div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          趋势:{" "}
                          {pred.trend === "up"
                            ? "上升"
                            : pred.trend === "down"
                              ? "下降"
                              : "平稳"}
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
                    <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-orange-800">
                          MAPE (平均绝对百分比误差)
                        </h4>
                        <Target className="w-5 h-5 text-orange-600" />
                      </div>
                      <div className="text-2xl font-bold text-orange-600">
                        {evaluationMetrics.mape}%
                      </div>
                      <p className="text-sm text-orange-700">
                        良好的预测精度，优于简单移动平均
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

              <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
                <h4 className="font-semibold text-orange-800 mb-3">
                  指数平滑法特点分析
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-orange-700">
                  <div>
                    <h5 className="font-medium mb-2">模型优势：</h5>
                    <ul className="list-disc list-inside space-y-1">
                      <li>对近期数据权重更高</li>
                      <li>能够快速适应变化</li>
                      <li>计算简单高效</li>
                      <li>适合短期预测</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium mb-2">适用场景：</h5>
                    <ul className="list-disc list-inside space-y-1">
                      <li>需求变化较快的产品</li>
                      <li>有轻微趋势的时间序列</li>
                      <li>实时预测更新</li>
                      <li>库存管理优化</li>
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
                          ? "bg-orange-600 border-orange-600 text-white"
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
                        ? "text-orange-600"
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
              : "bg-orange-600 text-white hover:bg-orange-700 shadow-md hover:shadow-lg"
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
              <h4 className="font-medium text-gray-900 mb-3">模型配置</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">平滑类型:</span>
                  <span className="font-medium">简单指数平滑</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">α (平滑系数):</span>
                  <span className="font-medium">{lastPrediction.alpha}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">评估指标</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center p-2 bg-orange-50 rounded">
                  <div className="font-bold text-orange-600">
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

export default ExponentialSmoothingModel;
