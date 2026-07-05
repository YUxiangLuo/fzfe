/// <reference lib="dom" />
/// <reference types="bun-types" />

import { resolve } from "path";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import type { RenderResult } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

mock.restore();

const r = (p: string) => resolve(import.meta.dir, p);

const defaultManual = {
  file_name: "实验手册.pdf",
  file_path: "/manuals/current.pdf",
};

let latestExperimentRuns: any[] = [];

const apiGet = mock(async (endpoint: string): Promise<any> => {
  if (endpoint === "/manuals/active") return defaultManual;
  if (endpoint === "/students/me/experiment-runs") return latestExperimentRuns;
  return null;
});

const createNewExperiment = mock(async () => {});
const setIsSubmitting = mock((_value: boolean) => {});
const confirmMock = mock(async () => false);
const useAuthObjectUrlMock = mock((value?: string | null) => (value ? "about:blank" : null));

let experimentValue = {
  state: {
    start_time: null as string | null,
    status: "Not Started",
    current_step: 1,
    highest_completed_step: 0,
    quiz_about_model_completed: false,
    quiz_about_plan_completed: false,
    last_activity_at: null as string | null,
  },
  ui: {
    isSubmitting: false,
  },
  createNewExperiment,
  setIsSubmitting,
};

mock.module(r("../../../utils/apiClient.ts"), () => ({
  apiClient: {
    get: apiGet,
  },
}));

mock.module(r("../../../hooks/useAuthObjectUrl.ts"), () => ({
  useAuthObjectUrl: useAuthObjectUrlMock,
}));

mock.module(
  r("../contexts/ExperimentContext.zustand.tsx"),
  () => ({
    useExperiment: () => experimentValue,
  }),
);

mock.module(
  r("../shared/contexts/ConfirmContext.tsx"),
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

const createDeferred = <T,>() => {
  let resolvePromise!: (value: T) => void;
  let rejectPromise!: (error?: unknown) => void;
  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  return {
    promise,
    resolve: resolvePromise,
    reject: rejectPromise,
  };
};

describe("Introduction", () => {
  let view: RenderResult | null = null;

  beforeEach(() => {
    latestExperimentRuns = [];
    apiGet.mockReset();
    apiGet.mockImplementation(async (endpoint: string): Promise<any> => {
      if (endpoint === "/manuals/active") return defaultManual;
      if (endpoint === "/students/me/experiment-runs") return latestExperimentRuns;
      return null;
    });
    createNewExperiment.mockReset();
    createNewExperiment.mockResolvedValue(undefined);
    setIsSubmitting.mockReset();
    confirmMock.mockReset();
    confirmMock.mockResolvedValue(false);
    useAuthObjectUrlMock.mockReset();
    useAuthObjectUrlMock.mockImplementation((value?: string | null) => (value ? "about:blank" : null));
    experimentValue = {
      state: {
        ...experimentValue.state,
        start_time: null,
        status: "Not Started",
        current_step: 1,
        highest_completed_step: 0,
        quiz_about_model_completed: false,
        quiz_about_plan_completed: false,
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

  it("warns before starting when the latest experiment is already completed and respects cancellation", async () => {
    latestExperimentRuns = [
      {
        experiment_id: 88,
        status: "Completed",
        completion_time: "2026-03-02T10:00:00Z",
      },
    ];
    confirmMock.mockResolvedValueOnce(false);

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

    expect(confirmMock).toHaveBeenCalledWith(expect.objectContaining({
      title: "检测到最近一次实验已完成",
      confirmText: "确认开始新实验",
      cancelText: "暂不开始",
      variant: "warning",
    }));
    expect(createNewExperiment).not.toHaveBeenCalled();
    expect(view.getByTestId("location-display").textContent).toBe("/introduction");
    expect(setIsSubmitting).toHaveBeenCalledWith(true);
    expect(setIsSubmitting).toHaveBeenLastCalledWith(false);
  });

  it("starts a new experiment after the completed-latest warning is confirmed", async () => {
    latestExperimentRuns = [
      {
        experiment_id: 89,
        status: "Completed",
        completion_time: "2026-03-02T10:00:00Z",
      },
    ];
    confirmMock.mockResolvedValueOnce(true);

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

    await waitFor(() => {
      expect(view!.getByTestId("location-display").textContent).toBe("/industry");
    });
    expect(confirmMock).toHaveBeenCalledTimes(1);
    expect(createNewExperiment).toHaveBeenCalledTimes(1);
  });

  it("shows the resume dialog and continues the existing experiment from the saved step", async () => {
    experimentValue = {
      ...experimentValue,
      state: {
        ...experimentValue.state,
        start_time: "2026-03-01T08:00:00Z",
        status: "In Progress",
        current_step: 6,
        highest_completed_step: 5,
        quiz_about_model_completed: false,
        quiz_about_plan_completed: false,
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

  it("continues a report-ready experiment through the plan quiz result checkpoint", async () => {
    experimentValue = {
      ...experimentValue,
      state: {
        ...experimentValue.state,
        start_time: "2026-03-01T08:00:00Z",
        status: "In Progress",
        current_step: 7,
        highest_completed_step: 7,
        quiz_about_model_completed: true,
        quiz_about_plan_completed: true,
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
    await act(async () => {
      fireEvent.click(view!.getByRole("button", { name: "继续未完成的实验" }));
    });

    await waitFor(() => {
      expect(view!.getByTestId("location-display").textContent).toBe("/quiz-plan");
    });
  });

  it("returns to the originating experiment route instead of opening the resume dialog", async () => {
    experimentValue = {
      ...experimentValue,
      state: {
        ...experimentValue.state,
        start_time: "2026-03-01T08:00:00Z",
        status: "In Progress",
        current_step: 4,
        highest_completed_step: 3,
        quiz_about_model_completed: false,
        quiz_about_plan_completed: false,
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

  it("stays on the introduction page and resets submitting state when createNewExperiment fails", async () => {
    createNewExperiment.mockRejectedValueOnce(new Error("network error"));

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

    expect(setIsSubmitting).toHaveBeenCalledWith(true);
    expect(createNewExperiment).toHaveBeenCalledTimes(1);
    expect(setIsSubmitting).toHaveBeenLastCalledWith(false);
    expect(view!.getByTestId("location-display").textContent).toBe("/introduction");
  });

  it("shows an empty manual state instead of logging an error when no active manual exists", async () => {
    const missingManualError = Object.assign(new Error("HTTP 404 Not Found - 未找到激活的手册"), {
      status: 404,
    });
    apiGet.mockRejectedValueOnce(missingManualError);

    view = await renderIntroduction("/introduction");

    await act(async () => {
      fireEvent.click(view!.getByRole("button", { name: "下一步" }));
    });
    await act(async () => {
      fireEvent.click(view!.getByRole("button", { name: "下一步" }));
    });

    expect(view.getByText("暂无实验手册")).toBeDefined();
    expect(
      view.getByText("当前还没有激活的实验手册。您仍可继续体验实验流程，若需要手册内容，请联系老师或管理员补充。"),
    ).toBeDefined();
    expect(view.container.querySelector("iframe")).toBeNull();
  });

  it("keeps showing the loading state before the manual request settles", async () => {
    const deferredManual = createDeferred<{ file_name: string; file_path: string }>();
    apiGet.mockImplementationOnce(() => deferredManual.promise);

    view = await renderIntroduction("/introduction");

    await act(async () => {
      fireEvent.click(view!.getByRole("button", { name: "下一步" }));
    });
    await act(async () => {
      fireEvent.click(view!.getByRole("button", { name: "下一步" }));
    });

    expect(view.getByTestId("manual-loading")).toBeDefined();
    expect(view.queryByText("暂无实验手册")).toBeNull();
    expect(view.queryByText("实验手册加载失败")).toBeNull();

    await act(async () => {
      deferredManual.resolve({
        file_name: "实验手册.pdf",
        file_path: "/manuals/current.pdf",
      });
      await deferredManual.promise;
    });
  });

  it("shows an error state when the manual request fails for non-404 reasons", async () => {
    const serverError = Object.assign(new Error("HTTP 500 Internal Server Error"), {
      status: 500,
    });
    apiGet.mockRejectedValueOnce(serverError);

    view = await renderIntroduction("/introduction");

    await act(async () => {
      fireEvent.click(view!.getByRole("button", { name: "下一步" }));
    });
    await act(async () => {
      fireEvent.click(view!.getByRole("button", { name: "下一步" }));
    });

    expect(view.getByText("实验手册加载失败")).toBeDefined();
    expect(
      view.getByText("当前无法加载实验手册。您仍可继续体验实验流程，建议稍后重试，或联系老师和管理员检查服务状态。"),
    ).toBeDefined();
    expect(view.queryByText("暂无实验手册")).toBeNull();
    expect(view.container.querySelector("iframe")).toBeNull();
  });
});
