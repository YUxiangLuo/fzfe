import React, { useState } from 'react';
import { AppState } from '../../App';
import { Brain, Settings, Play, Zap, Layers, CheckCircle, TrendingUp, Award, X, History } from 'lucide-react';

interface Props {
  appState: AppState;
  updateAppState: (updates: Partial<AppState>) => void;
  completeStep: (step: number) => void;
}

const LSTMModel: React.FC<Props> = ({ completeStep }) => {
  const [hiddenUnits, setHiddenUnits] = useState(50);
  const [timeSteps, setTimeSteps] = useState(12);
  const [epochs, setEpochs] = useState(100);
  const [learningRate, setLearningRate] = useState(0.001);
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
      setTrainingProgress(prev => {
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
      timestamp: new Date().toLocaleString('zh-CN'),
      hiddenUnits,
      timeSteps,
      epochs,
      learningRate,
      predictions,
      metrics: evaluationMetrics
    });
  };

  const handleCompleteStep = () => {
    setShowModal(false);
    setHasHistory(true);
    setLastPrediction({
      timestamp: new Date().toLocaleString('zh-CN'),
      hiddenUnits,
      timeSteps,
      epochs,
      learningRate,
      predictions,
      metrics: evaluationMetrics
    });
    completeStep(5);
  };

  // 模拟LSTM预测结果
  const predictions = [
    { month: '2025-01', predicted: 1920, confidence: 0.92 },
    { month: '2025-02', predicted: 2350, confidence: 0.89 },
    { month: '2025-03', predicted: 1850, confidence: 0.91 },
    { month: '2025-04', predicted: 1780, confidence: 0.88 },
    { month: '2025-05', predicted: 2180, confidence: 0.90 },
    { month: '2025-06', predicted: 2520, confidence: 0.87 },
  ];

  // 模拟评估指标
  const evaluationMetrics = {
    mape: 8.2,
    rmse: 245,
    r2: 0.92
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
                <h2 className="text-xl font-semibold text-green-800">LSTM神经网络训练完成</h2>
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
                  深度学习模型训练完成！网络已学习到复杂的时间序列模式，以下是高精度预测结果。
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
                          <div className="text-right">
                            <div className="text-purple-600 font-semibold">{pred.predicted.toLocaleString()}件</div>
                            <div className="text-xs text-gray-500">置信度: {(pred.confidence * 100).toFixed(0)}%</div>
                          </div>
                          <TrendingUp className="w-4 h-4 text-green-500" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
                    <Award className="w-5 h-5 mr-2 text-yellow-500" />
                    模型评估指标 (最优)
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-green-800">MAPE (平均绝对百分比误差)</h4>
                        <Award className="w-5 h-5 text-green-600" />
                      </div>
                      <div className="text-2xl font-bold text-green-600">{evaluationMetrics.mape}%</div>
                      <p className="text-sm text-green-700">优秀！低于10%为高精度预测</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-white rounded-lg">
                        <div className="text-sm text-purple-600">RMSE</div>
                        <div className="text-lg font-bold text-purple-900">{evaluationMetrics.rmse}</div>
                      </div>
                      <div className="p-3 bg-white rounded-lg">
                        <div className="text-sm text-purple-600">R²</div>
                        <div className="text-lg font-bold text-purple-900">{evaluationMetrics.r2}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
                <h4 className="font-semibold text-purple-800 mb-3">LSTM模型优势分析</h4>
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
                <button
                  onClick={handleCompleteStep}
                  className="px-8 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 shadow-md hover:shadow-lg transition-all"
                >
                  完成LSTM模型学习，继续下一步
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Brain className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">LSTM神经网络</h1>
              <p className="text-gray-600">Long Short-Term Memory Neural Network</p>
            </div>
          </div>
          
          <p className="text-lg text-gray-600">
            LSTM是一种特殊的循环神经网络，能够学习长期依赖关系。
            通过门控机制，LSTM可以有效处理时间序列中的复杂模式和长期趋势。
          </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6 min-h-0">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                网络架构配置
              </h2>
              
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
                      onChange={(e) => setLearningRate(Number(e.target.value))}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value={0.01}>0.01 (快速)</option>
                      <option value={0.001}>0.001 (标准)</option>
                      <option value={0.0001}>0.0001 (精细)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Layers className="w-5 h-5 mr-2" />
                网络结构可视化
              </h3>
              
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mb-2">
                      <span className="text-sm font-bold text-blue-600">输入层</span>
                    </div>
                    <p className="text-xs text-gray-600">{timeSteps} 时间步</p>
                  </div>
                  
                  <div className="flex-1 flex items-center justify-center">
                    <div className="w-8 h-0.5 bg-gray-400"></div>
                    <Zap className="w-4 h-4 text-yellow-500 mx-2" />
                    <div className="w-8 h-0.5 bg-gray-400"></div>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-16 h-16 bg-purple-100 rounded-lg flex items-center justify-center mb-2">
                      <span className="text-sm font-bold text-purple-600">LSTM</span>
                    </div>
                    <p className="text-xs text-gray-600">{hiddenUnits} 单元</p>
                  </div>
                  
                  <div className="flex-1 flex items-center justify-center">
                    <div className="w-8 h-0.5 bg-gray-400"></div>
                    <Zap className="w-4 h-4 text-yellow-500 mx-2" />
                    <div className="w-8 h-0.5 bg-gray-400"></div>
                  </div>
                  
                  <div className="text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-lg flex items-center justify-center mb-2">
                      <span className="text-sm font-bold text-green-600">输出层</span>
                    </div>
                    <p className="text-xs text-gray-600">预测值</p>
                  </div>
                </div>
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
                    : 'bg-purple-600 text-white hover:bg-purple-700 shadow-md hover:shadow-lg'
                }`}
              >
                <Play className="w-5 h-5" />
                <span>{isTraining ? '训练中...' : '开始训练模型'}</span>
              </button>

              {isTraining && (
                <div className="mt-4 space-y-3">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className="bg-purple-600 h-3 rounded-full transition-all duration-300"
                      style={{ width: `${trainingProgress}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Epoch {Math.floor(trainingProgress * epochs / 100)}/{epochs}</span>
                    <span>{trainingProgress}%</span>
                  </div>
                  <p className="text-sm text-gray-600 text-center">
                    正在训练神经网络，学习时间序列模式...
                  </p>
                </div>
              )}
            </div>

            <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-purple-800 mb-3">LSTM原理</h3>
              <div className="space-y-3 text-sm text-purple-700">
                <div>
                  <h4 className="font-medium">核心组件：</h4>
                  <ul className="list-disc list-inside space-y-1 mt-1">
                    <li>遗忘门：决定丢弃哪些信息</li>
                    <li>输入门：决定存储哪些新信息</li>
                    <li>输出门：决定输出哪些信息</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium">优势：</h4>
                  <ul className="list-disc list-inside space-y-1 mt-1">
                    <li>处理长期依赖关系</li>
                    <li>自动特征提取</li>
                    <li>适合复杂时间模式</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium">注意事项：</h4>
                  <p className="text-purple-600">需要足够的训练数据和计算资源</p>
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
              <h4 className="font-medium text-gray-900 mb-3">网络配置</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">隐藏层单元:</span>
                  <span className="font-medium">{lastPrediction.hiddenUnits}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">时间步长:</span>
                  <span className="font-medium">{lastPrediction.timeSteps}个月</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">训练轮数:</span>
                  <span className="font-medium">{lastPrediction.epochs}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">学习率:</span>
                  <span className="font-medium">{lastPrediction.learningRate}</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium text-gray-900 mb-3">评估指标</h4>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center p-2 bg-purple-50 rounded">
                  <div className="font-bold text-purple-600">{lastPrediction.metrics.mape}%</div>
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

export default LSTMModel;