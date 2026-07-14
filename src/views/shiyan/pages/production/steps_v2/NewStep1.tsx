import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, CheckCircle2, Factory, Gauge, Info, Loader2, Scale, ShieldAlert, TrendingUp } from 'lucide-react';
import { useProductionPlan } from '../ProductionPlanContextV2';
import { useExperiment } from '../../../contexts/ExperimentContext.zustand';
import { MPS_CALCULATION, SERVICE_LEVELS } from '../config/mpsConstants';
import { validatePredictions } from '../utils/predictionValidator';
import { ProductionPredictionError, predictWithBestModel } from '../../../services/modelLifecycle';
import { useToast } from '../../../shared/hooks/useToast';
import { Toast } from '../../../shared/components/common/Toast';
import ProductionForecastAssumptionNote from '../components/ProductionForecastAssumptionNote';
import ProductionPredictionErrorAlert from '../components/ProductionPredictionErrorAlert';
import {
  calculateCapacityScenarioOptions,
  type CapacityScenarioOption,
} from '../utils/productionCapacityHelper';

// 固定预测期数为6期（不在UI显示）
const FIXED_FORECAST_PERIODS = 6;

// 模型名称映射：前端模型ID -> 显示名称
const MODEL_NAME_MAP: Record<string, string> = {
  'ma': '移动平均（MA）',
  'exp': '指数平滑（ES）',
  'arima': 'ARIMA',
  'lstm': 'LSTM',
  'ensemble_weighted': '加权平均融合',
  'ensemble_boosting': 'Boosting集成',
  'ensemble_stacking': 'Stacking集成',
};

const CAPACITY_CARD_CLASSES = {
  tight: {
    border: 'border-red-200',
    selectedBorder: 'border-red-500 ring-2 ring-red-200',
    bg: 'bg-red-50',
    title: 'text-red-900',
    text: 'text-red-800',
    badge: 'bg-red-100 text-red-700',
    button: 'bg-red-600 hover:bg-red-700',
    Icon: ShieldAlert,
  },
  normal: {
    border: 'border-blue-200',
    selectedBorder: 'border-blue-500 ring-2 ring-blue-200',
    bg: 'bg-blue-50',
    title: 'text-blue-900',
    text: 'text-blue-800',
    badge: 'bg-blue-100 text-blue-700',
    button: 'bg-blue-600 hover:bg-blue-700',
    Icon: Scale,
  },
  abundant: {
    border: 'border-green-200',
    selectedBorder: 'border-green-500 ring-2 ring-green-200',
    bg: 'bg-green-50',
    title: 'text-green-900',
    text: 'text-green-800',
    badge: 'bg-green-100 text-green-700',
    button: 'bg-green-600 hover:bg-green-700',
    Icon: Gauge,
  },
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
  const { state: experimentState } = useExperiment();
  const { toast, showToast, hideToast } = useToast();

  const [isPredicting, setIsPredicting] = useState(false);
  const [predictionError, setPredictionError] = useState<ProductionPredictionError | null>(null);
  const [isPeriod1Generated, setIsPeriod1Generated] = useState(false);
  const [period1Data, setPeriod1Data] = useState<{
    demand: number;
    safetyStock: number;
  } | null>(null);
  // Synchronous re-entrancy guard: the disabled button only updates after a
  // re-render, so a fast double-click could otherwise fire two predictions.
  const isPredictingRef = useRef(false);
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // 🔒 固定参数
  const INITIAL_INVENTORY = MPS_CALCULATION.INITIAL_INVENTORY; // 初始库存 = 0
  const TARGET_SERVICE_LEVEL = SERVICE_LEVELS.EXCELLENT.value; // 目标服务水平 = 99%
  const Z_SCORE = SERVICE_LEVELS.EXCELLENT.zScore; // Z分数 = 2.33
  const capacityOptions = React.useMemo(
    () => calculateCapacityScenarioOptions(state.predictions ?? [], Z_SCORE),
    [state.predictions, Z_SCORE],
  );
  const selectedCapacityOption = state.productionCapacity == null
    ? null
    : capacityOptions.find((option) => option.id === state.capacityScenario) ?? null;
  const hasGeneratedPeriod1 = isPeriod1Generated
    || (state.period1Data.demandForecast != null && Boolean(state.predictions?.length));
  const displayedPeriod1Demand = period1Data?.demand ?? state.period1Data.demandForecast;
  const isCapacityLocked = state.completedSteps.includes(1);

  // 🔹 预测第一期需求
  const handlePredictPeriod1 = async () => {
    if (isPredictingRef.current) {
      return;
    }
    isPredictingRef.current = true;
    hideToast();
    setPredictionError(null);
    setIsPredicting(true);

    try {
      if (!experimentState.experiment_id) {
        throw new Error('实验状态未初始化，无法进行需求预测');
      }

      const response = await predictWithBestModel(
        state.selectedBestModel,
        experimentState.experiment_id,
        FIXED_FORECAST_PERIODS,
      );

      // The backend keeps running after a browser disconnect; if the student
      // navigated away mid-request, skip UI/store updates for the dead view.
      if (!isMountedRef.current) {
        return;
      }

      if (response.status !== 'success' || !response.results?.predictions) {
        throw new Error('预测API返回数据格式错误');
      }

      const validation = validatePredictions(response.results.predictions);
      validation.allWarnings.forEach(warning => console.warn(`⚠️ ${warning}`));

      const predictions = validation.validatedData.slice(0, FIXED_FORECAST_PERIODS);
      if (predictions.length < FIXED_FORECAST_PERIODS) {
        throw new Error(`预测数据不足：期望 ${FIXED_FORECAST_PERIODS} 期，实际 ${predictions.length} 期`);
      }
      if (predictions.length === 0) {
        throw new Error('预测API未返回任何数据');
      }
      const firstPrediction = predictions[0];
      if (!firstPrediction) {
        throw new Error('预测API未返回期1数据');
      }
      // 保存完整预测结果
      savePredictions(predictions);

      // 🆕 使用预测值填充第一期的标准化参考数据
      const period1Demand = Math.max(0, Math.round(firstPrediction.prediction));

      // 保存Period1数据到本地状态（用于显示）
      setPeriod1Data({
        demand: period1Demand,
        safetyStock: 0, // 占位，实际不显示
      });

      // 填充到Context（按客户文档：第一月标准化处理）
      fillPeriod1Data({
        demandForecast: period1Demand, // 实际需求 = 预测值
        safetyStock: 0, // 第1期标准化处理：安全库存固定为0
        plannedProduction: period1Demand, // 投入量 = 预测量（第一月预测量=需求预测，不含安全库存）
        beginningInventory: INITIAL_INVENTORY, // 期初库存 = 0（标准化基准）
        productionOutput: period1Demand, // 产出量 = 需求量（假设生产完全满足需求）
        endingInventory: INITIAL_INVENTORY, // 期末库存 = 0（标准化：产出=需求，因而库存=0）
        stockout: 0, // 缺货 = 0（标准化假设）
        serviceLevel: 1.0, // 服务水平 = 100%
      });

      // 保存参数（使用固定值）
      updateParameters({
        forecastPeriods: FIXED_FORECAST_PERIODS,
        initialInventory: INITIAL_INVENTORY,
        targetServiceLevel: TARGET_SERVICE_LEVEL,
        safetyStockZScore: Z_SCORE,
      });

      setIsPeriod1Generated(true);
    } catch (err) {
      console.error('生成预测失败:', err);
      if (isMountedRef.current) {
        if (err instanceof ProductionPredictionError) {
          setPredictionError(err);
        } else {
          showToast(err instanceof Error ? err.message : '生成预测失败，请重试', 'error');
        }
      }
    } finally {
      isPredictingRef.current = false;
      if (isMountedRef.current) {
        setIsPredicting(false);
      }
    }
  };

  const handleSelectCapacity = (option: CapacityScenarioOption) => {
    if (isCapacityLocked) return;
    updateCapacity({
      mode: 'scenario',
      scenario: option.id,
      capacity: option.capacity,
    });
  };

  // 🔹 进入下一步
  const handleNext = () => {
    if (state.productionCapacity == null) {
      showToast('请先选择一种月产能模式，再进入下一步', 'error');
      return;
    }
    completeCurrentStep();
  };

  const renderCapacitySelection = () => {
    if (!hasGeneratedPeriod1) return null;

    if (capacityOptions.length === 0) {
      return (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          预测数据尚未准备好，暂时无法计算产能模式。
        </div>
      );
    }

    const { averageForecastLoad, peakForecastLoad, forecastLoadPoints } = capacityOptions[0]!;

    return (
      <div className="mt-4 space-y-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
            <div>
              <h4 className="font-semibold text-slate-900">选择月产能模式</h4>
              <p className="mt-1 text-sm text-slate-600 leading-relaxed">
                本实验使用预测负荷作为产能规划基准：预测负荷 = 预测需求 + 安全库存。月产能上限表示每期最多能完成的产出量，不代表每期固定生产这么多。
              </p>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                这里的安全库存仅用于估算产能模式；MPS 表第 1 期仍按标准化规则填写，安全库存为 0。
              </p>
            </div>
            <div className="rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <div>平均预测负荷：<strong>{averageForecastLoad.toLocaleString()}</strong> 件/月</div>
              <div>最高预测负荷：<strong>{peakForecastLoad.toLocaleString()}</strong> 件/月</div>
            </div>
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[560px] text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="py-2 pr-3 font-medium">期数</th>
                  <th className="py-2 pr-3 font-medium">预测需求</th>
                  <th className="py-2 pr-3 font-medium">安全库存</th>
                  <th className="py-2 pr-3 font-medium">预测负荷</th>
                </tr>
              </thead>
              <tbody>
                {forecastLoadPoints.map((point) => (
                  <tr key={point.period} className="border-b border-slate-100 text-slate-700">
                    <td className="py-2 pr-3">期 {point.period}</td>
                    <td className="py-2 pr-3">{point.demand.toLocaleString()}</td>
                    <td className="py-2 pr-3">{point.safetyStock.toLocaleString()}</td>
                    <td className="py-2 pr-3 font-medium text-slate-900">{point.forecastLoad.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {capacityOptions.map((option) => {
            const classes = CAPACITY_CARD_CLASSES[option.id];
            const Icon = classes.Icon;
            const isSelected = state.productionCapacity != null && state.capacityScenario === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => handleSelectCapacity(option)}
                disabled={isCapacityLocked}
                aria-pressed={isSelected}
                className={`text-left rounded-lg border-2 p-4 transition-all ${classes.bg} ${
                  isSelected ? classes.selectedBorder : classes.border
                } ${isCapacityLocked ? 'cursor-default opacity-90' : 'hover:shadow-md'}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-5 h-5 ${classes.title}`} />
                    <div className={`font-semibold ${classes.title}`}>{option.name}</div>
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs font-medium ${classes.badge}`}>
                    {option.badge}
                  </span>
                </div>
                <div className="mt-4 text-3xl font-bold text-slate-950">
                  {option.capacity.toLocaleString()}
                  <span className="ml-1 text-sm font-normal text-slate-600">件/月</span>
                </div>
                <div className={`mt-2 text-xs font-medium ${classes.text}`}>{option.formulaLabel}</div>
                <p className={`mt-3 text-sm leading-relaxed ${classes.text}`}>{option.description}</p>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">{option.recommendation}</p>
                <div className={`mt-4 inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium ${
                  isSelected ? `${classes.button} text-white` : 'bg-white/80 text-slate-700'
                }`}>
                  {isSelected && <CheckCircle2 className="w-4 h-4" />}
                  {isSelected ? '已选择' : `选择${option.name}`}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderPeriod1Action = () => {
    if (predictionError) {
      return (
        <ProductionPredictionErrorAlert
          error={predictionError}
          selectedBestModel={state.selectedBestModel}
          isRetrying={isPredicting}
          onRetry={handlePredictPeriod1}
        />
      );
    }

    if (hasGeneratedPeriod1 && displayedPeriod1Demand != null) {
      return (
        <div className="bg-green-50 border-2 border-green-400 rounded-lg p-4">
          <div className="flex flex-col xl:flex-row xl:items-start gap-4">
            <div className="flex items-start space-x-3 flex-1 min-w-0">
              <CheckCircle2 className="w-7 h-7 text-green-600 flex-shrink-0" />
              <div className="min-w-0">
                <h4 className="font-semibold text-green-900 mb-2">第一期数据生成成功</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div className="bg-white rounded-lg p-3 border border-green-200">
                    <div className="text-xs text-gray-600 mb-1">使用模型</div>
                    <div className="font-semibold text-blue-700">{MODEL_NAME_MAP[state.selectedBestModel] || state.selectedBestModel}</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-green-200">
                    <div className="text-xs text-gray-600 mb-1">第一期预测需求</div>
                    <div className="text-xl font-bold text-gray-900">{displayedPeriod1Demand}</div>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-green-200">
                    <div className="text-xs text-gray-600 mb-1">当前月产能模式</div>
                    <div className="text-xl font-bold text-gray-900">
                      {selectedCapacityOption
                        ? `${selectedCapacityOption.name} · ${selectedCapacityOption.capacity.toLocaleString()}件/月`
                        : '待选择'}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      {selectedCapacityOption?.formulaLabel ?? '选择后将用于后续每期产出约束'}
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-600">
                  MPS 表第一排已按标准化规则填充：期初库存=0、产出量=需求、期末库存=0、缺货=0、服务水平=100%。下一步开始，所选月产能上限会用于约束每期产出量。
                </p>
                {renderCapacitySelection()}
              </div>
            </div>
            <div className="flex xl:justify-end flex-shrink-0">
              <button
                type="button"
                onClick={handleNext}
                disabled={state.productionCapacity == null}
                className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-colors font-medium shadow-md ${
                  state.productionCapacity == null
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 hover:shadow-lg'
                }`}
              >
                <span>进入下一步</span>
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-400 rounded-lg p-4">
        <div className="flex flex-col xl:flex-row xl:items-start gap-4">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-green-900 mb-2 flex items-center space-x-2">
              <TrendingUp className="w-5 h-5" />
              <span>开始预测第一期需求</span>
            </h4>
            <p className="text-sm text-green-800 leading-relaxed">
              调用已选择的最佳预测模型<strong>（{MODEL_NAME_MAP[state.selectedBestModel] || state.selectedBestModel}）</strong>生成 6 期需求预测，并立即填充 MPS 表第 1 行标准化数据。
            </p>
            <p className="mt-2 text-xs text-green-700 leading-relaxed">
              生产计划模块沿用需求预测阶段的目标字段、特征字段和归一化方式；LSTM/融合模型会基于已保存的历史窗口生成基线预测。
            </p>
            <details className="mt-2 text-sm">
              <summary className="cursor-pointer font-medium text-green-700 hover:text-green-800">
                查看生产预测特征说明
              </summary>
              <ProductionForecastAssumptionNote className="mt-3" />
            </details>
          </div>
          <div className="flex xl:justify-end flex-shrink-0">
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
      </div>
    );
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
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h5 className="font-semibold text-amber-900 mb-2">🏭 月产能模式</h5>
            <p className="text-sm text-amber-800 leading-relaxed">
              本实验不再使用固定默认产能。生成未来 6 期需求预测后，系统会计算每期<strong>预测负荷 = 预测需求 + 安全库存</strong>，
              并提供“产能紧张、产能正常、产能充裕”三种模式供你选择。
            </p>
            <p className="mt-2 text-xs text-amber-700 leading-relaxed">
              三种模式代表不同的资源配置策略。月产能上限表示每期最多能完成的产出量，不表示企业每期一定生产这么多；后续计算会使用公式：产出量 = min(上月投入量, 产能上限)。
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
                <strong>期初库存：</strong>第一个月的期初库存为 0（标准化基准）。
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <span>•</span>
              <div>
                <strong>产出量：</strong>第一个月的产出量等于需求量。这意味着我们假设生产完全满足市场需求，因而库存量和缺货量均为 0。
              </div>
            </div>
            <div className="flex items-start space-x-2">
              <span>•</span>
              <div>
                <strong>预测量：</strong>第一个月的预测量<strong>等于需求预测量</strong>（安全库存固定为0）。
                <div className="mt-1 text-xs bg-amber-50 border-l-4 border-amber-400 pl-3 py-2 rounded">
                  💡 <strong>概念说明</strong>：从第二个月开始，预测量 = 需求预测 + 安全库存。但第一个月作为<strong>标准化基准期</strong>，安全库存固定为0，因此预测量直接等于需求预测。这是为了简化第一期的计算，帮助您理解MPS的基本逻辑。
                </div>
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
              <div><strong>产出量的计算：</strong>产出量 = min(上月投入量, 产能上限)。第二个月的产出量等于第一个月的投入量（受产能上限约束）。</div>
            </div>
            <div className="flex items-start space-x-2">
              <div className="w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">3</div>
              <div><strong>库存量与缺货量的计算：</strong>期末库存 = 期初库存 + 产出量 - 实际需求量。根据实际需求量和期初库存，计算第二个月的库存或缺货情况。</div>
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
      {renderPeriod1Action()}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}
    </div>
  );
};

export default NewStep1;
