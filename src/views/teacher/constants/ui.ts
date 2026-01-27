/**
 * P2-1: UI-related constants to avoid magic numbers
 */

export const UI_CONSTANTS = {
  // Debounce delays (milliseconds)
  SEARCH_DEBOUNCE_DELAY: 300,
  INPUT_DEBOUNCE_DELAY: 500,

  // Password constraints
  PASSWORD_MIN_LENGTH: 6,
  PASSWORD_MAX_LENGTH: 20,

  // Toast auto-dismiss duration (milliseconds)
  TOAST_DURATION: 3000,

  // Experiment steps
  EXPERIMENT_TOTAL_STEPS: 7,

  // Pagination
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,

  // Form field lengths
  USERNAME_MIN_LENGTH: 3,
  USERNAME_MAX_LENGTH: 20,
  FULL_NAME_MIN_LENGTH: 2,
  FULL_NAME_MAX_LENGTH: 20,
  CLASS_NAME_MIN_LENGTH: 2,
  CLASS_NAME_MAX_LENGTH: 50,
  CLASS_CODE_MIN_LENGTH: 2,
  CLASS_CODE_MAX_LENGTH: 20,
  EMAIL_MAX_LENGTH: 100,
  PHONE_LENGTH: 11,
  QUESTION_TEXT_MIN_LENGTH: 10,
  QUESTION_TEXT_MAX_LENGTH: 500,
  QUESTION_OPTION_MAX_LENGTH: 100,

  // Score ranges
  SCORE_MIN: 0,
  SCORE_MAX: 100,
  PERCENTAGE_MIN: 0,
  PERCENTAGE_MAX: 100,
} as const;

// Export type for type safety
export type UIConstants = typeof UI_CONSTANTS;
