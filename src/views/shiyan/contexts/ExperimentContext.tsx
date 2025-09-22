import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  getExperimentState,
  updateExperimentState as apiUpdateExperimentState,
  resetExperimentState as apiResetExperimentState,
} from '../../../utils/apiClient';
import { apiClient } from '../../../utils/apiClient';

type ExperimentStatus = 'Not Started' | 'In Progress' | 'Completed';

export interface ModelMetrics {
  rmse: number | null;
  mae: number | null;
  r2: number | null;
}

export interface ProductSalesData {
  meta: {
    industry: string;
    company: string;
    product: string;
    name: string;
    description: string;
    unit: string;
  };
  monthlySales: {
    month: string;
    sales: number;
  }[];
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

export interface DataWindowSelection {
  trainStartIndex: number | null;
  trainEndIndex: number | null;
  evaluateStartIndex: number | null;
  evaluateEndIndex: number | null;
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
  dataWindow: DataWindowSelection;
  quiz_about_model_completed: boolean;
  quiz_about_plan_completed: boolean;
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

const createInitialDataWindowSelection = (): DataWindowSelection => ({
  trainStartIndex: null,
  trainEndIndex: null,
  evaluateStartIndex: null,
  evaluateEndIndex: null,
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
  dataWindow: createInitialDataWindowSelection(),
  quiz_about_model_completed: false,
  quiz_about_plan_completed: false,
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
    'dataWindow',
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
    'dataWindow',
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
    'dataWindow',
    'quiz_about_model_completed',
    'quiz_about_plan_completed',
  ],
};

interface ExperimentContextType {
  state: ExperimentState;
  loading: boolean;
  updateState: (updates: Partial<ExperimentState>) => Promise<void>;
  resetExperiment: () => Promise<void>;
  isStepCompleted: (step: number) => boolean;
  isStepUnlocked: (step: number) => boolean;
  // New additions for in-memory sales data
  productSalesData: ProductSalesData | null;
  isLoadingSales: boolean;
  salesDataError: string | null;
  loadProductSalesData: (industry: string, company: string, product: string) => Promise<boolean>;
}

const ExperimentContext = createContext<ExperimentContextType | undefined>(undefined);

export const ExperimentProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<ExperimentState>(buildInitialState());
  const [loading, setLoading] = useState(true);

  // In-memory state for sales data, not persisted with the main experiment state
  const [productSalesData, setProductSalesData] = useState<ProductSalesData | null>(null);
  const [isLoadingSales, setIsLoadingSales] = useState(false);
  const [salesDataError, setSalesDataError] = useState<string | null>(null);

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

      // When a selection changes that invalidates sales data, clear it.
      if (key === 'selected_industry' || key === 'selected_company' || key === 'selected_product') {
        setProductSalesData(null);
        setSalesDataError(null);
      }

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
          case 'dataWindow':
            newState.dataWindow = createInitialDataWindowSelection();
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
    setProductSalesData(null); // Also clear in-memory data on full reset
    setSalesDataError(null);
  };

  const isStepCompleted = (step: number): boolean => state.highest_completed_step >= step;

  const isStepUnlocked = (step: number): boolean => step <= state.current_step;

  const loadProductSalesData = async (industry: string, company: string, product: string): Promise<boolean> => {
    setIsLoadingSales(true);
    setSalesDataError(null);
    try {
      const endpoint = `/datasets/industries/${industry}/companies/${company}/products/${product}/sales`;
      const data = await apiClient.get<ProductSalesData>(endpoint);
      setProductSalesData(data);
      return true;
    } catch (err: any) {
      setSalesDataError(err.message || '获取产品销量数据失败');
      setProductSalesData(null);
      return false;
    } finally {
      setIsLoadingSales(false);
    }
  };

  return (
    <ExperimentContext.Provider
      value={{
        state,
        loading,
        updateState,
        resetExperiment,
        isStepCompleted,
        isStepUnlocked,
        productSalesData,
        isLoadingSales,
        salesDataError,
        loadProductSalesData,
      }}
    >
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
