/// <reference types="bun-types" />

import { describe, expect, it } from "bun:test";
import {
  canAccessModelQuiz,
  canAccessPlanQuiz,
  canAccessReport,
  getExperimentResumePath,
  getModelQuizFallbackPath,
  getPlanQuizFallbackPath,
  getProtectedRouteRedirectPath,
  getReportFallbackPath,
  getTrainingLockRedirectPath,
  shouldBlockBeforeUnload,
  shouldHideSidebar,
} from "./routeGuards";

describe("routeGuards", () => {
  it("hides the sidebar only on production routes", () => {
    expect(shouldHideSidebar("/production")).toBe(true);
    expect(shouldHideSidebar("/production/plan")).toBe(true);
    expect(shouldHideSidebar("/model")).toBe(false);
  });

  it("redirects protected step routes back to industry when the step is locked", () => {
    expect(getProtectedRouteRedirectPath(4, (step) => step <= 3)).toBe("/industry");
    expect(getProtectedRouteRedirectPath(4, (step) => step <= 4)).toBeNull();
  });

  it("allows model quiz access only after production is unlocked", () => {
    expect(canAccessModelQuiz((step) => step <= 7)).toBe(true);
    expect(canAccessModelQuiz((step) => step <= 6)).toBe(false);
    expect(getModelQuizFallbackPath({ current_step: 5 })).toBe("/model");
  });

  it("allows plan quiz access after production completion or compatible legacy report state", () => {
    expect(
      canAccessPlanQuiz(
        {
          quiz_about_plan_completed: false,
          current_step: 4,
          status: "In Progress",
        },
        (step) => step <= 7,
      ),
    ).toBe(true);

    expect(
      canAccessPlanQuiz(
        {
          quiz_about_plan_completed: false,
          current_step: 8,
          status: "In Progress",
        },
        () => false,
      ),
    ).toBe(true);

    expect(
      canAccessPlanQuiz(
        {
          quiz_about_plan_completed: false,
          current_step: 4,
          status: "Completed",
        },
        () => false,
      ),
    ).toBe(true);
  });

  it("falls back plan quiz access to the current workflow route", () => {
    expect(getPlanQuizFallbackPath({ current_step: 4 })).toBe("/data");
    expect(
      canAccessPlanQuiz(
        {
          quiz_about_plan_completed: false,
          current_step: 4,
          status: "In Progress",
        },
        () => false,
      ),
    ).toBe(false);
  });

  it("allows report access only after the plan quiz, workflow completion, or a legacy report state", () => {
    expect(
      canAccessReport({
        quiz_about_model_completed: true,
        quiz_about_plan_completed: true,
        current_step: 7,
        status: "In Progress",
      }),
    ).toBe(true);

    expect(
      canAccessReport({
        quiz_about_model_completed: false,
        quiz_about_plan_completed: false,
        current_step: 8,
        status: "In Progress",
      }),
    ).toBe(true);

    expect(
      canAccessReport({
        quiz_about_model_completed: false,
        quiz_about_plan_completed: false,
        current_step: 6,
        status: "In Progress",
      }),
    ).toBe(false);

    expect(
      canAccessReport({
        quiz_about_model_completed: false,
        quiz_about_plan_completed: true,
        current_step: 7,
        status: "In Progress",
      }),
    ).toBe(false);
  });

  it("routes report fallback to the missing quiz before allowing report access", () => {
    expect(
      getReportFallbackPath(
        { current_step: 7, quiz_about_model_completed: true, quiz_about_plan_completed: true },
        (step) => step <= 7,
      ),
    ).toBe("/quiz-plan");
    expect(
      getReportFallbackPath(
        { current_step: 7, quiz_about_model_completed: false, quiz_about_plan_completed: true },
        (step) => step <= 7,
      ),
    ).toBe("/quiz");
    expect(
      getReportFallbackPath(
        { current_step: 4, quiz_about_model_completed: true, quiz_about_plan_completed: false },
        () => false,
      ),
    ).toBe("/data");
  });

  it("routes experiment resume through the fixed quiz checkpoints", () => {
    expect(
      getExperimentResumePath({
        current_step: 6,
        highest_completed_step: 5,
        quiz_about_model_completed: false,
        quiz_about_plan_completed: false,
        status: "In Progress",
      }),
    ).toBe("/evaluation");

    expect(
      getExperimentResumePath({
        current_step: 7,
        highest_completed_step: 6,
        quiz_about_model_completed: false,
        quiz_about_plan_completed: false,
        status: "In Progress",
      }),
    ).toBe("/quiz");

    expect(
      getExperimentResumePath({
        current_step: 7,
        highest_completed_step: 6,
        quiz_about_model_completed: true,
        quiz_about_plan_completed: false,
        status: "In Progress",
      }),
    ).toBe("/production");

    expect(
      getExperimentResumePath({
        current_step: 7,
        highest_completed_step: 7,
        quiz_about_model_completed: true,
        quiz_about_plan_completed: false,
        status: "In Progress",
      }),
    ).toBe("/quiz-plan");

    expect(
      getExperimentResumePath({
        current_step: 7,
        highest_completed_step: 7,
        quiz_about_model_completed: true,
        quiz_about_plan_completed: true,
        status: "In Progress",
      }),
    ).toBe("/quiz-plan");
  });

  it("keeps legacy and completed experiment resume paths compatible", () => {
    expect(
      getExperimentResumePath({
        current_step: 8,
        highest_completed_step: 7,
        quiz_about_model_completed: false,
        quiz_about_plan_completed: false,
        status: "In Progress",
      }),
    ).toBe("/report");

    expect(
      getExperimentResumePath({
        current_step: 7,
        highest_completed_step: 7,
        quiz_about_model_completed: true,
        quiz_about_plan_completed: true,
        status: "Completed",
      }),
    ).toBe("/report");
  });

  it("redirects locked navigation only when the current path differs from the lock path", () => {
    expect(
      getTrainingLockRedirectPath(
        { isTrainingLocked: true, trainingLockPath: "/model" },
        "/industry",
      ),
    ).toBe("/model");

    expect(
      getTrainingLockRedirectPath(
        { isTrainingLocked: true, trainingLockPath: "/model/" },
        "/model",
      ),
    ).toBeNull();

    expect(
      getTrainingLockRedirectPath(
        { isTrainingLocked: false, trainingLockPath: "/model" },
        "/industry",
      ),
    ).toBeNull();
  });

  it("blocks beforeunload only while training is locked", () => {
    expect(shouldBlockBeforeUnload({ isTrainingLocked: true })).toBe(true);
    expect(shouldBlockBeforeUnload({ isTrainingLocked: false })).toBe(false);
  });
});
