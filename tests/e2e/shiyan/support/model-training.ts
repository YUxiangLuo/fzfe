import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveE2EBackendDir } from "../../helpers/backend-dir";
import type { ExperimentRecord, StudentApiClient } from "./backend";
import {
  DEFAULT_DATA_WINDOW,
  SHIYAN_COMPANY,
  SHIYAN_INDUSTRY,
  SHIYAN_PRIMARY_PRODUCT,
} from "./constants";

type ExperimentPatch = Record<string, unknown>;
type GuidedModelType = "ma" | "es" | "arima" | "lstm" | "weighted_avg" | "stacking" | "boosting";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE_DIR = path.resolve(__dirname, "../../../..");
const BE_DIR = resolveE2EBackendDir(FE_DIR);

const SERVER_MANAGED_FIXTURE_FIELDS = new Set([
  "status",
  "moving_average_completed",
  "moving_average_metrics_rmse",
  "moving_average_metrics_mae",
  "moving_average_metrics_r2",
  "exponential_smoothing_completed",
  "exponential_smoothing_metrics_rmse",
  "exponential_smoothing_metrics_mae",
  "exponential_smoothing_metrics_r2",
  "arima_completed",
  "arima_p",
  "arima_q",
  "arima_metrics_rmse",
  "arima_metrics_mae",
  "arima_metrics_r2",
  "lstm_completed",
  "lstm_metrics_rmse",
  "lstm_metrics_mae",
  "lstm_metrics_r2",
  "ensemble_weighted_completed",
  "ensemble_weighted_base_models",
  "ensemble_weighted_metrics_rmse",
  "ensemble_weighted_metrics_mae",
  "ensemble_weighted_metrics_r2",
  "ensemble_boosting_completed",
  "ensemble_boosting_base_models",
  "ensemble_boosting_metrics_rmse",
  "ensemble_boosting_metrics_mae",
  "ensemble_boosting_metrics_r2",
  "ensemble_stacking_completed",
  "ensemble_stacking_base_models",
  "ensemble_stacking_metrics_rmse",
  "ensemble_stacking_metrics_mae",
  "ensemble_stacking_metrics_r2",
  "quiz_about_model_completed",
  "quiz_about_plan_completed",
  "selected_best_model",
]);

const JSON_FIXTURE_FIELDS = new Set([
  "lstm_features",
  "ensemble_weighted_base_models",
  "ensemble_boosting_base_models",
  "ensemble_stacking_base_models",
]);

const SEED_SERVER_MANAGED_FIELDS_SCRIPT = `
import mysql from "mysql2/promise";

const experimentId = Number(process.env.E2E_EXPERIMENT_ID);
const patch = JSON.parse(process.env.E2E_EXPERIMENT_PATCH ?? "{}");
const allowedFields = new Set(JSON.parse(process.env.E2E_ALLOWED_FIELDS ?? "[]"));
const jsonFields = new Set(JSON.parse(process.env.E2E_JSON_FIELDS ?? "[]"));
const entries = Object.entries(patch);
if (!Number.isInteger(experimentId) || experimentId <= 0) throw new Error("Invalid E2E experiment id");
if (entries.length === 0) throw new Error("Empty E2E experiment fixture patch");
for (const [field] of entries) {
  if (!allowedFields.has(field)) throw new Error(\`Disallowed E2E fixture field: \${field}\`);
}

const conn = await mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD ?? "",
  database: process.env.DB_DATABASE,
  charset: "utf8mb4",
});
try {
  const assignments = entries.map(([field]) => "\`" + field + "\` = ?").join(", ");
  const values = entries.map(([field, value]) => jsonFields.has(field) && value !== null
    ? JSON.stringify(value)
    : value);
  const [result] = await conn.query(
    \`UPDATE experiment_status
        SET \${assignments}, state_version = state_version + 1, last_activity_at = NOW()
      WHERE experiment_id = ?\`,
    [...values, experimentId],
  );
  if (result.affectedRows !== 1) throw new Error("E2E experiment fixture row not found");
  const [rows] = await conn.query(
    "SELECT state_version FROM experiment_status WHERE experiment_id = ? LIMIT 1",
    [experimentId],
  );
  console.log(JSON.stringify({ state_version: Number(rows[0].state_version) }));
} finally {
  await conn.end();
}
`;

const seedServerManagedFields = (
  experimentId: number,
  patch: ExperimentPatch,
): number => {
  const output = execFileSync("bun", ["-e", SEED_SERVER_MANAGED_FIELDS_SCRIPT], {
    cwd: BE_DIR,
    env: {
      ...process.env,
      E2E_EXPERIMENT_ID: String(experimentId),
      E2E_EXPERIMENT_PATCH: JSON.stringify(patch),
      E2E_ALLOWED_FIELDS: JSON.stringify([...SERVER_MANAGED_FIXTURE_FIELDS]),
      E2E_JSON_FIELDS: JSON.stringify([...JSON_FIXTURE_FIELDS]),
    },
    encoding: "utf8",
  });
  const result = JSON.parse(output.trim()) as { state_version: number };
  return result.state_version;
};

export const seedManagedExperimentFixture = (
  experimentId: number,
  patch: ExperimentPatch,
) => seedServerManagedFields(experimentId, patch);

const partitionFixtureOverrides = (overrides: ExperimentPatch) => {
  const writable: ExperimentPatch = {};
  const managed: ExperimentPatch = {};
  for (const [field, value] of Object.entries(overrides)) {
    (SERVER_MANAGED_FIXTURE_FIELDS.has(field) ? managed : writable)[field] = value;
  }
  return { writable, managed };
};

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
  const { writable, managed } = partitionFixtureOverrides(overrides);
  const updated = await studentApi.updateExperiment(experiment.experiment_id, {
    ...buildModelStageDefaults(),
    ...writable,
  });
  if (Object.keys(managed).length === 0) return updated;

  seedServerManagedFields(experiment.experiment_id, managed);
  const seeded = await studentApi.getActiveExperiment();
  if (!seeded) throw new Error("E2E model fixture experiment disappeared after seeding");
  return seeded;
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

const toFrontendBaseModel = (model: string) => ({
  ma: "moving_average",
  es: "exponential_smoothing",
  arima: "arima",
  lstm: "lstm",
})[model] ?? model;

export const seedAuthoritativeTrainingFixture = (
  modelType: GuidedModelType,
  request: Record<string, unknown>,
  result: { results: Record<string, unknown> },
) => {
  const experimentId = Number(request.experiment_id);
  const metrics = result.results.metrics as Record<string, unknown>;
  const patch: ExperimentPatch = {};
  const assignMetrics = (prefix: string) => {
    patch[`${prefix}_metrics_rmse`] = metrics.rmse;
    patch[`${prefix}_metrics_mae`] = metrics.mae;
    patch[`${prefix}_metrics_r2`] = metrics.r2;
  };

  switch (modelType) {
    case "ma":
      patch.moving_average_completed = true;
      assignMetrics("moving_average");
      break;
    case "es":
      patch.exponential_smoothing_completed = true;
      assignMetrics("exponential_smoothing");
      break;
    case "arima": {
      const order = result.results.best_order as Record<string, unknown> | undefined;
      patch.arima_completed = true;
      if (order) {
        patch.arima_p = order.p;
        patch.arima_q = order.q;
      }
      assignMetrics("arima");
      break;
    }
    case "lstm":
      patch.lstm_completed = true;
      assignMetrics("lstm");
      break;
    case "weighted_avg":
    case "boosting":
    case "stacking": {
      const prefix = modelType === "weighted_avg"
        ? "ensemble_weighted"
        : modelType === "boosting"
          ? "ensemble_boosting"
          : "ensemble_stacking";
      patch[`${prefix}_completed`] = true;
      patch[`${prefix}_base_models`] = String(request.models ?? "")
        .split(",")
        .filter(Boolean)
        .map(toFrontendBaseModel);
      assignMetrics(prefix);
      break;
    }
  }

  const stateVersion = seedServerManagedFields(experimentId, patch);
  return {
    ...patch,
    state_version: stateVersion,
  };
};
