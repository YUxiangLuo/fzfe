import React, { useState } from 'react';
import { AppState } from '../../App';
import { BarChart3, Settings, Play, TrendingUp, CheckCircle, Target, X, History } from 'lucide-react';

interface Props {
  appState: AppState;
  updateAppState: (updates: Partial<AppState>) => void;
  completeStep: (step: number) => void;
}

const MovingAverageModel: React.FC<Props> = ({ appState, updateAppState, completeStep }) => {
  const [windowSize, setWindowSize] = useState(3);
  const [weightType, setWeightType] = useState('simple');
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
    }, 2000);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setHasHistory(true);
    setLastPrediction({
      timestamp: new Date().toLocaleString('zh-CN'),
      windowSize,
      weightType,
      predictions,
      metrics: evaluationMetrics
    });
  };

  const handleCompleteStep = () => {
    setShowModal(false);
    setHasHistory(true);
    setLastPrediction({
      timestamp: new Date().toLocaleString('zh-CN'),
      windowSize,
      weightType,
      predictions,
      metrics: evaluationMetrics
    });
    completeStep(5);
  };

  // 模拟移动平均预测结果
  const predictions = [
    { month: '2025-01', predicted: 1850, actual: null },
    { month: '2025-02', predicted: 2200, actual: null },
    { month: '2025-03', predicted: 1920, actual: null },
    { month: '2025-04', predicted: 1750, actual: null },
    { month: '2025-05', predicted: 2100, actual: null },
    { month: '2025-06', predicted: 2400, actual: null },
  ];

  // 模拟评估指标
  const evaluationMetrics = {
    mape: 12.5,
    rmse: 389,
    r2: 0.85
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
                <h2 className="text-xl font-semibold text-green-800">移动平均法预测完成</h2>
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
                  模型训练完成！以下是基于{windowSize}个月{weightType === 'simple' ? '简单' : weightType === 'weighted' ? '加权' : '指数'}移动平均的预测结果。
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">未来6个月预测结果</h3>
                  
                  <div className="space-y-3">
                    {predictions.map((pred, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-white rounded-lg">
                        <span className="font-medium">{pred.month}</span>
                        <div className="flex items-center space-x-4">
                          <span className="text-blue-600 font-semibold">{pred.predicted.toLocaleString()}件</span>
                          <TrendingUp className="w-4 h-4 text-green-500" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">模型评估指标</h3>
                  
                  <div className="space-y-4">
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-blue-800">MAPE (平均绝对百分比误差)</h4>
                        <Target className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="text-2xl font-bold text-blue-600">{evaluationMetrics.mape}%</div>
                      <p className="text-sm text-blue-700">数值越小表示预测越准确</p>
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

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                <h4 className="font-semibold text-blue-800 mb-3">模型特点分析</h4>
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
                <button
                  onClick={handleCompleteStep}
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md hover:shadow-lg transition-all"
                >
                  完成移动平均法学习，继续下一步
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">移动平均法</h1>
              <p className="text-gray-600">Simple Moving Average (SMA)</p>
            </div>
          </div>
          
          <p className="text-lg text-gray-600">
            移动平均法是最简单直观的时间序列预测方法，通过计算过去几个时期的平均值来预测未来。
            适合数据相对平稳、没有明显趋势的情况。
          </p>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6 min-h-0">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                参数配置
              </h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    窗口大小（月）
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
                    <span className="text-lg font-semibold text-blue-600 w-8">{windowSize}</span>
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
                      { id: 'simple', name: '简单移动平均', desc: '所有数据点权重相等' },
                      { id: 'weighted', name: '加权移动平均', desc: '近期数据权重更大' },
                      { id: 'exponential', name: '指数移动平均', desc: '指数递减权重' }
                    ].map((type) => (
                      <label key={type.id} className="flex items-start space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name="weightType"
                          value={type.id}
                          checked={weightType === type.id}
                          onChange={(e) => setWeightType(e.target.value)}
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
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">预测结果预览</h3>
              
              <div className="space-y-3">
                {predictions.map((pred, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium">{pred.month}</span>
                    <div className="flex items-center space-x-4">
                      <span className="text-blue-600 font-semibold">{pred.predicted.toLocaleString()}件</span>
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
        </div>

        <div className="space-y-6 min-h-0">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">模型训练</h3>
              
              <button
                onClick={handleTrainModel}
                disabled={isTraining}
                className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all ${
                  isTraining
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
                }`}
              >
                <Play className="w-5 h-5" />
                <span>{isTraining ? '计算中...' : '开始计算预测'}</span>
              </button>

              {isTraining && (
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '70%' }}></div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2 text-center">正在计算移动平均值...</p>
                </div>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-blue-800 mb-3">算法原理</h3>
              <div className="space-y-3 text-sm text-blue-700">
                <div>
                  <h4 className="font-medium">计算公式：</h4>
                  <p className="font-mono bg-white p-2 rounded mt-1">
                    MA(t) = (X₁ + X₂ + ... + Xₙ) / n
                  </p>
                </div>
                <div>
                  <h4 className="font-medium">适用场景：</h4>
                  <ul className="list-disc list-inside space-y-1 mt-1">
                    <li>数据相对平稳</li>
                    <li>短期预测</li>
                    <li>快速获得预测结果</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium">优缺点：</h4>
                  <p className="text-green-700">✓ 简单易懂，计算快速</p>
                  <p className="text-red-700">✗ 无法捕捉趋势和季节性</p>
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
              <h4 className="font-medium text-gray-900 mb-3">预测配置</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">窗口大小:</span>
                  <span className="font-medium">{lastPrediction.windowSize}个月</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">权重类型:</span>
                  <span className="font-medium">
                    {lastPrediction.weightType === 'simple' ? '简单移动平均' : 
                     lastPrediction.weightType === 'weighted' ? '加权移动平均' : '指数移动平均'}
                  </span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-3">评估指标</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center p-2 bg-blue-50 rounded">
                  <div className="font-bold text-blue-600">{lastPrediction.metrics.mape}%</div>
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

export default MovingAverageModel;