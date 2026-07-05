/// <reference lib="dom" />
/// <reference types="bun-types" />

import { resolve } from "path";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { act, fireEvent, render, waitFor } from "@testing-library/react";
import type { RenderResult } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

mock.restore();

const r = (p: string) => resolve(import.meta.dir, p);

const apiGet = mock(async (): Promise<any> => ({ is_rejected: false, has_report: false }));
const createNewExperiment = mock(async () => {});
const setIsSubmitting = mock((_value: boolean) => {});
const useAuthObjectUrlMock = mock(() => "about:blank");
const consoleErrorMock = mock(() => {});

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
    useExperiment: () => ({
      createNewExperiment,
      setIsSubmitting,
    }),
  }),
);

const LocationDisplay = () => {
  const location = useLocation();
  return <div data-testid="location-display">{location.pathname}</div>;
};

const renderReportStatusCheck = async () => {
  const { default: ReportStatusCheck } = await import("./ReportStatusCheck");
  let view!: RenderResult;

  await act(async () => {
    view = render(
      <MemoryRouter initialEntries={["/status-check"]}>
        <Routes>
          <Route
            path="/status-check"
            element={
              <>
                <ReportStatusCheck />
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

describe("ReportStatusCheck", () => {
  let view: RenderResult | null = null;
  let originalConsoleError: typeof console.error;

  beforeEach(() => {
    apiGet.mockReset();
    apiGet.mockResolvedValue({ is_rejected: false, has_report: false });
    createNewExperiment.mockReset();
    createNewExperiment.mockResolvedValue(undefined);
    setIsSubmitting.mockReset();
    useAuthObjectUrlMock.mockReset();
    useAuthObjectUrlMock.mockReturnValue("about:blank");
    consoleErrorMock.mockReset();
    originalConsoleError = console.error;
    console.error = consoleErrorMock;
  });

  afterEach(async () => {
    console.error = originalConsoleError;
    if (view) {
      view.unmount();
      view = null;
    }
    mock.clearAllMocks();
  });

  it("redirects to the introduction page when no latest report exists", async () => {
    view = await renderReportStatusCheck();

    await waitFor(() => {
      expect(view!.getByTestId("location-display").textContent).toBe("/introduction");
    });
  });

  it("renders submitted report status and keeps the introduction entry available", async () => {
    apiGet.mockResolvedValueOnce({
      is_rejected: false,
      has_report: true,
      experiment: {
        experiment_id: 123,
        status: "Completed",
        current_step: 8,
        start_time: "2026-03-01T08:00:00Z",
        last_activity_at: "2026-03-01T10:00:00Z",
        completion_time: "2026-03-01T11:00:00Z",
      },
      report: {
        report_id: 9,
        experiment_id: 123,
        student_id: 8,
        report_content: "content",
        pdf_file_path: "/reports/123.pdf",
        status: "submitted",
        submitted_at: "2026-03-01T11:30:00Z",
        grade: null,
        feedback: null,
        graded_by: null,
      },
    });

    view = await renderReportStatusCheck();

    expect(view.getByText("您的实验报告已提交")).toBeDefined();
    expect(view.getByText("待评分")).toBeDefined();
    expect(view.getByText("暂未评分，请等待教师或助教完成评阅。")).toBeDefined();
    expect(createNewExperiment).not.toHaveBeenCalled();

    const downloadLink = view.getByRole("link", { name: "下载 PDF" });
    expect(downloadLink.getAttribute("href")).toBe("about:blank");

    await act(async () => {
      fireEvent.click(view!.getByRole("button", { name: "进入实验首页" }));
    });

    await waitFor(() => {
      expect(view!.getByTestId("location-display").textContent).toBe("/introduction");
    });
    expect(createNewExperiment).not.toHaveBeenCalled();
  });

  it("renders graded report score and feedback without creating a new experiment", async () => {
    apiGet.mockResolvedValueOnce({
      is_rejected: false,
      has_report: true,
      experiment: {
        experiment_id: 123,
        status: "Completed",
        current_step: 8,
        start_time: "2026-03-01T08:00:00Z",
        last_activity_at: "2026-03-01T10:00:00Z",
        completion_time: "2026-03-01T11:00:00Z",
      },
      report: {
        report_id: 9,
        experiment_id: 123,
        student_id: 8,
        report_content: "content",
        pdf_file_path: "/reports/123.pdf",
        status: "graded",
        submitted_at: "2026-03-01T11:30:00Z",
        grade: 92.5,
        feedback: "报告结构完整，误差分析充分。",
        graded_by: 5,
      },
    });

    view = await renderReportStatusCheck();

    expect(view.getByText("您的实验报告已评分")).toBeDefined();
    expect(view.getByText("已评分")).toBeDefined();
    expect(view.getByText("92.5")).toBeDefined();
    expect(view.getByText("报告结构完整，误差分析充分。")).toBeDefined();
    expect(createNewExperiment).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(view!.getByRole("button", { name: "进入实验首页" }));
    });

    await waitFor(() => {
      expect(view!.getByTestId("location-display").textContent).toBe("/introduction");
    });
    expect(createNewExperiment).not.toHaveBeenCalled();
  });

  it("shows only the safe fallback message when loading the status fails", async () => {
    apiGet.mockRejectedValueOnce(new Error("token=secret&detail=backend exploded"));

    view = await renderReportStatusCheck();

    expect(view.getByText("无法获取报告状态，请稍后重试。")).toBeDefined();
    expect(view.queryByText("backend exploded")).toBeNull();
    expect(consoleErrorMock).toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(view!.getByRole("button", { name: "直接进入实验首页" }));
    });

    await waitFor(() => {
      expect(view!.getByTestId("location-display").textContent).toBe("/introduction");
    });
  });

  it("renders rejected report details and restarts the experiment", async () => {
    apiGet.mockResolvedValueOnce({
      is_rejected: true,
      experiment: {
        experiment_id: 123,
        status: "Completed",
        current_step: 8,
        start_time: "2026-03-01T08:00:00Z",
        last_activity_at: "2026-03-01T10:00:00Z",
        completion_time: "2026-03-01T11:00:00Z",
      },
      report: {
        report_id: 9,
        experiment_id: 123,
        student_id: 8,
        report_content: "content",
        pdf_file_path: "/reports/123.pdf",
        status: "rejected",
        submitted_at: "2026-03-01T11:30:00Z",
        grade: null,
        feedback: "请补充评估依据",
        graded_by: 5,
      },
    });

    let resolveRestart!: () => void;
    createNewExperiment.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveRestart = resolve;
        }),
    );

    view = await renderReportStatusCheck();

    expect(view.getByText("您的上一份实验报告已被驳回")).toBeDefined();
    expect(view.getByText("请补充评估依据")).toBeDefined();
    expect(view.getByText("123")).toBeDefined();

    const downloadLink = view.getByRole("link", { name: "下载 PDF" });
    expect(downloadLink.getAttribute("href")).toBe("about:blank");

    const restartButton = view.getByRole("button", { name: /重新进行实验/ });
    expect(restartButton).toBeDefined();

    await act(async () => {
      fireEvent.click(restartButton);
    });

    expect(setIsSubmitting).toHaveBeenCalledWith(true);
    expect(createNewExperiment).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveRestart();
    });

    await waitFor(() => {
      expect(view!.getByTestId("location-display").textContent).toBe("/industry");
    });
    expect(setIsSubmitting).toHaveBeenLastCalledWith(false);
  });
});
