import React, { useState } from 'react';
import { Factory, ArrowRight, Info, Loader2, TrendingUp, Target, Shield, PlayCircle } from 'lucide-react';
import { useProductionPlan } from '../ProductionPlanContextV2';
import { apiClient } from '../../../../../utils/apiClient';
import { calculateCapacityAuto } from '../utils/productionCapacityHelper';
import { MPS_CALCULATION, SERVICE_LEVELS } from '../config/mpsConstants';

// 固定预测期数为6期（不在UI显示）
const FIXED_FORECAST_PERIODS = 6;

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
 * Step 1: 制定生产计划的实验流程介绍
 * - 介绍MPS概念、核心目标、关键要素
 * - 介绍关键概念（需求预测、提前期、时段选择）
 * - 介绍逻辑流程（标准化第一月、第二月计算流程）
 * - 预测第一期需求
 */
const NewStep1: React.FC = () => {
  const { state, updateParameters, updateCapacity, fillPeriod1Data, savePredictions, completeCurrentStep } = useProductionPlan();

  const [isPredicting, setIsPredicting] = useState(false);
  const [isPeriod1Generated, setIsPeriod1Generated] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [period1Data, setPeriod1Data] = useState<{
    demand: number;
    safetyStock: number;
  } | null>(null);

  const avgDemand = state.avgDemand;

  // 🔒 固定参数
  const INITIAL_INVENTORY = MPS_CALCULATION.INITIAL_INVENTORY; // 初始库存 = 0
  const TARGET_SERVICE_LEVEL = SERVICE_LEVELS.EXCELLENT.value; // 目标服务水平 = 99%
  const Z_SCORE = SERVICE_LEVELS.EXCELLENT.zScore; // Z分数 = 2.33

  // 🔹 预测第一期需求
  const handlePredictPeriod1 = async () => {
    setError(null);
    setIsPredicting(true);

    try {
      // 🚀 调用预测接口获取需求预测
      console.log('📌 使用的最佳模型:', state.selectedBestModel);

      const modelType = MODEL_TYPE_MAP[state.selectedBestModel];
      if (!modelType) {
        throw new Error(`无效的模型类型: ${state.selectedBestModel}`);
      }

      console.log('🚀 调用预测API:', { model_type: modelType, forecast_steps: FIXED_FORECAST_PERIODS });

      const response = await apiClient.post<{
        status: string;
        results: { predictions: Array<{ prediction: number; std_dev: number }> };
      }>('/models/predictions', {
        model_type: modelType,
        forecast_steps: FIXED_FORECAST_PERIODS,
      });

      if (response.status !== 'success' || !response.results?.predictions) {
        throw new Error('预测API返回数据格式错误');
      }

      const predictions = response.results.predictions;
      if (predictions.length === 0) {
        throw new Error('预测API未返回任何数据');
      }
      const firstPrediction = predictions[0];
      if (!firstPrediction) {
        throw new Error('预测API未返回期1数据');
      }
      console.log('✅ 预测数据获取成功:', predictions);

      // 保存完整预测结果
      savePredictions(predictions);

      // 🆕 使用预测值填充第一期的标准化参考数据
      const period1Demand = Math.round(firstPrediction.prediction);

      // 保存Period1数据到本地状态（用于显示）
      setPeriod1Data({
        demand: period1Demand,
        safetyStock: 0, // 占位，实际不显示
      });

      // 填充到Context
      fillPeriod1Data({
        demandForecast: period1Demand, // 实际需求 = 预测值
        safetyStock: null, // 安全库存在Step4才计算
        plannedProduction: period1Demand, // 投入量 = 预测需求（简化）
        beginningInventory: INITIAL_INVENTORY, // 期初库存 = 0（标准化）
        productionOutput: period1Demand, // 产出量 = 预测需求（假设正好满足）
        endingInventory: INITIAL_INVENTORY, // 期末库存 = 0（标准化：产出=需求）
        stockout: 0, // 缺货 = 0（标准化假设）
        serviceLevel: 1.0, // 服务水平 = 100%
      });

      // 🔧 自动计算产能（使用auto模式）
      const autoCapacity = calculateCapacityAuto(predictions);
      console.log('🔧 自动计算产能:', autoCapacity);

      // 保存参数（使用固定值）
      updateParameters({
        forecastPeriods: FIXED_FORECAST_PERIODS,
        initialInventory: INITIAL_INVENTORY,
        targetServiceLevel: TARGET_SERVICE_LEVEL,
        safetyStockZScore: Z_SCORE,
      });

      // 保存产能（使用自动计算的值）
      updateCapacity({
        scenario: 'normal', // 标记为normal场景
        capacity: autoCapacity,
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
          <h3 className="text-xl font-bold text-gray-900">制定生产计划的实验流程介绍</h3>
          <p className="text-sm text-blue-600">MPS Overview</p>
        </div>
      </div>

      {/* 一、MPS概念介绍 */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500 rounded-lg p-5">
        <h4 className="font-semibold text-blue-900 mb-3 flex items-center space-x-2">
          <Info className="w-5 h-5" />
          <span>什么是生产计划（MPS）</span>
        </h4>
        <p className="text-sm text-blue-800 leading-relaxed mb-4">
          <strong>生产计划（MPS, Master Production Schedule）</strong>是指企业在给定的时间范围内，根据市场需求预测和实际库存情况，制定出具体的生产任务安排。
        </p>
        <div className="bg-white/70 rounded-lg p-4 mb-4">
          <h5 className="font-semibold text-blue-900 mb-2">核心目标</h5>
          <p className="text-sm text-blue-800">
            确保在满足市场需求的同时，最大限度地<strong>减少库存成本</strong>和<strong>避免缺货</strong>情况的发生。
          </p>
        </div>
        <div className="bg-white/70 rounded-lg p-4">
          <h5 className="font-semibold text-blue-900 mb-3">生产计划的关键要素</h5>
          <div className="space-y-2 text-sm text-blue-800">
            <div className="flex items-start space-x-2">
              <span className="font-bold text-blue-600">1.</span>
              <div>
                <strong>需求预测：</strong>基于历史数据和市场趋势，预测未来需求，是生产计划制定的基础。
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <span className="font-bold text-blue-600">2.</span>
              <div>
                <strong>产能规划：</strong>根据生产能力和市场需求，合理安排每月的产出量，确保资源的高效利用。
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <span className="font-bold text-blue-600">3.</span>
              <div>
                <strong>库存与缺货管理：</strong>通过库存与缺货的精确计算，平衡产出与实际需求，确保生产供应链的稳定性。
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <span className="font-bold text-blue-600">4.</span>
              <div>
                <strong>服务水平评估：</strong>衡量企业在某一时间段内满足市场需求的能力，以此评估和调整生产计划的有效性。
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <span className="font-bold text-blue-600">5.</span>
              <div>
                <strong>预测量和投入量的计算：</strong>根据需求预测和安全库存，逐步计算投入量，确保未来的生产能够平衡市场需求和库存情况。
              </div>
            </div>
          </div>
        </div>
        <p className="text-sm text-blue-800 mt-4 leading-relaxed">
          在本流程中，我们将从需求预测、产出、库存、缺货等多个角度，逐步带你了解如何制定一个完整的生产计划表。每一步的计算逻辑都建立在之前的步骤基础上，确保整个计划具有连贯性和可操作性。
        </p>
      </div>

      {/* 二、关键概念 */}
      <div className="bg-white border-2 border-indigo-200 rounded-lg p-5">
        <h4 className="font-semibold text-gray-800 mb-4">关键概念</h4>
        <div className="space-y-3">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h5 className="font-semibold text-blue-900 mb-2">📈 需求预测</h5>
            <p className="text-sm text-blue-800">
              需求预测是基于历史数据和市场趋势，对未来某一时段内的市场需求进行的预估。这是生产计划的起点，通常通过时间序列分析、回归模型或机器学习方法得出。
            </p>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <h5 className="font-semibold text-purple-900 mb-2">⏱️ 提前期（Lead Time）</h5>
            <p className="text-sm text-purple-800">
              提前期是指从生产开始到产品完成并可供使用所需的时间。在我们的示例中，<strong>提前期设定为 1 个月</strong>，即当前月的投入量将在下个月产生成果。
            </p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h5 className="font-semibold text-green-900 mb-2">📅 时段选择</h5>
            <p className="text-sm text-green-800">
              需求预测时段是预先选定的，如每月、每季度或每年。在制定生产计划时，我们围绕这些时段进行需求预测和生产安排。本实验采用<strong>月度</strong>时段。
            </p>
          </div>
        </div>
      </div>

      {/* 三、逻辑流程介绍 */}
      <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-500 rounded-lg p-5">
        <h4 className="font-semibold text-amber-900 mb-4">逻辑流程与标准化第一个月</h4>
        <p className="text-sm text-amber-800 leading-relaxed mb-4">
          在正式进入生产计划制定的具体步骤之前，首先需要全面了解整个生产计划制定原理（Master Production Schedule, MPS）的逻辑和结构。这一步骤将有助于清晰地理解后续每一步操作的意义，以及如何将这些步骤整合为一个完整的生产计划表。
        </p>

        {/* 标准化第一个月 */}
        <div className="bg-white rounded-lg p-4 mb-4 border border-amber-200">
          <h5 className="font-semibold text-amber-900 mb-3">📌 标准化第一个月</h5>
          <p className="text-sm text-amber-800 mb-3">
            在制定生产计划时，我们首先对第一个月进行<strong>"标准化"</strong>处理。这意味着我们假设第一个月的产出量刚好满足市场需求，而库存量和缺货量均为 0。这样的处理有助于简化计算，并为后续的生产计划制定打下基础。
          </p>
          <div className="space-y-2 text-sm text-amber-800">
            <div className="flex items-start space-x-2">
              <span>•</span>
              <div>
                <strong>产出量：</strong>第一个月的产出量等于需求量。这意味着我们假设生产完全满足市场需求，因而库存量和缺货量均为 0。
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <span>•</span>
              <div>
                <strong>预测量：</strong>第一个月的预测量不包含安全库存，仅为需求预测量。这一预测量为第二个月的生产计划提供了基础。
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <span>•</span>
              <div>
                <strong>生产计划数（投入量）：</strong>第一个月的生产计划数（即投入量）等于预测量减去上月库存量加上上月缺货量。由于第一个月的库存量和缺货量均为 0，因此投入量直接等于预测量。
              </div>
            </div>
          </div>
        </div>

        {/* 第二个月的计算流程 */}
        <div className="bg-white rounded-lg p-4 border border-amber-200">
          <h5 className="font-semibold text-amber-900 mb-3">🔄 第二个月的计算示例与后续流程</h5>
          <p className="text-sm text-amber-800 mb-3">
            从第二个月开始，正式进入生产计划的计算和制定阶段。第二个月的计算将作为整个生产计划流程的基础示例，并依此逻辑推导出后续各月的生产计划。具体步骤如下：
          </p>
          <div className="space-y-2 text-sm text-amber-800">
            <div className="flex items-start space-x-2">
              <div className="w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">1</div>
              <div><strong>投入量的确定：</strong>投入量 = 预测量 - 上月库存量 + 上月缺货量。在第二个月，投入量将基于第一个月的预测量和实际需求进行计算。</div>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">2</div>
              <div><strong>产出量的计算：</strong>产出量 = 上月的投入量。第二个月的产出量等于第一个月的投入量。</div>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</div>
              <div><strong>库存量与缺货量的计算：</strong>库存量或缺货量 = 产出量 - 实际需求量。根据实际需求量，计算第二个月的库存或缺货情况。</div>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">4</div>
              <div><strong>服务水平的计算：</strong>服务水平 = 1 - 缺货量 / 实际需求量。服务水平用于评估生产计划的有效性和市场需求的满足程度。</div>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">5</div>
              <div><strong>安全库存的计算：</strong>安全库存根据需求波动和不确定性来确定，用于应对未来需求的波动。</div>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">6</div>
              <div><strong>预测量的计算：</strong>预测量 = 预测结果 + 安全库存。预测量将用于指导第二个月及以后的生产投入。</div>
            </div>
          </div>
        </div>

        {/* 整体逻辑 */}
        <div className="mt-4 p-3 bg-white/70 rounded-lg border border-amber-300">
          <h5 className="font-semibold text-amber-900 mb-2">📊 整体逻辑与最终生产计划表的形成</h5>
          <div className="space-y-1 text-sm text-amber-800">
            <div>• <strong>标准化第一个月：</strong>通过对第一个月的标准化处理，简化了计算并确保了后续步骤的清晰性和一致性。</div>
            <div>• <strong>第二个月的计算示例：</strong>第二个月的生产计划制定将作为整个流程的核心示例，奠定基础。</div>
            <div>• <strong>完整生产计划表的形成：</strong>在完成第二个月的计算后，将按同样的逻辑逐步推导出整个需求预测时段内的生产计划表。</div>
          </div>
        </div>

        <p className="text-sm text-amber-800 mt-4 leading-relaxed">
          通过这一原理概述，你现在应当对生产计划制定的整个流程有了一个较为清晰的理解。接下来，我们将按照这个逻辑，一步步展示生产计划制定过程，并最终形成一个完整的生产计划表。
        </p>
      </div>

      {/* 四、开始预测第一期 */}
      {!isPeriod1Generated && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-400 rounded-lg p-5">
          <h4 className="font-semibold text-green-900 mb-3 flex items-center space-x-2">
            <TrendingUp className="w-5 h-5" />
            <span>开始预测第一期需求</span>
          </h4>
          <p className="text-sm text-green-800 mb-4">
            点击下方按钮，系统将调用您之前选择的最佳预测模型<strong>（{MODEL_NAME_MAP[state.selectedBestModel] || state.selectedBestModel}）</strong>，为您生成第一期的需求预测，并自动填充MPS表的第一排标准化数据。
          </p>
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handlePredictPeriod1}
              disabled={isPredicting}
              className={`flex items-center space-x-2 px-8 py-3 rounded-lg font-medium transition-all ${
                !isPredicting
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
        </div>
      )}

      {/* 预测中加载状态 */}
      {isPredicting && (
        <div className="bg-blue-50 border border-blue-300 rounded-lg p-5 animate-pulse">
          <div className="flex items-center space-x-3">
            <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
            <div>
              <h4 className="font-semibold text-blue-900 mb-1">正在预测需求...</h4>
              <p className="text-sm text-blue-700">
                使用<strong>{MODEL_NAME_MAP[state.selectedBestModel] || state.selectedBestModel}</strong>模型进行需求预测
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-5">
          <div className="flex items-start space-x-3">
            <div className="text-red-600 text-xl">⚠️</div>
            <div className="flex-1">
              <h4 className="font-semibold text-red-900 mb-1">预测失败</h4>
              <p className="text-sm text-red-700">{error}</p>
              <button
                type="button"
                onClick={handlePredictPeriod1}
                className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
              >
                重试
              </button>
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
                <p className="text-xs text-gray-600 mt-2">
                  💡 第一期采用标准化设置，为后续计划提供参考基准
                </p>
              </div>
            </div>
          </div>

          {/* 下一步按钮 */}
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-md hover:shadow-lg"
            >
              <span>进入下一步</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NewStep1;
