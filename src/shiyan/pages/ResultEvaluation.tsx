import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AppState } from '../App';
import { TrendingUp, Target, Award } from 'lucide-react';

interface Props {
  appState: AppState;
  updateAppState: (updates: Partial<AppState>) => void;
  completeStep: (step: number) => void;
}

const ResultEvaluation: React.FC<Props> = ({ completeStep }) => {
  const navigate = useNavigate();

  const handleNext = () => {
    completeStep(6);
    navigate('/production');
  };

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">评估预测结果</h1>
          <p className="text-lg text-gray-600">
            分析各种预测模型的效果，比较不同算法的准确性和适用性。
            学习如何使用各种评估指标来判断模型质量，选择最优预测方案。
          </p>
        </div>

        <div className="space-y-8 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">基础预测模型对比</h2>
            
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-blue-800">移动平均法</h3>
                  <Target className="w-5 h-5 text-blue-600" />
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-blue-600">MAPE</p>
                    <p className="font-bold text-blue-800">12.5%</p>
                  </div>
                  <div>
                    <p className="text-blue-600">RMSE</p>
                    <p className="font-bold text-blue-800">389</p>
                  </div>
                  <div>
                    <p className="text-blue-600">R²</p>
                    <p className="font-bold text-blue-800">0.85</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-orange-800">指数平滑法</h3>
                  <TrendingUp className="w-5 h-5 text-orange-600" />
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-orange-600">MAPE</p>
                    <p className="font-bold text-orange-800">11.3%</p>
                  </div>
                  <div>
                    <p className="text-orange-600">RMSE</p>
                    <p className="font-bold text-orange-800">356</p>
                  </div>
                  <div>
                    <p className="text-orange-600">R²</p>
                    <p className="font-bold text-orange-800">0.87</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-800">ARIMA模型</h3>
                  <TrendingUp className="w-5 h-5 text-gray-600" />
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">MAPE</p>
                    <p className="font-bold text-gray-800">10.1%</p>
                  </div>
                  <div>
                    <p className="text-gray-600">RMSE</p>
                    <p className="font-bold text-gray-800">312</p>
                  </div>
                  <div>
                    <p className="text-gray-600">R²</p>
                    <p className="font-bold text-gray-800">0.88</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-purple-800">LSTM神经网络</h3>
                  <Award className="w-5 h-5 text-purple-600" />
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-purple-600">MAPE</p>
                    <p className="font-bold text-purple-800">8.2%</p>
                  </div>
                  <div>
                    <p className="text-purple-600">RMSE</p>
                    <p className="font-bold text-purple-800">245</p>
                  </div>
                  <div>
                    <p className="text-purple-600">R²</p>
                    <p className="font-bold text-purple-800">0.92</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">融合预测模型对比</h2>
            
            <div className="space-y-4">
              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-indigo-800">加权平均融合模型</h3>
                  <Award className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-indigo-600">MAPE</p>
                    <p className="font-bold text-indigo-800">7.8%</p>
                  </div>
                  <div>
                    <p className="text-indigo-600">RMSE</p>
                    <p className="font-bold text-indigo-800">228</p>
                  </div>
                  <div>
                    <p className="text-indigo-600">R²</p>
                    <p className="font-bold text-indigo-800">0.94</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-red-800">Boosting融合模型</h3>
                  <Award className="w-5 h-5 text-red-600" />
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-red-600">MAPE</p>
                    <p className="font-bold text-red-800">6.9%</p>
                  </div>
                  <div>
                    <p className="text-red-600">RMSE</p>
                    <p className="font-bold text-red-800">198</p>
                  </div>
                  <div>
                    <p className="text-red-600">R²</p>
                    <p className="font-bold text-red-800">0.96</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-green-800">Stacking融合模型</h3>
                  <Award className="w-5 h-5 text-green-600" />
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-green-600">MAPE</p>
                    <p className="font-bold text-green-800">6.2%</p>
                  </div>
                  <div>
                    <p className="text-green-600">RMSE</p>
                    <p className="font-bold text-green-800">175</p>
                  </div>
                  <div>
                    <p className="text-green-600">R²</p>
                    <p className="font-bold text-green-800">0.97</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">预测结果可视化</h2>
            
            <div className="h-80 bg-gray-50 rounded-lg flex items-center justify-center mb-6">
              <div className="text-center">
                <TrendingUp className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">预测结果对比图表</p>
                <p className="text-sm text-gray-500 mt-2">（显示实际值 vs 各模型预测值）</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">基础模型</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">移动平均法</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">指数平滑法</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 bg-gray-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">ARIMA模型</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 bg-purple-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">LSTM神经网络</span>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 mb-3">融合模型</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 bg-indigo-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">加权平均融合</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">Boosting融合</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">Stacking融合</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm text-gray-600">实际销量</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">评估指标说明</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-sm">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">MAPE（平均绝对百分比误差）</h4>
              <p className="text-gray-600">衡量预测准确性的常用指标，数值越小表示预测越准确。通常低于10%为较好结果。</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">RMSE（均方根误差）</h4>
              <p className="text-gray-600">反映预测值与实际值的偏差程度，对较大误差更加敏感，数值越小越好。</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">R²（决定系数）</h4>
              <p className="text-gray-600">反映模型解释数据变异的能力，取值0-1，越接近1表示模型拟合度越好。</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">模型选择建议</h4>
              <p className="text-gray-600">Stacking融合模型表现最优，适合高精度需求；LSTM适合复杂模式；ARIMA适合传统分析。</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-8">
          <h4 className="font-semibold text-green-800 mb-3">🏆 模型性能排名</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h5 className="font-medium text-green-700 mb-3">按MAPE排序（越小越好）</h5>
              <ol className="space-y-2 text-sm text-green-700">
                <li className="flex items-center space-x-2">
                  <span className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
                  <span>Stacking融合模型 (6.2%)</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
                  <span>Boosting融合模型 (6.9%)</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="w-6 h-6 bg-green-400 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
                  <span>加权平均融合模型 (7.8%)</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="w-6 h-6 bg-yellow-500 text-white rounded-full flex items-center justify-center text-xs font-bold">4</span>
                  <span>LSTM神经网络 (8.2%)</span>
                </li>
              </ol>
            </div>
            <div>
              <h5 className="font-medium text-green-700 mb-3">模型特点总结</h5>
              <div className="space-y-2 text-sm text-green-700">
                <p><strong>融合模型</strong>：通过组合多个基础模型，显著提升预测精度</p>
                <p><strong>深度学习</strong>：LSTM能够捕捉复杂的时间序列模式</p>
                <p><strong>传统方法</strong>：ARIMA和指数平滑法简单可靠，易于解释</p>
                <p><strong>建议</strong>：生产环境推荐使用Stacking融合模型</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between">
          <button
            onClick={() => navigate('/model')}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            上一步
          </button>
          
          <button
            onClick={handleNext}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md hover:shadow-lg transition-all"
          >
            下一步：制定生产计划
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResultEvaluation;