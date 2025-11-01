import React, { useEffect, useState } from 'react';
import { TrendingUp, ArrowRight, CheckCircle, Loader2, AlertCircle, Award } from 'lucide-react';
import { useProductionPlan } from '../ProductionPlanContextV2';
import { useExperiment } from '../../../contexts/ExperimentContext';
import { apiClient } from '../../../../../utils/apiClient';

// 模型类型映射：前端ID -> 后端API参数
const MODEL_TYPE_MAP: Record<string, string> = {
  'ma': 'ma',
  'exp': 'es',
  'arima': 'arima',
  'lstm': 'lstm',
  'ensemble_weighted': 'weighted_average',
  'ensemble_boosting': 'boosting',
  'ensemble_stacking': 'stacking',
};

// 模型显示名称映射
const MODEL_DISPLAY_NAMES: Record<string, { name: string; description: string }> = {
  'ma': { name: 'MA 移动平均', description: '简单平均法，适合趋势稳定的数据' },
  'exp': { name: 'ES 指数平滑', description: '加权平均法，近期数据权重更高' },
  'arima': { name: 'ARIMA 自回归模型', description: '经典时间序列模型，捕捉趋势和季节性' },
  'lstm': { name: 'LSTM 长短期记忆网络', description: '深度学习模型，捕捉复杂时序模式' },
  'ensemble_weighted': { name: '加权平均集成', description: '多模型加权融合，平衡各模型优势' },
  'ensemble_boosting': { name: 'Boosting 集成', description: '序列集成方法，逐步修正误差' },
  'ensemble_stacking': { name: 'Stacking 集成', description: '分层集成方法，元学习器优化预测' },
};

const ConceptStep2: React.FC = () => {
  const { state, fillPeriod1Data, fillPeriod2Field, completeCurrentStep, updateDemoPrediction } = useProductionPlan();
  const { state: experimentState } = useExperiment();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasFetched, setHasFetched] = useState(false);

  // 📊 从全局状态获取最佳模型信息
  const bestModelId = experimentState.selected_best_model;
  const modelDisplayInfo = bestModelId ? MODEL_DISPLAY_NAMES[bestModelId] : null;

  useEffect(() => {
    const fetched = state.period2Data.demandForecast !== null;
    setHasFetched((prev) => (prev === fetched ? prev : fetched));
  }, [state.period2Data.demandForecast]);

  // 📈 根据模型ID获取对应的性能指标
  const getModelMetrics = (modelId: string | null) => {
    if (!modelId) return null;

    const metricsMap: Record<string, { rmse: number | null; mae: number | null; r2: number | null }> = {
      'ma': {
        rmse: experimentState.moving_average_metrics_rmse,
        mae: experimentState.moving_average_metrics_mae,
        r2: experimentState.moving_average_metrics_r2,
      },
      'exp': {
        rmse: experimentState.exponential_smoothing_metrics_rmse,
        mae: experimentState.exponential_smoothing_metrics_mae,
        r2: experimentState.exponential_smoothing_metrics_r2,
      },
      'arima': {
        rmse: experimentState.arima_metrics_rmse,
        mae: experimentState.arima_metrics_mae,
        r2: experimentState.arima_metrics_r2,
      },
      'lstm': {
        rmse: experimentState.lstm_metrics_rmse,
        mae: experimentState.lstm_metrics_mae,
        r2: experimentState.lstm_metrics_r2,
      },
      'ensemble_weighted': {
        rmse: experimentState.ensemble_weighted_metrics_rmse,
        mae: experimentState.ensemble_weighted_metrics_mae,
        r2: experimentState.ensemble_weighted_metrics_r2,
      },
      'ensemble_boosting': {
        rmse: experimentState.ensemble_boosting_metrics_rmse,
        mae: experimentState.ensemble_boosting_metrics_mae,
        r2: experimentState.ensemble_boosting_metrics_r2,
      },
      'ensemble_stacking': {
        rmse: experimentState.ensemble_stacking_metrics_rmse,
        mae: experimentState.ensemble_stacking_metrics_mae,
        r2: experimentState.ensemble_stacking_metrics_r2,
      },
    };

    return metricsMap[modelId] || null;
  };

  const bestModelMetrics = getModelMetrics(bestModelId);

  const handleFetchPrediction = async () => {
    if (isLoading) return;
    setIsLoading(true);
    setError(null);

    try {
      const modelType = MODEL_TYPE_MAP[state.selectedBestModel];
      if (!modelType) {
        throw new Error(`无效的模型类型: ${state.selectedBestModel}`);
      }

      console.log('📞 调用预测API获取期1和期2数据:', { model_type: modelType, forecast_steps: 2 });

      const response = await apiClient.post<{
        status: string;
        results: { predictions: Array<{ prediction: number; std_dev: number }> };
      }>('/models/predictions', {
        model_type: modelType,
        forecast_steps: 2,
      });

      if (response.status === 'success' && response.results?.predictions?.length >= 2) {
        const period1Prediction = response.results.predictions[0]!;
        const period2Prediction = response.results.predictions[1]!;

        console.log('✅ 获取期1预测:', period1Prediction);
        console.log('✅ 获取期2预测:', period2Prediction);

        const period1DemandForecast = Math.round(period1Prediction.prediction);
        let period1StdDev = period1Prediction.std_dev;

        if (period1StdDev < 0 || !isFinite(period1StdDev) || isNaN(period1StdDev)) {
          console.warn(`⚠️ 期1的std_dev非法: ${period1StdDev}，使用需求的5%作为替代`);
          period1StdDev = period1DemandForecast * 0.05;
        } else if (period1StdDev === 0) {
          console.warn(`⚠️ 期1的std_dev为0，安全库存将为0`);
        } else if (period1StdDev > period1DemandForecast * 0.3) {
          console.warn(`⚠️ 期1的std_dev异常大: ${period1StdDev.toFixed(2)}，占预测值 ${((period1StdDev/period1DemandForecast)*100).toFixed(1)}%`);
        }

        const period1SafetyStock = Math.round(state.safetyStockZScore * period1StdDev);
        const period1BeginningInventory = state.initialInventory;
        const period1PlannedProduction = Math.max(
          0,
          period1DemandForecast + period1SafetyStock - period1BeginningInventory
        );
        const period1ProductionOutput = Math.max(
          0,
          Math.min(period1PlannedProduction, state.productionCapacity)
        );

        let period1EndingInventory =
          period1BeginningInventory + period1ProductionOutput - period1DemandForecast;
        let period1Stockout = 0;

        if (period1EndingInventory < 0) {
          period1Stockout = Math.abs(period1EndingInventory);
          period1EndingInventory = 0;
        }

        const period1ServiceLevel = period1DemandForecast > 0 ? 1 - (period1Stockout / period1DemandForecast) : 1;

        fillPeriod1Data({
          demandForecast: period1DemandForecast,
          safetyStock: period1SafetyStock,
          plannedProduction: period1PlannedProduction,
          beginningInventory: period1BeginningInventory,
          productionOutput: period1ProductionOutput,
          endingInventory: period1EndingInventory,
          stockout: period1Stockout,
          serviceLevel: period1ServiceLevel,
        });

        updateDemoPrediction(period2Prediction.prediction, period2Prediction.std_dev);

        const period2DemandForecast = Math.round(period2Prediction.prediction);
        fillPeriod2Field('demandForecast', period2DemandForecast);
        setHasFetched(true);
      } else {
        throw new Error('预测API返回数据格式错误');
      }
    } catch (err: any) {
      console.error('获取预测失败:', err);
      setError(err.message || '获取预测失败');

      console.warn('⚠️ 使用历史平均值作为后备');
      const demandForecast = Math.round(state.demoPrediction);

      const period1SafetyStock = Math.round(state.safetyStockZScore * state.demoStdDev);
      const period1BeginningInventory = state.initialInventory;
      const period1PlannedProduction = Math.max(
        0,
        demandForecast + period1SafetyStock - period1BeginningInventory
      );
      const period1ProductionOutput = Math.max(
        0,
        Math.min(period1PlannedProduction, state.productionCapacity)
      );
      const period1EndingInventory =
        period1BeginningInventory + period1ProductionOutput - demandForecast;

      let fallbackEndingInventory = period1EndingInventory;
      let fallbackStockout = 0;

      if (fallbackEndingInventory < 0) {
        fallbackStockout = Math.abs(fallbackEndingInventory);
        fallbackEndingInventory = 0;
      }

      const fallbackServiceLevel =
        demandForecast > 0 ? 1 - fallbackStockout / demandForecast : 1;

      fillPeriod1Data({
        demandForecast: demandForecast,
        safetyStock: period1SafetyStock,
        plannedProduction: period1PlannedProduction,
        beginningInventory: period1BeginningInventory,
        productionOutput: period1ProductionOutput,
        endingInventory: fallbackEndingInventory,
        stockout: fallbackStockout,
        serviceLevel: fallbackServiceLevel,
      });

      updateDemoPrediction(state.demoPrediction, state.demoStdDev);
      fillPeriod2Field('demandForecast', demandForecast);
      setHasFetched(true);
    } finally {
      setIsLoading(false);
    }
  };

  const hasForecast = state.period2Data.demandForecast !== null;
  const canProceed = hasForecast;

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

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-semibold text-gray-800 mb-2">📊 什么是预测需求？</h4>
        <p className="text-sm text-gray-700">
          预测需求是基于历史数据和最佳预测模型预测出的未来市场需求量。它是制定生产计划的基础输入，决定了我们需要准备多少产品来满足市场。
        </p>
      </div>

      {/* 🏆 显示用户选择的最佳模型 */}
      {bestModelId && modelDisplayInfo && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="flex items-start space-x-3">
            <div className="mt-1">
              <Award className="w-6 h-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center space-x-2">
                <span>🎯 使用您选择的最佳模型进行预测</span>
              </h4>
              <div className="bg-white rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">模型名称：</span>
                  <span className="text-sm font-semibold text-gray-900">{modelDisplayInfo.name}</span>
                </div>
                <div className="text-xs text-gray-600 border-t border-gray-200 pt-2">
                  {modelDisplayInfo.description}
                </div>
                {bestModelMetrics && (bestModelMetrics.rmse !== null || bestModelMetrics.mae !== null || bestModelMetrics.r2 !== null) && (
                  <div className="grid grid-cols-3 gap-2 border-t border-gray-200 pt-2">
                    <div className="text-center">
                      <p className="text-xs text-gray-500">RMSE</p>
                      <p className="text-sm font-semibold text-gray-800">{bestModelMetrics.rmse?.toFixed(2) || '-'}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500">MAE</p>
                      <p className="text-sm font-semibold text-gray-800">{bestModelMetrics.mae?.toFixed(2) || '-'}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-500">R²</p>
                      <p className="text-sm font-semibold text-gray-800">{bestModelMetrics.r2?.toFixed(3) || '-'}</p>
                    </div>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-600 mt-2">
                💡 该模型在步骤6中被您评选为最佳模型，现在将用于生成未来需求预测。
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h4 className="font-semibold text-gray-800 mb-1">第2期的预测需求</h4>
            <p className="text-xs text-gray-500">点击右侧按钮，调用模型生成未来两期的预测值。</p>
          </div>
          <button
            type="button"
            onClick={handleFetchPrediction}
            disabled={isLoading}
            className={`inline-flex items-center space-x-2 px-4 py-2 rounded-lg border transition focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-1 ${
              isLoading
                ? 'border-gray-200 text-gray-400 cursor-wait bg-gray-50'
                : 'border-blue-200 text-blue-600 hover:bg-blue-50'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>预测中...</span>
              </>
            ) : (
              <>
                <TrendingUp className="w-4 h-4" />
                <span>调用模型预测</span>
              </>
            )}
          </button>
        </div>

        <div className="mt-4">
          {isLoading ? (
            <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg flex items-center space-x-3">
              <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
              <p className="text-sm text-gray-700">正在调用预测模型获取期1和期2的需求预测...</p>
            </div>
          ) : error ? (
            <div className="bg-white border border-red-200 p-4 rounded-lg">
              <div className="flex items-start space-x-2">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-800 mb-1">
                    预测调用失败，已使用历史平均值作为演示数据。
                  </p>
                  <p className="text-xs text-gray-600">{error}</p>
                </div>
              </div>
            </div>
          ) : hasFetched ? (
            <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
              <p className="text-sm text-gray-700">
                ✅ 已获取期1和期2的预测数据。期1已完整显示在右侧表格中作为参考。
              </p>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
              <p className="text-sm text-gray-700">
                点击右上方按钮，调用最佳模型并生成未来两期的预测需求。
              </p>
            </div>
          )}
        </div>

        <div className="bg-blue-50 p-4 rounded-lg mt-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm text-gray-600 mb-1">第2期预测需求：</p>
              <p className="text-3xl font-bold text-blue-600">
                {hasForecast ? state.period2Data.demandForecast!.toLocaleString() : '--'}{' '}
                <span className="text-lg">件</span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {hasForecast
                  ? `原始预测值：${state.demoPrediction.toFixed(2)}，四舍五入后为 ${state.period2Data.demandForecast!.toLocaleString()}`
                  : '尚未生成预测，请先点击上方按钮。'}
              </p>
            </div>
            {hasForecast && !isLoading && (
              <CheckCircle className="w-8 h-8 text-green-600" />
            )}
          </div>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h4 className="font-semibold text-gray-800 mb-2">👉 查看右侧表格</h4>
        <p className="text-sm text-gray-700">
          现在请查看右侧MPS表格的<strong className="text-blue-900">第2期第1列（预测需求）</strong>，您会看到刚才计算的值已经自动填充了！
        </p>
      </div>

      <button
        onClick={completeCurrentStep}
        disabled={!canProceed}
        className={`w-full flex items-center justify-center space-x-2 px-6 py-3 rounded-lg transition-all font-medium ${
          canProceed
            ? 'bg-green-600 text-white hover:bg-green-700 shadow-md hover:shadow-lg'
            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
        }`}
      >
        <span>理解了，学习下一个变量：安全库存</span>
        <ArrowRight className="w-5 h-5" />
      </button>
    </div>
  );
};

export default ConceptStep2;
