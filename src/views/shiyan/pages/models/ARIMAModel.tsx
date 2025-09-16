import React, { useState } from "react";
import { AppState } from "../../App";
import {
  TrendingUp,
  Settings,
  Play,
  BarChart,
  Activity,
  CheckCircle,
  Target,
  X,
  History,
  ArrowRight,
  ArrowLeft,
  Info,
  Calculator,
  Search,
  Zap,
} from "lucide-react";

import { useNavigate } from "react-router-dom";

interface Props {
  appState: AppState;
  updateAppState: (updates: Partial<AppState>) => void;
  completeStep: (step: number) => void;
}

const ARIMAModel: React.FC<Props> = ({ completeStep }) => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [dValue, setDValue] = useState(1);
  const [isCalculating, setIsCalculating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [hasHistory, setHasHistory] = useState(false);
  const [lastPrediction, setLastPrediction] = useState<any>(null);

  const steps = [
    { id: 1, title: "方法介绍", icon: Info },
    { id: 2, title: "平稳性检验", icon: Activity },
    { id: 3, title: "差分阶数选择", icon: Search },
    { id: 4, title: "自动参数寻优计算结果", icon: Zap },
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
    }, 4000);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setHasHistory(true);
    setLastPrediction({
      timestamp: new Date().toLocaleString("zh-CN"),
      dValue,
      pValue: 2, // 自动确定的p值
      qValue: 1, // 自动确定的q值
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
      dValue,
      pValue: 2,
      qValue: 1,
      predictions,
      metrics: evaluationMetrics,
    });
    completeStep(5);
    navigate("/evaluation");
  };

  // 模拟ARIMA预测结果
  const predictions = [
    { month: "2025-01", predicted: 1880, lowerBound: 1650, upperBound: 2110 },
    { month: "2025-02", predicted: 2280, lowerBound: 2020, upperBound: 2540 },
    { month: "2025-03", predicted: 1820, lowerBound: 1580, upperBound: 2060 },
    { month: "2025-04", predicted: 1750, lowerBound: 1510, upperBound: 1990 },
    { month: "2025-05", predicted: 2150, lowerBound: 1890, upperBound: 2410 },
    { month: "2025-06", predicted: 2450, lowerBound: 2170, upperBound: 2730 },
  ];

  // 模拟评估指标
  const evaluationMetrics = {
    mape: 10.1,
    rmse: 312,
    r2: 0.88,
    aic: 245.8,
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <TrendingUp className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                ARIMA模型
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                自回归积分滑动平均模型，是经典的时间序列预测方法，特别适合处理有趋势的非平稳数据
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                  <Activity className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-green-900 mb-3">
                  理论扎实
                </h3>
                <p className="text-green-700">
                  基于严格的统计理论， 能够处理非平稳时间序列，
                  提供可靠的预测结果
                </p>
              </div>

              <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <Target className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-blue-900 mb-3">
                  置信区间
                </h3>
                <p className="text-blue-700">
                  不仅提供点预测， 还能给出预测的置信区间， 量化预测的不确定性
                </p>
              </div>

              <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                  <CheckCircle className="w-6 h-6 text-purple-600" />
                </div>
                <h3 className="text-lg font-semibold text-purple-900 mb-3">
                  广泛应用
                </h3>
                <p className="text-purple-700">
                  在经济学、金融学等领域 应用广泛，是时间序列分析 的经典方法
                </p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                ARIMA(p,d,q)模型组成
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-lg p-4">
                  <h4 className="font-medium text-gray-800 mb-3">
                    🔄 AR(p) - 自回归
                  </h4>
                  <ul className="space-y-2 text-gray-600 text-sm">
                    <li>• 当前值与过去p个值相关</li>
                    <li>• 捕捉数据的自相关性</li>
                    <li>• 适合有记忆效应的序列</li>
                  </ul>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <h4 className="font-medium text-gray-800 mb-3">
                    📈 I(d) - 差分
                  </h4>
                  <ul className="space-y-2 text-gray-600 text-sm">
                    <li>• 通过d次差分使序列平稳</li>
                    <li>• 消除趋势和季节性</li>
                    <li>• 满足ARIMA建模前提</li>
                  </ul>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <h4 className="font-medium text-gray-800 mb-3">
                    📊 MA(q) - 移动平均
                  </h4>
                  <ul className="space-y-2 text-gray-600 text-sm">
                    <li>• 当前值与过去q个误差相关</li>
                    <li>• 捕捉随机冲击的影响</li>
                    <li>• 平滑随机波动</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
              <h4 className="font-semibold text-green-800 mb-3">
                🎯 ARIMA建模流程
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-green-700">
                <div>
                  <h5 className="font-medium mb-2">建模步骤：</h5>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>平稳性检验（ADF检验）</li>
                    <li>确定差分阶数d</li>
                    <li>识别AR和MA阶数p、q</li>
                    <li>参数估计和模型诊断</li>
                  </ol>
                </div>
                <div>
                  <h5 className="font-medium mb-2">适用场景：</h5>
                  <ul className="list-disc list-inside space-y-1">
                    <li>有趋势的时间序列</li>
                    <li>需要置信区间的预测</li>
                    <li>中长期预测需求</li>
                    <li>经济金融数据分析</li>
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
                <Activity className="w-10 h-10 text-blue-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                平稳性检验
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                使用ADF单位根检验来判断时间序列是否平稳，这是ARIMA建模的重要前提
              </p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
              <h3 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
                ADF单位根检验结果
              </h3>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-red-50 rounded-xl p-6 border border-red-200">
                  <h4 className="text-lg font-semibold text-red-800 mb-4">
                    原始序列检验
                  </h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-red-700">ADF统计量</span>
                      <span className="font-mono font-bold text-red-900">
                        -1.245
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-red-700">p值</span>
                      <span className="font-mono font-bold text-red-900">
                        0.652
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-red-700">1%临界值</span>
                      <span className="font-mono text-red-800">-3.482</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-red-700">5%临界值</span>
                      <span className="font-mono text-red-800">-2.884</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-red-700">10%临界值</span>
                      <span className="font-mono text-red-800">-2.579</span>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-red-100 rounded-lg">
                    <div className="text-red-800 font-semibold mb-1">
                      检验结论
                    </div>
                    <div className="text-red-700 text-sm">
                      ❌ 序列非平稳 (p值大于0.05)
                      <br />
                      需要进行差分处理
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 rounded-xl p-6 border border-green-200">
                  <h4 className="text-lg font-semibold text-green-800 mb-4">
                    一阶差分后检验
                  </h4>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-green-700">ADF统计量</span>
                      <span className="font-mono font-bold text-green-900">
                        -4.127
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-green-700">p值</span>
                      <span className="font-mono font-bold text-green-900">
                        0.001
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-green-700">1%临界值</span>
                      <span className="font-mono text-green-800">-3.482</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-green-700">5%临界值</span>
                      <span className="font-mono text-green-800">-2.884</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-green-700">10%临界值</span>
                      <span className="font-mono text-green-800">-2.579</span>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-green-100 rounded-lg">
                    <div className="text-green-800 font-semibold mb-1">
                      检验结论
                    </div>
                    <div className="text-green-700 text-sm">
                      ✓ 序列平稳 (p值小于0.01)
                      <br />
                      可以进行ARIMA建模
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <h4 className="font-semibold text-blue-800 mb-3">
                📊 ADF检验原理
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-blue-700">
                <div>
                  <h5 className="font-medium mb-2">检验假设：</h5>
                  <ul className="space-y-1">
                    <li>
                      <strong>H₀</strong>: 序列存在单位根（非平稳）
                    </li>
                    <li>
                      <strong>H₁</strong>: 序列不存在单位根（平稳）
                    </li>
                  </ul>
                </div>
                <div>
                  <h5 className="font-medium mb-2">判断标准：</h5>
                  <ul className="space-y-1">
                    <li>• ADF统计量小于临界值时拒绝H₀</li>
                    <li>• p值小于0.05时序列平稳</li>
                    <li>• 否则需要继续差分</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
              <h4 className="font-semibold text-yellow-800 mb-3">
                💡 检验结果解读
              </h4>
              <div className="text-yellow-700 text-sm space-y-2">
                <p>
                  • <strong>原始序列</strong>
                  ：ADF统计量(-1.245)大于所有临界值，p值(0.652)远大于0.05，表明序列非平稳
                </p>
                <p>
                  • <strong>一阶差分后</strong>
                  ：ADF统计量(-4.127)小于1%临界值(-3.482)，p值(0.001)小于0.01，强烈拒绝原假设
                </p>
                <p>
                  • <strong>结论</strong>
                  ：原始序列为I(1)序列，即一阶单整序列，需要一次差分才能平稳
                </p>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="w-10 h-10 text-purple-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                差分阶数选择
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                根据平稳性检验结果，确定ARIMA模型中的差分阶数d
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">
                  差分阶数配置
                </h3>

                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      差分阶数 d：{dValue}
                    </label>
                    <div className="flex items-center space-x-4">
                      <input
                        type="range"
                        min="0"
                        max="2"
                        step="1"
                        value={dValue}
                        onChange={(e) => setDValue(Number(e.target.value))}
                        className="flex-1"
                      />
                      <span className="text-lg font-semibold text-purple-600 w-8">
                        {dValue}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      根据ADF检验结果，建议选择d=1
                    </p>
                  </div>

                  <div className="bg-purple-50 rounded-lg p-4">
                    <h4 className="font-medium text-purple-800 mb-2">
                      当前选择效果
                    </h4>
                    <div className="text-purple-700 text-sm">
                      {dValue === 0 && "d=0：不进行差分，适用于已经平稳的序列"}
                      {dValue === 1 &&
                        "d=1：一阶差分，消除线性趋势，使序列平稳"}
                      {dValue === 2 &&
                        "d=2：二阶差分，消除二次趋势，但可能过度差分"}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">
                  差分效果对比
                </h3>

                <div className="space-y-4">
                  {[
                    {
                      d: 0,
                      desc: "原始序列",
                      adf: -1.245,
                      pValue: 0.652,
                      status: "non-stationary",
                      color: "bg-red-100 text-red-700 border-red-200",
                    },
                    {
                      d: 1,
                      desc: "一阶差分",
                      adf: -4.127,
                      pValue: 0.001,
                      status: "stationary",
                      color: "bg-green-100 text-green-700 border-green-200",
                    },
                    {
                      d: 2,
                      desc: "二阶差分",
                      adf: -6.234,
                      pValue: 0.0,
                      status: "over-differenced",
                      color: "bg-yellow-100 text-yellow-700 border-yellow-200",
                    },
                  ].map((option) => (
                    <div
                      key={option.d}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        dValue === option.d
                          ? "border-purple-500 bg-purple-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                      onClick={() => setDValue(option.d)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-gray-900">
                          d = {option.d}
                        </span>
                        <span
                          className={`px-2 py-1 text-xs rounded-full border ${option.color}`}
                        >
                          {option.desc}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-600">ADF: </span>
                          <span className="font-mono">{option.adf}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">p值: </span>
                          <span className="font-mono">{option.pValue}</span>
                        </div>
                      </div>
                      <div className="text-xs mt-2">
                        {option.status === "stationary" && (
                          <span className="text-green-600">✓ 平稳</span>
                        )}
                        {option.status === "non-stationary" && (
                          <span className="text-red-600">× 非平稳</span>
                        )}
                        {option.status === "over-differenced" && (
                          <span className="text-yellow-600">
                            ⚠ 可能过度差分
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
              <h4 className="font-semibold text-green-800 mb-3">
                🎯 差分阶数选择建议
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-green-700">
                <div>
                  <h5 className="font-medium mb-2">选择原则：</h5>
                  <ul className="list-disc list-inside space-y-1">
                    <li>选择使序列平稳的最小差分阶数</li>
                    <li>避免过度差分导致信息丢失</li>
                    <li>通常d不超过2</li>
                    <li>结合ADF检验和图形分析</li>
                  </ul>
                </div>
                <div>
                  <h5 className="font-medium mb-2">当前建议：</h5>
                  <div className="bg-white rounded p-3">
                    <div className="font-semibold text-green-800">
                      推荐 d = 1
                    </div>
                    <div className="text-green-600 text-xs mt-1">
                      • ADF检验显示一阶差分后序列平稳
                      <br />• p值显著小于0.05
                      <br />• 避免了过度差分的风险
                    </div>
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
                <Zap className="w-10 h-10 text-indigo-600" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                自动参数寻优计算结果
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                基于您选择的差分阶数，系统将自动确定最优的p和q参数，并计算ARIMA模型
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">
                  参数寻优配置
                </h3>

                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">差分阶数 (d)</span>
                    <span className="font-semibold text-gray-900">
                      {dValue}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">p参数搜索范围</span>
                    <span className="font-semibold text-gray-900">0 - 5</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">q参数搜索范围</span>
                    <span className="font-semibold text-gray-900">0 - 5</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">优化准则</span>
                    <span className="font-semibold text-gray-900">AIC最小</span>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-indigo-50 rounded-lg">
                  <h4 className="font-medium text-indigo-800 mb-2">
                    自动寻优说明
                  </h4>
                  <p className="text-indigo-700 text-sm">
                    系统将在指定范围内搜索所有可能的(p,q)组合，
                    基于AIC准则选择最优参数，确保模型既有良好的拟合效果，
                    又避免过拟合问题。
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">
                  开始计算
                </h3>

                {!isCalculating ? (
                  <div className="text-center">
                    <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Play className="w-8 h-8 text-indigo-600" />
                    </div>
                    <p className="text-gray-600 mb-6">
                      点击下方按钮开始自动参数寻优和ARIMA模型计算
                    </p>
                    <button
                      onClick={handleCalculate}
                      className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all font-medium"
                    >
                      <Zap className="w-5 h-5" />
                      <span>开始自动寻优</span>
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                      <Zap className="w-8 h-8 text-indigo-600" />
                    </div>
                    <p className="text-gray-600 mb-6">正在进行参数寻优...</p>
                    <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                      <div
                        className="bg-indigo-600 h-3 rounded-full animate-pulse"
                        style={{ width: "60%" }}
                      ></div>
                    </div>
                    <div className="space-y-1 text-sm text-gray-500">
                      <p>正在搜索最优参数组合...</p>
                      <p>当前测试: ARIMA(2,{dValue},1)</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
              <h4 className="font-semibold text-yellow-800 mb-3">
                🔍 寻优过程说明
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-yellow-700">
                <div>
                  <h5 className="font-medium mb-2">第一步：</h5>
                  <p>遍历所有(p,q)组合，拟合ARIMA(p,{dValue},q)模型</p>
                </div>
                <div>
                  <h5 className="font-medium mb-2">第二步：</h5>
                  <p>计算每个模型的AIC值，选择AIC最小的组合</p>
                </div>
                <div>
                  <h5 className="font-medium mb-2">第三步：</h5>
                  <p>验证最优模型的残差是否满足白噪声假设</p>
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
                  ARIMA模型拟合完成
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
                  自动参数寻优完成！最优模型为ARIMA(2,{dValue},1)，
                  模型已通过残差检验，可以用于预测。
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
                          <div className="text-green-600 font-semibold">
                            {pred.predicted.toLocaleString()}件
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>置信区间:</span>
                          <span>
                            {pred.lowerBound.toLocaleString()} -{" "}
                            {pred.upperBound.toLocaleString()}件
                          </span>
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
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-green-800">
                          MAPE (平均绝对百分比误差)
                        </h4>
                        <Target className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="text-2xl font-bold text-green-600">
                        {evaluationMetrics.mape}%
                      </div>
                      <p className="text-sm text-green-700">良好的预测精度</p>
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

                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="text-sm text-blue-600">
                        AIC (信息准则)
                      </div>
                      <div className="text-lg font-bold text-blue-900">
                        {evaluationMetrics.aic}
                      </div>
                      <div className="text-xs text-blue-700">
                        最优模型选择准则
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                <h4 className="font-semibold text-green-800 mb-3">
                  ARIMA(2,{dValue},1)模型特点分析
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-green-700">
                  <div>
                    <h5 className="font-medium mb-2">模型组成：</h5>
                    <ul className="list-disc list-inside space-y-1">
                      <li>AR(2): 当前值与前2期值相关</li>
                      <li>
                        I({dValue}): {dValue}阶差分使序列平稳
                      </li>
                      <li>MA(1): 当前值与前1期误差相关</li>
                      <li>通过AIC准则自动选择</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium mb-2">预测特点：</h5>
                    <ul className="list-disc list-inside space-y-1">
                      <li>提供点预测和区间预测</li>
                      <li>能够捕捉数据的趋势特征</li>
                      <li>适合中长期预测</li>
                      <li>具有统计理论支撑</li>
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
                          ? "bg-green-600 border-green-600 text-white"
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
                        ? "text-green-600"
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
              : "bg-green-600 text-white hover:bg-green-700 shadow-md hover:shadow-lg"
          }`}
        >
          <span>{currentStep === 4 ? "开始寻优" : "下一步"}</span>
          {currentStep === 4 ? (
            <Zap className="w-5 h-5" />
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
                  <span className="text-gray-600">ARIMA参数:</span>
                  <span className="font-medium font-mono">
                    ({lastPrediction.pValue},{lastPrediction.dValue},
                    {lastPrediction.qValue})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">优化方法:</span>
                  <span className="font-medium">AIC准则自动寻优</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-gray-900 mb-3">评估指标</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center p-2 bg-green-50 rounded">
                  <div className="font-bold text-green-600">
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
                <div className="text-center p-2 bg-blue-50 rounded">
                  <div className="font-bold text-blue-600">
                    {lastPrediction.metrics.aic}
                  </div>
                  <div className="text-gray-600">AIC</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ARIMAModel;
