import React, { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

// 预测结果接口
export interface ForecastResult {
  prediction: number;
  std_dev: number;
}

// MPS表行接口
export interface MPSTableRow {
  period: number;
  period_label: string;
  demand_forecast: number;
  safety_stock: number;
  planned_production: number;
  beginning_inventory: number;
  production_output: number;
  ending_inventory: number;
  stockout: number;
  service_level: number;
}

// 生产计划状态接口
export interface ProductionPlanState {
  // 输入参数
  forecastPeriods: number;
  initialInventory: number;
  targetServiceLevel: number;
  safetyStockZScore: number;

  // 预测结果
  forecastResults: ForecastResult[] | null;

  // MPS表数据
  mpsTable: MPSTableRow[];
  isCompleted: boolean;

  // 临时：模拟的最佳模型（用于测试）
  selectedBestModel: string | null;
}

// Context值接口
interface ProductionPlanContextValue {
  state: ProductionPlanState;
  updateForecastParams: (params: {
    forecastPeriods?: number;
    initialInventory?: number;
    targetServiceLevel?: number;
    safetyStockZScore?: number;
  }) => void;
  updateForecastResults: (results: ForecastResult[]) => void;
  updateMPSTable: (table: MPSTableRow[]) => void;
  setCompleted: (completed: boolean) => void;
  resetAll: () => void;
}

const ProductionPlanContext = createContext<ProductionPlanContextValue | undefined>(undefined);

// 默认状态
const getDefaultState = (): ProductionPlanState => ({
  forecastPeriods: 6,
  initialInventory: 0,
  targetServiceLevel: 0.95,
  safetyStockZScore: 1.65,
  forecastResults: null,
  mpsTable: [],
  isCompleted: false,
  // 临时：硬编码一个模型用于测试
  selectedBestModel: 'lstm',
});

export const ProductionPlanProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [state, setState] = useState<ProductionPlanState>(getDefaultState());

  const updateForecastParams = (params: {
    forecastPeriods?: number;
    initialInventory?: number;
    targetServiceLevel?: number;
    safetyStockZScore?: number;
  }) => {
    setState((prev) => ({
      ...prev,
      ...params,
      // 参数变更时清空结果
      forecastResults: null,
      mpsTable: [],
      isCompleted: false,
    }));
  };

  const updateForecastResults = (results: ForecastResult[]) => {
    setState((prev) => ({
      ...prev,
      forecastResults: results,
      // 清空MPS表，需要重新生成
      mpsTable: [],
      isCompleted: false,
    }));
  };

  const updateMPSTable = (table: MPSTableRow[]) => {
    setState((prev) => ({
      ...prev,
      mpsTable: table,
    }));
  };

  const setCompleted = (completed: boolean) => {
    setState((prev) => ({
      ...prev,
      isCompleted: completed,
    }));
  };

  const resetAll = () => {
    setState(getDefaultState());
  };

  return (
    <ProductionPlanContext.Provider
      value={{
        state,
        updateForecastParams,
        updateForecastResults,
        updateMPSTable,
        setCompleted,
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
