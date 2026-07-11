export interface ModelMetrics {
  rmse: number;
  mae: number;
  mape: number;
  r2: number;
}

export interface ModelImplementationMetadata {
  methodName?: string;
  forecastStrategy?: string;
  implementationNotes?: string[];
}

export interface ModelPredictionRow {
  date: string;
  actual: number;
  predicted: number;
  stdDev?: number;
}

export interface ModelResultData extends ModelImplementationMetadata {
  predictions: ModelPredictionRow[];
  metrics: ModelMetrics;
}

export interface ModelApiResultBase {
  eval_y_true?: unknown;
  eval_predictions?: unknown;
  eval_std_devs?: unknown;
  evaluate_months?: unknown;
  metrics: ModelMetrics;
  method_name?: string;
  forecast_strategy?: string;
  implementation_notes?: string[];
}
