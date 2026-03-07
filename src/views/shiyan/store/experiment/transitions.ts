import { STEPS } from "../../constants/steps";
import { resetModelingFields, resetProductionPlanFields } from "./initialState";
import type { ExperimentState, SelectedBestModel } from "./types";

type DataWindowFields = Pick<
  ExperimentState,
  | "data_window_train_start_index"
  | "data_window_train_end_index"
  | "data_window_evaluate_start_index"
  | "data_window_evaluate_end_index"
>;

const cloneState = (state: ExperimentState): ExperimentState => ({ ...state });

export const applyIndustryChangeTransition = (
  currentState: ExperimentState,
  selectedIndustry: string,
): ExperimentState => {
  const nextState = cloneState(currentState);
  nextState.selected_industry = selectedIndustry;
  nextState.selected_company = null;
  nextState.selected_product = null;
  nextState.highest_completed_step = STEPS.INDUSTRY;
  nextState.current_step = STEPS.COMPANY;
  resetModelingFields(nextState, { resetQuizzes: true });
  return nextState;
};

export const applyCompanyChangeTransition = (
  currentState: ExperimentState,
  selectedCompany: string,
): ExperimentState => {
  const nextState = cloneState(currentState);
  nextState.selected_company = selectedCompany;
  nextState.selected_product = null;
  nextState.highest_completed_step = STEPS.COMPANY;
  nextState.current_step = STEPS.PRODUCT;
  resetModelingFields(nextState, { resetQuizzes: true });
  return nextState;
};

export const applyProductChangeTransition = (
  currentState: ExperimentState,
  selectedProduct: string,
): ExperimentState => {
  const nextState = cloneState(currentState);
  nextState.selected_product = selectedProduct;
  nextState.highest_completed_step = STEPS.PRODUCT;
  nextState.current_step = STEPS.DATA_WINDOW;
  resetModelingFields(nextState, { resetQuizzes: true });
  return nextState;
};

export const applyDataWindowChangeTransition = (
  currentState: ExperimentState,
  updates: Partial<DataWindowFields>,
): ExperimentState => {
  const nextState = {
    ...currentState,
    ...updates,
  };
  resetModelingFields(nextState, {
    resetQuizzes: true,
    preserveDataWindow: true,
  });
  nextState.highest_completed_step = STEPS.DATA_WINDOW;
  nextState.current_step = STEPS.MODEL;
  return nextState;
};

export const applyEnterEvaluationTransition = (
  currentState: ExperimentState,
): ExperimentState => {
  const nextState = cloneState(currentState);
  nextState.highest_completed_step = STEPS.MODEL;
  nextState.current_step = STEPS.EVALUATION;
  return nextState;
};

export const applyBestModelChangeTransition = (
  currentState: ExperimentState,
  selectedBestModel: SelectedBestModel | null,
): ExperimentState => {
  const nextState = cloneState(currentState);
  nextState.selected_best_model = selectedBestModel;
  resetProductionPlanFields(nextState);
  nextState.highest_completed_step = STEPS.EVALUATION;
  nextState.current_step = STEPS.PRODUCTION;
  return nextState;
};