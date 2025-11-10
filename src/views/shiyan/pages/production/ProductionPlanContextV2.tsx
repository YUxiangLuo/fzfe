import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { CapacityMode, CapacityScenario } from './utils/productionCapacityHelper';
import { validateAndFixStdDev } from './utils/predictionValidator';
import { MPS_CALCULATION, DEFAULT_PARAMETERS } from './config/mpsConstants';
import { retryAsync } from '../../../../utils/retryAsync';
import type { MPSTableRow as GlobalMPSTableRow } from '../../contexts/ExperimentContext';

// MPS表格行接口
export interface MPSTableRow {
  period: number;
  period_label: string;
  demand_forecast: number | null;
  safety_stock: number | null;
  planned_production: number | null;
  beginning_inventory: number | null;
  production_output: number | null;
  ending_inventory: number | null;
  stockout: number | null;
  service_level: number | null;
}

// 单期数据接口（用于第1期和第2期）
export interface PeriodData {
  demandForecast: number | null;
  safetyStock: number | null;
  plannedProduction: number | null;
  beginningInventory: number | null;
  productionOutput: number | null;
  endingInventory: number | null;
  stockout: number | null;
  serviceLevel: number | null;
}

// 为了兼容性，保留Period2Data别名
export type Period2Data = PeriodData;

// 生产计划状态接口
export interface ProductionPlanState {
  // 学习进度 (1-6)
  currentStep: number;
  completedSteps: number[];

  // 参数设置
  forecastPeriods: number;
  initialInventory: number;
  targetServiceLevel: number;
  safetyStockZScore: number;
  selectedBestModel: string;

  // 产能参数
  capacityMode: CapacityMode;
  capacityScenario: CapacityScenario;   // 用户选择的产能场景：tight | normal | abundant
  productionCapacity: number;           // 实际产能值（每期最多能生产多少件，MPS计算的核心约束）
  customCapacity: number | null;

  // 初始估算值（基于历史数据的平均值，用于默认显示和fallback计算）
  avgDemand: number;

  // 预测结果数据（从预测接口获取的完整数据）
  predictions: Array<{ prediction: number; std_dev: number }> | null;

  // 第1期的完整数据（作为参考，自动计算）
  period1Data: PeriodData;

  // 第2期的渐进式填充数据（用于教学演示）
  period2Data: Period2Data;

  // 完整MPS表（生成后）
  fullMPSTable: MPSTableRow[];
  isFullPlanGenerated: boolean;

  // Step6教学内容是否已隐藏（用于全屏显示MPS表）
  isStep6TeachingHidden: boolean;

  // 保存状态
  isSaving: boolean;
  savingError: string | null;
  hasSavedToGlobal: boolean;
}

// Context值接口
interface ProductionPlanContextValue {
  state: ProductionPlanState;

  // 步骤控制
  goToStep: (step: number) => void;
  completeCurrentStep: () => void;

  // 参数设置
  updateParameters: (params: {
    forecastPeriods?: number;
    initialInventory?: number;
    targetServiceLevel?: number;
    safetyStockZScore?: number;
  }) => void;

  // 产能设置
  updateCapacity: (params: {
    mode?: CapacityMode;
    scenario?: CapacityScenario;
    calculatedValue?: number;
    customValue?: number;
    capacity?: number;
  }) => void;

  // 第1期数据填充（一次性填充完整数据，用于显示参考）
  fillPeriod1Data: (data: PeriodData) => void;

  // 第2期单字段填充
  fillPeriod2Field: (field: keyof Period2Data, value: number | null) => void;

  // 第2期数据批量更新
  updatePeriod2Data: (data: Partial<Period2Data>) => void;

  // 保存预测结果（从预测接口获取的完整数据）
  savePredictions: (predictions: Array<{ prediction: number; std_dev: number }>) => void;

  // 生成完整MPS表
  generateFullMPS: (predictions: Array<{ prediction: number; std_dev: number }>) => MPSTableRow[];

  // Step6教学内容控制
  hideStep6Teaching: () => void;

  // 保存MPS数据到全局状态（带重试机制）
  saveMPSDataToGlobal: (updateStateFunc: Function) => Promise<void>;

  // 重置
  resetAll: () => void;
}

const ProductionPlanContext = createContext<ProductionPlanContextValue | undefined>(undefined);

// 🔄 将本地MPS表格数据转换为全局类型（去除null）
const convertToGlobalMPSTable = (localTable: MPSTableRow[]): GlobalMPSTableRow[] => {
  return localTable.map(row => ({
    period: row.period,
    period_label: row.period_label,
    demand_forecast: row.demand_forecast ?? 0,
    safety_stock: row.safety_stock ?? 0,
    planned_production: row.planned_production ?? 0,
    beginning_inventory: row.beginning_inventory ?? 0,
    production_output: row.production_output ?? 0,
    ending_inventory: row.ending_inventory ?? 0,
    stockout: row.stockout ?? 0,
    service_level: row.service_level ?? 0,
  }));
};

// 默认状态
const getDefaultState = (
  initialModel?: string,
  avgDemand?: number
): ProductionPlanState => {
  // 使用真实的平均需求（基于历史数据）或默认值
  const defaultAvgDemand = avgDemand || 1050;

  // 计算默认产能（基于真实需求，使用 normal 场景的倍数 1.3）
  const defaultCapacity = Math.round(defaultAvgDemand * 1.3);

  return {
    currentStep: 1,
    completedSteps: [],

    forecastPeriods: DEFAULT_PARAMETERS.forecastPeriods,
    initialInventory: DEFAULT_PARAMETERS.initialInventory,
    targetServiceLevel: DEFAULT_PARAMETERS.targetServiceLevel,
    safetyStockZScore: DEFAULT_PARAMETERS.safetyStockZScore,
    selectedBestModel: initialModel || 'lstm',

    // 产能参数（默认使用 normal 场景）
    capacityMode: 'scenario',
    capacityScenario: 'normal',
    productionCapacity: defaultCapacity,
    customCapacity: null,

    // 初始估算值（用于默认显示和 fallback 计算）
    avgDemand: defaultAvgDemand,

    // 预测结果（初始为空，Step1 时调用接口获取）
    predictions: null,

    // 第1期的完整数据（初始为空，后续自动填充）
    period1Data: {
      demandForecast: null,
      safetyStock: null,
      plannedProduction: null,
      beginningInventory: null,
      productionOutput: null,
      endingInventory: null,
      stockout: null,
      serviceLevel: null,
    },

    // 第2期的渐进式数据（用于教学演示）
    period2Data: {
      demandForecast: null,
      safetyStock: null,
      plannedProduction: null,
      beginningInventory: null,
      productionOutput: null,
      endingInventory: null,
      stockout: null,
      serviceLevel: null,
    },

    fullMPSTable: [],
    isFullPlanGenerated: false,

    isStep6TeachingHidden: false,

    // 保存状态
    isSaving: false,
    savingError: null,
    hasSavedToGlobal: false,
  };
};

export const ProductionPlanProvider: React.FC<{
  children: ReactNode;
  initialModel?: string;
  avgDemand?: number;
}> = ({ children, initialModel, avgDemand }) => {
  const initialPropsRef = useRef({
    initialModel,
    avgDemand,
  });

  const [state, setState] = useState<ProductionPlanState>(() =>
    getDefaultState(initialModel, avgDemand)
  );

  // 🔄 使用ref保存最新的state，避免闭包问题
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    initialPropsRef.current = { initialModel, avgDemand };
  }, [initialModel, avgDemand]);

  const goToStep = (step: number) => {
    if (step >= 1 && step <= 6) {
      setState((prev) => ({ ...prev, currentStep: step }));
    }
  };

  const completeCurrentStep = () => {
    setState((prev) => {
      const newCompletedSteps = prev.completedSteps.includes(prev.currentStep)
        ? prev.completedSteps
        : [...prev.completedSteps, prev.currentStep];

      return {
        ...prev,
        completedSteps: newCompletedSteps,
        currentStep: Math.min(prev.currentStep + 1, 6),
      };
    });
  };

  const updateParameters = (params: {
    forecastPeriods?: number;
    initialInventory?: number;
    targetServiceLevel?: number;
    safetyStockZScore?: number;
  }) => {
    setState((prev) => ({
      ...prev,
      ...params,
    }));
  };

  // 更新产能配置
  const updateCapacity = (params: {
    mode?: CapacityMode;
    scenario?: CapacityScenario;
    calculatedValue?: number;
    customValue?: number;
    capacity?: number;
  }) => {
    setState((prev) => {
      const nextMode = params.mode ?? prev.capacityMode;
      const nextScenario = params.scenario ?? prev.capacityScenario;

      const resolvedValue =
        params.calculatedValue ??
        params.capacity ??
        params.customValue ??
        prev.productionCapacity;

      const shouldUseCustom = nextMode === 'custom';
      const nextCustom = shouldUseCustom
        ? params.customValue ??
          params.capacity ??
          params.calculatedValue ??
          prev.customCapacity ??
          resolvedValue
        : null;

      let productionCapacity = resolvedValue;
      let customCapacity: number | null = null;
      if (shouldUseCustom) {
        customCapacity = nextCustom ?? resolvedValue;
        productionCapacity = customCapacity;
      }

      return {
        ...prev,
        capacityMode: nextMode,
        capacityScenario: nextScenario,
        productionCapacity,
        customCapacity,
      };
    });
  };

  const fillPeriod1Data = (data: PeriodData) => {
    setState((prev) => ({
      ...prev,
      period1Data: data,
    }));
  };

  const fillPeriod2Field = <K extends keyof Period2Data>(
    field: K,
    value: Period2Data[K],
  ) => {
    setState((prev) => ({
      ...prev,
      period2Data: {
        ...prev.period2Data,
        [field]: value,
      },
    }));
  };

  const updatePeriod2Data = (data: Partial<Period2Data>) => {
    setState((prev) => ({
      ...prev,
      period2Data: {
        ...prev.period2Data,
        ...data,
      },
    }));
  };

  // 保存预测结果（从预测接口获取的完整数据）
  const savePredictions = (predictions: Array<{ prediction: number; std_dev: number }>) => {
    setState((prev) => ({
      ...prev,
      predictions: predictions,
    }));
  };

  const generateFullMPS = (predictions: Array<{ prediction: number; std_dev: number }>) => {
    console.log('🏭 ===== 开始生成完整MPS表 =====');
    console.log(`📊 参数: 预测期数=${predictions.length}, 初始库存=${state.initialInventory}, 产能=${state.productionCapacity}, 服务水平目标=${state.targetServiceLevel}, Z值=${state.safetyStockZScore}`);
    console.log('📋 Period1 数据:', state.period1Data);
    console.log('📋 Period2 数据:', state.period2Data);

    // 🆕 构建期1和期2的数据（来自用户的实际学习操作）
    const period1Row: MPSTableRow = {
      period: 1,
      period_label: '期 1',
      demand_forecast: state.period1Data.demandForecast,
      safety_stock: state.period1Data.safetyStock,
      planned_production: state.period1Data.plannedProduction,
      beginning_inventory: state.period1Data.beginningInventory,
      production_output: state.period1Data.productionOutput,
      ending_inventory: state.period1Data.endingInventory,
      stockout: state.period1Data.stockout,
      service_level: state.period1Data.serviceLevel,
    };

    const period2Row: MPSTableRow = {
      period: 2,
      period_label: '期 2',
      demand_forecast: state.period2Data.demandForecast,
      safety_stock: state.period2Data.safetyStock,
      planned_production: state.period2Data.plannedProduction,
      beginning_inventory: state.period2Data.beginningInventory,
      production_output: state.period2Data.productionOutput,
      ending_inventory: state.period2Data.endingInventory,
      stockout: state.period2Data.stockout,
      service_level: state.period2Data.serviceLevel,
    };

    const generatedTable: MPSTableRow[] = [period1Row, period2Row];

    // 🆕 从期3开始生成，使用期2的结果作为初始状态
    let previousPlannedProduction = state.period2Data.plannedProduction ?? 0;
    let previousEndingInventory = state.period2Data.endingInventory ?? 0;
    let previousStockout = state.period2Data.stockout ?? 0;

    console.log(`📌 期1和期2使用用户学习数据，从期3开始生成`);
    console.log(`📌 期2结束状态: 计划投入=${previousPlannedProduction}, 期末库存=${previousEndingInventory}, 缺货=${previousStockout}`);

    // 从期3开始循环（i=2对应期3）
    for (let i = 2; i < predictions.length; i++) {
      const prediction = predictions[i];
      if (!prediction) continue;

      // 1. 产出量 = min(上期投入量, 产能)
      const productionOutput = Math.max(0, Math.min(previousPlannedProduction, state.productionCapacity));
      const isCapacityConstrained = previousPlannedProduction > state.productionCapacity;

      // 2. 计算本期库存、缺货、服务水平
      const beginningInventory = previousEndingInventory;
      const availableInventory = beginningInventory + productionOutput;
      const demandForecast = Math.round(prediction.prediction);
      const totalDemand = previousStockout + demandForecast; // 补上期缺货 + 本期需求

      let endingInventory = availableInventory - totalDemand;
      let stockout = 0;
      if (endingInventory < 0) {
        stockout = Math.abs(endingInventory);
        endingInventory = 0;
      }
      // Corrected Service Level: Based on current period's demand and what was available for it.
      const unmetCurrentDemand = Math.max(0, demandForecast - (beginningInventory + productionOutput));
      const serviceLevel = demandForecast > 0 ? 1 - (unmetCurrentDemand / demandForecast) : 1.0;


      // 3. 计算本期投入量 (供下一期使用)
      // 🛡️ 数据验证和修正：使用专用验证函数
      const validationResult = validateAndFixStdDev(prediction.std_dev, demandForecast, i);
      validationResult.warnings.forEach(warning => console.warn(`⚠️ ${warning}`));
      const stdDev = validationResult.value;
      const safetyStock = Math.round(state.safetyStockZScore * stdDev);

      // 计划生产量 = 预测需求 + 安全库存 + 上期缺货 - 期初库存
      const plannedProduction = Math.max(
        0,
        demandForecast + safetyStock + previousStockout - beginningInventory
      );

      // 🐛 调试日志
      console.log(`\n📦 期 ${i + 1}:`);
      console.log(`  需求预测: ${demandForecast}, 标准差: ${stdDev.toFixed(2)}`);
      console.log(`  安全库存: ${safetyStock}`);
      console.log(`  期初库存: ${beginningInventory}, 上期缺货: ${previousStockout}`);
      console.log(`  上期投入: ${previousPlannedProduction}, 产能上限: ${state.productionCapacity}`);
      console.log(`  ${isCapacityConstrained ? '⚠️ 产能受限！' : '✅ 产能充足'} 实际产出: ${productionOutput}`);
      console.log(`  可用库存: ${availableInventory} (期初${beginningInventory} + 产出${productionOutput})`);
      console.log(`  总需求: ${totalDemand} (补上期${previousStockout} + 本期${demandForecast})`);
      console.log(`  期末库存: ${endingInventory}, 本期缺货: ${stockout}, 服务水平: ${(serviceLevel * 100).toFixed(1)}%`);
      console.log(`  本期计划投入 (for 期 ${i + 2}): ${plannedProduction}`);

      const row: MPSTableRow = {
        period: i + 1,
        period_label: `期 ${i + 1}`,
        demand_forecast: demandForecast,
        safety_stock: safetyStock,
        planned_production: plannedProduction,
        beginning_inventory: beginningInventory,
        production_output: productionOutput,
        ending_inventory: endingInventory,
        stockout: stockout,
        service_level: serviceLevel,
      };

      generatedTable.push(row);

      // 4. 更新循环变量
      previousPlannedProduction = plannedProduction;
      previousEndingInventory = endingInventory;
      previousStockout = stockout;
    }

    console.log(`\n✅ MPS表生成完成，共 ${generatedTable.length} 期`);
    console.log('生成的表格:', generatedTable);

    setState((prev) => ({
      ...prev,
      fullMPSTable: generatedTable,
      isFullPlanGenerated: true,
    }));

    return generatedTable;
  };

  const hideStep6Teaching = () => {
    setState((prev) => ({
      ...prev,
      isStep6TeachingHidden: true,
    }));
  };

  // 💾 保存MPS数据到全局状态（带重试机制）
  const saveMPSDataToGlobal = async (updateStateFunc: Function, mpsTableOverride?: MPSTableRow[]) => {
    setState((prev) => ({
      ...prev,
      isSaving: true,
      savingError: null,
    }));

    try {
      console.log('💾 保存生产计划数据到全局状态...');

      // 🔄 使用ref获取最新的state数据，避免闭包问题
      const currentState = stateRef.current;

      // 如果提供了 mpsTableOverride，使用它；否则使用 currentState.fullMPSTable
      const mpsTableToSave = mpsTableOverride || currentState.fullMPSTable;

      console.log('📊 使用的MPS表数据来源:', mpsTableOverride ? '直接传入' : 'stateRef');
      console.log('📊 完整MPS表数据（期1-' + mpsTableToSave.length + '）:', mpsTableToSave);

      // 转换MPS表格数据类型
      const globalMPSTable = convertToGlobalMPSTable(mpsTableToSave);

      // 使用重试机制保存数据（最多重试3次，指数退避）
      await retryAsync(
        async () => {
          await updateStateFunc({
            production_plan_completed: true,
            production_forecast_periods: currentState.forecastPeriods,
            production_initial_inventory: currentState.initialInventory,
            production_target_service_level: currentState.targetServiceLevel,
            production_safety_stock_z_score: currentState.safetyStockZScore,
            production_forecast_results: currentState.predictions,
            production_mps_table: globalMPSTable,
            production_capacity_scenario: currentState.capacityScenario,
            production_capacity: currentState.productionCapacity,
          });
        },
        3, // 最多重试3次
        1000 // 初始延迟1秒
      );

      console.log('✅ 生产计划数据已保存到全局状态');

      setState((prev) => ({
        ...prev,
        isSaving: false,
        savingError: null,
        hasSavedToGlobal: true,
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      console.error('❌ 保存生产计划数据失败（已重试3次）:', err);

      setState((prev) => ({
        ...prev,
        isSaving: false,
        savingError: `保存失败: ${errorMessage}。数据将在您进入测验前再次尝试保存。`,
        hasSavedToGlobal: false,
      }));

      // 重新抛出错误，让调用者知道保存失败
      throw err;
    }
  };

  const resetAll = () => {
    const { initialModel: model, avgDemand: avg } = initialPropsRef.current;
    setState(getDefaultState(model, avg));
  };

  return (
    <ProductionPlanContext.Provider
      value={{
        state,
        goToStep,
        completeCurrentStep,
        updateParameters,
        updateCapacity,
        fillPeriod1Data,
        fillPeriod2Field,
        updatePeriod2Data,
        savePredictions,
        generateFullMPS,
        hideStep6Teaching,
        saveMPSDataToGlobal,
        resetAll,
      }}
    >
      {children}
    </ProductionPlanContext.Provider>
  );
};

export const useProductionPlan = () => {
  const context = useContext(ProductionPlanContext);
  if (context === undefined) {
    throw new Error('useProductionPlan must be used within a ProductionPlanProvider');
  }
  return context;
};
