import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  calculateSafetyStock,
  type CapacityMode,
  type CapacityScenario,
} from './utils/productionCapacityHelper';
import {
  DEFAULT_PARAMETERS,
  getServiceLevelOption,
  resolvePersistedServiceLevel,
  type ServiceLevel,
} from './config/mpsConstants';
import type {
  ExperimentState,
  MPSTableRow as GlobalMPSTableRow,
  SelectedBestModel,
} from '../../contexts/ExperimentContext.zustand';

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

export interface ProductionPredictionPoint {
  prediction: number;
  std_dev: number;
  upper_error_p99: number;
  upper_error_p99_kind?: string;
  coverage_guarantee?: boolean;
  uncertainty_source: 'model' | 'empirical' | 'fallback';
  uncertainty_reason?: string;
  calibration_mean_error: number | null;
  calibration_count: number | null;
}

type PersistExperimentState = (
  updates: Partial<ExperimentState>,
  options?: { forceSync?: boolean; skipSync?: boolean; throwOnSyncError?: boolean },
) => Promise<void>;

// 生产计划状态接口
export interface ProductionPlanState {
  // 学习进度 (1-5)
  currentStep: number;
  completedSteps: number[];

  // 参数设置
  forecastPeriods: number;
  initialInventory: number;
  targetServiceLevel: ServiceLevel | null;
  safetyStockZScore: number | null;
  selectedBestModel: SelectedBestModel;

  // 产能参数
  capacityMode: CapacityMode;
  capacityScenario: CapacityScenario;   // 用户选择的产能场景：tight | normal | abundant
  productionCapacity: number | null;    // 实际产能值（每期最多能生产多少件，MPS计算的核心约束）
  customCapacity: number | null;

  // 初始估算值（基于历史数据的平均值，用于默认显示和fallback计算）
  avgDemand: number;

  // 预测结果数据（从预测接口获取的完整数据）
  predictions: ProductionPredictionPoint[] | null;

  // 第1期的完整数据（作为参考，自动计算）
  period1Data: PeriodData;

  // 第2期的渐进式填充数据（用于教学演示）
  period2Data: Period2Data;

  // 完整MPS表（生成后）
  fullMPSTable: MPSTableRow[];
  isFullPlanGenerated: boolean;

  // 完整计划表教学内容是否已隐藏（用于全屏显示MPS表）
  isCompletePlanTeachingHidden: boolean;

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
  }) => void;

  // 服务水平决定客户公式中的 Z 值；完成第1步后锁定。
  selectServiceLevel: (serviceLevel: ServiceLevel) => void;

  // 产能设置
  updateCapacity: (params: {
    mode?: CapacityMode;
    scenario?: CapacityScenario;
    calculatedValue?: number | null;
    customValue?: number | null;
    capacity?: number | null;
  }) => void;

  // 第1期数据填充（一次性填充完整数据，用于显示参考）
  fillPeriod1Data: (data: PeriodData) => void;

  // 第2期单字段填充
  fillPeriod2Field: (field: keyof Period2Data, value: number | null) => void;

  // 第2期数据批量更新
  updatePeriod2Data: (data: Partial<Period2Data>) => void;

  // 保存预测结果（从预测接口获取的完整数据）
  savePredictions: (predictions: ProductionPredictionPoint[]) => void;

  // 生成完整MPS表
  generateFullMPS: (predictions: ProductionPredictionPoint[]) => MPSTableRow[];

  // 完整计划表教学内容控制
  hideCompletePlanTeaching: () => void;

  // 保存MPS数据到全局状态
  saveMPSDataToGlobal: (
    updateStateFunc: PersistExperimentState,
    mpsTableOverride?: MPSTableRow[],
    predictionsOverride?: ProductionPredictionPoint[],
  ) => Promise<void>;

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

const toPeriodData = (row?: GlobalMPSTableRow): PeriodData => ({
  demandForecast: row?.demand_forecast ?? null,
  safetyStock: row?.safety_stock ?? null,
  plannedProduction: row?.planned_production ?? null,
  beginningInventory: row?.beginning_inventory ?? null,
  productionOutput: row?.production_output ?? null,
  endingInventory: row?.ending_inventory ?? null,
  stockout: row?.stockout ?? null,
  serviceLevel: row?.service_level ?? null,
});

const isPredictionPoint = (
  value: unknown,
): value is NonNullable<ExperimentState["production_forecast_results"]>[number] => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const prediction = (value as { prediction?: unknown }).prediction;
  const stdDev = (value as { std_dev?: unknown }).std_dev;
  const upperErrorP99 = (value as { upper_error_p99?: unknown }).upper_error_p99;
  const upperErrorP99Kind = (value as { upper_error_p99_kind?: unknown }).upper_error_p99_kind;
  const coverageGuarantee = (value as { coverage_guarantee?: unknown }).coverage_guarantee;
  const uncertaintySource = (value as { uncertainty_source?: unknown }).uncertainty_source;
  const calibrationMeanError = (value as { calibration_mean_error?: unknown }).calibration_mean_error;
  const calibrationCount = (value as { calibration_count?: unknown }).calibration_count;
  const hasValidCalibration = (
    calibrationMeanError === null
    && calibrationCount === null
  ) || (
    typeof calibrationMeanError === 'number'
    && Number.isFinite(calibrationMeanError)
    && typeof calibrationCount === 'number'
    && Number.isInteger(calibrationCount)
    && calibrationCount > 0
  );
  return typeof prediction === 'number' && Number.isFinite(prediction)
    && typeof stdDev === 'number' && Number.isFinite(stdDev) && stdDev >= 0
    && typeof upperErrorP99 === 'number' && Number.isFinite(upperErrorP99) && upperErrorP99 >= 0
    && (upperErrorP99Kind === undefined || (typeof upperErrorP99Kind === 'string' && upperErrorP99Kind.length > 0))
    && (coverageGuarantee === undefined || typeof coverageGuarantee === 'boolean')
    && ['model', 'empirical', 'fallback'].includes(String(uncertaintySource))
    && hasValidCalibration;
};

const isPersistedMpsRow = (value: unknown): value is GlobalMPSTableRow => {
  return typeof value === 'object' && value !== null && typeof (value as { period?: unknown }).period === 'number';
};

export interface ProductionPlanInitializationOptions {
  initialModel?: SelectedBestModel;
  avgDemand?: number;
  persistedState?: Partial<ExperimentState>;
}

export const buildInitialProductionPlanState = ({
  initialModel,
  avgDemand,
  persistedState,
}: ProductionPlanInitializationOptions = {}): ProductionPlanState => {
  // 使用真实的平均需求（基于历史数据）或默认值
  const defaultAvgDemand = avgDemand ?? 1050;

  const persistedPredictions = Array.isArray(persistedState?.production_forecast_results)
    && persistedState.production_forecast_results.every(isPredictionPoint)
    ? persistedState.production_forecast_results
    : null;
  const normalizedPredictions = persistedPredictions && persistedPredictions.length > 0
    ? persistedPredictions
    : null;
  const rawPersistedMpsTable = Array.isArray(persistedState?.production_mps_table)
    ? persistedState.production_mps_table.filter(isPersistedMpsRow)
    : [];
  const persistedServiceLevel = resolvePersistedServiceLevel(
    persistedState?.production_target_service_level,
    persistedState?.production_safety_stock_z_score,
  );
  const hasPersistedPlan = rawPersistedMpsTable.length > 0 && persistedServiceLevel !== null;
  const persistedMpsTable = hasPersistedPlan ? rawPersistedMpsTable : [];
  const completedSteps = hasPersistedPlan ? [1, 2, 3, 4, 5] : [];
  const currentStep = hasPersistedPlan ? 5 : 1;
  const capacityMode: CapacityMode = persistedState?.production_capacity_mode === 'custom'
    ? 'custom'
    : 'scenario';
  const productionCapacity = persistedServiceLevel === null
    ? null
    : capacityMode === 'custom'
    ? (persistedState?.production_custom_capacity
        ?? persistedState?.production_capacity
        ?? null)
    : (persistedState?.production_capacity
        ?? null);
  const forecastPeriods = persistedState?.production_forecast_periods
    ?? (hasPersistedPlan ? persistedMpsTable.length : DEFAULT_PARAMETERS.forecastPeriods);

  return {
    currentStep,
    completedSteps,

    forecastPeriods,
    initialInventory: persistedState?.production_initial_inventory ?? DEFAULT_PARAMETERS.initialInventory,
    targetServiceLevel: persistedServiceLevel?.value ?? DEFAULT_PARAMETERS.targetServiceLevel,
    safetyStockZScore: persistedServiceLevel?.zScore ?? DEFAULT_PARAMETERS.safetyStockZScore,
    selectedBestModel: initialModel ?? persistedState?.selected_best_model ?? 'lstm',

    // 产能参数（默认使用 normal 场景）
    capacityMode,
    capacityScenario: persistedState?.production_capacity_scenario ?? 'normal',
    productionCapacity,
    customCapacity: persistedServiceLevel !== null && capacityMode === 'custom'
      ? (persistedState?.production_custom_capacity ?? productionCapacity)
      : null,

    // 初始估算值（用于默认显示和 fallback 计算）
    avgDemand: defaultAvgDemand,

    // 预测结果（初始为空，Step1 时调用接口获取）
    predictions: normalizedPredictions,

    // 第1期的完整数据（初始为空，后续自动填充）
    period1Data: toPeriodData(persistedMpsTable[0]),

    // 第2期的渐进式数据（用于教学演示）
    period2Data: toPeriodData(persistedMpsTable[1]),

    fullMPSTable: persistedMpsTable,
    isFullPlanGenerated: hasPersistedPlan,

    isCompletePlanTeachingHidden: false,

    // 保存状态
    isSaving: false,
    savingError: null,
    hasSavedToGlobal: hasPersistedPlan && Boolean(persistedState?.production_plan_completed),
  };
};

export const ProductionPlanProvider: React.FC<{
  children: ReactNode;
  initialModel?: SelectedBestModel;
  avgDemand?: number;
  persistedState?: Partial<ExperimentState>;
}> = ({ children, initialModel, avgDemand, persistedState }) => {
  const initialPropsRef = useRef({
    initialModel,
    avgDemand,
  });

  const [state, setState] = useState<ProductionPlanState>(() =>
    buildInitialProductionPlanState({ initialModel, avgDemand, persistedState })
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
    if (step >= 1 && step <= 5) {
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
        currentStep: Math.min(prev.currentStep + 1, 5),
      };
    });
  };

  const updateParameters = (params: {
    forecastPeriods?: number;
    initialInventory?: number;
  }) => {
    setState((prev) => ({
      ...prev,
      ...params,
    }));
  };

  const selectServiceLevel = (serviceLevel: ServiceLevel) => {
    setState((prev) => {
      if (prev.completedSteps.includes(1)) return prev;
      const option = getServiceLevelOption(serviceLevel);
      if (!option) return prev;
      return {
        ...prev,
        targetServiceLevel: option.value,
        safetyStockZScore: option.zScore,
        productionCapacity: null,
        customCapacity: null,
      };
    });
  };

  // 更新产能配置
  const updateCapacity = (params: {
    mode?: CapacityMode;
    scenario?: CapacityScenario;
    calculatedValue?: number | null;
    customValue?: number | null;
    capacity?: number | null;
  }) => {
    setState((prev) => {
      if (prev.completedSteps.includes(1)) return prev;
      const nextMode = params.mode ?? prev.capacityMode;
      const nextScenario = params.scenario ?? prev.capacityScenario;

      const resolvedValue =
        params.calculatedValue ??
        params.capacity ??
        params.customValue ??
        prev.productionCapacity ??
        null;

      const shouldUseCustom = nextMode === 'custom';
      const nextCustom = shouldUseCustom
        ? params.customValue ??
          params.capacity ??
          params.calculatedValue ??
          prev.customCapacity ??
          resolvedValue
        : null;

      let productionCapacity: number | null = resolvedValue;
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
  const savePredictions = (predictions: ProductionPredictionPoint[]) => {
    setState((prev) => ({
      ...prev,
      predictions: predictions,
    }));
  };

  const generateFullMPS = (predictions: ProductionPredictionPoint[]) => {
    if (predictions.length < 2) {
      throw new Error('预测数据不足，至少需要2期数据');
    }
    if (state.productionCapacity == null) {
      throw new Error('请先选择月产能模式');
    }
    if (state.targetServiceLevel == null || state.safetyStockZScore == null) {
      throw new Error('请先选择目标服务水平');
    }

    // Period1 是标准化基准期，安全库存固定为 0，因此不校验 safetyStock
    const requiredPeriod1Fields: Array<keyof PeriodData> = [
      'demandForecast',
      'plannedProduction',
      'beginningInventory',
      'productionOutput',
      'endingInventory',
      'stockout',
      'serviceLevel',
    ];
    const requiredPeriod2Fields: Array<keyof Period2Data> = [
      'demandForecast',
      'safetyStock',
      'plannedProduction',
      'beginningInventory',
      'productionOutput',
      'endingInventory',
      'stockout',
      'serviceLevel',
    ];

    const missingPeriod1Fields = requiredPeriod1Fields.filter((field) => state.period1Data[field] == null);
    const missingPeriod2Fields = requiredPeriod2Fields.filter((field) => state.period2Data[field] == null);

    if (missingPeriod1Fields.length > 0) {
      throw new Error(`期1数据不完整：缺少 ${missingPeriod1Fields.join(', ')}`);
    }
    if (missingPeriod2Fields.length > 0) {
      throw new Error(`期2数据不完整：缺少 ${missingPeriod2Fields.join(', ')}`);
    }

    const totalPeriods = Math.min(state.forecastPeriods, predictions.length);

    // 构建期1和期2的数据（来自用户的实际学习操作）
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

    // 从期3开始生成，使用期2的结果作为初始状态
    let previousPlannedProduction = state.period2Data.plannedProduction ?? 0;
    let previousEndingInventory = state.period2Data.endingInventory ?? 0;
    let previousStockout = state.period2Data.stockout ?? 0;

    // 从期3开始循环（i=2对应期3）
    for (let i = 2; i < totalPeriods; i++) {
      const prediction = predictions[i];
      if (!prediction) continue;

      // 1. 产出量 = min(上期投入量, 产能)
      const productionOutput = Math.max(0, Math.min(previousPlannedProduction, state.productionCapacity));

      // 2. 计算本期库存、缺货、服务水平
      const beginningInventory = previousEndingInventory;
      const availableInventory = beginningInventory + productionOutput;
      let demandForecast = Math.round(prediction.prediction);
      if (!Number.isFinite(demandForecast) || demandForecast < 0) {
        console.warn(`⚠️ 期 ${i + 1} 需求预测值异常(${prediction.prediction})，已修正为0`);
        demandForecast = 0;
      }
      // 库存计算仅基于本期需求；上期缺货通过投入量公式中的 +previousStockout 补偿
      let endingInventory = availableInventory - demandForecast;
      let stockout = 0;
      if (endingInventory < 0) {
        stockout = Math.abs(endingInventory);
        endingInventory = 0;
      }
      const serviceLevel = demandForecast > 0 ? Math.max(0, 1 - (stockout / demandForecast)) : 1.0;


      // 3. 客户需求文档公式：安全库存 = Z × std_dev × √提前期。
      const safetyStock = calculateSafetyStock(
        prediction.std_dev,
        state.safetyStockZScore,
      );

      // 计划生产量 = 预测需求 + 安全库存 + 上期缺货 - 期初库存
      const plannedProduction = Math.max(
        0,
        demandForecast + safetyStock + previousStockout - beginningInventory
      );

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

    setState((prev) => ({
      ...prev,
      predictions,
      fullMPSTable: generatedTable,
      isFullPlanGenerated: true,
    }));

    return generatedTable;
  };

  const hideCompletePlanTeaching = () => {
    setState((prev) => ({
      ...prev,
      isCompletePlanTeachingHidden: true,
    }));
  };

  // 💾 保存MPS数据到全局状态
  const saveMPSDataToGlobal = async (
    updateStateFunc: PersistExperimentState,
    mpsTableOverride?: MPSTableRow[],
    predictionsOverride?: ProductionPredictionPoint[],
  ) => {
    setState((prev) => ({
      ...prev,
      isSaving: true,
      savingError: null,
    }));

    try {
      // 使用ref获取最新的state数据，避免闭包问题
      const currentState = stateRef.current;

      const mpsTableToSave = mpsTableOverride || currentState.fullMPSTable;
      if (mpsTableToSave.length === 0) {
        throw new Error('MPS表为空，无法保存');
      }

      // 转换MPS表格数据类型
      const globalMPSTable = convertToGlobalMPSTable(mpsTableToSave);
      const predictionsToSave = predictionsOverride ?? currentState.predictions;
      if (currentState.productionCapacity == null) {
        throw new Error('请先选择月产能模式');
      }
      if (currentState.targetServiceLevel == null || currentState.safetyStockZScore == null) {
        throw new Error('请先选择目标服务水平');
      }

      await updateStateFunc({
        production_plan_completed: true,
        production_forecast_periods: currentState.forecastPeriods,
        production_initial_inventory: currentState.initialInventory,
        production_target_service_level: currentState.targetServiceLevel,
        production_safety_stock_z_score: currentState.safetyStockZScore,
        production_forecast_results: predictionsToSave && predictionsToSave.length > 0
          ? predictionsToSave
          : null,
        production_mps_table: globalMPSTable,
        production_capacity_mode: currentState.capacityMode,
        production_capacity_scenario: currentState.capacityScenario,
        production_capacity: currentState.productionCapacity,
        production_custom_capacity: currentState.customCapacity,
      }, { forceSync: true, throwOnSyncError: true });

      setState((prev) => ({
        ...prev,
        isSaving: false,
        savingError: null,
        hasSavedToGlobal: true,
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '未知错误';
      console.error('保存生产计划数据失败:', err);

      setState((prev) => ({
        ...prev,
        isSaving: false,
        savingError: `保存失败: ${errorMessage}。请重试保存，成功后再进入测验。`,
        hasSavedToGlobal: false,
      }));

      // 重新抛出错误，让调用者知道保存失败
      throw err;
    }
  };

  const resetAll = () => {
    const { initialModel: model, avgDemand: avg } = initialPropsRef.current;
    setState(buildInitialProductionPlanState({ initialModel: model, avgDemand: avg }));
  };

  return (
    <ProductionPlanContext.Provider
      value={{
        state,
        goToStep,
        completeCurrentStep,
        updateParameters,
        selectServiceLevel,
        updateCapacity,
        fillPeriod1Data,
        fillPeriod2Field,
        updatePeriod2Data,
        savePredictions,
        generateFullMPS,
        hideCompletePlanTeaching,
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
