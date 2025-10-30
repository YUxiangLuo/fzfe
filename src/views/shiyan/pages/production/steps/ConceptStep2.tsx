import React, { useEffect, useState } from 'react';
import { TrendingUp, ArrowRight, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { useProductionPlan } from '../ProductionPlanContextV2';
import { apiClient } from '../../../../../utils/apiClient';

// 模型类型映射
const MODEL_TYPE_MAP: Record<string, string> = {
  'ma': 'ma',
  'exp': 'es',
  'arima': 'arima',
  'lstm': 'lstm',
  'ensemble_weighted': 'weighted_average',
  'ensemble_boosting': 'boosting',
  'ensemble_stacking': 'stacking',
};

const ConceptStep2: React.FC = () => {
  const { state, fillPeriod2Field, completeCurrentStep, updateDemoPrediction } = useProductionPlan();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🆕 调用预测API获取第2期的真实预测值
  useEffect(() => {
    const fetchPrediction = async () => {
      if (state.period2Data.demandForecast !== null) {
        return; // 已经获取过了
      }

      setIsLoading(true);
      setError(null);

      try {
        const modelType = MODEL_TYPE_MAP[state.selectedBestModel];
        if (!modelType) {
          throw new Error(`无效的模型类型: ${state.selectedBestModel}`);
        }

        console.log('📞 调用预测API获取第2期数据:', { model_type: modelType, forecast_steps: 1 });

        const response = await apiClient.post<{
          status: string;
          results: { predictions: Array<{ prediction: number; std_dev: number }> };
        }>('/model/predict', {
          model_type: modelType,
          forecast_steps: 1, // 只预测第1期（作为第2期的演示数据）
        });

        if (response.status === 'success' && response.results?.predictions?.[0]) {
          const prediction = response.results.predictions[0];
          console.log('✅ 获取第2期预测:', prediction);

          // 更新演示预测数据
          updateDemoPrediction(prediction.prediction, prediction.std_dev);

          // 填充第2期的预测需求
          const demandForecast = Math.round(prediction.prediction);
          fillPeriod2Field('demandForecast', demandForecast);
        } else {
          throw new Error('预测API返回数据格式错误');
        }
      } catch (err: any) {
        console.error('获取预测失败:', err);
        setError(err.message || '获取预测失败');

        // 失败时使用历史平均值作为后备
        console.warn('⚠️ 使用历史平均值作为后备');
        const demandForecast = Math.round(state.demoPrediction);
        fillPeriod2Field('demandForecast', demandForecast);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrediction();
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

        {isLoading ? (
          <div className="bg-blue-50 p-4 rounded-lg flex items-center justify-center space-x-3">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            <p className="text-sm text-blue-700">正在调用预测模型获取第2期需求...</p>
          </div>
        ) : error ? (
          <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-orange-700 mb-1">
                  预测获取失败，使用历史平均值作为演示数据
                </p>
                <p className="text-xs text-orange-600">{error}</p>
              </div>
            </div>
          </div>
        ) : null}

        <div className="bg-blue-50 p-4 rounded-lg mt-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                使用最佳模型（
                {state.selectedBestModel === 'ma' && 'MA 移动平均'}
                {state.selectedBestModel === 'exp' && 'ES 指数平滑'}
                {state.selectedBestModel === 'arima' && 'ARIMA'}
                {state.selectedBestModel === 'lstm' && 'LSTM 长短期记忆网络'}
                {state.selectedBestModel === 'ensemble_weighted' && '加权平均集成'}
                {state.selectedBestModel === 'ensemble_boosting' && 'Boosting 集成'}
                {state.selectedBestModel === 'ensemble_stacking' && 'Stacking 集成'}
                ）预测：
              </p>
              <p className="text-3xl font-bold text-blue-600 mt-1">
                {demandForecast.toLocaleString()} <span className="text-lg">件</span>
              </p>
            </div>
            {state.period2Data.demandForecast !== null && !isLoading && (
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
