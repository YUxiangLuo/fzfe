export type ExperimentStatus = "Not Started" | "In Progress" | "Completed";

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
    sales: number | null;
  }[];
  csvData?: string[][];
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

export interface ExperimentSessionState {
  selected_base_models: string[];
  selected_ensemble_models: string[];
}

export interface PersistedExperimentState {
  experiment_id: number | null;
  student_id: number | null;
  status: ExperimentStatus;
  highest_completed_step: number;
  current_step: number;
  state_version: number;
  selected_industry: string | null;
  selected_company: string | null;
  selected_product: string | null;
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

export type ExperimentState = PersistedExperimentState & ExperimentSessionState;

export interface ExperimentUiState {
  loading: boolean;
  isLoadingSales: boolean;
  salesDataError: string | null;
  isLoadingFields: boolean;
  productFieldsError: string | null;
  isSubmitting: boolean;
  isTrainingLocked: boolean;
  trainingLockPath: string | null;
}
