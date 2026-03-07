/// <reference types="bun-types" />

import { describe, expect, it } from "bun:test";
import {
  canAccessModelQuiz,
  canAccessPlanQuiz,
  canAccessReport,
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
        quiz_about_plan_completed: true,
        current_step: 7,
        status: "In Progress",
      }),
    ).toBe(true);

    expect(
      canAccessReport({
        quiz_about_plan_completed: false,
        current_step: 8,
        status: "In Progress",
      }),
    ).toBe(true);

    expect(
      canAccessReport({
        quiz_about_plan_completed: false,
        current_step: 6,
        status: "In Progress",
      }),
    ).toBe(false);
  });

  it("routes report fallback through quiz-plan after production, otherwise to the active step", () => {
    expect(getReportFallbackPath({ current_step: 7 }, (step) => step <= 7)).toBe("/quiz-plan");
    expect(getReportFallbackPath({ current_step: 4 }, () => false)).toBe("/data");
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