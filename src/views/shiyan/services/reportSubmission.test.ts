/// <reference types="bun-types" />

import { resolve } from "path";
import { beforeEach, describe, expect, it, mock } from "bun:test";

mock.restore();

const apiClientModulePath = resolve(import.meta.dir, "../../../utils/apiClient.ts");

const apiGet = mock(async () => ({
  timeouts: {
    pdfQueueMs: 60000,
    pdfGenerationMs: 30000,
  },
}));
const apiPost = mock(async () => ({
  message: "提交成功",
  report_id: 9,
  pdf_path: "/uploads/reports/9.pdf",
}));

mock.module(apiClientModulePath, () => ({
  apiClient: {
    get: apiGet,
    post: apiPost,
  },
}));

let importVersion = 0;

const loadReportSubmission = async () => {
  importVersion += 1;
  return await import(`./reportSubmission.ts?report-submission-test=${importVersion}`);
};

const createApiError = (status: number, message: string) => {
  const error = new Error(`HTTP ${status} - ${message}`) as Error & {
    status?: number;
    payload?: unknown;
  };
  error.status = status;
  error.payload = { error: message };
  return error;
};

describe("reportSubmission", () => {
  beforeEach(() => {
    apiGet.mockReset();
    apiGet.mockResolvedValue({
      timeouts: {
        pdfQueueMs: 60000,
        pdfGenerationMs: 30000,
      },
    });
    apiPost.mockReset();
    apiPost.mockResolvedValue({
      message: "提交成功",
      report_id: 9,
      pdf_path: "/uploads/reports/9.pdf",
    });
  });

  it("submits the report content to the expected endpoint", async () => {
    const { submitExperimentReport } = await loadReportSubmission();

    const result = await submitExperimentReport(17, "# report");

    expect(apiGet).toHaveBeenCalledWith("/runtime-info");
    expect(apiPost).toHaveBeenCalledTimes(1);
    expect(apiPost).toHaveBeenCalledWith("/experiment-runs/17/report", {
      report_content: "# report",
    }, {
      timeoutMs: 120000,
    });
    expect(result).toEqual({
      message: "提交成功",
      report_id: 9,
      pdf_path: "/uploads/reports/9.pdf",
    });
  });

  it("derives the report timeout from backend PDF queue settings", async () => {
    const { submitExperimentReport } = await loadReportSubmission();
    apiGet.mockResolvedValueOnce({
      timeouts: {
        pdfQueueMs: 120000,
        pdfGenerationMs: 45000,
      },
    });

    await submitExperimentReport(17, "# report");

    expect(apiPost).toHaveBeenCalledWith("/experiment-runs/17/report", {
      report_content: "# report",
    }, {
      timeoutMs: 195000,
    });
  });

  it("maps 503 errors to a busy PDF generation message", async () => {
    const { submitExperimentReport } = await loadReportSubmission();

    apiPost.mockRejectedValueOnce(createApiError(503, "PDF 生成服务繁忙，排队等待超时"));

    await expect(submitExperimentReport(17, "# report")).rejects.toMatchObject({
      name: "ReportSubmissionError",
      status: 503,
      kind: "service_busy",
      message: expect.stringContaining("PDF 生成服务当前繁忙"),
    });
  });

  it("falls back to the backend detail for non-503 errors", async () => {
    const { submitExperimentReport } = await loadReportSubmission();

    apiPost.mockRejectedValueOnce(createApiError(400, "报告内容不能为空"));

    await expect(submitExperimentReport(17, "# report")).rejects.toMatchObject({
      name: "ReportSubmissionError",
      status: 400,
      kind: "unknown",
      message: "报告内容不能为空",
    });
  });
});
