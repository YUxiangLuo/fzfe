import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, ArrowRight, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { useExperiment } from '../../contexts/ExperimentContext';
import { apiClient } from '../../../../utils/apiClient';

// Map selected_best_model to API model_type
const MODEL_TYPE_MAP: Record<string, string> = {
  'ma': 'ma',
  'exp': 'es',
  'arima': 'arima',
  'lstm': 'lstm',
  'ensemble_weighted': 'weighted_average',
  'ensemble_boosting': 'boosting',
  'ensemble_stacking': 'stacking',
};

interface ForecastResult {
  predictions: { prediction: number; std_dev: number }[];
  mode: string;
  forecast_steps: number;
}

const Forecast: React.FC = () => {
  const navigate = useNavigate();
  const { state, updateState } = useExperiment();

  const [forecastPeriods, setForecastPeriods] = useState<number>(6);
  const [initialInventory, setInitialInventory] = useState<number>(0);
  const [targetServiceLevel, setTargetServiceLevel] = useState<number>(0.95);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forecastData, setForecastData] = useState<ForecastResult | null>(null);

  // Load from state if available and sync when global state updates
  useEffect(() => {
    if (state.production_forecast_periods) {
      setForecastPeriods(state.production_forecast_periods);
    }
    if (state.production_initial_inventory !== null) {
      setInitialInventory(state.production_initial_inventory);
    }
    if (state.production_target_service_level !== null) {
      setTargetServiceLevel(state.production_target_service_level);
    }
    // Restore forecast results from global state if available
    if (state.production_forecast_results && state.production_forecast_results.length > 0) {
      setForecastData({
        predictions: state.production_forecast_results,
        mode: 'restored',
        forecast_steps: state.production_forecast_results.length,
      });
    }
  }, [
    state.production_forecast_periods,
    state.production_initial_inventory,
    state.production_target_service_level,
    state.production_forecast_results,
  ]);

  const handleGenerateForecast = async () => {
    const modelType = MODEL_TYPE_MAP[state.selected_best_model!];
    if (!modelType) {
      setError('无效的模型类型');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiClient.post<{ status: string; results: ForecastResult }>(
        '/model/predict',
        {
          model_type: modelType,
          forecast_steps: forecastPeriods,
        }
      );

      if (response.status === 'success' && response.results) {
        setForecastData(response.results);

        // Save parameters and forecast results to global state
        await updateState({
          production_forecast_periods: forecastPeriods,
          production_initial_inventory: initialInventory,
          production_target_service_level: targetServiceLevel,
          // Calculate Z-score based on service level
          production_safety_stock_z_score: getZScore(targetServiceLevel),
          // Save forecast results for use in final plan generation
          production_forecast_results: response.results.predictions,
        });
      } else {
        setError('预测失败，请重试');
      }
    } catch (err: any) {
      console.error('Forecast error:', err);
      setError(err.message || '预测请求失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  // Get Z-score for given service level
  const getZScore = (serviceLevel: number): number => {
    const zScoreMap: Record<number, number> = { 0.90: 1.28, 0.95: 1.65, 0.98: 2.05, 0.99: 2.33 };
    return zScoreMap[serviceLevel] || 1.65;
  };

  // Scientific safety stock calculation
  const calculateSafetyStock = (std_dev: number): number => {
    const zScore = getZScore(targetServiceLevel);
    return Math.round(zScore * std_dev);
  };

  const handleNext = () => {
    if (!forecastData) {
      setError('请先生成预测结果');
      return;
    }
    navigate('/production/input');
  };

  const serviceLevelOptions = [
    { value: 0.90, label: '90%（低成本，允许一定缺货）' },
    { value: 0.95, label: '95%（均衡选择）' },
    { value: 0.98, label: '98%（高服务水平）' },
    { value: 0.99, label: '99%（极高要求，高库存成本）' },
  ];

  const getModelDisplayName = (modelKey: string): string => {
    const names: Record<string, string> = {
      'ma': '移动平均法',
      'exp': '指数平滑法',
      'arima': 'ARIMA模型',
      'lstm': 'LSTM神经网络',
      'ensemble_weighted': '加权平均融合',
      'ensemble_boosting': 'Boosting融合',
      'ensemble_stacking': 'Stacking融合',
    };
    return names[modelKey] || modelKey;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
      <div className="flex items-center space-x-4 mb-6">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
          <TrendingUp className="w-8 h-8 text-blue-600" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">生成需求预测与生产计划</h2>
          <p className="text-blue-600 font-medium">使用最佳模型预测未来需求</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Selected Model Info */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="font-semibold text-green-800">
              已选定最佳模型：{state.selected_best_model ? getModelDisplayName(state.selected_best_model) : '未选择'}
            </span>
          </div>
        </div>

        {/* Parameter Settings */}
        <div className="bg-gray-50 rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">生产计划参数设置</h3>

          {/* Forecast Periods */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              预测期数（未来多少期）
            </label>
            <input
              type="number"
              min="1"
              max="24"
              value={forecastPeriods}
              onChange={(e) => setForecastPeriods(Number(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">通常选择6-12期（月）</p>
          </div>

          {/* Initial Inventory */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              期初库存（件）
            </label>
            <input
              type="number"
              min="0"
              value={initialInventory}
              onChange={(e) => setInitialInventory(Number(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading}
            />
            <p className="text-xs text-gray-500 mt-1">当前仓库中的产品数量</p>
          </div>

          {/* Target Service Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              目标服务水平
            </label>
            <select
              value={targetServiceLevel}
              onChange={(e) => setTargetServiceLevel(Number(e.target.value))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading}
            >
              {serviceLevelOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              服务水平越高，安全库存越多，库存成本越高
            </p>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerateForecast}
            disabled={isLoading || !state.selected_best_model}
            className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md hover:shadow-lg transition-all font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>正在生成预测...</span>
              </>
            ) : (
              <>
                <TrendingUp className="w-5 h-5" />
                <span>生成需求预测</span>
              </>
            )}
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-red-900">错误</h4>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Forecast Results */}
        {forecastData && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">预测结果与计划生产量</h3>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-3 font-medium text-gray-700">期数</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-700">预测需求（件）</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-700">安全库存（件）</th>
                    <th className="text-right py-2 px-3 font-medium text-gray-700 bg-blue-50">计划生产量（件）</th>
                  </tr>
                </thead>
                <tbody>
                  {forecastData.predictions.map((item, index) => {
                    const safetyStock = calculateSafetyStock(item.std_dev);
                    const plannedProduction = Math.round(item.prediction) + safetyStock;

                    return (
                      <tr key={index} className="border-b border-gray-100">
                        <td className="py-2 px-3 text-gray-600">期 {index + 1}</td>
                        <td className="py-2 px-3 text-right text-gray-800">{Math.round(item.prediction).toLocaleString()}</td>
                        <td className="py-2 px-3 text-right text-orange-600">{safetyStock.toLocaleString()}</td>
                        <td className="py-2 px-3 text-right font-semibold text-blue-600 bg-blue-50">
                          {plannedProduction.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4 text-xs text-gray-500 space-y-1">
              <p>• 预测需求：由您选定的最佳模型预测的未来需求量</p>
              <p>• 安全库存：根据目标服务水平{(targetServiceLevel * 100).toFixed(0)}%计算的缓冲库存（Z分数={getZScore(targetServiceLevel)}）</p>
              <p>• 计划生产量 = 预测需求 + 安全库存</p>
            </div>
          </div>
        )}

        {/* Formula Explanation */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">💡 计划生产量计算公式</h3>
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-center mb-4">
            <p className="text-lg font-mono text-gray-800">
              <span className="font-bold text-blue-600">计划生产量</span> ={' '}
              <span className="font-bold text-green-600">需求预测结果</span> +{' '}
              <span className="font-bold text-orange-600">安全库存</span>
            </p>
          </div>
          <p className="text-blue-700 text-sm">
            计划生产量是下达给生产线的目标量。它不仅要满足预测的市场需求，还需要额外准备安全库存来应对预测误差和突发需求波动，从而保障设定的服务水平目标。
          </p>
        </div>

        {/* Next Button */}
        <button
          onClick={handleNext}
          disabled={!forecastData}
          className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-md hover:shadow-lg transition-all font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <span>我已理解，继续计算投入量</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default Forecast;