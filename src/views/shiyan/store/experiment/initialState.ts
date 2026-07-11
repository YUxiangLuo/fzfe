import type {
  ExperimentSessionState,
  ExperimentState,
  PersistedExperimentState,
} from "./types";

export const buildInitialSessionState = (): ExperimentSessionState => ({
  selected_base_models: [],
  selected_ensemble_models: [],
});

export const buildInitialPersistedState = (): PersistedExperimentState => ({
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
  moving_average_metrics_mape: null,
  moving_average_metrics_r2: null,

  exponential_smoothing_completed: false,
  exponential_smoothing_alpha: null,
  exponential_smoothing_metrics_rmse: null,
  exponential_smoothing_metrics_mae: null,
  exponential_smoothing_metrics_mape: null,
  exponential_smoothing_metrics_r2: null,

  arima_completed: false,
  arima_p: null,
  arima_d: null,
  arima_q: null,
  arima_metrics_rmse: null,
  arima_metrics_mae: null,
  arima_metrics_mape: null,
  arima_metrics_r2: null,
  arima_adf_stationarity: [],

  lstm_completed: false,
  lstm_normalization: null,
  lstm_features: [],
  lstm_metrics_rmse: null,
  lstm_metrics_mae: null,
  lstm_metrics_mape: null,
  lstm_metrics_r2: null,

  ensemble_weighted_completed: false,
  ensemble_weighted_base_models: [],
  ensemble_weighted_metrics_rmse: null,
  ensemble_weighted_metrics_mae: null,
  ensemble_weighted_metrics_mape: null,
  ensemble_weighted_metrics_r2: null,

  ensemble_boosting_completed: false,
  ensemble_boosting_base_models: [],
  ensemble_boosting_metrics_rmse: null,
  ensemble_boosting_metrics_mae: null,
  ensemble_boosting_metrics_mape: null,
  ensemble_boosting_metrics_r2: null,

  ensemble_stacking_completed: false,
  ensemble_stacking_base_models: [],
  ensemble_stacking_metrics_rmse: null,
  ensemble_stacking_metrics_mae: null,
  ensemble_stacking_metrics_mape: null,
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

export const buildInitialState = (): ExperimentState => ({
  ...buildInitialPersistedState(),
  ...buildInitialSessionState(),
});

export const initialState: ExperimentState = buildInitialState();

export const resetModelingFields = (
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
  target.moving_average_metrics_mape = null;
  target.moving_average_metrics_r2 = null;

  target.exponential_smoothing_completed = false;
  target.exponential_smoothing_alpha = null;
  target.exponential_smoothing_metrics_rmse = null;
  target.exponential_smoothing_metrics_mae = null;
  target.exponential_smoothing_metrics_mape = null;
  target.exponential_smoothing_metrics_r2 = null;

  target.arima_completed = false;
  target.arima_p = null;
  target.arima_d = null;
  target.arima_q = null;
  target.arima_metrics_rmse = null;
  target.arima_metrics_mae = null;
  target.arima_metrics_mape = null;
  target.arima_metrics_r2 = null;
  target.arima_adf_stationarity = [];

  target.lstm_completed = false;
  target.lstm_normalization = null;
  target.lstm_features = [];
  target.lstm_target_field = null;
  target.lstm_metrics_rmse = null;
  target.lstm_metrics_mae = null;
  target.lstm_metrics_mape = null;
  target.lstm_metrics_r2 = null;

  target.ensemble_weighted_completed = false;
  target.ensemble_weighted_base_models = [];
  target.ensemble_weighted_metrics_rmse = null;
  target.ensemble_weighted_metrics_mae = null;
  target.ensemble_weighted_metrics_mape = null;
  target.ensemble_weighted_metrics_r2 = null;

  target.ensemble_boosting_completed = false;
  target.ensemble_boosting_base_models = [];
  target.ensemble_boosting_metrics_rmse = null;
  target.ensemble_boosting_metrics_mae = null;
  target.ensemble_boosting_metrics_mape = null;
  target.ensemble_boosting_metrics_r2 = null;

  target.ensemble_stacking_completed = false;
  target.ensemble_stacking_base_models = [];
  target.ensemble_stacking_metrics_rmse = null;
  target.ensemble_stacking_metrics_mae = null;
  target.ensemble_stacking_metrics_mape = null;
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

export const resetProductionPlanFields = (target: ExperimentState) => {
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
