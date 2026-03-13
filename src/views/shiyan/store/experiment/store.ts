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
import { experimentRepository } from "../../services/experimentRepository";
import { buildInitialState } from "./initialState";
import { createProductResourceController } from "./productResourceController";
import {
  buildResetArimaPatch,
  buildResetBoostingEnsemblePatch,
  buildResetExponentialSmoothingPatch,
  buildResetLstmPatch,
  buildResetMovingAveragePatch,
  buildResetStackingEnsemblePatch,
  buildResetWeightedEnsemblePatch,
} from "./resetPatches";
import {
  createExperimentStateSyncController,
  type UpdateStateOptions,
} from "./stateSyncController";
import {
  buildInitialUiState,
  mergeExperimentUiState,
} from "./storeHelpers";
import {
  applyBestModelChangeTransition,
  applyCompanyChangeTransition,
  applyDataWindowChangeTransition,
  applyEnterEvaluationTransition,
  applyIndustryChangeTransition,
  applyProductChangeTransition,
} from "./transitions";
import { STEPS } from "../../constants/steps";
import { hasCompletedAllSelectedEnsembleModels } from "../../utils/ensembleProgress";
import { toastEventBus } from "../../utils/toastEventBus";
import type {
  ExperimentState,
  ExperimentUiState,
  ProductSalesData,
  SelectedBestModel,
} from "./types";

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
  ui: ExperimentUiState;
  productSalesData: ProductSalesData | null;
  productFieldOptions: string[] | null;

  initialize: () => Promise<void>;
  setIsSubmitting: (isSubmitting: boolean) => void;
  setTrainingLock: (isLocked: boolean, lockPath?: string | null) => void;
  updateState: (
    updates: Partial<ExperimentState>,
    options?: UpdateStateOptions,
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

export const useExperimentStore = create<ExperimentStore>()(
  devtools(
    (set, get) => {
      // Request versioning counters — scoped to the store closure
      // so they reset together with the store (e.g. in tests).
      let trainingLockCount = 0;
      const mergeUiState = (
        currentUi: ExperimentUiState,
        updates: Partial<ExperimentUiState>,
      ): ExperimentUiState => mergeExperimentUiState(currentUi, updates);

      const productResourceController = createProductResourceController({
        set,
        get: () => get(),
      });

      const stateSyncController = createExperimentStateSyncController({
        repository: experimentRepository,
        getState: () => get().state,
        setState: (state) => set({ state }),
        onLocalStateChange: (previousState, nextState) => {
          logger.stateChange("updateState", previousState, nextState);
        },
        onSyncSuccess: () => {
          addToast("实验进度已同步至云端", "success");
        },
        onSyncError: (error) => {
          addToast("同步失败，请检查网络连接或联系管理员", "error");
          logger.error("updateState:sync", error);
        },
        onIgnoreStaleResponse: (responseVersion, latestVersion) => {
          logger.action("updateState:ignoreStaleServerResponse", {
            responseVersion,
            latestVersion,
          });
        },
        onRemoteProductSelectionChanged: () => {
          productResourceController.invalidateAndResetProductDependentResources();
        },
        onCompletedStepRecordError: (step, error) => {
          console.error(`Failed to record COMPLETED event for step ${step}:`, error);
        },
      });

      return ({
      state: buildInitialState(),
      ui: buildInitialUiState(),
      productSalesData: null,
      productFieldOptions: null,

      setIsSubmitting: (isSubmitting) => {
        set((current) => ({
          ui: mergeUiState(current.ui, { isSubmitting }),
        }));
      },
      setTrainingLock: (isLocked, lockPath = null) => {
        if (isLocked) {
          trainingLockCount++;
          set((current) => ({
            ui: mergeUiState(current.ui, {
              isTrainingLocked: true,
              trainingLockPath: current.ui.trainingLockPath ?? lockPath ?? null,
            }),
          }));
        } else {
          trainingLockCount = Math.max(0, trainingLockCount - 1);
          set((current) => ({
            ui: mergeUiState(current.ui, {
              isTrainingLocked: trainingLockCount > 0,
              trainingLockPath: trainingLockCount > 0 ? current.ui.trainingLockPath : null,
            }),
          }));
        }
      },

      initialize: async () => {
        logger.action("initialize");
        const fetchState = async (retryCount = 0): Promise<void> => {
          const maxRetries = 2;
          set((current) => ({
            ui: mergeUiState(current.ui, { loading: true }),
          }));
          try {
            const fetchedState = await experimentRepository.getActive();
            logger.stateChange("initialize", buildInitialState(), fetchedState);
            set((current) => ({
              state: fetchedState,
              ui: mergeUiState(current.ui, { loading: false }),
            }));
          } catch (error) {
            logger.error("initialize", error);
            console.warn(`Experiment state fetch attempt ${retryCount + 1} failed:`, error);

            if (
              retryCount < maxRetries &&
              !(error instanceof Error && error.message?.includes("network"))
            ) {
              await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
              return fetchState(retryCount + 1);
            }

            const currentState = get().state;
            if (currentState.experiment_id) {
              addToast("实验状态同步失败，但将继续使用当前状态", "info");
            } else {
              set({ state: buildInitialState() });
            }
            set((current) => ({
              ui: mergeUiState(current.ui, { loading: false }),
            }));
          }
        };
        await fetchState();
      },

      updateState: async (updates, options = {}) => {
        logger.action("updateState", options);
        await stateSyncController.updateState(updates, options);
      },

      handleIndustryChange: async (selected_industry) => {
        logger.action("handleIndustryChange", { selected_industry });
        get().setIsSubmitting(true);
        try {
          const newState = applyIndustryChangeTransition(get().state, selected_industry);

          productResourceController.invalidateAndResetProductDependentResources();

          await get().updateState(newState, { forceSync: true, throwOnSyncError: true });
        } finally {
          get().setIsSubmitting(false);
        }
      },

      handleCompanyChange: async (selected_company) => {
        logger.action("handleCompanyChange", { selected_company });
        get().setIsSubmitting(true);
        try {
          const newState = applyCompanyChangeTransition(get().state, selected_company);

          productResourceController.invalidateAndResetProductDependentResources();

          await get().updateState(newState, { forceSync: true, throwOnSyncError: true });
        } finally {
          get().setIsSubmitting(false);
        }
      },

      handleProductChange: async (selected_product) => {
        logger.action("handleProductChange", { selected_product });
        get().setIsSubmitting(true);
        try {
          const newState = applyProductChangeTransition(get().state, selected_product);

          productResourceController.invalidateAndResetProductDependentResources();

          await get().updateState(newState, { forceSync: true, throwOnSyncError: true });
        } finally {
          get().setIsSubmitting(false);
        }
      },

      handleDataWindowChange: async (updates) => {
        get().setIsSubmitting(true);
        try {
          const newState = applyDataWindowChangeTransition(get().state, updates);
          await get().updateState(newState, { forceSync: true, throwOnSyncError: true });
        } finally {
          get().setIsSubmitting(false);
        }
      },

      handleEnterEvaluation: async () => {
        if (!hasCompletedAllSelectedEnsembleModels(get().state)) {
          throw new Error("请先完成所有已选融合模型的训练");
        }

        get().setIsSubmitting(true);
        try {
          const newState = applyEnterEvaluationTransition(get().state);
          await get().updateState(newState, { forceSync: true, throwOnSyncError: true });
        } finally {
          get().setIsSubmitting(false);
        }
      },

      handleBestModelChange: async (selected_best_model) => {
        get().setIsSubmitting(true);
        try {
          const newState = applyBestModelChangeTransition(get().state, selected_best_model);
          await get().updateState(newState, { forceSync: true, throwOnSyncError: true });
        } finally {
          get().setIsSubmitting(false);
        }
      },

      recordStepEvent: async (stepOrder, eventType) => {
        const { experiment_id } = get().state;
        if (!experiment_id) {
          console.warn("Cannot record step event: experiment_id is null");
          return;
        }
        try {
          await experimentRepository.recordStepEvent(experiment_id, stepOrder, eventType);
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
        return await productResourceController.loadProductSalesData(industry, company, product);
      },

      loadProductFieldOptions: async (industry, company, product) => {
        return await productResourceController.loadProductFieldOptions(industry, company, product);
      },

      resetMovingAverageModel: async () => {
        await get().updateState(buildResetMovingAveragePatch());
      },

      resetExponentialSmoothingModel: async () => {
        await get().updateState(buildResetExponentialSmoothingPatch());
      },

      resetARIMAModel: async () => {
        await get().updateState(buildResetArimaPatch());
      },

      resetLSTMModel: async () => {
        await get().updateState(buildResetLstmPatch());
      },

      resetWeightedEnsembleModel: async () => {
        await get().updateState(buildResetWeightedEnsemblePatch());
      },

      resetBoostingEnsembleModel: async () => {
        await get().updateState(buildResetBoostingEnsemblePatch());
      },

      resetStackingEnsembleModel: async () => {
        await get().updateState(buildResetStackingEnsemblePatch());
      },

      createNewExperiment: async () => {
        logger.action("createNewExperiment");
        try {
          const newState = await experimentRepository.create();
          await get().updateState(newState, { skipSync: true });
          logger.stateChange("createNewExperiment", {}, newState);
        } catch (error) {
          logger.error("createNewExperiment", error);
          console.error("Failed to create experiment:", error);
          throw error;
        }
      },
    });
    },
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
