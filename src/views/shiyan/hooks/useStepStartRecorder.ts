import { useEffect, useRef } from 'react';

type StepEventType = 'STARTED' | 'COMPLETED';

export const useStepStartRecorder = (
  stepOrder: number,
  highestCompletedStep: number,
  recordStepEvent: (stepOrder: number, eventType: StepEventType) => void | Promise<void>
): void => {
  const hasRecordedStartRef = useRef(false);
  const prevHighestStepRef = useRef(highestCompletedStep);

  useEffect(() => {
    if (highestCompletedStep < prevHighestStepRef.current) {
      hasRecordedStartRef.current = false;
    }
    prevHighestStepRef.current = highestCompletedStep;

    if (stepOrder > highestCompletedStep && !hasRecordedStartRef.current) {
      recordStepEvent(stepOrder, 'STARTED');
      hasRecordedStartRef.current = true;
    }
  }, [stepOrder, highestCompletedStep, recordStepEvent]);
};
