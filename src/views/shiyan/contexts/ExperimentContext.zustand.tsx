/**
 * ExperimentContext - Zustand Implementation
 *
 * 🐛 调试模式:
 * - 在浏览器控制台运行: window.__EXPERIMENT_DEBUG__ = true (启用)
 * - 在浏览器控制台运行: window.__EXPERIMENT_DEBUG__ = false (禁用)
 * - 或直接修改下面的 DEBUG_MODE 变量
 *
 * 📊 Redux DevTools:
 * - 安装 Redux DevTools 浏览器插件即可自动查看状态变化
 * - 插件地址: https://github.com/reduxjs/redux-devtools
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import {
  getExperimentState,
  updateExperimentState as apiUpdateExperimentState,
  createExperimentState,
  recordStepEvent,
} from '../api';
import { apiClient } from "../../../utils/apiClient";

// Debug flag - can be controlled at runtime via window.__EXPERIMENT_DEBUG__
declare global {
  interface Window {
    __EXPERIMENT_DEBUG__?: boolean;
  }
}

const DEBUG_MODE = true; // Default debug mode

// Helper to check debug mode (supports runtime override)
const isDebugEnabled = () => {
  return typeof window !== 'undefined' && window.__EXPERIMENT_DEBUG__ !== undefined
    ? window.__EXPERIMENT_DEBUG__
    : DEBUG_MODE;
};

// Logger helper
const logger = {
  action: (actionName: string, ...args: any[]) => {
    if (isDebugEnabled()) {
      console.group(`🔵 [Zustand Action] ${actionName}`);
      console.log("Arguments:", args);
      console.log("Timestamp:", new Date().toLocaleTimeString());
      console.groupEnd();
    }
  },
  stateChange: (actionName: string, before: any, after: any) => {
    if (isDebugEnabled()) {
      console.group(`🟢 [State Change] ${actionName}`);
      console.log("Before:", before);
      console.log("After:", after);
      console.log("Diff:", {
        added: Object.keys(after).filter(k => !(k in before)),
        changed: Object.keys(after).filter(k => after[k] !== before[k]),
      });
      console.groupEnd();
    }
  },
  error: (actionName: string, error: any) => {
    console.group(`🔴 [Error] ${actionName}`);
    console.error("Error:", error);
    console.log("Timestamp:", new Date().toLocaleTimeString());
    console.groupEnd();
  },
};

type ExperimentStatus = "Not Started" | "In Progress" | "Completed";

export type SelectedBestModel =
  | "ma"
  | "exp"
  | "arima"
  | "lstm"
  | "ensemble_weighted"
  | "ensemble_boosting"
  | "ensemble_stacking";

export interface ModelMetrics {
  rmse: number | null;
  mae: number | null;
  r2: number | null;
}

export interface ProductSalesData {
  meta: {
    industry: string;
    company: string;
    product: string;
    name: string;
    description: string;
    unit: string;
  };
  monthlySales: {
    month: string;
    sales: number;
  }[];
  csvData?: string[][]; // 原始CSV数据，第一行为表头
}

export interface AdfStationarityRow {
  diff_order: number;
  statistic: number;
  p_value: number;
  stationary: boolean;
  critical_values: Record<string, number>;
}

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

export interface ExperimentState {
  experiment_id: number | null;
  student_id: number | null;
  status: ExperimentStatus;
  highest_completed_step: number;
  current_step: number;
  selected_industry: string | null;
  selected_company: string | null;
  selected_product: string | null;

  // New fields for the refactored flow
  selected_base_models: string[];
  selected_ensemble_models: string[];

  data_window_train_start_index: number | null;
  data_window_train_end_index: number | null;
  data_window_evaluate_start_index: number | null;
  data_window_evaluate_end_index: number | null;

  moving_average_completed: boolean;
  moving_average_window: number | null;
  moving_average_metrics_rmse: number | null;
  moving_average_metrics_mae: number | null;
  moving_average_metrics_r2: number | null;

  exponential_smoothing_completed: boolean;
  exponential_smoothing_alpha: number | null;
  exponential_smoothing_metrics_rmse: number | null;
  exponential_smoothing_metrics_mae: number | null;
  exponential_smoothing_metrics_r2: number | null;

  arima_completed: boolean;
  arima_p: number | null;
  arima_d: number | null;
  arima_q: number | null;
  arima_metrics_rmse: number | null;
  arima_metrics_mae: number | null;
  arima_metrics_r2: number | null;
  arima_adf_stationarity: AdfStationarityRow[];

  lstm_completed: boolean;
  lstm_normalization: "minmax" | "zscore" | null;
  lstm_features: string[];
  lstm_metrics_rmse: number | null;
  lstm_metrics_mae: number | null;
  lstm_metrics_r2: number | null;

  ensemble_weighted_completed: boolean;
  ensemble_weighted_base_models: string[];
  ensemble_weighted_metrics_rmse: number | null;
  ensemble_weighted_metrics_mae: number | null;
  ensemble_weighted_metrics_r2: number | null;

  ensemble_boosting_completed: boolean;
  ensemble_boosting_base_models: string[];
  ensemble_boosting_metrics_rmse: number | null;
  ensemble_boosting_metrics_mae: number | null;
  ensemble_boosting_metrics_r2: number | null;

  ensemble_stacking_completed: boolean;
  ensemble_stacking_base_models: string[];
  ensemble_stacking_metrics_rmse: number | null;
  ensemble_stacking_metrics_mae: number | null;
  ensemble_stacking_metrics_r2: number | null;

  selected_best_model: SelectedBestModel | null;

  lstm_target_field: string | null;
  quiz_about_model_completed: boolean;
  quiz_about_plan_completed: boolean;

  // Production planning fields
  production_plan_completed: boolean;
  production_forecast_periods: number | null;
  production_initial_inventory: number | null;
  production_target_service_level: number | null;
  production_safety_stock_z_score: number | null;
  production_forecast_results: Array<{
    prediction: number;
    std_dev: number;
  }> | null;
  production_mps_table: MPSTableRow[];
  production_capacity_mode: "scenario" | "auto" | "custom" | null;
  production_capacity_scenario: "tight" | "normal" | "abundant" | null;
  production_capacity: number | null;
  production_custom_capacity: number | null;

  start_time: string | null;
  last_activity_at: string | null;
  completion_time: string | null;
}

const buildInitialState = (): ExperimentState => ({
  experiment_id: null,
  student_id: null,
  status: "Not Started",
  highest_completed_step: 0,
  current_step: 1,
  selected_industry: null,
  selected_company: null,
  selected_product: null,

  selected_base_models: [],
  selected_ensemble_models: [],

  data_window_train_start_index: null,
  data_window_train_end_index: null,
  data_window_evaluate_start_index: null,
  data_window_evaluate_end_index: null,

  moving_average_completed: false,
  moving_average_window: null,
  moving_average_metrics_rmse: null,
  moving_average_metrics_mae: null,
  moving_average_metrics_r2: null,

  exponential_smoothing_completed: false,
  exponential_smoothing_alpha: null,
  exponential_smoothing_metrics_rmse: null,
  exponential_smoothing_metrics_mae: null,
  exponential_smoothing_metrics_r2: null,

  arima_completed: false,
  arima_p: null,
  arima_d: null,
  arima_q: null,
  arima_metrics_rmse: null,
  arima_metrics_mae: null,
  arima_metrics_r2: null,
  arima_adf_stationarity: [],

  lstm_completed: false,
  lstm_normalization: null,
  lstm_features: [],
  lstm_metrics_rmse: null,
  lstm_metrics_mae: null,
  lstm_metrics_r2: null,

  ensemble_weighted_completed: false,
  ensemble_weighted_base_models: [],
  ensemble_weighted_metrics_rmse: null,
  ensemble_weighted_metrics_mae: null,
  ensemble_weighted_metrics_r2: null,

  ensemble_boosting_completed: false,
  ensemble_boosting_base_models: [],
  ensemble_boosting_metrics_rmse: null,
  ensemble_boosting_metrics_mae: null,
  ensemble_boosting_metrics_r2: null,

  ensemble_stacking_completed: false,
  ensemble_stacking_base_models: [],
  ensemble_stacking_metrics_rmse: null,
  ensemble_stacking_metrics_mae: null,
  ensemble_stacking_metrics_r2: null,

  selected_best_model: null,

  lstm_target_field: null,
  quiz_about_model_completed: false,
  quiz_about_plan_completed: false,

  production_plan_completed: false,
  production_forecast_periods: null,
  production_initial_inventory: null,
  production_target_service_level: null,
  production_safety_stock_z_score: null,
  production_forecast_results: null,
  production_mps_table: [],
  production_capacity_mode: null,
  production_capacity_scenario: null,
  production_capacity: null,
  production_custom_capacity: null,

  start_time: null,
  last_activity_at: null,
  completion_time: null,
});

export const initialState: ExperimentState = buildInitialState();

const resetModelingFields = (
  target: ExperimentState,
  {
    resetQuizzes,
    preserveDataWindow = false,
  }: { resetQuizzes: boolean; preserveDataWindow?: boolean },
) => {
  if (!preserveDataWindow) {
    target.data_window_train_start_index = null;
    target.data_window_train_end_index = null;
    target.data_window_evaluate_start_index = null;
    target.data_window_evaluate_end_index = null;
  }

  target.selected_base_models = [];
  target.selected_ensemble_models = [];

  target.moving_average_completed = false;
  target.moving_average_window = null;
  target.moving_average_metrics_rmse = null;
  target.moving_average_metrics_mae = null;
  target.moving_average_metrics_r2 = null;

  target.exponential_smoothing_completed = false;
  target.exponential_smoothing_alpha = null;
  target.exponential_smoothing_metrics_rmse = null;
  target.exponential_smoothing_metrics_mae = null;
  target.exponential_smoothing_metrics_r2 = null;

  target.arima_completed = false;
  target.arima_p = null;
  target.arima_d = null;
  target.arima_q = null;
  target.arima_metrics_rmse = null;
  target.arima_metrics_mae = null;
  target.arima_metrics_r2 = null;
  target.arima_adf_stationarity = [];

  target.lstm_completed = false;
  target.lstm_normalization = null;
  target.lstm_features = [];
  target.lstm_target_field = null;
  target.lstm_metrics_rmse = null;
  target.lstm_metrics_mae = null;
  target.lstm_metrics_r2 = null;

  target.ensemble_weighted_completed = false;
  target.ensemble_weighted_base_models = [];
  target.ensemble_weighted_metrics_rmse = null;
  target.ensemble_weighted_metrics_mae = null;
  target.ensemble_weighted_metrics_r2 = null;

  target.ensemble_boosting_completed = false;
  target.ensemble_boosting_base_models = [];
  target.ensemble_boosting_metrics_rmse = null;
  target.ensemble_boosting_metrics_mae = null;
  target.ensemble_boosting_metrics_r2 = null;

  target.ensemble_stacking_completed = false;
  target.ensemble_stacking_base_models = [];
  target.ensemble_stacking_metrics_rmse = null;
  target.ensemble_stacking_metrics_mae = null;
  target.ensemble_stacking_metrics_r2 = null;

  target.selected_best_model = null;

  target.production_plan_completed = false;
  target.production_forecast_periods = null;
  target.production_initial_inventory = null;
  target.production_target_service_level = null;
  target.production_safety_stock_z_score = null;
  target.production_forecast_results = null;
  target.production_mps_table = [];
  target.production_capacity_mode = null;
  target.production_capacity_scenario = null;
  target.production_capacity = null;
  target.production_custom_capacity = null;

  if (resetQuizzes) {
    target.quiz_about_model_completed = false;
    target.quiz_about_plan_completed = false;
  }
};

const resetProductionPlanFields = (target: ExperimentState) => {
  target.production_plan_completed = false;
  target.production_forecast_periods = null;
  target.production_initial_inventory = null;
  target.production_target_service_level = null;
  target.production_safety_stock_z_score = null;
  target.production_forecast_results = null;
  target.production_mps_table = [];
  target.production_capacity_mode = null;
  target.production_capacity_scenario = null;
  target.production_capacity = null;
  target.production_custom_capacity = null;
  target.quiz_about_plan_completed = false;
};

// Toast function placeholder - will be injected
let addToastFn: ((message: string, type: "success" | "error" | "info") => void) | null = null;

export const setToastFunction = (fn: (message: string, type: "success" | "error" | "info") => void) => {
  addToastFn = fn;
};

const addToast = (message: string, type: "success" | "error" | "info") => {
  if (addToastFn) {
    addToastFn(message, type);
  }
};

interface ExperimentStore {
  // State
  state: ExperimentState;
  loading: boolean;
  productSalesData: ProductSalesData | null;
  isLoadingSales: boolean;
  salesDataError: string | null;
  productFieldOptions: string[] | null;
  isLoadingFields: boolean;
  productFieldsError: string | null;
  isSubmitting: boolean;

  // Actions
  initialize: () => Promise<void>;
  setIsSubmitting: (isSubmitting: boolean) => void;
  updateState: (
    updates: Partial<ExperimentState>,
    forceSync?: boolean,
    skipSync?: boolean,
  ) => Promise<void>;
  handleIndustryChange: (selected_industry: string) => Promise<void>;
  handleCompanyChange: (selected_company: string) => Promise<void>;
  handleProductChange: (selected_product: string) => Promise<void>;
  handleDataWindowChange: (updates: Partial<ExperimentState>) => Promise<void>;
  handleEnterEvaluation: () => Promise<void>;
  handleBestModelChange: (selected_best_model: SelectedBestModel | null) => Promise<void>;
  recordStepEvent: (stepOrder: number, eventType: "STARTED" | "COMPLETED") => Promise<void>;
  isStepCompleted: (step: number) => boolean;
  isStepUnlocked: (step: number) => boolean;
  loadProductSalesData: (industry: string, company: string, product: string) => Promise<boolean>;
  loadProductFieldOptions: (industry: string, company: string, product: string) => Promise<boolean>;
  resetMovingAverageModel: () => Promise<void>;
  resetExponentialSmoothingModel: () => Promise<void>;
  resetARIMAModel: () => Promise<void>;
  resetLSTMModel: () => Promise<void>;
  resetWeightedEnsembleModel: () => Promise<void>;
  resetBoostingEnsembleModel: () => Promise<void>;
  resetStackingEnsembleModel: () => Promise<void>;
  createNewExperiment: () => Promise<void>;
}

export const useExperimentStore = create<ExperimentStore>()(
  devtools(
    (set, get) => ({
  // Initial state
  state: buildInitialState(),
  loading: true,
  productSalesData: null,
  isLoadingSales: false,
  salesDataError: null,
  productFieldOptions: null,
  isLoadingFields: false,
  productFieldsError: null,
  isSubmitting: false,

  // Set submitting state
  setIsSubmitting: (isSubmitting) => {
    set({ isSubmitting });
  },

  // Initialize - fetch experiment state
  initialize: async () => {
    logger.action("initialize");
    const fetchState = async (retryCount = 0): Promise<void> => {
      const maxRetries = 2;
      set({ loading: true });
      try {
        const fetchedState = await getExperimentState();
        logger.stateChange("initialize", buildInitialState(), fetchedState);
        set({ state: fetchedState, loading: false });
      } catch (error) {
        logger.error("initialize", error);
        console.warn(`Experiment state fetch attempt ${retryCount + 1} failed:`, error);

        if (
          retryCount < maxRetries &&
          !(error instanceof Error && error.message?.includes("network"))
        ) {
          console.log(`Retrying experiment state fetch in ${1000 * (retryCount + 1)}ms...`);
          setTimeout(() => fetchState(retryCount + 1), 1000 * (retryCount + 1));
          return;
        }

        const currentState = get().state;
        if (currentState.experiment_id) {
          console.log("Keeping existing experiment state despite fetch error");
          addToast("实验状态同步失败，但将继续使用当前状态", "info");
        } else {
          console.log("No existing experiment found, initializing to default state");
          set({ state: buildInitialState() });
        }
        set({ loading: false });
      }
    };
    await fetchState();
  },

  // Update state
  updateState: async (updates, forceSync = false, skipSync = false) => {
    logger.action("updateState", { updates, forceSync, skipSync });
    const previousState = get().state;
    let nextState: ExperimentState = { ...previousState, ...updates };

    if (nextState.status === "Not Started" && Object.keys(updates).length > 0) {
      nextState.status = "In Progress";
      nextState.start_time = nextState.start_time ?? new Date().toISOString();
    }

    nextState.last_activity_at = new Date().toISOString();

    logger.stateChange("updateState", previousState, nextState);
    set({ state: nextState });

    // Record COMPLETED event if highest_completed_step increased
    if (
      nextState.highest_completed_step > previousState.highest_completed_step &&
      nextState.experiment_id
    ) {
      for (
        let step = previousState.highest_completed_step + 1;
        step <= nextState.highest_completed_step;
        step++
      ) {
        recordStepEvent(nextState.experiment_id, step, "COMPLETED").catch((err) => {
          console.error(`Failed to record COMPLETED event for step ${step}:`, err);
        });
      }
    }

    // Determine if we should sync to backend
    const stepCompleted =
      nextState.highest_completed_step > previousState.highest_completed_step;

    const modelCompletionFields = [
      "moving_average_completed",
      "exponential_smoothing_completed",
      "arima_completed",
      "lstm_completed",
      "ensemble_weighted_completed",
      "ensemble_boosting_completed",
      "ensemble_stacking_completed",
    ] as const;


    const modelReset = modelCompletionFields.some(
      (field) => nextState[field] === false && previousState[field] === true,
    );

    const experimentCompleted =
      Object.prototype.hasOwnProperty.call(updates, "status") &&
      nextState.status === "Completed" &&
      previousState.status !== "Completed";

    const shouldSyncToBackend =
      !skipSync && (forceSync || stepCompleted || modelReset || experimentCompleted);

    if (shouldSyncToBackend) {
      try {
        const serverState = await apiUpdateExperimentState(nextState);

        addToast("实验进度已同步至云端", "success");
        if (serverState && typeof serverState === "object") {
          const mergedState = {
            ...serverState,
            selected_base_models: nextState.selected_base_models,
            selected_ensemble_models: nextState.selected_ensemble_models,
          };
          set({ state: mergedState as ExperimentState });

          const productChangedRemote =
            mergedState.selected_industry !== previousState.selected_industry ||
            mergedState.selected_company !== previousState.selected_company ||
            mergedState.selected_product !== previousState.selected_product;

          if (productChangedRemote) {
            set({
              productSalesData: null,
              salesDataError: null,
              productFieldOptions: null,
              productFieldsError: null,
            });
          }
        }
      } catch (error) {
        addToast("同步失败，请检查网络连接或联系管理员", "error");
        console.error("Failed to persist experiment state.", error);
      }
    }
  },

  // Handle industry change
  handleIndustryChange: async (selected_industry) => {
    logger.action("handleIndustryChange", { selected_industry });
    set({ isSubmitting: true });
    try {
      const currentState = get().state;
      const newState: ExperimentState = { ...currentState, selected_industry };
      newState.selected_company = null;
      newState.selected_product = null;
      newState.highest_completed_step = 1;
      newState.current_step = 2;
      resetModelingFields(newState, { resetQuizzes: true });

      set({
        productSalesData: null,
        salesDataError: null,
        productFieldOptions: null,
        productFieldsError: null,
      });

      await get().updateState(newState, true);
    } finally {
      set({ isSubmitting: false });
    }
  },

  // Handle company change
  handleCompanyChange: async (selected_company) => {
    logger.action("handleCompanyChange", { selected_company });
    set({ isSubmitting: true });
    try {
      const currentState = get().state;
      const newState: ExperimentState = { ...currentState, selected_company };
      newState.selected_product = null;
      newState.highest_completed_step = 2;
      newState.current_step = 3;
      resetModelingFields(newState, { resetQuizzes: true });

      set({
        productSalesData: null,
        salesDataError: null,
        productFieldOptions: null,
        productFieldsError: null,
      });

      await get().updateState(newState, true);
    } finally {
      set({ isSubmitting: false });
    }
  },

  // Handle product change
  handleProductChange: async (selected_product) => {
    logger.action("handleProductChange", { selected_product });
    set({ isSubmitting: true });
    try {
      const currentState = get().state;
      const newState: ExperimentState = { ...currentState, selected_product };
      newState.highest_completed_step = 3;
      newState.current_step = 4;
      resetModelingFields(newState, { resetQuizzes: true });

      set({
        productSalesData: null,
        salesDataError: null,
        productFieldOptions: null,
        productFieldsError: null,
      });

      await get().updateState(newState, true);
    } finally {
      set({ isSubmitting: false });
    }
  },

  // Handle data window change
  handleDataWindowChange: async (updates) => {
    set({ isSubmitting: true });
    try {
      const currentState = get().state;
      const newState: ExperimentState = { ...currentState, ...updates };
      resetModelingFields(newState, {
        resetQuizzes: true,
        preserveDataWindow: true,
      });
      newState.highest_completed_step = 4;
      newState.current_step = 5;
      await get().updateState(newState, true);
    } finally {
      set({ isSubmitting: false });
    }
  },

  handleEnterEvaluation: async () => {
    set({ isSubmitting: true });
    try {
      const currentState = get().state;
      const newState: ExperimentState = { ...currentState };
      newState.highest_completed_step = 5;
      newState.current_step = 6;
      await get().updateState(newState, true);
    } finally {
      set({ isSubmitting: false });
    }
  },

  // Handle best model change
  handleBestModelChange: async (selected_best_model) => {
    set({ isSubmitting: true });
    try {
      const currentState = get().state;
      const newState: ExperimentState = { ...currentState, selected_best_model };
      resetProductionPlanFields(newState);
      newState.highest_completed_step = 6;
      newState.current_step = 7;
      await get().updateState(newState, true);
    } finally {
      set({ isSubmitting: false });
    }
  },

  // Record step event
  recordStepEvent: async (stepOrder, eventType) => {
    const { experiment_id } = get().state;
    if (!experiment_id) {
      console.warn("Cannot record step event: experiment_id is null");
      return;
    }
    try {
      await recordStepEvent(experiment_id, stepOrder, eventType);
    } catch (error) {
      console.error(`Failed to record ${eventType} event for step ${stepOrder}:`, error);
    }
  },

  // Check if step is completed
  isStepCompleted: (step) => {
    return get().state.highest_completed_step >= step;
  },

  // Check if step is unlocked
  isStepUnlocked: (step) => {
    return step <= get().state.current_step;
  },

  // Load product sales data
  loadProductSalesData: async (industry, company, product) => {
    set({ isLoadingSales: true, salesDataError: null });
    try {
      const endpoint = `/datasets/industries/${industry}/companies/${company}/products/${product}/sales`;
      const data = await apiClient.get<ProductSalesData>(endpoint);
      set({ productSalesData: data, isLoadingSales: false });
      return true;
    } catch (err: any) {
      set({
        salesDataError: err.message || "获取产品销量数据失败",
        productSalesData: null,
        isLoadingSales: false,
      });
      return false;
    }
  },

  // Load product field options
  loadProductFieldOptions: async (industry, company, product) => {
    set({ isLoadingFields: true, productFieldsError: null });
    try {
      const endpoint = `/datasets/industries/${industry}/companies/${company}/products/${product}/fields`;
      const response = await apiClient.get<{ fields: string[] }>(endpoint);
      const fields = Array.isArray(response?.fields) ? response.fields : [];
      set({ productFieldOptions: fields, isLoadingFields: false });
      return true;
    } catch (err: any) {
      set({
        productFieldsError: err.message || "获取产品字段信息失败",
        productFieldOptions: null,
        isLoadingFields: false,
      });
      return false;
    }
  },

  // Reset moving average model
  resetMovingAverageModel: async () => {
    await get().updateState({
      moving_average_completed: false,
      moving_average_window: null,
      moving_average_metrics_rmse: null,
      moving_average_metrics_mae: null,
      moving_average_metrics_r2: null,
      ensemble_weighted_completed: false,
      ensemble_weighted_base_models: [],
      ensemble_weighted_metrics_rmse: null,
      ensemble_weighted_metrics_mae: null,
      ensemble_weighted_metrics_r2: null,
      ensemble_boosting_completed: false,
      ensemble_boosting_base_models: [],
      ensemble_boosting_metrics_rmse: null,
      ensemble_boosting_metrics_mae: null,
      ensemble_boosting_metrics_r2: null,
      ensemble_stacking_completed: false,
      ensemble_stacking_base_models: [],
      ensemble_stacking_metrics_rmse: null,
      ensemble_stacking_metrics_mae: null,
      ensemble_stacking_metrics_r2: null,
    });
  },

  // Reset exponential smoothing model
  resetExponentialSmoothingModel: async () => {
    await get().updateState({
      exponential_smoothing_completed: false,
      exponential_smoothing_alpha: null,
      exponential_smoothing_metrics_rmse: null,
      exponential_smoothing_metrics_mae: null,
      exponential_smoothing_metrics_r2: null,
      ensemble_weighted_completed: false,
      ensemble_weighted_base_models: [],
      ensemble_weighted_metrics_rmse: null,
      ensemble_weighted_metrics_mae: null,
      ensemble_weighted_metrics_r2: null,
      ensemble_boosting_completed: false,
      ensemble_boosting_base_models: [],
      ensemble_boosting_metrics_rmse: null,
      ensemble_boosting_metrics_mae: null,
      ensemble_boosting_metrics_r2: null,
      ensemble_stacking_completed: false,
      ensemble_stacking_base_models: [],
      ensemble_stacking_metrics_rmse: null,
      ensemble_stacking_metrics_mae: null,
      ensemble_stacking_metrics_r2: null,
    });
  },

  // Reset ARIMA model
  resetARIMAModel: async () => {
    await get().updateState({
      arima_completed: false,
      arima_p: null,
      arima_d: null,
      arima_q: null,
      arima_metrics_rmse: null,
      arima_metrics_mae: null,
      arima_metrics_r2: null,
      arima_adf_stationarity: [],
      ensemble_weighted_completed: false,
      ensemble_weighted_base_models: [],
      ensemble_weighted_metrics_rmse: null,
      ensemble_weighted_metrics_mae: null,
      ensemble_weighted_metrics_r2: null,
      ensemble_boosting_completed: false,
      ensemble_boosting_base_models: [],
      ensemble_boosting_metrics_rmse: null,
      ensemble_boosting_metrics_mae: null,
      ensemble_boosting_metrics_r2: null,
      ensemble_stacking_completed: false,
      ensemble_stacking_base_models: [],
      ensemble_stacking_metrics_rmse: null,
      ensemble_stacking_metrics_mae: null,
      ensemble_stacking_metrics_r2: null,
    });
  },

  // Reset LSTM model
  resetLSTMModel: async () => {
    await get().updateState({
      lstm_completed: false,
      lstm_normalization: null,
      lstm_features: [],
      lstm_target_field: null,
      lstm_metrics_rmse: null,
      lstm_metrics_mae: null,
      lstm_metrics_r2: null,
      ensemble_weighted_completed: false,
      ensemble_weighted_base_models: [],
      ensemble_weighted_metrics_rmse: null,
      ensemble_weighted_metrics_mae: null,
      ensemble_weighted_metrics_r2: null,
      ensemble_boosting_completed: false,
      ensemble_boosting_base_models: [],
      ensemble_boosting_metrics_rmse: null,
      ensemble_boosting_metrics_mae: null,
      ensemble_boosting_metrics_r2: null,
      ensemble_stacking_completed: false,
      ensemble_stacking_base_models: [],
      ensemble_stacking_metrics_rmse: null,
      ensemble_stacking_metrics_mae: null,
      ensemble_stacking_metrics_r2: null,
    });
  },

  // Reset weighted ensemble model
  resetWeightedEnsembleModel: async () => {
    await get().updateState({
      ensemble_weighted_completed: false,
      ensemble_weighted_base_models: [],
      ensemble_weighted_metrics_rmse: null,
      ensemble_weighted_metrics_mae: null,
      ensemble_weighted_metrics_r2: null,
    });
  },

  // Reset boosting ensemble model
  resetBoostingEnsembleModel: async () => {
    await get().updateState({
      ensemble_boosting_completed: false,
      ensemble_boosting_base_models: [],
      ensemble_boosting_metrics_rmse: null,
      ensemble_boosting_metrics_mae: null,
      ensemble_boosting_metrics_r2: null,
    });
  },

  // Reset stacking ensemble model
  resetStackingEnsembleModel: async () => {
    await get().updateState({
      ensemble_stacking_completed: false,
      ensemble_stacking_base_models: [],
      ensemble_stacking_metrics_rmse: null,
      ensemble_stacking_metrics_mae: null,
      ensemble_stacking_metrics_r2: null,
    });
  },

  // Create new experiment
  createNewExperiment: async () => {
    logger.action("createNewExperiment");
    try {
      const newState = await createExperimentState();
      await get().updateState(newState, false, true);
      logger.stateChange("createNewExperiment", {}, newState);
    } catch (error) {
      logger.error("createNewExperiment", error);
      console.error("Failed to create experiment:", error);
      throw error;
    }
  },
    }),
    {
      name: "ExperimentStore",
      enabled: true,
    }
  )
);

// Compatibility hook that mimics the old useExperiment API
export const useExperiment = () => {
  const store = useExperimentStore();
  return store;
};
