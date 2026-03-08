/// <reference types="bun-types" />

import { describe, expect, it, mock } from "bun:test";
import { render, waitFor } from "@testing-library/react";
import React from "react";
import { useAutoCalculation } from "./useAutoCalculation";

interface HarnessProps {
  currentStepId?: string;
  canCalculate: boolean;
  results: unknown;
  isLoading: boolean;
  error?: string | null;
  handleCalculate: () => void;
}

const Harness: React.FC<HarnessProps> = ({
  currentStepId = "results",
  canCalculate,
  results,
  isLoading,
  error = null,
  handleCalculate,
}) => {
  useAutoCalculation({
    calculationStepId: "results",
    currentStepId,
    handleCalculate,
    canCalculate,
    results,
    isLoading,
    error,
  });

  return null;
};

describe("useAutoCalculation", () => {
  it("deduplicates StrictMode double-effect execution for the same idle calculation state", async () => {
    const handleCalculate = mock(() => {});

    render(
      <React.StrictMode>
        <Harness
          canCalculate
          results={null}
          isLoading={false}
          handleCalculate={handleCalculate}
        />
      </React.StrictMode>,
    );

    await waitFor(() => expect(handleCalculate).toHaveBeenCalledTimes(1));
  });

  it("allows a new auto-calculation after the previous attempt ends in error and the error is cleared", async () => {
    const handleCalculate = mock(() => {});
    const { rerender } = render(
      <Harness
        canCalculate
        results={null}
        isLoading={false}
        handleCalculate={handleCalculate}
      />,
    );

    await waitFor(() => expect(handleCalculate).toHaveBeenCalledTimes(1));

    rerender(
      <Harness
        canCalculate
        results={null}
        isLoading={false}
        error="failed"
        handleCalculate={handleCalculate}
      />,
    );

    rerender(
      <Harness
        canCalculate
        results={null}
        isLoading={false}
        handleCalculate={handleCalculate}
      />,
    );

    await waitFor(() => expect(handleCalculate).toHaveBeenCalledTimes(2));
  });
});
