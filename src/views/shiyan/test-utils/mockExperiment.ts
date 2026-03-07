import { mock } from "bun:test";

export interface MockExperimentValue {
  state: {
    current_step: number;
    highest_completed_step: number;
    start_time: string | null;
    last_activity_at: string | null;
  };
  ui: {
    loading: boolean;
    isTrainingLocked: boolean;
    isSubmitting: boolean;
    trainingLockPath: string | null;
  };
  isStepCompleted: (step: number) => boolean;
  isStepUnlocked: (step: number) => boolean;
  createNewExperiment: ReturnType<typeof mock>;
  setIsSubmitting: ReturnType<typeof mock>;
  updateState: ReturnType<typeof mock>;
  productSalesData: null;
  setTrainingLock: ReturnType<typeof mock>;
}

type MockOverrides = Omit<Partial<MockExperimentValue>, "state" | "ui"> & {
  state?: Partial<MockExperimentValue["state"]>;
  ui?: Partial<MockExperimentValue["ui"]>;
};

export function createMockExperimentValue(
  overrides: MockOverrides = {},
): MockExperimentValue {
  const { state, ui, ...rest } = overrides;
  return {
    state: {
      current_step: 1,
      highest_completed_step: 0,
      start_time: null,
      last_activity_at: null,
      ...state,
    },
    ui: {
      loading: false,
      isTrainingLocked: false,
      isSubmitting: false,
      trainingLockPath: null,
      ...ui,
    },
    isStepCompleted: () => false,
    isStepUnlocked: () => true,
    createNewExperiment: mock(async () => {}),
    setIsSubmitting: mock(() => {}),
    updateState: mock(async () => {}),
    productSalesData: null,
    setTrainingLock: mock(() => {}),
    ...rest,
  };
}
