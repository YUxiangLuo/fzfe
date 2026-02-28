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
  createExperimentState,
  getExperimentState,
  recordStepEvent as recordExperimentStepEvent,
  updateExperimentState as apiUpdateExperimentState,
} from "../../services/experiment";
import {
  getProductFieldOptions,
  getProductSalesData,
} from "../../services/datasets";
import {
  buildInitialState,
  resetModelingFields,
  resetProductionPlanFields,
} from "./initialState";
import { STEPS } from "../../constants/steps";
import { toastEventBus } from "../../utils/toastEventBus";
import type { ExperimentState, ProductSalesData, SelectedBestModel } from "./types";

// Debug flag - can be controlled at runtime via window.__EXPERIMENT_DEBUG__
declare global {
  interface Window {
    __EXPERIMENT_DEBUG__?: boolean;
  }
}

const DEBUG_MODE = false;

const isDebugEnabled = () => {
  return typeof window !== "undefined" && window.__EXPERIMENT_DEBUG__ !== undefined
    ? window.__EXPERIMENT_DEBUG__
    : DEBUG_MODE;
};

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
        added: Object.keys(after).filter((k) => !(k in before)),
        changed: Object.keys(after).filter((k) => after[k] !== before[k]),
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

// Toast notification - using EventEmitter pattern instead of module-level mutable variable
const addToast = (message: string, type: "success" | "error" | "info") => {
  toastEventBus.emit({ message, type });
};

export interface ExperimentStore {
  state: ExperimentState;
  loading: boolean;
  productSalesData: ProductSalesData | null;
  isLoadingSales: boolean;
  salesDataError: string | null;
  productFieldOptions: string[] | null;
  isLoadingFields: boolean;
  productFieldsError: string | null;
  isSubmitting: boolean;
  isTrainingLocked: boolean;
  trainingLockPath: string | null;

  initialize: () => Promise<void>;
  setIsSubmitting: (isSubmitting: boolean) => void;
  setTrainingLock: (isLocked: boolean, lockPath?: string | null) => void;
  updateState: (
    updates: Partial<ExperimentState>,
    forceSync?: boolean,
    skipSync?: boolean,
    throwOnSyncError?: boolean,
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
  loadProductSalesData: (
    industry: string,
    company: string,
    product: string,
  ) => Promise<"success" | "failed" | "ignored">;
  loadProductFieldOptions: (
    industry: string,
    company: string,
    product: string,
  ) => Promise<"success" | "failed" | "ignored">;
  resetMovingAverageModel: () => Promise<void>;
  resetExponentialSmoothingModel: () => Promise<void>;
  resetARIMAModel: () => Promise<void>;
  resetLSTMModel: () => Promise<void>;
  resetWeightedEnsembleModel: () => Promise<void>;
  resetBoostingEnsembleModel: () => Promise<void>;
  resetStackingEnsembleModel: () => Promise<void>;
  createNewExperiment: () => Promise<void>;
}

let trainingLockCount = 0;
let stateUpdateVersion = 0;
let salesDataRequestVersion = 0;
let fieldOptionsRequestVersion = 0;

const isMatchingProductSelection = (
  state: ExperimentState,
  industry: string,
  company: string,
  product: string,
) => {
  return (
    state.selected_industry === industry &&
    state.selected_company === company &&
    state.selected_product === product
  );
};

const invalidateProductDataRequests = () => {
  salesDataRequestVersion++;
  fieldOptionsRequestVersion++;
};

export const useExperimentStore = create<ExperimentStore>()(
  devtools(
    (set, get) => ({
      state: buildInitialState(),
      loading: true,
      productSalesData: null,
      isLoadingSales: false,
      salesDataError: null,
      productFieldOptions: null,
      isLoadingFields: false,
      productFieldsError: null,
      isSubmitting: false,
      isTrainingLocked: false,
      trainingLockPath: null,

      setIsSubmitting: (isSubmitting) => {
        set({ isSubmitting });
      },
      setTrainingLock: (isLocked, lockPath = null) => {
        if (isLocked) {
          trainingLockCount++;
          set({
            isTrainingLocked: true,
            trainingLockPath: get().trainingLockPath ?? lockPath ?? null,
          });
        } else {
          trainingLockCount = Math.max(0, trainingLockCount - 1);
          set({
            isTrainingLocked: trainingLockCount > 0,
            trainingLockPath: trainingLockCount > 0 ? get().trainingLockPath : null,
          });
        }
      },

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
              await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
              return fetchState(retryCount + 1);
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

      updateState: async (updates, forceSync = false, skipSync = false, throwOnSyncError = false) => {
        logger.action("updateState", { updates, forceSync, skipSync, throwOnSyncError });
        const previousState = get().state;
        const currentUpdateVersion = ++stateUpdateVersion;
        let nextState: ExperimentState = { ...previousState, ...updates };

        if (nextState.status === "Not Started" && Object.keys(updates).length > 0) {
          nextState.status = "In Progress";
          nextState.start_time = nextState.start_time ?? new Date().toISOString();
        }

        nextState.last_activity_at = new Date().toISOString();

        logger.stateChange("updateState", previousState, nextState);
        set({ state: nextState });

        if (
          nextState.highest_completed_step > previousState.highest_completed_step &&
          nextState.experiment_id
        ) {
          for (
            let step = previousState.highest_completed_step + 1;
            step <= nextState.highest_completed_step;
            step++
          ) {
            recordExperimentStepEvent(nextState.experiment_id, step, "COMPLETED").catch((err) => {
              console.error(`Failed to record COMPLETED event for step ${step}:`, err);
            });
          }
        }

        const stepCompleted =
          nextState.highest_completed_step > previousState.highest_completed_step;

        const experimentCompleted =
          Object.prototype.hasOwnProperty.call(updates, "status") &&
          nextState.status === "Completed" &&
          previousState.status !== "Completed";

        const shouldSyncToBackend =
          !skipSync && (forceSync || stepCompleted || experimentCompleted);

        if (shouldSyncToBackend) {
          try {
            const serverState = await apiUpdateExperimentState(nextState);

            addToast("实验进度已同步至云端", "success");
            if (serverState && typeof serverState === "object") {
              if (currentUpdateVersion !== stateUpdateVersion) {
                logger.action("updateState:ignoreStaleServerResponse", {
                  responseVersion: currentUpdateVersion,
                  latestVersion: stateUpdateVersion,
                });
                return;
              }

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
                invalidateProductDataRequests();
                set({
                  productSalesData: null,
                  isLoadingSales: false,
                  salesDataError: null,
                  productFieldOptions: null,
                  isLoadingFields: false,
                  productFieldsError: null,
                });
              }
            }
          } catch (error) {
            addToast("同步失败，请检查网络连接或联系管理员", "error");
            console.error("Failed to persist experiment state.", error);
            if (throwOnSyncError) {
              throw error;
            }
          }
        }
      },

      handleIndustryChange: async (selected_industry) => {
        logger.action("handleIndustryChange", { selected_industry });
        set({ isSubmitting: true });
        try {
          const currentState = get().state;
          const newState: ExperimentState = { ...currentState, selected_industry };
          newState.selected_company = null;
          newState.selected_product = null;
          newState.highest_completed_step = STEPS.INDUSTRY;
          newState.current_step = STEPS.COMPANY;
          resetModelingFields(newState, { resetQuizzes: true });

          invalidateProductDataRequests();
          set({
            productSalesData: null,
            isLoadingSales: false,
            salesDataError: null,
            productFieldOptions: null,
            isLoadingFields: false,
            productFieldsError: null,
          });

          await get().updateState(newState, true, false, true);
        } finally {
          set({ isSubmitting: false });
        }
      },

      handleCompanyChange: async (selected_company) => {
        logger.action("handleCompanyChange", { selected_company });
        set({ isSubmitting: true });
        try {
          const currentState = get().state;
          const newState: ExperimentState = { ...currentState, selected_company };
          newState.selected_product = null;
          newState.highest_completed_step = STEPS.COMPANY;
          newState.current_step = STEPS.PRODUCT;
          resetModelingFields(newState, { resetQuizzes: true });

          invalidateProductDataRequests();
          set({
            productSalesData: null,
            isLoadingSales: false,
            salesDataError: null,
            productFieldOptions: null,
            isLoadingFields: false,
            productFieldsError: null,
          });

          await get().updateState(newState, true, false, true);
        } finally {
          set({ isSubmitting: false });
        }
      },

      handleProductChange: async (selected_product) => {
        logger.action("handleProductChange", { selected_product });
        set({ isSubmitting: true });
        try {
          const currentState = get().state;
          const newState: ExperimentState = { ...currentState, selected_product };
          newState.highest_completed_step = STEPS.PRODUCT;
          newState.current_step = STEPS.DATA_WINDOW;
          resetModelingFields(newState, { resetQuizzes: true });

          invalidateProductDataRequests();
          set({
            productSalesData: null,
            isLoadingSales: false,
            salesDataError: null,
            productFieldOptions: null,
            isLoadingFields: false,
            productFieldsError: null,
          });

          await get().updateState(newState, true, false, true);
        } finally {
          set({ isSubmitting: false });
        }
      },

      handleDataWindowChange: async (updates) => {
        set({ isSubmitting: true });
        try {
          const currentState = get().state;
          const newState: ExperimentState = { ...currentState, ...updates };
          resetModelingFields(newState, {
            resetQuizzes: true,
            preserveDataWindow: true,
          });
          newState.highest_completed_step = STEPS.DATA_WINDOW;
          newState.current_step = STEPS.MODEL;
          await get().updateState(newState, true, false, true);
        } finally {
          set({ isSubmitting: false });
        }
      },

      handleEnterEvaluation: async () => {
        set({ isSubmitting: true });
        try {
          const currentState = get().state;
          const newState: ExperimentState = { ...currentState };
          newState.highest_completed_step = STEPS.MODEL;
          newState.current_step = STEPS.EVALUATION;
          await get().updateState(newState, true, false, true);
        } finally {
          set({ isSubmitting: false });
        }
      },

      handleBestModelChange: async (selected_best_model) => {
        set({ isSubmitting: true });
        try {
          const currentState = get().state;
          const newState: ExperimentState = { ...currentState, selected_best_model };
          resetProductionPlanFields(newState);
          newState.highest_completed_step = STEPS.EVALUATION;
          newState.current_step = STEPS.PRODUCTION;
          await get().updateState(newState, true, false, true);
        } finally {
          set({ isSubmitting: false });
        }
      },

      recordStepEvent: async (stepOrder, eventType) => {
        const { experiment_id } = get().state;
        if (!experiment_id) {
          console.warn("Cannot record step event: experiment_id is null");
          return;
        }
        try {
          await recordExperimentStepEvent(experiment_id, stepOrder, eventType);
        } catch (error) {
          console.error(`Failed to record ${eventType} event for step ${stepOrder}:`, error);
        }
      },

      isStepCompleted: (step) => {
        return get().state.highest_completed_step >= step;
      },

      isStepUnlocked: (step) => {
        return step <= get().state.current_step;
      },

      loadProductSalesData: async (industry, company, product) => {
        const requestVersion = ++salesDataRequestVersion;
        set({ isLoadingSales: true, salesDataError: null });
        try {
          const data = await getProductSalesData(industry, company, product);
          const currentState = get().state;
          const isLatestRequest = requestVersion === salesDataRequestVersion;
          const isCurrentSelection = isMatchingProductSelection(
            currentState,
            industry,
            company,
            product,
          );

          if (!isLatestRequest || !isCurrentSelection) {
            if (isLatestRequest) {
              set({ isLoadingSales: false });
            }
            return "ignored";
          }

          set({
            productSalesData: data,
            isLoadingSales: false,
            salesDataError: null,
          });
          return "success";
        } catch (err: any) {
          const currentState = get().state;
          const isLatestRequest = requestVersion === salesDataRequestVersion;
          const isCurrentSelection = isMatchingProductSelection(
            currentState,
            industry,
            company,
            product,
          );

          if (!isLatestRequest || !isCurrentSelection) {
            if (isLatestRequest) {
              set({ isLoadingSales: false });
            }
            return "ignored";
          }

          set({
            salesDataError: err.message || "获取产品销量数据失败",
            productSalesData: null,
            isLoadingSales: false,
          });
          return "failed";
        }
      },

      loadProductFieldOptions: async (industry, company, product) => {
        const requestVersion = ++fieldOptionsRequestVersion;
        set({ isLoadingFields: true, productFieldsError: null });
        try {
          const fields = await getProductFieldOptions(industry, company, product);
          const currentState = get().state;
          const isLatestRequest = requestVersion === fieldOptionsRequestVersion;
          const isCurrentSelection = isMatchingProductSelection(
            currentState,
            industry,
            company,
            product,
          );

          if (!isLatestRequest || !isCurrentSelection) {
            if (isLatestRequest) {
              set({ isLoadingFields: false });
            }
            return "ignored";
          }

          set({
            productFieldOptions: fields,
            isLoadingFields: false,
            productFieldsError: null,
          });
          return "success";
        } catch (err: any) {
          const currentState = get().state;
          const isLatestRequest = requestVersion === fieldOptionsRequestVersion;
          const isCurrentSelection = isMatchingProductSelection(
            currentState,
            industry,
            company,
            product,
          );

          if (!isLatestRequest || !isCurrentSelection) {
            if (isLatestRequest) {
              set({ isLoadingFields: false });
            }
            return "ignored";
          }

          set({
            productFieldsError: err.message || "获取产品字段信息失败",
            productFieldOptions: null,
            isLoadingFields: false,
          });
          return "failed";
        }
      },

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

      resetWeightedEnsembleModel: async () => {
        await get().updateState({
          ensemble_weighted_completed: false,
          ensemble_weighted_base_models: [],
          ensemble_weighted_metrics_rmse: null,
          ensemble_weighted_metrics_mae: null,
          ensemble_weighted_metrics_r2: null,
        });
      },

      resetBoostingEnsembleModel: async () => {
        await get().updateState({
          ensemble_boosting_completed: false,
          ensemble_boosting_base_models: [],
          ensemble_boosting_metrics_rmse: null,
          ensemble_boosting_metrics_mae: null,
          ensemble_boosting_metrics_r2: null,
        });
      },

      resetStackingEnsembleModel: async () => {
        await get().updateState({
          ensemble_stacking_completed: false,
          ensemble_stacking_base_models: [],
          ensemble_stacking_metrics_rmse: null,
          ensemble_stacking_metrics_mae: null,
          ensemble_stacking_metrics_r2: null,
        });
      },

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
    },
  ),
);

export const useExperiment = () => {
  const store = useExperimentStore();
  return store;
};
