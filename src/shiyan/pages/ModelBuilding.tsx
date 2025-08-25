import React from 'react';
import { Routes, Route, Link, useLocation, useNavigate } from 'react-router-dom';
import { AppState } from '../App';
import { Brain, TrendingUp, BarChart3, ArrowRight } from 'lucide-react';
import MovingAverageModel from './models/MovingAverageModel';
import LSTMModel from './models/LSTMModel';
import ARIMAModel from './models/ARIMAModel';

interface Props {
  appState: AppState;
  updateAppState: (updates: Partial<AppState>) => void;
  completeStep: (step: number) => void;
}

const ModelBuilding: React.FC<Props> = ({ appState, updateAppState, completeStep }) => {
  const location = useLocation();
  const navigate = useNavigate();

  console.log('Current location:', location.pathname);

  // 包装completeStep函数，完成后导航到评估页面
  const handleCompleteStep = (step: number) => {
    completeStep(step);
    navigate('/evaluation');
  };

  const models = [
    { 
      id: 'ma', 
      name: '移动平均法', 
      path: 'ma',
      icon: BarChart3,
      description: '简单易理解的经典预测方法，适合平稳数据',
      difficulty: '初级',
      accuracy: '中等',
    },
    { 
      id: 'lstm', 
      name: 'LSTM神经网络', 
      path: 'lstm',
      icon: Brain,
      description: '深度学习方法，擅长捕捉复杂的时间序列模式',
      difficulty: '高级',
      accuracy: '高',
    },
    { 
      id: 'arima', 
      name: 'ARIMA模型', 
      path: 'arima',
      icon: TrendingUp,
      description: '自回归积分滑动平均模型，适合有趋势的数据',
      difficulty: '中级',
      accuracy: '较高',
    },
  ];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case '初级': return 'text-green-600 bg-green-50 border-green-200';
      case '中级': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case '高级': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getAccuracyColor = (accuracy: string) => {
    switch (accuracy) {
      case '高': return 'text-green-600';
      case '较高': return 'text-blue-600';
      case '中等': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const DefaultModelContent = () => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div>
        <Brain className="w-16 h-16 text-blue-600 mx-auto mb-6" />
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">选择预测模型</h2>
        <p className="text-lg text-gray-600 mb-8">
          请从左侧选择一个预测模型开始学习。每种模型都有其特点和适用场景，
          您可以逐一学习和比较不同算法的效果。
        </p>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {models.map((model) => {
            const Icon = model.icon;
            
            return (
              <div key={model.id} className="p-6 bg-gray-50 rounded-lg border border-gray-200 h-full">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{model.name}</h3>
                <p className="text-sm text-gray-600 mb-4">{model.description}</p>
                <div className="flex items-center space-x-3">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getDifficultyColor(model.difficulty)}`}>
                    {model.difficulty}
                  </span>
                  <span className={`text-xs font-medium ${getAccuracyColor(model.accuracy)}`}>
                    {model.accuracy}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-8">
      <div className="w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">预测模型建立</h1>
          <p className="text-lg text-gray-600">
            选择合适的预测算法来分析云裳服饰真丝连衣裙的需求。每种方法都有其特点和适用场景。
          </p>
        </div>

        <div className="flex gap-8">
          {/* 左侧二级路由导航 */}
          <div className="w-80 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">预测模型</h2>
            <nav className="space-y-2">
              {models.map((model) => {
                const Icon = model.icon;
                const isActive = location.pathname === `/model/${model.path}` || 
                                (location.pathname === '/model' && model.path === 'ma');
                
                return (
                  <Link
                    key={model.id}
                    to={`/model/${model.path}`}
                    className={`flex items-center space-x-3 p-3 rounded-lg transition-all ${
                      isActive 
                        ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                        : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <div className="flex-1">
                      <div className="font-medium">{model.name}</div>
                      <div className="text-xs text-gray-500">{model.difficulty} · {model.accuracy}</div>
                    </div>
                    {isActive && <ArrowRight className="w-4 h-4" />}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-800 mb-2">学习建议</h3>
                <div className="text-xs text-blue-700 space-y-1">
                  <p>• 初学者推荐从移动平均法开始</p>
                  <p>• ARIMA适合有统计基础的学生</p>
                  <p>• LSTM体验最新的AI预测技术</p>
                </div>
              </div>
            </div>
          </div>

          {/* 右侧内容区域 */}
          <div className="flex-1 min-h-0">
            <Routes>
              <Route index element={<DefaultModelContent />} />
              <Route path="ma" element={
                <MovingAverageModel 
                  appState={appState} 
                  updateAppState={updateAppState}
                  completeStep={handleCompleteStep}
                />
              } />
              <Route path="lstm" element={
                <LSTMModel 
                  appState={appState} 
                  updateAppState={updateAppState}
                  completeStep={handleCompleteStep}
                />
              } />
              <Route path="arima" element={
                <ARIMAModel 
                  appState={appState} 
                  updateAppState={updateAppState}
                  completeStep={handleCompleteStep}
                />
              } />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModelBuilding;