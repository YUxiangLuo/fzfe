import { useEffect } from 'react';

interface UseAutoCalculationParams {
  /**
   * The ID of the step that should trigger the calculation.
   */
  calculationStepId: string;
  /**
   * The ID of the current step in the stepper.
   */
  currentStepId?: string;
  /**
   * The function to call to perform the calculation.
   */
  handleCalculate: () => void;
  /**
   * A boolean indicating if all preconditions for calculation are met.
   */
  canCalculate: boolean;
  /**
   * The results of the calculation. If this is not null, calculation will not be re-triggered.
   */
  results: any;
  /**
   * A boolean indicating if a calculation is currently in progress.
   */
  isLoading: boolean;
  /**
   * An optional error message. If present, calculation will not be re-triggered.
   */
  error?: string | null;
}

/**
 * A hook to automatically trigger a calculation when a specific step is reached,
 * provided that all conditions are met.
 * @param params - The parameters for the auto calculation logic.
 */
export const useAutoCalculation = ({
  calculationStepId,
  currentStepId,
  handleCalculate,
  canCalculate,
  results,
  isLoading,
  error,
}: UseAutoCalculationParams) => {
  useEffect(() => {
    console.log(results);
    if (
      currentStepId === calculationStepId &&
      !results &&
      !isLoading &&
      canCalculate &&
      !error
    ) {
      handleCalculate();
    }
    // The handleCalculate function is expected to be memoized with useCallback
    // to prevent infinite loops.
  }, [
    calculationStepId,
    currentStepId,
    handleCalculate,
    canCalculate,
    results,
    isLoading,
    error,
  ]);
};
