import { ROUTES, getStepPath } from "../constants/routes";
import { STEPS } from "../constants/steps";
import type { ExperimentState, ExperimentUiState } from "../store/experiment";

const LEGACY_REPORT_STEP = 8;

const stripTrailingSlash = (path: string) =>
  path.length > 1 && path.endsWith("/") ? path.slice(0, -1) : path;

export const shouldHideSidebar = (pathname: string): boolean =>
  pathname.startsWith(ROUTES.PRODUCTION);

export const getProtectedRouteRedirectPath = (
  step: number,
  isStepUnlocked: (step: number) => boolean,
): string | null => (isStepUnlocked(step) ? null : ROUTES.INDUSTRY);

export const canAccessModelQuiz = (
  isStepUnlocked: (step: number) => boolean,
): boolean => isStepUnlocked(STEPS.PRODUCTION);

export const getModelQuizFallbackPath = (
  state: Pick<ExperimentState, "current_step">,
): string => getStepPath(state.current_step);

const hasReachedLegacyReportState = (
  state: Pick<ExperimentState, "current_step">,
): boolean => state.current_step >= LEGACY_REPORT_STEP;

export const canAccessPlanQuiz = (
  state: Pick<ExperimentState, "quiz_about_plan_completed" | "current_step" | "status">,
  isStepCompleted: (step: number) => boolean,
): boolean =>
  isStepCompleted(STEPS.PRODUCTION) ||
  state.quiz_about_plan_completed ||
  hasReachedLegacyReportState(state) ||
  state.status === "Completed";

export const getPlanQuizFallbackPath = (
  state: Pick<ExperimentState, "current_step">,
): string => getStepPath(state.current_step);

export const canAccessReport = (
  state: Pick<ExperimentState, "quiz_about_plan_completed" | "current_step" | "status">,
): boolean =>
  state.quiz_about_plan_completed ||
  hasReachedLegacyReportState(state) ||
  state.status === "Completed";

export const getReportFallbackPath = (
  state: Pick<ExperimentState, "current_step">,
  isStepCompleted: (step: number) => boolean,
): string =>
  isStepCompleted(STEPS.PRODUCTION)
    ? ROUTES.QUIZ_PLAN
    : getStepPath(state.current_step);

export const getTrainingLockRedirectPath = (
  ui: Pick<ExperimentUiState, "isTrainingLocked" | "trainingLockPath">,
  pathname: string,
): string | null => {
  if (!ui.isTrainingLocked || !ui.trainingLockPath) {
    return null;
  }

  if (stripTrailingSlash(pathname) === stripTrailingSlash(ui.trainingLockPath)) {
    return null;
  }

  return ui.trainingLockPath;
};

export const shouldBlockBeforeUnload = (
  ui: Pick<ExperimentUiState, "isTrainingLocked">,
): boolean => ui.isTrainingLocked;