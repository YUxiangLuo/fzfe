import React, { useState } from 'react';
import { Factory, ArrowRight, Info, Loader2, TrendingUp } from 'lucide-react';
import { useProductionPlan } from '../ProductionPlanContextV2';
import { apiClient } from '../../../../../utils/apiClient';
import {
  CAPACITY_SCENARIOS,
  calculateCapacityByScenario,
  type CapacityScenario,
} from '../utils/productionCapacityHelper';

// 模型类型映射：前端模型ID -> 后端API参数
const MODEL_TYPE_MAP: Record<string, string> = {
  'ma': 'ma',
  'exp': 'es',
  'arima': 'arima',
  'lstm': 'lstm',
  'ensemble_weighted': 'weighted_average',
  'ensemble_boosting': 'boosting',
  'ensemble_stacking': 'stacking',
};

// 模型名称映射：前端模型ID -> 显示名称
const MODEL_NAME_MAP: Record<string, string> = {
  'ma': '移动平均（MA）',
  'exp': '指数平滑（ES）',
  'arima': 'ARIMA',
  'lstm': 'LSTM',
  'ensemble_weighted': '加权平均集成',
  'ensemble_boosting': 'Boosting集成',
  'ensemble_stacking': 'Stacking集成',
};

/**
 * Step 1: 规划总览
 * - 介绍MPS概念、流程结构、关键术语
 * - 用户输入参数（预测期数、目标服务水平、产能场景）
 * - 初始库存固定为0（标准化基准）
 */
const NewStep1: React.FC = () => {
  const { state, updateParameters, updateCapacity, fillPeriod1Data, savePredictions, completeCurrentStep } = useProductionPlan();

  const [forecastPeriods, setForecastPeriods] = useState(state.forecastPeriods);
  const [selectedScenario, setSelectedScenario] = useState<CapacityScenario>(state.capacityScenario);
  const [hasTouchedForecast, setHasTouchedForecast] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);
  const [isPeriod1Generated, setIsPeriod1Generated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [period1Data, setPeriod1Data] = useState<{
    demand: number;
    safetyStock: number;
  } | null>(null);

  const avgDemand = state.demoPrediction;

  // 🔒 根据客户需求：第一月标准化，初始库存固定为 0
  const INITIAL_INVENTORY = 0;

  // 🎯 固定目标服务水平为 99%（追求卓越服务）
  const TARGET_SERVICE_LEVEL = 0.99;
  const Z_SCORE = 2.33;

  const getScenarioBorderClass = (scenarioId: CapacityScenario) => {
    if (selectedScenario === scenarioId) {
      const scenario = CAPACITY_SCENARIOS.find(s => s.id === scenarioId);
      if (scenario?.color === 'red') return 'border-2 border-red-400 bg-red-50';
      if (scenario?.color === 'blue') return 'border-2 border-blue-400 bg-blue-50';
      if (scenario?.color === 'green') return 'border-2 border-green-400 bg-green-50';
    }
    return 'border border-gray-200 hover:bg-gray-50';
  };

  const isForecastPeriodValid = forecastPeriods >= 2;

  // 🔹 预测第一期需求
  const handlePredictPeriod1 = async () => {
    setHasTouchedForecast(true);
    setError(null);

    if (!isForecastPeriodValid) {
      return;
    }

    setIsPredicting(true);

    try {
      // 🚀 调用预测接口获取需求预测
      console.log('📌 使用的最佳模型:', state.selectedBestModel);

      const modelType = MODEL_TYPE_MAP[state.selectedBestModel];
      if (!modelType) {
        throw new Error(`无效的模型类型: ${state.selectedBestModel}`);
      }

      console.log('🚀 调用预测API:', { model_type: modelType, forecast_steps: forecastPeriods });

      const response = await apiClient.post<{
        status: string;
        results: { predictions: Array<{ prediction: number; std_dev: number }> };
      }>('/models/predictions', {
        model_type: modelType,
        forecast_steps: forecastPeriods,
      });

      if (response.status !== 'success' || !response.results?.predictions) {
        throw new Error('预测API返回数据格式错误');
      }

      const predictions = response.results.predictions;
      console.log('✅ 预测数据获取成功:', predictions);

      // 保存完整预测结果
      savePredictions(predictions);

      // 🆕 使用预测值填充第一期的标准化参考数据
      // 根据客户需求：第一期作为参考基准，采用标准化设置（初始库存=0，缺货=0）
      const period1Demand = Math.round(predictions[0].prediction);
      const period1StdDev = predictions[0].std_dev;
      const safetyStock = Math.round(Z_SCORE * period1StdDev);

      // 保存Period1数据到本地状态（用于显示）
      setPeriod1Data({
        demand: period1Demand,
        safetyStock: safetyStock,
      });

      // 填充到Context
      fillPeriod1Data({
        demandForecast: period1Demand, // 实际需求 = 预测值
        safetyStock: safetyStock, // 安全库存
        plannedProduction: period1Demand, // 投入量 = 预测需求（简化）
        beginningInventory: INITIAL_INVENTORY, // 期初库存 = 0（标准化）
        productionOutput: period1Demand, // 产出量 = 预测需求（假设正好满足）
        endingInventory: INITIAL_INVENTORY, // 期末库存 = 0（标准化：产出=需求）
        stockout: 0, // 缺货 = 0（标准化假设）
        serviceLevel: 1.0, // 服务水平 = 100%
      });

      setIsPeriod1Generated(true);
    } catch (err) {
      console.error('生成预测失败:', err);
      setError(err instanceof Error ? err.message : '生成预测失败，请重试');
    } finally {
      setIsPredicting(false);
    }
  };

  // 🔹 进入下一步
  const handleNext = () => {
    // 保存参数
    updateParameters({
      forecastPeriods,
      initialInventory: INITIAL_INVENTORY, // 固定为 0
      targetServiceLevel: TARGET_SERVICE_LEVEL, // 固定为 99%
      safetyStockZScore: Z_SCORE, // 固定为 2.33
    });

    // 计算并保存产能
    const capacity = calculateCapacityByScenario(selectedScenario, avgDemand);
    updateCapacity({
      mode: 'scenario',
      scenario: selectedScenario,
      calculatedValue: capacity,
    });

    completeCurrentStep();
  };

  return (
    <div className="space-y-6">
      {/* 标题 */}
      <div className="flex items-center space-x-3">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
          <Factory className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">第1步：规划总览</h3>
          <p className="text-sm text-blue-600">Master Production Schedule Overview</p>
        </div>
      </div>

      {/* 客户需求：页面目标 */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 rounded-lg p-5">
        <h4 className="font-semibold text-blue-900 mb-3 flex items-center space-x-2">
          <Info className="w-5 h-5" />
          <span>流程说明</span>
        </h4>
        <p className="text-sm text-blue-800 leading-relaxed mb-3">
          本向导将带您按顺序完成 MPS（主生产计划）制定。
          <br />
          每一步会逐步解锁并计算：
        </p>
        <div className="flex items-center space-x-2 text-sm font-medium text-blue-900 bg-white/50 px-4 py-2 rounded-lg">
          <span>投入量</span>
          <ArrowRight className="w-4 h-4" />
          <span>产出量</span>
          <ArrowRight className="w-4 h-4" />
          <span>库存</span>
          <ArrowRight className="w-4 h-4" />
          <span>缺货</span>
          <ArrowRight className="w-4 h-4" />
          <span>服务水平</span>
        </div>
      </div>

      {/* 关键解释模块 */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h5 className="font-semibold text-gray-800 mb-2">⏱️ 时间单位</h5>
          <p className="text-sm text-gray-700">
            <strong>月</strong> - 每个期间代表一个月
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h5 className="font-semibold text-gray-800 mb-2">🚚 提前期（Lead Time）</h5>
          <p className="text-sm text-gray-700">
            <strong>1 个月</strong> - 本月投入 → 下月才能产出
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h5 className="font-semibold text-gray-800 mb-2">📌 第一月标准化</h5>
          <p className="text-sm text-gray-700">
            初始库存=<strong>0</strong>、缺货=<strong>0</strong>
            <br />
            真实动态从第二月起体现
          </p>
        </div>
      </div>

      {/* 参数设置 */}
      <div className="bg-gray-50 rounded-lg p-5 border border-gray-200">
        <h4 className="font-semibold text-gray-800 mb-4">📋 设置生产计划参数</h4>

        <div className="space-y-5">
          {/* 预测期数 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              预测期数（计划多少期）
            </label>
            <input
              type="number"
              min="2"
              max="12"
              value={forecastPeriods}
              onChange={(e) => {
                setForecastPeriods(Number(e.target.value));
                setHasTouchedForecast(true);
              }}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                hasTouchedForecast && !isForecastPeriodValid
                  ? 'border-red-500 bg-red-50'
                  : 'border-gray-300'
              }`}
            />
            {hasTouchedForecast && !isForecastPeriodValid && (
              <p className="mt-1 text-sm text-red-600">预测期数至少需要2期</p>
            )}
            <p className="mt-1 text-xs text-gray-500">推荐设置 4-8 期</p>
          </div>

          {/* 产能场景选择 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择产能情况
            </label>
            <div className="grid md:grid-cols-3 gap-3">
              {CAPACITY_SCENARIOS.map((scenario) => (
                <button
                  key={scenario.id}
                  type="button"
                  onClick={() => setSelectedScenario(scenario.id)}
                  className={`p-4 rounded-lg transition-all text-left ${getScenarioBorderClass(scenario.id)}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-semibold text-gray-900">{scenario.name}</div>
                    {scenario.badge && (
                      <span className={`text-xs px-2 py-1 rounded ${
                        scenario.id === 'normal'
                          ? 'bg-blue-100 text-blue-700 font-semibold'
                          : scenario.id === 'tight'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {scenario.badge}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-600 mb-2">{scenario.description}</div>
                  <div className="text-xs font-medium text-gray-700">
                    产能 = 平均需求 × {scenario.multiplier}
                  </div>
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              产能场景决定了每期的最大产出能力。推荐选择"正常"场景。
            </p>
          </div>

          {/* 目标服务水平说明（固定值） */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <div className="text-blue-600 text-xl">🎯</div>
              <div>
                <h5 className="font-semibold text-blue-900 mb-1">目标服务水平：99%</h5>
                <p className="text-sm text-blue-800">
                  我们的目标是满足 99% 的客户需求（追求卓越服务）。
                  系统将自动计算合适的安全库存以尽可能达到此目标。
                </p>
                <p className="text-xs text-blue-600 mt-2">
                  💡 实际服务水平会受产能约束影响，即使目标是99%，产能不足时仍可能缺货。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 预测第一期需求按钮 */}
      {!isPeriod1Generated && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handlePredictPeriod1}
            disabled={!isForecastPeriodValid || isPredicting}
            className={`flex items-center space-x-2 px-8 py-3 rounded-lg font-medium transition-all ${
              isForecastPeriodValid && !isPredicting
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isPredicting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>预测中...</span>
              </>
            ) : (
              <>
                <TrendingUp className="w-5 h-5" />
                <span>预测第一期需求</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* 预测中加载状态 */}
      {isPredicting && (
        <div className="bg-blue-50 border border-blue-300 rounded-lg p-5 animate-pulse">
          <div className="flex items-center space-x-3">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            <div>
              <h4 className="font-semibold text-blue-900 mb-1">正在预测第一期需求...</h4>
              <p className="text-sm text-blue-700">
                使用您上一步选择的最佳模型<strong>（{MODEL_NAME_MAP[state.selectedBestModel] || state.selectedBestModel}）</strong>进行需求预测
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 第一期预测结果展示 */}
      {isPeriod1Generated && period1Data && (
        <div className="bg-green-50 border-2 border-green-400 rounded-lg p-5">
          <div className="flex items-start space-x-3">
            <div className="text-green-600 text-2xl">✅</div>
            <div className="flex-1">
              <h4 className="font-semibold text-green-900 mb-3">第一期数据生成成功</h4>

              {/* 模型信息 */}
              <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800">
                  🤖 <strong>使用模型</strong>：{MODEL_NAME_MAP[state.selectedBestModel] || state.selectedBestModel}
                </p>
              </div>

              <div className="bg-white rounded-lg p-4 border border-green-200">
                <div className="text-xs text-gray-600 mb-1">第一期预测需求</div>
                <div className="text-2xl font-bold text-gray-900">{period1Data.demand}</div>
                <div className="text-xs text-gray-500 mt-1">单位：件</div>
              </div>

              <div className="mt-3 p-3 bg-white rounded-lg border border-green-200">
                <p className="text-sm text-gray-700">
                  📊 <strong>MPS表第一排已填充</strong>：期初库存=0、产出量={period1Data.demand}、期末库存=0、缺货=0、服务水平=100%
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <div className="text-red-600 text-xl">⚠️</div>
            <div>
              <h4 className="font-semibold text-red-900 mb-1">生成失败</h4>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* 下一步按钮 */}
      <div className="flex justify-end pt-4">
        <button
          type="button"
          onClick={handleNext}
          disabled={!isPeriod1Generated}
          className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${
            isPeriod1Generated
              ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          <span>下一步</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default NewStep1;
