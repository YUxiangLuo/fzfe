import type { ExperimentRecord, StudentApiClient } from "./backend";
import {
  DEFAULT_DATA_WINDOW,
  SHIYAN_COMPANY,
  SHIYAN_INDUSTRY,
  SHIYAN_PRIMARY_PRODUCT,
} from "./constants";

type ExperimentPatch = Record<string, unknown>;

const buildModelStageDefaults = (): ExperimentPatch => ({
  selected_industry: SHIYAN_INDUSTRY,
  selected_company: SHIYAN_COMPANY,
  selected_product: SHIYAN_PRIMARY_PRODUCT,
  data_window_train_start_index: Number(DEFAULT_DATA_WINDOW.trainStart),
  data_window_train_end_index: Number(DEFAULT_DATA_WINDOW.trainEnd),
  data_window_evaluate_start_index: Number(DEFAULT_DATA_WINDOW.evaluateStart),
  data_window_evaluate_end_index: Number(DEFAULT_DATA_WINDOW.evaluateEnd),
  current_step: 5,
  highest_completed_step: 4,
});

export async function prepareModelStageExperiment(
  studentApi: StudentApiClient,
  overrides: ExperimentPatch = {},
): Promise<ExperimentRecord> {
  const experiment = await studentApi.ensureFreshExperiment();
  return await studentApi.updateExperiment(experiment.experiment_id, {
    ...buildModelStageDefaults(),
    ...overrides,
  });
}

export async function prepareEnsembleReadyExperiment(
  studentApi: StudentApiClient,
  overrides: ExperimentPatch = {},
): Promise<ExperimentRecord> {
  return await prepareModelStageExperiment(studentApi, {
    moving_average_window: 6,
    moving_average_completed: true,
    moving_average_metrics_rmse: 12.3,
    moving_average_metrics_mae: 9.1,
    moving_average_metrics_r2: 0.82,
    exponential_smoothing_alpha: 0.3,
    exponential_smoothing_completed: true,
    exponential_smoothing_metrics_rmse: 11.7,
    exponential_smoothing_metrics_mae: 8.7,
    exponential_smoothing_metrics_r2: 0.84,
    ...overrides,
  });
}

export async function prepareProductionStageExperiment(
  studentApi: StudentApiClient,
  overrides: ExperimentPatch = {},
): Promise<ExperimentRecord> {
  return await prepareModelStageExperiment(studentApi, {
    moving_average_window: 6,
    moving_average_completed: true,
    moving_average_metrics_rmse: 12.3,
    moving_average_metrics_mae: 9.1,
    moving_average_metrics_r2: 0.82,
    selected_best_model: "ma",
    quiz_about_model_completed: true,
    current_step: 7,
    highest_completed_step: 6,
    ...overrides,
  });
}
