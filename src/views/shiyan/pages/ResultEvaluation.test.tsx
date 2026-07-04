/// <reference lib="dom" />
/// <reference types="bun-types" />

import { resolve } from "path";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

mock.restore();

const r = (p: string) => resolve(import.meta.dir, p);

const handleBestModelChange = mock(async () => {});
const recordStepEvent = mock(async () => {});
const useStepStartRecorder = mock(() => {});

let experimentValue = {
  state: {
    current_step: 7,
    highest_completed_step: 6,
    selected_best_model: "ma",
    quiz_about_model_completed: true,
    moving_average_completed: true,
    moving_average_metrics_rmse: 12,
    moving_average_metrics_mae: 8,
    moving_average_metrics_r2: 0.8,
    exponential_smoothing_completed: false,
    exponential_smoothing_metrics_rmse: null,
    exponential_smoothing_metrics_mae: null,
    exponential_smoothing_metrics_r2: null,
    arima_completed: false,
    arima_metrics_rmse: null,
    arima_metrics_mae: null,
    arima_metrics_r2: null,
    lstm_completed: false,
    lstm_metrics_rmse: null,
    lstm_metrics_mae: null,
    lstm_metrics_r2: null,
    ensemble_weighted_completed: false,
    ensemble_weighted_metrics_rmse: null,
    ensemble_weighted_metrics_mae: null,
    ensemble_weighted_metrics_r2: null,
    ensemble_boosting_completed: false,
    ensemble_boosting_metrics_rmse: null,
    ensemble_boosting_metrics_mae: null,
    ensemble_boosting_metrics_r2: null,
    ensemble_stacking_completed: false,
    ensemble_stacking_metrics_rmse: null,
    ensemble_stacking_metrics_mae: null,
    ensemble_stacking_metrics_r2: null,
  },
  ui: {
    isSubmitting: false,
  },
  handleBestModelChange,
  recordStepEvent,
};

mock.module(r("../contexts/ExperimentContext.zustand.tsx"), () => ({
  useExperiment: () => experimentValue,
}));

mock.module(r("../hooks/useStepStartRecorder.ts"), () => ({
  useStepStartRecorder,
}));

const LocationDisplay = () => {
  const location = useLocation();
  return <div data-testid="location-display">{location.pathname}</div>;
};

describe("ResultEvaluation", () => {
  beforeEach(() => {
    handleBestModelChange.mockReset();
    handleBestModelChange.mockResolvedValue(undefined);
    recordStepEvent.mockReset();
    useStepStartRecorder.mockReset();
    experimentValue = {
      ...experimentValue,
      state: {
        ...experimentValue.state,
        current_step: 7,
        highest_completed_step: 6,
        selected_best_model: "ma",
        quiz_about_model_completed: true,
      },
      ui: {
        isSubmitting: false,
      },
    };
  });

  it("enters the model quiz checkpoint even when the model quiz is already completed", async () => {
    const { default: ResultEvaluation } = await import("./ResultEvaluation");
    const view = render(
      <MemoryRouter initialEntries={["/evaluation"]}>
        <Routes>
          <Route
            path="/evaluation"
            element={
              <>
                <ResultEvaluation />
                <LocationDisplay />
              </>
            }
          />
          <Route path="*" element={<LocationDisplay />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect((view.getByRole("button", { name: "下一步" }) as HTMLButtonElement).disabled).toBe(false);
    });
    fireEvent.click(view.getByRole("button", { name: "下一步" }));

    await waitFor(() => {
      expect(view.getByTestId("location-display").textContent).toBe("/quiz");
    });
    expect(handleBestModelChange).not.toHaveBeenCalled();
  });
});
