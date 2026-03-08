import { useEffect, useRef } from 'react';

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
  const hasTriggeredRef = useRef(false);
  const scheduledTriggerRef = useRef<number | null>(null);

  useEffect(() => {
    const shouldCalculate =
      currentStepId === calculationStepId &&
      !results &&
      !isLoading &&
      canCalculate &&
      !error;

    if (shouldCalculate) {
      if (hasTriggeredRef.current) {
        return;
      }

      hasTriggeredRef.current = true;
      scheduledTriggerRef.current = window.setTimeout(() => {
        scheduledTriggerRef.current = null;
        handleCalculate();
      }, 0);

      return () => {
        if (scheduledTriggerRef.current !== null) {
          window.clearTimeout(scheduledTriggerRef.current);
          scheduledTriggerRef.current = null;
          hasTriggeredRef.current = false;
        }
      };
    }

    // Not in a triggerable state — reset the dedup guard so a future
    // transition back to triggerable (e.g. after error is cleared) can fire.
    if (scheduledTriggerRef.current !== null) {
      window.clearTimeout(scheduledTriggerRef.current);
      scheduledTriggerRef.current = null;
    }
    hasTriggeredRef.current = false;
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
