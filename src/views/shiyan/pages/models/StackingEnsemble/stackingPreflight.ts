import type { GuidedTrainingSession } from '../../../services/guidedTraining';

export const ensureStackingPreflight = async (
  session: GuidedTrainingSession | null,
  runNextStep: () => Promise<boolean>,
): Promise<boolean> => {
  const hasCompletedPreflight = session?.steps.some(
    step => step.id === 'prepare_data' && step.status === 'completed',
  ) ?? false;

  return hasCompletedPreflight ? true : runNextStep();
};
