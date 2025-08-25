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
            分析模型预测效果，比较不同算法的准确性和适用性。
            学习如何使用各种评估指标来判断模型质量。
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">模型对比结果</h2>
            
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-green-800">LSTM神经网络</h3>
                  <Award className="w-5 h-5 text-green-600" />
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-green-600">MAPE</p>
                    <p className="font-bold text-green-800">8.2%</p>
                  </div>
                  <div>
                    <p className="text-green-600">RMSE</p>
                    <p className="font-bold text-green-800">245</p>
                  </div>
                  <div>
                    <p className="text-green-600">R²</p>
                    <p className="font-bold text-green-800">0.92</p>
                  </div>
                </div>
              </div>

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

            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                <span className="text-sm text-gray-600">LSTM预测值</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                <span className="text-sm text-gray-600">移动平均预测值</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-gray-500 rounded-full"></div>
                <span className="text-sm text-gray-600">ARIMA预测值</span>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                <span className="text-sm text-gray-600">实际销量</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">评估指标说明</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
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