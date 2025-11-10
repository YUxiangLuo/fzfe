import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import {
  getExperimentState,
  updateExperimentState as apiUpdateExperimentState,
  recordStepEvent,
} from '../../../utils/apiClient';
import { apiClient } from '../../../utils/apiClient';

type ExperimentStatus = 'Not Started' | 'In Progress' | 'Completed';

export type SelectedBestModel =
  | 'ma'
  | 'exp'
  | 'arima'
  | 'lstm'
  | 'ensemble_weighted'
  | 'ensemble_boosting'
  | 'ensemble_stacking';

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
  lstm_normalization: 'minmax' | 'zscore' | null;
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
  production_forecast_results: Array<{ prediction: number; std_dev: number }> | null;
  production_mps_table: MPSTableRow[];
  // 🆕 产能约束参数（重构后新增）
  production_capacity_mode: 'scenario' | 'auto' | 'custom' | null;
  production_capacity_scenario: 'tight' | 'normal' | 'abundant' | null;
  production_capacity: number | null;
  production_custom_capacity: number | null;

  start_time: string | null;
  last_activity_at: string | null;
  completion_time: string | null;
}

const buildInitialState = (): ExperimentState => ({
  experiment_id: null,
  student_id: null,
  status: 'Not Started',
  highest_completed_step: 0,
  current_step: 1,
  selected_industry: null,
  selected_company: null,
  selected_product: null,

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

  // Production planning initial values
  production_plan_completed: false,
  production_forecast_periods: null,
  production_initial_inventory: null,
  production_target_service_level: null,
  production_safety_stock_z_score: null,
  production_forecast_results: null,
  production_mps_table: [],
  // 🆕 产能约束初始值
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

  // Reset production planning fields
  target.production_plan_completed = false;
  target.production_forecast_periods = null;
  target.production_initial_inventory = null;
  target.production_target_service_level = null;
  target.production_safety_stock_z_score = null;
  target.production_forecast_results = null;
  target.production_mps_table = [];
  // 🆕 重置产能约束参数
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
  // 🆕 重置产能约束参数
  target.production_capacity_mode = null;
  target.production_capacity_scenario = null;
  target.production_capacity = null;
  target.production_custom_capacity = null;
  target.quiz_about_plan_completed = false;
};

interface ExperimentContextType {
  state: ExperimentState;
  loading: boolean;
  updateState: (updates: Partial<ExperimentState>) => Promise<void>;
  recordStepEvent: (stepOrder: number, eventType: 'STARTED' | 'COMPLETED') => Promise<void>;
  isStepCompleted: (step: number) => boolean;
  isStepUnlocked: (step: number) => boolean;
  productSalesData: ProductSalesData | null;
  isLoadingSales: boolean;
  salesDataError: string | null;
  productFieldOptions: string[] | null;
  isLoadingFields: boolean;
  productFieldsError: string | null;
  loadProductSalesData: (industry: string, company: string, product: string) => Promise<boolean>;
  loadProductFieldOptions: (industry: string, company: string, product: string) => Promise<boolean>;
}

const ExperimentContext = createContext<ExperimentContextType | undefined>(undefined);

export const ExperimentProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<ExperimentState>(buildInitialState());
  const [loading, setLoading] = useState(true);

  const [productSalesData, setProductSalesData] = useState<ProductSalesData | null>(null);
  const [isLoadingSales, setIsLoadingSales] = useState(false);
  const [salesDataError, setSalesDataError] = useState<string | null>(null);
  const [productFieldOptions, setProductFieldOptions] = useState<string[] | null>(null);
  const [isLoadingFields, setIsLoadingFields] = useState(false);
  const [productFieldsError, setProductFieldsError] = useState<string | null>(null);

  useEffect(() => {
    const fetchState = async () => {
      setLoading(true);
      try {
        const fetchedState = await getExperimentState();
        setState(fetchedState);
      } catch (error) {
        console.error("No experiment record.", error);
        setState(buildInitialState());
      } finally {
        setLoading(false);
      }
    };
    void fetchState();
  }, []);

  const shouldLoadSales = useMemo(() => {
    if (!state.selected_industry || !state.selected_company || !state.selected_product) {
      return false;
    }
    return state.highest_completed_step >= 3;
  }, [state.selected_industry, state.selected_company, state.selected_product, state.highest_completed_step]);

  useEffect(() => {
    if (
      !shouldLoadSales ||
      productSalesData ||
      isLoadingSales ||
      salesDataError ||
      !state.selected_industry ||
      !state.selected_company ||
      !state.selected_product
    ) {
      return;
    }
    void loadProductSalesData(state.selected_industry, state.selected_company, state.selected_product);
  }, [
    shouldLoadSales,
    productSalesData,
    isLoadingSales,
    salesDataError,
    state.selected_industry,
    state.selected_company,
    state.selected_product,
  ]);

  useEffect(() => {
    if (
      !shouldLoadSales ||
      productFieldOptions ||
      isLoadingFields ||
      productFieldsError ||
      !state.selected_industry ||
      !state.selected_company ||
      !state.selected_product
    ) {
      return;
    }
    void loadProductFieldOptions(state.selected_industry, state.selected_company, state.selected_product);
  }, [
    shouldLoadSales,
    productFieldOptions,
    isLoadingFields,
    productFieldsError,
    state.selected_industry,
    state.selected_company,
    state.selected_product,
  ]);

  const recordStepEventWrapper = useCallback(async (stepOrder: number, eventType: 'STARTED' | 'COMPLETED') => {
    if (!state.experiment_id) {
      console.warn('Cannot record step event: experiment_id is null');
      return;
    }
    try {
      await recordStepEvent(state.experiment_id, stepOrder, eventType);
    } catch (error) {
      console.error(`Failed to record ${eventType} event for step ${stepOrder}:`, error);
    }
  }, [state.experiment_id]);

  const updateState = async (updates: Partial<ExperimentState>) => {
    const previousState = state;
    const nextState: ExperimentState = { ...state, ...updates };

    const industryChanged =
      Object.prototype.hasOwnProperty.call(updates, 'selected_industry') &&
      updates.selected_industry !== previousState.selected_industry;
    const companyChanged =
      Object.prototype.hasOwnProperty.call(updates, 'selected_company') &&
      updates.selected_company !== previousState.selected_company;
    const productChanged =
      Object.prototype.hasOwnProperty.call(updates, 'selected_product') &&
      updates.selected_product !== previousState.selected_product;
    const dataWindowFields: Array<
      | 'data_window_train_start_index'
      | 'data_window_train_end_index'
      | 'data_window_evaluate_start_index'
      | 'data_window_evaluate_end_index'
    > = [
      'data_window_train_start_index',
      'data_window_train_end_index',
      'data_window_evaluate_start_index',
      'data_window_evaluate_end_index',
    ];
    const dataWindowChanged = dataWindowFields.some((field) => {
      if (!Object.prototype.hasOwnProperty.call(updates, field)) {
        return false;
      }
      return updates[field] !== previousState[field];
    });
    const bestModelChanged =
      Object.prototype.hasOwnProperty.call(updates, 'selected_best_model') &&
      updates.selected_best_model !== previousState.selected_best_model;

    if (industryChanged) {
      nextState.selected_company = null;
      nextState.selected_product = null;
      nextState.highest_completed_step = 0;
      nextState.current_step = 1;
      resetModelingFields(nextState, { resetQuizzes: true });
      setProductSalesData(null);
      setSalesDataError(null);
      setProductFieldOptions(null);
      setProductFieldsError(null);
    } else if (companyChanged) {
      nextState.selected_product = null;
      nextState.highest_completed_step = 1;
      nextState.current_step = 2;
      resetModelingFields(nextState, { resetQuizzes: true });
      setProductSalesData(null);
      setSalesDataError(null);
      setProductFieldOptions(null);
      setProductFieldsError(null);
    } else if (productChanged) {
      nextState.highest_completed_step = 2;
      nextState.current_step = 3;
      resetModelingFields(nextState, { resetQuizzes: true });
      setProductSalesData(null);
      setSalesDataError(null);
      setProductFieldOptions(null);
      setProductFieldsError(null);
    }

    if (dataWindowChanged) {
      const wasComplete = dataWindowFields.every(
        (field) => previousState[field] !== null && previousState[field] !== undefined,
      );
      const isCompleteNow = dataWindowFields.every(
        (field) => nextState[field] !== null && nextState[field] !== undefined,
      );
      if (wasComplete && isCompleteNow) {
        resetModelingFields(nextState, { resetQuizzes: true, preserveDataWindow: true });
        nextState.highest_completed_step = Math.min(nextState.highest_completed_step, 4);
        nextState.current_step = Math.min(nextState.current_step, 5);
      }
    }

    if (bestModelChanged) {
      resetProductionPlanFields(nextState);
      nextState.highest_completed_step = Math.min(nextState.highest_completed_step, 6);
      nextState.current_step = Math.min(nextState.current_step, 7);
    }

    if (nextState.status === 'Not Started' && Object.keys(updates).length > 0) {
      nextState.status = 'In Progress';
      nextState.start_time = nextState.start_time ?? new Date().toISOString();
    }

    nextState.last_activity_at = new Date().toISOString();

    setState(nextState);

    // Record COMPLETED event if highest_completed_step increased
    if (nextState.highest_completed_step > previousState.highest_completed_step && nextState.experiment_id) {
      // Record COMPLETED event for each step that was completed
      for (let step = previousState.highest_completed_step + 1; step <= nextState.highest_completed_step; step++) {
        recordStepEvent(nextState.experiment_id, step, 'COMPLETED').catch(err => {
          console.error(`Failed to record COMPLETED event for step ${step}:`, err);
        });
      }
    }

    // Determine if we should sync to backend (lazy sync strategy)
    // Rationale: Reduce API calls during frequent parameter adjustments in modeling phase
    // Only sync when:
    // 1. Step completion: User advances to next major step (syncs all accumulated changes)
    // 2. Critical state changes: Industry/company/product selection or data window setup
    // 3. Model completion: User finishes training a model (important checkpoint)
    // 4. Experiment completion: Status changes to 'Completed'
    const stepCompleted = nextState.highest_completed_step > previousState.highest_completed_step;
    const criticalStateChanged = industryChanged || companyChanged || productChanged || dataWindowChanged;

    // Check if any model completion status changed from false to true
    const modelCompletionFields = [
      'moving_average_completed',
      'exponential_smoothing_completed',
      'arima_completed',
      'lstm_completed',
      'ensemble_weighted_completed',
      'ensemble_boosting_completed',
      'ensemble_stacking_completed',
    ] as const;

    const modelCompleted = modelCompletionFields.some(
      (field) => nextState[field] === true && previousState[field] === false
    );

    // Check if experiment status changed to 'Completed'
    const experimentCompleted =
      Object.prototype.hasOwnProperty.call(updates, 'status') &&
      nextState.status === 'Completed' &&
      previousState.status !== 'Completed';


    const shouldSyncToBackend = stepCompleted || criticalStateChanged || modelCompleted || experimentCompleted || bestModelChanged;

    if (shouldSyncToBackend) {
      try {
        const serverState = await apiUpdateExperimentState(nextState);
        if (serverState && typeof serverState === 'object') {
          setState(serverState);

          const productChangedRemote =
            serverState.selected_industry !== previousState.selected_industry ||
            serverState.selected_company !== previousState.selected_company ||
            serverState.selected_product !== previousState.selected_product;

          if (productChangedRemote) {
            setProductSalesData(null);
            setSalesDataError(null);
            setProductFieldOptions(null);
            setProductFieldsError(null);
          }
        }
      } catch (error) {
        console.error("Failed to persist experiment state.", error);
      }
    }
  };


  const isStepCompleted = useCallback((step: number): boolean => state.highest_completed_step >= step, [state.highest_completed_step]);
  const isStepUnlocked = useCallback((step: number): boolean => step <= state.current_step, [state.current_step]);

  const loadProductSalesData = useCallback(async (industry: string, company: string, product: string): Promise<boolean> => {
    setIsLoadingSales(true);
    setSalesDataError(null);
    try {
      const endpoint = `/datasets/industries/${industry}/companies/${company}/products/${product}/sales`;
      const data = await apiClient.get<ProductSalesData>(endpoint);
      setProductSalesData(data);
      return true;
    } catch (err: any) {
      setSalesDataError(err.message || '获取产品销量数据失败');
      setProductSalesData(null);
      return false;
    } finally {
      setIsLoadingSales(false);
    }
  }, []);

  const loadProductFieldOptions = useCallback(async (industry: string, company: string, product: string): Promise<boolean> => {
    setIsLoadingFields(true);
    setProductFieldsError(null);
    try {
      const endpoint = `/datasets/industries/${industry}/companies/${company}/products/${product}/fields`;
      const response = await apiClient.get<{ fields: string[] }>(endpoint);
      const fields = Array.isArray(response?.fields) ? response.fields : [];
      setProductFieldOptions(fields);
      return true;
    } catch (err: any) {
      setProductFieldsError(err.message || '获取产品字段信息失败');
      setProductFieldOptions(null);
      return false;
    } finally {
      setIsLoadingFields(false);
    }
  }, []);

  const contextValue = useMemo(
    () => ({
      state,
      loading,
      updateState,
      recordStepEvent: recordStepEventWrapper,
      isStepCompleted,
      isStepUnlocked,
      productSalesData,
      isLoadingSales,
      salesDataError,
      productFieldOptions,
      isLoadingFields,
      productFieldsError,
      loadProductSalesData,
      loadProductFieldOptions,
    }),
    [
      state,
      loading,
      recordStepEventWrapper,
      isStepCompleted,
      isStepUnlocked,
      productSalesData,
      isLoadingSales,
      salesDataError,
      productFieldOptions,
      isLoadingFields,
      productFieldsError,
      loadProductSalesData,
      loadProductFieldOptions,
    ]
  );

  return (
    <ExperimentContext.Provider value={contextValue}>
      {children}
    </ExperimentContext.Provider>
  );
};

export const useExperiment = () => {
  const context = useContext(ExperimentContext);
  if (!context) {
    throw new Error('useExperiment must be used within an ExperimentProvider');
  }
  return context;
};
