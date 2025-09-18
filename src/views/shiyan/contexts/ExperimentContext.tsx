import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { 
  getExperimentState, 
  updateExperimentState as apiUpdateExperimentState,
  resetExperimentState as apiResetExperimentState 
} from '../../../utils/apiClient';

// --- 1. NEW STATE DEFINITION ---
// This interface maps directly to the new `experiment_status` table schema.
export interface ModelRun {
  completed: boolean;
  params: Record<string, any>;
  metrics: Record<string, any> | null;
}

export interface ExperimentState {
  experiment_id: number | null;
  student_id: number | null;
  status: 'Not Started' | 'In Progress' | 'Completed';
  
  highest_completed_step: number;
  current_step: number;

  selected_industry: string | null;
  selected_company: string | null;
  selected_product: string | null;
  
  model_runs: Record<string, ModelRun>;
  
  best_model: string | null;
}

// --- 2. NEW INITIAL STATE & RESET LOGIC ---
export const initialState: ExperimentState = {
  experiment_id: null,
  student_id: null,
  status: 'Not Started',
  highest_completed_step: 0,
  current_step: 1,
  selected_industry: null,
  selected_company: null,
  selected_product: null,
  model_runs: {},
  best_model: null,
};

// Reset logic is now simpler and more declarative.
const resetLogic: Partial<Record<keyof ExperimentState, (keyof ExperimentState)[]>> = {
  selected_industry: [
    'selected_company', 'selected_product', 'highest_completed_step', 'current_step', 'model_runs', 'best_model'
  ],
  selected_company: [
    'selected_product', 'highest_completed_step', 'current_step', 'model_runs', 'best_model'
  ],
  selected_product: [
    'highest_completed_step', 'current_step', 'model_runs', 'best_model'
  ],
};

// --- 3. CONTEXT DEFINITION ---
interface ExperimentContextType {
  state: ExperimentState;
  loading: boolean;
  updateState: (updates: Partial<ExperimentState>) => Promise<void>;
  resetExperiment: () => Promise<void>;
  isStepCompleted: (step: number) => boolean;
  isStepUnlocked: (step: number) => boolean;
}

const ExperimentContext = createContext<ExperimentContextType | undefined>(undefined);

// --- 4. PROVIDER COMPONENT ---
export const ExperimentProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<ExperimentState>(initialState);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchState = async () => {
      setLoading(true);
      const fetchedState = await getExperimentState();
      if (fetchedState) {
        setState(fetchedState);
      }
      setLoading(false);
    };
    fetchState();
  }, []);

  const updateState = async (updates: Partial<ExperimentState>) => {
    let newState = { ...state, ...updates };

    // Apply reset logic
    for (const key in updates) {
      const fieldsToReset = resetLogic[key as keyof ExperimentState];
      if (fieldsToReset) {
        fieldsToReset.forEach(field => {
          // Special handling for step counters
          if (field === 'highest_completed_step') {
            if (key === 'selected_industry') newState.highest_completed_step = 0;
            if (key === 'selected_company') newState.highest_completed_step = 1;
            if (key === 'selected_product') newState.highest_completed_step = 2;
          } else if (field === 'current_step') {
            if (key === 'selected_industry') newState.current_step = 1;
            if (key === 'selected_company') newState.current_step = 2;
            if (key === 'selected_product') newState.current_step = 3;
          } else {
            (newState as any)[field] = initialState[field as keyof ExperimentState];
          }
        });
      }
    }
    
    // Update overall status
    if (newState.status === 'Not Started' && Object.keys(updates).length > 0) {
        newState.status = 'In Progress';
    }

    setState(newState);
    await apiUpdateExperimentState(newState);
  };

  const resetExperiment = async () => {
    await apiResetExperimentState();
    setState({ ...initialState, student_id: 123, experiment_id: 1 }); // Reset to a clean initial state
  };

  // Logic is now much simpler and more readable.
  const isStepCompleted = (step: number): boolean => {
    return state.highest_completed_step >= step;
  };

  const isStepUnlocked = (step: number): boolean => {
    return step <= state.current_step;
  };

  return (
    <ExperimentContext.Provider value={{ state, loading, updateState, resetExperiment, isStepCompleted, isStepUnlocked }}>
      {children}
    </ExperimentContext.Provider>
  );
};

// --- 5. HOOK for easy consumption ---
export const useExperiment = () => {
  const context = useContext(ExperimentContext);
  if (context === undefined) {
    throw new Error('useExperiment must be used within an ExperimentProvider');
  }
  return context;
};