import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  getExperimentState,
  updateExperimentState as apiUpdateExperimentState,
  resetExperimentState as apiResetExperimentState,
} from '../../../utils/apiClient';

type ExperimentStatus = 'Not Started' | 'In Progress' | 'Completed';

export interface ModelMetrics {
  rmse: number | null;
  mae: number | null;
  r2: number | null;
}

export interface AdfStationarityRow {
  diff_order: number;
  statistic: number;
  p_value: number;
  stationary: boolean;
  critical_values: Record<string, number>;
}

export interface MovingAverageState {
  completed: boolean | null;
  window: number | null;
  metrics: ModelMetrics;
}

export interface ExponentialSmoothingState {
  completed: boolean | null;
  alpha: number | null;
  metrics: ModelMetrics;
}

export interface ArimaState {
  completed: boolean | null;
  p: number | null;
  d: number | null;
  q: number | null;
  metrics: ModelMetrics;
  adfStationarity: AdfStationarityRow[];
}

export interface LstmState {
  completed: boolean | null;
  normalization: 'minmax' | 'zscore' | null;
  features: string[];
  metrics: ModelMetrics;
}

export interface EnsembleState {
  completed: boolean | null;
  baseModels: string[];
  metrics: ModelMetrics;
}

export interface ExperimentState {
  experiment_id: number | null;
  student_id: number | null;
  status: ExperimentStatus;
  highest_completed_step: number;
  current_step: number;
  selected_industry: string | null;
  selected_company: string | null;
  selected_product: string | null;
  movingAverage: MovingAverageState;
  exponentialSmoothing: ExponentialSmoothingState;
  arima: ArimaState;
  lstm: LstmState;
  ensembleWeighted: EnsembleState;
  ensembleBoosting: EnsembleState;
  ensembleStacking: EnsembleState;
  best_model: string | null;
}

const createEmptyMetrics = (): ModelMetrics => ({ rmse: null, mae: null, r2: null });

const createInitialMovingAverage = (): MovingAverageState => ({
  completed: null,
  window: null,
  metrics: createEmptyMetrics(),
});

const createInitialExponentialSmoothing = (): ExponentialSmoothingState => ({
  completed: null,
  alpha: null,
  metrics: createEmptyMetrics(),
});

const createInitialArima = (): ArimaState => ({
  completed: null,
  p: null,
  d: null,
  q: null,
  metrics: createEmptyMetrics(),
  adfStationarity: [],
});

const createInitialLstm = (): LstmState => ({
  completed: null,
  normalization: null,
  features: [],
  metrics: createEmptyMetrics(),
});

const createInitialEnsemble = (): EnsembleState => ({
  completed: null,
  baseModels: [],
  metrics: createEmptyMetrics(),
});

const buildInitialState = (): ExperimentState => ({
  experiment_id: null,
  student_id: null,
  status: 'Not Started',
  highest_completed_step: 0,
  current_step: 1,
  selected_industry: null,
  selected_company: null,
  selected_product: null,
  movingAverage: createInitialMovingAverage(),
  exponentialSmoothing: createInitialExponentialSmoothing(),
  arima: createInitialArima(),
  lstm: createInitialLstm(),
  ensembleWeighted: createInitialEnsemble(),
  ensembleBoosting: createInitialEnsemble(),
  ensembleStacking: createInitialEnsemble(),
  best_model: null,
});

export const initialState: ExperimentState = buildInitialState();

const resetLogic: Partial<Record<keyof ExperimentState, (keyof ExperimentState)[]>> = {
  selected_industry: [
    'selected_company',
    'selected_product',
    'highest_completed_step',
    'current_step',
    'movingAverage',
    'exponentialSmoothing',
    'arima',
    'lstm',
    'ensembleWeighted',
    'ensembleBoosting',
    'ensembleStacking',
    'best_model',
  ],
  selected_company: [
    'selected_product',
    'highest_completed_step',
    'current_step',
    'movingAverage',
    'exponentialSmoothing',
    'arima',
    'lstm',
    'ensembleWeighted',
    'ensembleBoosting',
    'ensembleStacking',
    'best_model',
  ],
  selected_product: [
    'highest_completed_step',
    'current_step',
    'movingAverage',
    'exponentialSmoothing',
    'arima',
    'lstm',
    'ensembleWeighted',
    'ensembleBoosting',
    'ensembleStacking',
    'best_model',
  ],
};

interface ExperimentContextType {
  state: ExperimentState;
  loading: boolean;
  updateState: (updates: Partial<ExperimentState>) => Promise<void>;
  resetExperiment: () => Promise<void>;
  isStepCompleted: (step: number) => boolean;
  isStepUnlocked: (step: number) => boolean;
}

const ExperimentContext = createContext<ExperimentContextType | undefined>(undefined);

export const ExperimentProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<ExperimentState>(buildInitialState());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchState = async () => {
      setLoading(true);
      const fetchedState = await getExperimentState();
      setState(fetchedState && typeof fetchedState === 'object' ? { ...buildInitialState(), ...fetchedState } : buildInitialState());
      setLoading(false);
    };
    fetchState();
  }, []);

  const updateState = async (updates: Partial<ExperimentState>) => {
    const newState: ExperimentState = { ...state, ...updates };
    const freshDefaults = buildInitialState();

    for (const key of Object.keys(updates) as (keyof ExperimentState)[]) {
      const fieldsToReset = resetLogic[key];
      if (!fieldsToReset) continue;

      for (const field of fieldsToReset) {
        switch (field) {
          case 'highest_completed_step':
            if (key === 'selected_industry') newState.highest_completed_step = 0;
            if (key === 'selected_company') newState.highest_completed_step = 1;
            if (key === 'selected_product') newState.highest_completed_step = 2;
            break;
          case 'current_step':
            if (key === 'selected_industry') newState.current_step = 1;
            if (key === 'selected_company') newState.current_step = 2;
            if (key === 'selected_product') newState.current_step = 3;
            break;
          case 'movingAverage':
            newState.movingAverage = createInitialMovingAverage();
            break;
          case 'exponentialSmoothing':
            newState.exponentialSmoothing = createInitialExponentialSmoothing();
            break;
          case 'arima':
            newState.arima = createInitialArima();
            break;
          case 'lstm':
            newState.lstm = createInitialLstm();
            break;
          case 'ensembleWeighted':
            newState.ensembleWeighted = createInitialEnsemble();
            break;
          case 'ensembleBoosting':
            newState.ensembleBoosting = createInitialEnsemble();
            break;
          case 'ensembleStacking':
            newState.ensembleStacking = createInitialEnsemble();
            break;
          default:
            (newState as unknown as Record<string, unknown>)[field as string] =
              (freshDefaults as unknown as Record<string, unknown>)[field as string];
        }
      }
    }

    if (newState.status === 'Not Started' && Object.keys(updates).length > 0) {
      newState.status = 'In Progress';
    }

    setState(newState);
    await apiUpdateExperimentState(newState);
  };

  const resetExperiment = async () => {
    await apiResetExperimentState();
    const resetState = buildInitialState();
    resetState.experiment_id = 1;
    resetState.student_id = 123;
    setState(resetState);
  };

  const isStepCompleted = (step: number): boolean => state.highest_completed_step >= step;

  const isStepUnlocked = (step: number): boolean => step <= state.current_step;

  return (
    <ExperimentContext.Provider value={{ state, loading, updateState, resetExperiment, isStepCompleted, isStepUnlocked }}>
      {children}
    </ExperimentContext.Provider>
  );
};

export const useExperiment = () => {
  const context = useContext(ExperimentContext);
  if (!context) {
    throw new Error('useExperiment must be used within an ExperimentProvider');
  }
  return context;
};
