/**
 * Shared constants for model components
 */

// Model ID mapping between frontend and backend
export const MODEL_ID_MAP: Record<string, string> = {
  'moving_average': 'ma',
  'exponential_smoothing': 'es',
  'arima': 'arima',
  'lstm': 'lstm',
} as const;

// `retryCount` tracks failed attempts including the initial auto-triggered attempt.
const MAX_MODEL_RETRIES = 1;

export const MODEL_RETRY_LIMITS = {
  maxRetries: MAX_MODEL_RETRIES,
  maxFailures: MAX_MODEL_RETRIES + 1,
} as const;

// ARIMA model constants
export const ARIMA_CONSTANTS = {
  MAX_DIFFERENCING_ORDER: 2,
  MIN_DIFFERENCING_ORDER: 0,
} as const;

// Moving Average constants
export const MOVING_AVERAGE_CONSTANTS = {
  MIN_WINDOW_SIZE: 2,
} as const;

// Exponential Smoothing constants
export const EXPONENTIAL_SMOOTHING_CONSTANTS = {
  MIN_ALPHA: 0,
  MAX_ALPHA: 1,
} as const;

// Ensemble model constants
export const ENSEMBLE_CONSTANTS = {
  MIN_BASE_MODELS: 2,
} as const;
