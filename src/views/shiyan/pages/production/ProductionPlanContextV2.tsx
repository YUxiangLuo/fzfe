import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { CapacityMode, CapacityScenario } from './utils/productionCapacityHelper';

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

  // 🆕 产能参数（支持多种模式）
  capacityMode: CapacityMode;           // 产能计算模式：scenario | auto | custom
  capacityScenario: CapacityScenario;   // 当前选择的场景（scenario模式使用）
  productionCapacity: number;           // 实际产能值（所有模式都使用此值）
  customCapacity: number | null;        // 自定义产能（custom模式使用）

  // 演示数据（用于第2期的教学演示）
  demoPrediction: number;
  demoStdDev: number;

  // 第1期的完整数据（作为参考，自动计算）
  period1Data: PeriodData;

  // 第2期的渐进式填充数据（用于教学演示）
  period2Data: Period2Data;

  // 完整MPS表（生成后）
  fullMPSTable: MPSTableRow[];
  isFullPlanGenerated: boolean;
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

  // 🆕 产能设置（支持多种模式）
  updateCapacity: (params: {
    mode?: CapacityMode;
    scenario?: CapacityScenario;
    customValue?: number;
    calculatedValue?: number;
  }) => void;

  // 第1期数据填充（一次性填充完整数据，用于显示参考）
  fillPeriod1Data: (data: PeriodData) => void;

  // 第2期数据填充（每完成一个概念就填充对应字段）
  fillPeriod2Field: (field: keyof Period2Data, value: number) => void;

  // 第2期数据批量更新
  updatePeriod2Data: (data: Partial<Period2Data>) => void;

  // 🆕 更新演示预测数据（从API获取真实预测值）
  updateDemoPrediction: (prediction: number, stdDev: number) => void;

  // 生成完整MPS表
  generateFullMPS: (predictions: Array<{ prediction: number; std_dev: number }>) => void;

  // 重置
  resetAll: () => void;
}

const ProductionPlanContext = createContext<ProductionPlanContextValue | undefined>(undefined);

// 默认状态
const getDefaultState = (
  initialModel?: string,
  avgDemand?: number,
  stdDevDemand?: number
): ProductionPlanState => {
  // 使用真实的平均需求（基于历史数据）或默认值
  const demoPrediction = avgDemand || 1050;
  const demoStdDev = stdDevDemand || 52;

  // 计算默认产能（基于真实需求）
  const defaultCapacity = Math.round(demoPrediction * 1.3); // normal场景：130%

  return {
    currentStep: 1,
    completedSteps: [],

    forecastPeriods: 6,
    initialInventory: 0, // 固定为0（客户需求：第一月标准化）
    targetServiceLevel: 0.99, // 固定为99%（追求卓越服务）
    safetyStockZScore: 2.33, // 对应99%服务水平的Z分数
    selectedBestModel: initialModel || 'lstm',

    // 🆕 产能参数（默认使用场景模式）
    capacityMode: 'scenario',
    capacityScenario: 'normal',
    productionCapacity: defaultCapacity,
    customCapacity: null,

    // 演示数据（第2期的预测值，用于教学）- 使用真实历史数据
    demoPrediction: demoPrediction,
    demoStdDev: demoStdDev,

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
  };
};

export const ProductionPlanProvider: React.FC<{
  children: ReactNode;
  initialModel?: string;
  avgDemand?: number;
  stdDevDemand?: number;
}> = ({ children, initialModel, avgDemand, stdDevDemand }) => {
  const initialPropsRef = useRef({
    initialModel,
    avgDemand,
    stdDevDemand,
  });

  const [state, setState] = useState<ProductionPlanState>(() =>
    getDefaultState(initialModel, avgDemand, stdDevDemand)
  );

  useEffect(() => {
    initialPropsRef.current = { initialModel, avgDemand, stdDevDemand };
  }, [initialModel, avgDemand, stdDevDemand]);

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

  // 🆕 更新产能配置（支持多种模式）
  const updateCapacity = (params: {
    mode?: CapacityMode;
    scenario?: CapacityScenario;
    customValue?: number;
    calculatedValue?: number;
  }) => {
    setState((prev) => {
      const newState = { ...prev };

      // 更新模式
      if (params.mode) {
        newState.capacityMode = params.mode;
      }

      // 更新场景
      if (params.scenario) {
        newState.capacityScenario = params.scenario;
      }

      // 更新自定义值
      if (params.customValue !== undefined) {
        newState.customCapacity = params.customValue;
      }

      // 更新实际产能值（这是所有计算使用的值）
      if (params.calculatedValue !== undefined) {
        newState.productionCapacity = params.calculatedValue;
      }

      return newState;
    });
  };

  const fillPeriod1Data = (data: PeriodData) => {
    setState((prev) => ({
      ...prev,
      period1Data: data,
    }));
  };

  const fillPeriod2Field = (field: keyof Period2Data, value: number) => {
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

  // 🆕 更新演示预测数据（从API获取的真实预测值）
  const updateDemoPrediction = (prediction: number, stdDev: number) => {
    setState((prev) => ({
      ...prev,
      demoPrediction: prediction,
      demoStdDev: stdDev,
    }));
  };

  const generateFullMPS = (predictions: Array<{ prediction: number; std_dev: number }>) => {
    console.log('🏭 ===== 开始生成完整MPS表 =====');
    console.log(`📊 参数: 预测期数=${predictions.length}, 初始库存=${state.initialInventory}, 产能=${state.productionCapacity}, 服务水平目标=${state.targetServiceLevel}, Z值=${state.safetyStockZScore}`);

    const generatedTable: MPSTableRow[] = [];
    let previousEndingInventory = state.initialInventory;
    let previousStockout = 0;

    for (let i = 0; i < predictions.length; i++) {
      const prediction = predictions[i];
      if (!prediction) continue;

      const demandForecast = Math.round(prediction.prediction);

      // 🛡️ 数据验证和修正：检查std_dev是否异常
      let stdDev = prediction.std_dev;

      // 1. 检查是否为负数或非法值（必须修正，否则会导致NaN）
      if (stdDev < 0 || !isFinite(stdDev) || isNaN(stdDev)) {
        console.warn(`⚠️ 期 ${i + 1} 的std_dev非法: ${stdDev}，使用需求的5%作为替代`);
        stdDev = demandForecast * 0.05;
      }
      // 2. 检查是否为0（MA等模型可能返回0）
      else if (stdDev === 0) {
        console.warn(`⚠️ 期 ${i + 1} 的std_dev为0，安全库存将为0`);
      }
      // 3. 检查是否异常大（超过预测值的30%）- 仅警告
      else if (stdDev > demandForecast * 0.3) {
        console.warn(`⚠️ 期 ${i + 1} 的std_dev异常大: ${stdDev.toFixed(2)}，占预测值 ${((stdDev/demandForecast)*100).toFixed(1)}%`);
      }

      const safetyStock = Math.round(state.safetyStockZScore * stdDev);

      const beginningInventory = previousEndingInventory;
      const backlogToRecover = previousStockout;

      // 计划生产量 = 预测需求 + 安全库存 + 上期缺货 - 期初库存
      const requiredProduction = Math.max(
        0,
        demandForecast + safetyStock + backlogToRecover - beginningInventory
      );

      // 🆕 应用产能约束
      const productionOutput = Math.max(0, Math.min(requiredProduction, state.productionCapacity));
      const isCapacityConstrained = requiredProduction > state.productionCapacity;

      // 可用库存 = 期初库存 + 实际产出
      const availableInventory = beginningInventory + productionOutput;
      // 总需求 = 上期缺货（需要补） + 本期需求
      const totalDemand = backlogToRecover + demandForecast;

      // 期末库存 = 可用库存 - 总需求
      let endingInventory = availableInventory - totalDemand;
      let stockout = 0;

      if (endingInventory < 0) {
        stockout = Math.abs(endingInventory);
        endingInventory = 0;
      }

      // 服务水平：基于本期需求（不包括补上期缺货）
      const serviceLevel = demandForecast > 0 ? 1 - (stockout / demandForecast) : 1;

      // 🐛 调试日志
      console.log(`\n📦 期 ${i + 1}:`);
      console.log(`  需求预测: ${demandForecast}, 标准差: ${stdDev.toFixed(2)}`);
      console.log(`  安全库存: ${safetyStock}`);
      console.log(`  期初库存: ${beginningInventory}, 上期缺货: ${backlogToRecover}`);
      console.log(`  计划生产: ${requiredProduction}, 产能上限: ${state.productionCapacity}`);
      console.log(`  ${isCapacityConstrained ? '⚠️ 产能受限！' : '✅ 产能充足'} 实际产出: ${productionOutput}`);
      console.log(`  可用库存: ${availableInventory} (期初${beginningInventory} + 产出${productionOutput})`);
      console.log(`  总需求: ${totalDemand} (补上期${backlogToRecover} + 本期${demandForecast})`);
      console.log(`  期末库存: ${endingInventory}, 本期缺货: ${stockout}, 服务水平: ${(serviceLevel * 100).toFixed(1)}%`);

      const row: MPSTableRow = {
        period: i + 1,
        period_label: `期 ${i + 1}`,
        demand_forecast: demandForecast,
        safety_stock: safetyStock,
        planned_production: requiredProduction,
        beginning_inventory: beginningInventory,
        production_output: productionOutput,
        ending_inventory: endingInventory,
        stockout: stockout,
        service_level: serviceLevel,
      };

      generatedTable.push(row);

      previousEndingInventory = endingInventory;
      previousStockout = stockout;
    }

    setState((prev) => ({
      ...prev,
      fullMPSTable: generatedTable,
      isFullPlanGenerated: true,
    }));
  };

  const resetAll = () => {
    const { initialModel: model, avgDemand: avg, stdDevDemand: std } = initialPropsRef.current;
    setState(getDefaultState(model, avg, std));
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
        updateDemoPrediction,
        generateFullMPS,
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
