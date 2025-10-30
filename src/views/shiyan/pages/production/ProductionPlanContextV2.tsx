import React, { createContext, useContext, useState } from 'react';
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

// 第2期的渐进式数据
export interface Period2Data {
  demandForecast: number | null;
  safetyStock: number | null;
  plannedProduction: number | null;
  beginningInventory: number | null;
  productionOutput: number | null;
  endingInventory: number | null;
  stockout: number | null;
  serviceLevel: number | null;
}

// 生产计划状态接口
export interface ProductionPlanState {
  // 学习进度 (1-9)
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

  // 第2期的渐进式填充数据
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

  // 第2期数据填充（每完成一个概念就填充对应字段）
  fillPeriod2Field: (field: keyof Period2Data, value: number) => void;

  // 生成完整MPS表
  generateFullMPS: (predictions: Array<{ prediction: number; std_dev: number }>) => void;

  // 重置
  resetAll: () => void;
}

const ProductionPlanContext = createContext<ProductionPlanContextValue | undefined>(undefined);

// 默认状态
const getDefaultState = (): ProductionPlanState => {
  // 计算默认产能（基于演示数据）
  const demoPrediction = 1050;
  const defaultCapacity = Math.round(demoPrediction * 1.3); // normal场景：130%

  return {
    currentStep: 1,
    completedSteps: [],

    forecastPeriods: 6,
    initialInventory: 100,
    targetServiceLevel: 0.95,
    safetyStockZScore: 1.65,
    selectedBestModel: 'lstm',

    // 🆕 产能参数（默认使用场景模式）
    capacityMode: 'scenario',
    capacityScenario: 'normal',
    productionCapacity: defaultCapacity,
    customCapacity: null,

    // 演示数据（第2期的预测值，用于教学）
    demoPrediction: 1050,
    demoStdDev: 52,

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

export const ProductionPlanProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<ProductionPlanState>(getDefaultState());

  const goToStep = (step: number) => {
    if (step >= 1 && step <= 9) {
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
        currentStep: Math.min(prev.currentStep + 1, 9),
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

  const fillPeriod2Field = (field: keyof Period2Data, value: number) => {
    setState((prev) => ({
      ...prev,
      period2Data: {
        ...prev.period2Data,
        [field]: value,
      },
    }));
  };

  const generateFullMPS = (predictions: Array<{ prediction: number; std_dev: number }>) => {
    const generatedTable: MPSTableRow[] = [];
    let previousEndingInventory = state.initialInventory;
    let previousStockout = 0;

    for (let i = 0; i < predictions.length; i++) {
      const prediction = predictions[i];
      if (!prediction) continue;

      const demandForecast = Math.round(prediction.prediction);
      const safetyStock = Math.round(state.safetyStockZScore * prediction.std_dev);
      const plannedProduction = demandForecast + safetyStock;

      const beginningInventory = previousEndingInventory;
      const productionInput = plannedProduction - beginningInventory + previousStockout;

      // 🆕 应用产能约束
      const productionOutput = Math.max(0, Math.min(productionInput, state.productionCapacity));

      let endingInventory = beginningInventory + productionOutput - demandForecast;
      let stockout = 0;

      if (endingInventory < 0) {
        stockout = Math.abs(endingInventory);
        endingInventory = 0;
      }

      // 修正：服务水平基于预测需求，而非"实际需求"
      const serviceLevel = demandForecast > 0 ? 1 - (stockout / demandForecast) : 1;

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
    setState(getDefaultState());
  };

  return (
    <ProductionPlanContext.Provider
      value={{
        state,
        goToStep,
        completeCurrentStep,
        updateParameters,
        updateCapacity,
        fillPeriod2Field,
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
