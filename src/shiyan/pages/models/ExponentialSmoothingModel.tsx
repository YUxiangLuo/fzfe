import React, { useState } from 'react';
import { AppState } from '../../App';
import { TrendingUp, Settings, Play, BarChart, CheckCircle, Target, X, History } from 'lucide-react';

import { useNavigate } from 'react-router-dom';

interface Props {
  appState: AppState;
  updateAppState: (updates: Partial<AppState>) => void;
  completeStep: (step: number) => void;
}

const ExponentialSmoothingModel: React.FC<Props> = ({ completeStep }) => {
  const navigate = useNavigate();
  const [alpha, setAlpha] = useState(0.3);
  const [beta, setBeta] = useState(0.1);
  const [gamma, setGamma] = useState(0.1);
  const [smoothingType, setSmoothingType] = useState('simple');
  const [isTraining, setIsTraining] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [hasHistory, setHasHistory] = useState(false);
  const [lastPrediction, setLastPrediction] = useState<any>(null);

  const handleTrainModel = async () => {
    setIsTraining(true);
    // 模拟训练过程
    setTimeout(() => {
      setIsTraining(false);
      setShowModal(true);
    }, 2500);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setHasHistory(true);
    setLastPrediction({
      timestamp: new Date().toLocaleString('zh-CN'),
      alpha,
      beta,
      gamma,
      smoothingType,
      predictions,
      metrics: evaluationMetrics
    });
    completeStep(5);
    completeStep(5);
  };

  const handleCompleteStep = () => {
    setShowModal(false);
    setHasHistory(true);
    setLastPrediction({
      timestamp: new Date().toLocaleString('zh-CN'),
      alpha,
      beta,
      gamma,
      smoothingType,
      predictions,
      metrics: evaluationMetrics
    });
    completeStep(5);
    // 跳转到结果评估页面
    navigate('/evaluation');
  };

  // 模拟指数平滑预测结果
  const predictions = [
    { month: '2025-01', predicted: 1890, trend: 'stable' },
    { month: '2025-02', predicted: 2250, trend: 'up' },
    { month: '2025-03', predicted: 1840, trend: 'down' },
    { month: '2025-04', predicted: 1770, trend: 'down' },
    { month: '2025-05', predicted: 2120, trend: 'up' },
    { month: '2025-06', predicted: 2420, trend: 'up' },
  ];

  // 模拟评估指标
  const evaluationMetrics = {
    mape: 11.3,
    rmse: 356,
    r2: 0.87
  };

  const getSmoothingTypeDescription = (type: string) => {
    const descriptions = {
      simple: '简单指数平滑，适合无趋势无季节性的数据',
      double: '双重指数平滑，适合有趋势但无季节性的数据',
      triple: '三重指数平滑，适合既有趋势又有季节性的数据'
    };
    return descriptions[type as keyof typeof descriptions];
  };

  return (
    <div className="h-full">
      {/* 预测结果弹窗 */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <h2 className="text-xl font-semibold text-green-800">指数平滑法预测完成</h2>
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
                  {smoothingType === 'simple' ? '简单' : smoothingType === 'double' ? '双重' : '三重'}指数平滑模型训练完成！
                  模型已学习到数据的平滑模式，对近期数据赋予了更高的权重。
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">未来6个月预测结果</h3>
                  
                  <div className="space-y-3">
                    {predictions.map((pred, index) => (
                      <div key={index} className="p-3 bg-white rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{pred.month}</span>
                          <div className="flex items-center space-x-2">
                            <div className="text-orange-600 font-semibold">{pred.predicted.toLocaleString()}件</div>
                            <div className={`w-2 h-2 rounded-full ${
                              pred.trend === 'up' ? 'bg-green-500' : 
                              pred.trend === 'down' ? 'bg-red-500' : 'bg-gray-500'
                            }`}></div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          趋势: {pred.trend === 'up' ? '上升' : pred.trend === 'down' ? '下降' : '平稳'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">模型评估指标</h3>
                  
                  <div className="space-y-4">
                    <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-orange-800">MAPE (平均绝对百分比误差)</h4>
                        <Target className="w-5 h-5 text-orange-600" />
                      </div>
                      <div className="text-2xl font-bold text-orange-600">{evaluationMetrics.mape}%</div>
                      <p className="text-sm text-orange-700">良好的预测精度，优于简单移动平均</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-white rounded-lg">
                        <div className="text-sm text-gray-600">RMSE</div>
                        <div className="text-lg font-bold text-gray-900">{evaluationMetrics.rmse}</div>
                      </div>
                      <div className="p-3 bg-white rounded-lg">
                        <div className="text-sm text-gray-600">R²</div>
                        <div className="text-lg font-bold text-gray-900">{evaluationMetrics.r2}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
                <h4 className="font-semibold text-orange-800 mb-3">指数平滑法特点分析</h4>
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

      <div className="mb-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">指数平滑法</h1>
            <p className="text-gray-600">Exponential Smoothing</p>
          </div>
        </div>
        
        <p className="text-lg text-gray-600">
          指数平滑法是一种加权移动平均方法，对近期观测值赋予更高的权重，
          能够快速响应数据变化，特别适合需求波动较大的产品预测。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6 min-h-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              平滑参数配置
            </h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  平滑类型
                </label>
                <div className="space-y-2">
                  {[
                    { id: 'simple', name: '简单指数平滑', desc: '适合无趋势无季节性' },
                    { id: 'double', name: '双重指数平滑', desc: '适合有趋势无季节性' },
                    { id: 'triple', name: '三重指数平滑', desc: '适合有趋势有季节性' }
                  ].map((type) => (
                    <label key={type.id} className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="smoothingType"
                        value={type.id}
                        checked={smoothingType === type.id}
                        onChange={(e) => setSmoothingType(e.target.value)}
                        className="mt-1"
                      />
                      <div>
                        <div className="font-medium text-gray-900">{type.name}</div>
                        <div className="text-sm text-gray-600">{type.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    α (水平平滑系数): {alpha}
                  </label>
                  <input 
                    type="range"
                    min="0.1"
                    max="0.9"
                    step="0.1"
                    value={alpha}
                    onChange={(e) => setAlpha(Number(e.target.value))}
                    className="w-full"
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    控制对最新观测值的权重
                  </p>
                </div>
                
                {smoothingType !== 'simple' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      β (趋势平滑系数): {beta}
                    </label>
                    <input 
                      type="range"
                      min="0.0"
                      max="0.5"
                      step="0.1"
                      value={beta}
                      onChange={(e) => setBeta(Number(e.target.value))}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      控制趋势变化的敏感度
                    </p>
                  </div>
                )}
                
                {smoothingType === 'triple' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      γ (季节平滑系数): {gamma}
                    </label>
                    <input 
                      type="range"
                      min="0.0"
                      max="0.5"
                      step="0.1"
                      value={gamma}
                      onChange={(e) => setGamma(Number(e.target.value))}
                      className="w-full"
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      控制季节性变化的敏感度
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <BarChart className="w-5 h-5 mr-2" />
              权重分布可视化
            </h3>
            
            <div className="bg-gray-50 rounded-lg p-6">
              <div className="space-y-3">
                <div className="text-sm text-gray-600 mb-4">数据点权重分布 (α = {alpha})</div>
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
                      <span className="text-sm w-16 text-right">{(weight * 100).toFixed(1)}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6 min-h-0">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">模型训练</h3>
            
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">当前配置:</div>
              <div className="font-mono text-sm font-bold text-gray-900">
                {smoothingType === 'simple' ? '简单' : smoothingType === 'double' ? '双重' : '三重'}指数平滑
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {getSmoothingTypeDescription(smoothingType)}
              </div>
            </div>
            
            <button
              onClick={handleTrainModel}
              disabled={isTraining}
              className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all ${
                isTraining
                  ? 'bg-gray-400 text-white cursor-not-allowed'
                  : 'bg-orange-600 text-white hover:bg-orange-700 shadow-md hover:shadow-lg'
              }`}
            >
              <Play className="w-5 h-5" />
              <span>{isTraining ? '计算中...' : '开始模型训练'}</span>
            </button>

            {isTraining && (
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-orange-600 h-2 rounded-full animate-pulse" style={{ width: '75%' }}></div>
                </div>
                <p className="text-sm text-gray-600 mt-2 text-center">正在计算指数平滑值...</p>
              </div>
            )}
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-orange-800 mb-3">算法原理</h3>
            <div className="space-y-3 text-sm text-orange-700">
              <div>
                <h4 className="font-medium">核心思想：</h4>
                <p className="font-mono bg-white p-2 rounded mt-1 text-xs">
                  S(t) = α×X(t) + (1-α)×S(t-1)
                </p>
              </div>
              <div>
                <h4 className="font-medium">参数含义：</h4>
                <ul className="list-disc list-inside space-y-1 mt-1">
                  <li>α越大，对新数据反应越敏感</li>
                  <li>α越小，预测结果越平滑</li>
                  <li>通常α取值0.1-0.3</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium">优缺点：</h4>
                <p className="text-green-700">✓ 快速响应数据变化</p>
                <p className="text-red-700">✗ 对异常值较敏感</p>
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
            <h3 className="text-lg font-semibold text-gray-900">最近预测记录</h3>
            <span className="text-sm text-gray-500">({lastPrediction.timestamp})</span>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-900 mb-3">模型配置</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">平滑类型:</span>
                  <span className="font-medium">
                    {lastPrediction.smoothingType === 'simple' ? '简单指数平滑' : 
                     lastPrediction.smoothingType === 'double' ? '双重指数平滑' : '三重指数平滑'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">α (水平系数):</span>
                  <span className="font-medium">{lastPrediction.alpha}</span>
                </div>
                {lastPrediction.smoothingType !== 'simple' && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">β (趋势系数):</span>
                    <span className="font-medium">{lastPrediction.beta}</span>
                  </div>
                )}
                {lastPrediction.smoothingType === 'triple' && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">γ (季节系数):</span>
                    <span className="font-medium">{lastPrediction.gamma}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-3">评估指标</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center p-2 bg-orange-50 rounded">
                  <div className="font-bold text-orange-600">{lastPrediction.metrics.mape}%</div>
                  <div className="text-gray-600">MAPE</div>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded">
                  <div className="font-bold text-gray-900">{lastPrediction.metrics.rmse}</div>
                  <div className="text-gray-600">RMSE</div>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded">
                  <div className="font-bold text-gray-900">{lastPrediction.metrics.r2}</div>
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