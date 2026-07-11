export const MIN_TRAINING_POINTS = 2;
export const MIN_EVALUATION_POINTS = 2;
export const MIN_TOTAL_POINTS = MIN_TRAINING_POINTS + MIN_EVALUATION_POINTS;

export const getInclusiveRangeSize = (startIndex: number, endIndex: number): number => (
  endIndex - startIndex + 1
);

export const hasMinimumEvaluationPoints = (startIndex: number, endIndex: number): boolean => (
  getInclusiveRangeSize(startIndex, endIndex) >= MIN_EVALUATION_POINTS
);
