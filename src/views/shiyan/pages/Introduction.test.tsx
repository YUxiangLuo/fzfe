/// <reference lib="dom" />
/// <reference types="bun-types" />

import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import type { RenderResult } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

const apiGet = mock(async (): Promise<any> => ({
  file_name: "实验手册.pdf",
  file_path: "/manuals/current.pdf",
}));

const createNewExperiment = mock(async () => {});
const setIsSubmitting = mock((_value: boolean) => {});
const confirmMock = mock(async () => false);
const useAuthObjectUrlMock = mock(() => "about:blank");

let experimentValue = {
  state: {
    start_time: null as string | null,
    current_step: 1,
    last_activity_at: null as string | null,
  },
  ui: {
    isSubmitting: false,
  },
  createNewExperiment,
  setIsSubmitting,
};

mock.module("/home/alice/pros/fangzhen/fe/src/utils/apiClient.ts", () => ({
  apiClient: {
    get: apiGet,
  },
}));

mock.module("/home/alice/pros/fangzhen/fe/src/hooks/useAuthObjectUrl.ts", () => ({
  useAuthObjectUrl: useAuthObjectUrlMock,
}));

mock.module(
  "/home/alice/pros/fangzhen/fe/src/views/shiyan/contexts/ExperimentContext.zustand.tsx",
  () => ({
    useExperiment: () => experimentValue,
  }),
);

mock.module(
  "/home/alice/pros/fangzhen/fe/src/views/shiyan/shared/contexts/ConfirmContext.tsx",
  () => ({
    useConfirm: () => ({ confirm: confirmMock }),
  }),
);

const LocationDisplay = () => {
  const location = useLocation();
  return <div data-testid="location-display">{location.pathname}</div>;
};

const renderIntroduction = async (
  initialEntry: string | { pathname: string; state?: { from?: string } },
) => {
  const { default: Introduction } = await import("./Introduction");
  let view!: RenderResult;

  await act(async () => {
    view = render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route
            path="/introduction"
            element={
              <>
                <Introduction />
                <LocationDisplay />
              </>
            }
          />
          <Route path="*" element={<LocationDisplay />} />
        </Routes>
      </MemoryRouter>
    );
  });

  return view;
};

describe("Introduction", () => {
  let view: RenderResult | null = null;

  beforeEach(() => {
    apiGet.mockReset();
    apiGet.mockResolvedValue({
      file_name: "实验手册.pdf",
      file_path: "/manuals/current.pdf",
    });
    createNewExperiment.mockReset();
    createNewExperiment.mockResolvedValue(undefined);
    setIsSubmitting.mockReset();
    confirmMock.mockReset();
    confirmMock.mockResolvedValue(false);
    useAuthObjectUrlMock.mockReset();
    useAuthObjectUrlMock.mockReturnValue("about:blank");
    experimentValue = {
      state: {
        start_time: null,
        current_step: 1,
        last_activity_at: null,
      },
      ui: {
        isSubmitting: false,
      },
      createNewExperiment,
      setIsSubmitting,
    };
  });

  afterEach(async () => {
    if (view) {
      view.unmount();
      view = null;
    }
    mock.clearAllMocks();
  });

  it("starts a new experiment from the final introduction step when no active experiment exists", async () => {
    view = await renderIntroduction("/introduction");

    await act(async () => {
      fireEvent.click(view!.getByRole("button", { name: "下一步" }));
    });
    await act(async () => {
      fireEvent.click(view!.getByRole("button", { name: "下一步" }));
    });

    const startButton = view.getByRole("button", { name: "开始实验" });
    expect(startButton).toBeDefined();
    expect(view.container.querySelector("iframe")?.getAttribute("src")).toBe(
      "about:blank",
    );

    await act(async () => {
      fireEvent.click(startButton);
    });

    await waitFor(() => {
      expect(view!.getByTestId("location-display").textContent).toBe("/industry");
    });

    expect(setIsSubmitting).toHaveBeenCalledWith(true);
    expect(createNewExperiment).toHaveBeenCalledTimes(1);
    expect(setIsSubmitting).toHaveBeenLastCalledWith(false);
  });

  it("shows the resume dialog and continues the existing experiment from the saved step", async () => {
    experimentValue = {
      ...experimentValue,
      state: {
        start_time: "2026-03-01T08:00:00Z",
        current_step: 6,
        last_activity_at: "2026-03-01T10:00:00Z",
      },
    };

    view = await renderIntroduction("/introduction");

    await act(async () => {
      fireEvent.click(view!.getByRole("button", { name: "下一步" }));
    });
    await act(async () => {
      fireEvent.click(view!.getByRole("button", { name: "下一步" }));
    });

    await act(async () => {
      fireEvent.click(view!.getByRole("button", { name: "开始实验" }));
    });

    expect(view.getByText("检测到未完成的实验")).toBeDefined();
    expect(view.getByText("步骤 6 / 7")).toBeDefined();

    await act(async () => {
      fireEvent.click(view!.getByRole("button", { name: "继续未完成的实验" }));
    });

    await waitFor(() => {
      expect(view!.getByTestId("location-display").textContent).toBe("/evaluation");
    });
    expect(createNewExperiment).not.toHaveBeenCalled();
  });

  it("returns to the originating experiment route instead of opening the resume dialog", async () => {
    experimentValue = {
      ...experimentValue,
      state: {
        start_time: "2026-03-01T08:00:00Z",
        current_step: 4,
        last_activity_at: "2026-03-01T10:00:00Z",
      },
    };

    view = await renderIntroduction({
      pathname: "/introduction",
      state: { from: "/production" },
    });

    await act(async () => {
      fireEvent.click(view!.getByRole("button", { name: "下一步" }));
    });
    await act(async () => {
      fireEvent.click(view!.getByRole("button", { name: "下一步" }));
    });

    const returnButton = view.getByRole("button", { name: "回到实验" });
    expect(returnButton).toBeDefined();

    await act(async () => {
      fireEvent.click(returnButton);
    });

    await waitFor(() => {
      expect(view!.getByTestId("location-display").textContent).toBe("/production");
    });
    expect(view.queryByText("检测到未完成的实验")).toBeNull();
  });
});