/// <reference lib="dom" />
/// <reference types="bun-types" />

import { resolve } from "path";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import type { RenderResult } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

mock.restore();

const r = (p: string) => resolve(import.meta.dir, p);

const handleEnterEvaluation = mock(async () => {});

let experimentValue = {
  state: {
    selected_ensemble_models: ["weighted_ensemble"] as string[],
    ensemble_weighted_completed: false,
    ensemble_boosting_completed: false,
    ensemble_stacking_completed: false,
  },
  ui: {
    isSubmitting: false,
  },
  handleEnterEvaluation,
};

mock.module(
  r("../../contexts/ExperimentContext.zustand.tsx"),
  () => ({
    useExperiment: () => experimentValue,
  }),
);

const LocationDisplay = () => {
  const location = useLocation();
  return <div data-testid="location-display">{location.pathname}</div>;
};

const renderEnsembleSelection = async () => {
  const { default: EnsembleModelSelection } = await import("./EnsembleModelSelection");
  return render(
    <MemoryRouter initialEntries={["/model/ensemble-select"]}>
      <Routes>
        <Route
          path="/model/ensemble-select"
          element={
            <>
              <EnsembleModelSelection />
              <LocationDisplay />
            </>
          }
        />
        <Route path="*" element={<LocationDisplay />} />
      </Routes>
    </MemoryRouter>,
  );
};

describe("EnsembleModelSelection", () => {
  let view: RenderResult | null = null;

  beforeEach(() => {
    handleEnterEvaluation.mockReset();
    handleEnterEvaluation.mockResolvedValue(undefined);
    experimentValue = {
      state: {
        selected_ensemble_models: ["weighted_ensemble"],
        ensemble_weighted_completed: false,
        ensemble_boosting_completed: false,
        ensemble_stacking_completed: false,
      },
      ui: {
        isSubmitting: false,
      },
      handleEnterEvaluation,
    };
  });

  afterEach(() => {
    if (view) {
      view.unmount();
      view = null;
    }
    mock.clearAllMocks();
  });

  it("does not render any direct evaluation shortcut before all selected ensemble models are completed", async () => {
    view = await renderEnsembleSelection();

    expect(view.getByText("请完成您选择的融合模型")).toBeDefined();
    expect(
      view.queryByRole("button", { name: "暂不训练融合模型，直接评估" }),
    ).toBeNull();
    expect(
      view.queryByRole("button", { name: "进入结果评估" }),
    ).toBeNull();
  });

  it("allows entering evaluation only after all selected ensemble models are completed", async () => {
    experimentValue = {
      ...experimentValue,
      state: {
        selected_ensemble_models: ["weighted_ensemble", "boosting_ensemble"],
        ensemble_weighted_completed: true,
        ensemble_boosting_completed: true,
        ensemble_stacking_completed: false,
      },
    };

    view = await renderEnsembleSelection();

    const enterEvaluationButton = view.getByRole("button", { name: "进入结果评估" });
    expect(enterEvaluationButton).toBeDefined();

    await act(async () => {
      fireEvent.click(enterEvaluationButton);
    });

    await waitFor(() => {
      expect(view!.getByTestId("location-display").textContent).toBe("/evaluation");
    });

    expect(handleEnterEvaluation).toHaveBeenCalledTimes(1);
  });
});
