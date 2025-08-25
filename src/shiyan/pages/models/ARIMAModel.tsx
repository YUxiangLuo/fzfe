import React, { useState } from 'react';
import { AppState } from '../../App';
import { TrendingUp, Settings, Play, BarChart, Activity, CheckCircle, Target, X, History } from 'lucide-react';

interface Props {
  appState: AppState;
  updateAppState: (updates: Partial<AppState>) => void;
  completeStep: (step: number) => void;
}

const ARIMAModel: React.FC<Props> = ({ completeStep }) => {
  const [pValue, setPValue] = useState(1);
  const [dValue, setDValue] = useState(1);
  const [qValue, setQValue] = useState(1);
  const [seasonalP, setSeasonalP] = useState(1);
  const [seasonalD, setSeasonalD] = useState(1);
  const [seasonalQ, setSeasonalQ] = useState(1);
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
    }, 3000);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setHasHistory(true);
    setLastPrediction({
      timestamp: new Date().toLocaleString('zh-CN'),
      pValue,
      dValue,
      qValue,
      seasonalP,
      seasonalD,
      seasonalQ,
      predictions,
      metrics: evaluationMetrics
    });
  };

  const handleCompleteStep = () => {
    setShowModal(false);
    setHasHistory(true);
    setLastPrediction({
      timestamp: new Date().toLocaleString('zh-CN'),
      pValue,
      dValue,
      qValue,
      seasonalP,
      seasonalD,
      seasonalQ,
      predictions,
      metrics: evaluationMetrics
    });
    completeStep(5);
  };

  const getParameterDescription = (param: string) => {
    const descriptions = {
      p: '自回归项数，表示当前值与过去p个值的关系',
      d: '差分次数，用于使时间序列平稳',
      q: '移动平均项数，表示当前值与过去q个预测误差的关系'
    };
    return descriptions[param as keyof typeof descriptions];
  };

  // 模拟ARIMA预测结果
  const predictions = [
    { month: '2025-01', predicted: 1880, lowerBound: 1650, upperBound: 2110 },
    { month: '2025-02', predicted: 2280, lowerBound: 2020, upperBound: 2540 },
    { month: '2025-03', predicted: 1820, lowerBound: 1580, upperBound: 2060 },
    { month: '2025-04', predicted: 1750, lowerBound: 1510, upperBound: 1990 },
    { month: '2025-05', predicted: 2150, lowerBound: 1890, upperBound: 2410 },
    { month: '2025-06', predicted: 2450, lowerBound: 2170, upperBound: 2730 },
  ];

  // 模拟评估指标
  const evaluationMetrics = {
    mape: 10.1,
    rmse: 312,
    r2: 0.88,
    aic: 245.8
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
                <h2 className="text-xl font-semibold text-green-800">ARIMA模型拟合完成</h2>
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
                  ARIMA({pValue},{dValue},{qValue})模型拟合完成！模型已捕捉到时间序列的自回归和移动平均特征。
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
                          <div className="text-green-600 font-semibold">{pred.predicted.toLocaleString()}件</div>
                        </div>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>置信区间:</span>
                          <span>{pred.lowerBound.toLocaleString()} - {pred.upperBound.toLocaleString()}件</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6">模型评估指标</h3>
                  
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-green-800">MAPE (平均绝对百分比误差)</h4>
                        <Target className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="text-2xl font-bold text-green-600">{evaluationMetrics.mape}%</div>
                      <p className="text-sm text-green-700">良好的预测精度</p>
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

                    <div className="p-3 bg-blue-50 rounded-lg">
                      <div className="text-sm text-blue-600">AIC (信息准则)</div>
                      <div className="text-lg font-bold text-blue-900">{evaluationMetrics.aic}</div>
                      <div className="text-xs text-blue-700">数值越小，模型越优</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                <h4 className="font-semibold text-green-800 mb-3">ARIMA模型特点分析</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-green-700">
                  <div>
                    <h5 className="font-medium mb-2">模型优势：</h5>
                    <ul className="list-disc list-inside space-y-1">
                      <li>理论基础扎实</li>
                      <li>提供置信区间</li>
                      <li>适合有趋势的数据</li>
                      <li>参数解释性强</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium mb-2">适用场景：</h5>
                    <ul className="list-disc list-inside space-y-1">
                      <li>中长期预测</li>
                      <li>经济时间序列</li>
                      <li>需要统计推断</li>
                      <li>传统预测方法</li>
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
                  className="px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-md hover:shadow-lg transition-all"
                >
                  完成ARIMA模型学习，继续下一步
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">ARIMA模型</h1>
              <p className="text-gray-600">AutoRegressive Integrated Moving Average</p>
            </div>
          </div>
          
          <p className="text-lg text-gray-600">
            ARIMA是经典的时间序列预测模型，结合了自回归(AR)、差分(I)和移动平均(MA)三个组件。
            特别适合处理有趋势但相对平稳的时间序列数据。
          </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6 min-h-0">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                ARIMA(p,d,q) 参数配置
              </h2>
              
              <div className="space-y-6">
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      p 值 (自回归)
                    </label>
                    <div className="space-y-2">
                      <input 
                        type="range"
                        min="0"
                        max="5"
                        value={pValue}
                        onChange={(e) => setPValue(Number(e.target.value))}
                        className="w-full"
                      />
                      <div className="text-center text-lg font-semibold text-blue-600">{pValue}</div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {getParameterDescription('p')}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      d 值 (差分)
                    </label>
                    <div className="space-y-2">
                      <input 
                        type="range"
                        min="0"
                        max="3"
                        value={dValue}
                        onChange={(e) => setDValue(Number(e.target.value))}
                        className="w-full"
                      />
                      <div className="text-center text-lg font-semibold text-green-600">{dValue}</div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {getParameterDescription('d')}
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      q 值 (移动平均)
                    </label>
                    <div className="space-y-2">
                      <input 
                        type="range"
                        min="0"
                        max="5"
                        value={qValue}
                        onChange={(e) => setQValue(Number(e.target.value))}
                        className="w-full"
                      />
                      <div className="text-center text-lg font-semibold text-purple-600">{qValue}</div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {getParameterDescription('q')}
                    </p>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">季节性ARIMA参数 (可选)</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">季节性 P</label>
                      <input 
                        type="number" 
                        value={seasonalP}
                        onChange={(e) => setSeasonalP(Number(e.target.value))}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        min="0"
                        max="3"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">季节性 D</label>
                      <input 
                        type="number" 
                        value={seasonalD}
                        onChange={(e) => setSeasonalD(Number(e.target.value))}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        min="0"
                        max="2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">季节性 Q</label>
                      <input 
                        type="number" 
                        value={seasonalQ}
                        onChange={(e) => setSeasonalQ(Number(e.target.value))}
                        className="w-full p-2 border border-gray-300 rounded-md"
                        min="0"
                        max="3"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Activity className="w-5 h-5 mr-2" />
                模型诊断
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <BarChart className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-blue-800">AIC 信息准则</span>
                  </div>
                  <div className="text-2xl font-bold text-blue-600">245.8</div>
                  <p className="text-sm text-blue-700">数值越小，模型越优</p>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                    <span className="font-medium text-green-800">模型稳定性</span>
                  </div>
                  <div className="text-2xl font-bold text-green-600">良好</div>
                  <p className="text-sm text-green-700">所有根都在单位圆内</p>
                </div>
              </div>
            </div>
        </div>

        <div className="space-y-6 min-h-0">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">模型训练</h3>
              
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">当前配置:</div>
                <div className="font-mono text-lg font-bold text-gray-900">
                  ARIMA({pValue},{dValue},{qValue})
                </div>
                {(seasonalP > 0 || seasonalD > 0 || seasonalQ > 0) && (
                  <div className="font-mono text-sm text-gray-600">
                    季节性({seasonalP},{seasonalD},{seasonalQ})₁₂
                  </div>
                )}
              </div>
              
              <button
                onClick={handleTrainModel}
                disabled={isTraining}
                className={`w-full flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium transition-all ${
                  isTraining
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700 shadow-md hover:shadow-lg'
                }`}
              >
                <Play className="w-5 h-5" />
                <span>{isTraining ? '拟合中...' : '开始模型拟合'}</span>
              </button>

              {isTraining && (
                <div className="mt-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full animate-pulse" style={{ width: '65%' }}></div>
                  </div>
                  <p className="text-sm text-gray-600 mt-2 text-center">正在进行最大似然估计...</p>
                </div>
              )}
            </div>

            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-green-800 mb-3">ARIMA原理</h3>
              <div className="space-y-3 text-sm text-green-700">
                <div>
                  <h4 className="font-medium">模型组成：</h4>
                  <ul className="list-disc list-inside space-y-1 mt-1">
                    <li><strong>AR(p)</strong>: 自回归，用历史值预测</li>
                    <li><strong>I(d)</strong>: 差分，消除趋势</li>
                    <li><strong>MA(q)</strong>: 移动平均，用误差项预测</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium">适用条件：</h4>
                  <ul className="list-disc list-inside space-y-1 mt-1">
                    <li>时间序列相对平稳</li>
                    <li>有一定的自相关性</li>
                    <li>数据量充足(通常&gt;50个观测)</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium">参数选择：</h4>
                  <p className="text-green-600">通过AIC、BIC等准则选择最优参数</p>
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
                  <span className="text-gray-600">ARIMA参数:</span>
                  <span className="font-medium font-mono">({lastPrediction.pValue},{lastPrediction.dValue},{lastPrediction.qValue})</span>
                </div>
                {(lastPrediction.seasonalP > 0 || lastPrediction.seasonalD > 0 || lastPrediction.seasonalQ > 0) && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">季节性参数:</span>
                    <span className="font-medium font-mono">({lastPrediction.seasonalP},{lastPrediction.seasonalD},{lastPrediction.seasonalQ})₁₂</span>
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-3">评估指标</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="text-center p-2 bg-green-50 rounded">
                  <div className="font-bold text-green-600">{lastPrediction.metrics.mape}%</div>
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
                <div className="text-center p-2 bg-blue-50 rounded">
                  <div className="font-bold text-blue-600">{lastPrediction.metrics.aic}</div>
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