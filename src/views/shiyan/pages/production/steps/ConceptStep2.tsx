import React, { useEffect } from 'react';
import { TrendingUp, ArrowRight, CheckCircle } from 'lucide-react';
import { useProductionPlan } from '../ProductionPlanContextV2';

const ConceptStep2: React.FC = () => {
  const { state, fillPeriod2Field, completeCurrentStep } = useProductionPlan();

  // 自动计算并填充预测需求
  useEffect(() => {
    if (state.period2Data.demandForecast === null) {
      const demandForecast = Math.round(state.demoPrediction);
      fillPeriod2Field('demandForecast', demandForecast);
    }
  }, []);

  const demandForecast = state.period2Data.demandForecast || Math.round(state.demoPrediction);

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-3">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
          <TrendingUp className="w-6 h-6 text-green-600" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-gray-900">第1列：预测需求</h3>
          <p className="text-sm text-green-600">Demand Forecast</p>
        </div>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <h4 className="font-semibold text-green-800 mb-2">📊 什么是预测需求？</h4>
        <p className="text-sm text-green-700">
          预测需求是基于历史数据和最佳预测模型（如LSTM、ARIMA等）预测出的未来市场需求量。它是制定生产计划的基础输入，决定了我们需要准备多少产品来满足市场。
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h4 className="font-semibold text-gray-800 mb-3">第2期的预测需求</h4>
        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">使用最佳模型（{state.selectedBestModel.toUpperCase()}）预测：</p>
              <p className="text-3xl font-bold text-blue-600 mt-1">
                {demandForecast.toLocaleString()} <span className="text-lg">件</span>
              </p>
            </div>
            {state.period2Data.demandForecast !== null && (
              <CheckCircle className="w-8 h-8 text-green-600" />
            )}
          </div>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          原始预测值：{state.demoPrediction.toFixed(2)}，四舍五入后为 {demandForecast}
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h4 className="font-semibold text-blue-800 mb-2">👉 查看右侧表格</h4>
        <p className="text-sm text-blue-700">
          现在请查看右侧MPS表格的<strong className="text-blue-900">第2期第1列（预测需求）</strong>，您会看到刚才计算的值已经自动填充了！
        </p>
      </div>

      <button
        onClick={completeCurrentStep}
        className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-md hover:shadow-lg transition-all font-medium"
      >
        <span>理解了，学习下一个变量：安全库存</span>
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
};

export default ConceptStep2;
