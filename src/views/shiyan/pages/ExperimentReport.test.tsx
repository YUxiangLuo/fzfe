/// <reference lib="dom" />
/// <reference types="bun-types" />

import React from "react";
import { resolve } from "path";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { act, fireEvent, render, waitFor, type RenderResult } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

mock.restore();

const r = (p: string) => resolve(import.meta.dir, p);

const apiGet = mock(async (path: string): Promise<unknown> => {
  if (path === "/users/me") {
    return { username: "20240002", full_name: "测试学生" };
  }
  return [];
});
const submitExperimentReport = mock(async () => ({ report_id: 1 }));
const updateState = mock(async () => {});
const clearSession = mock(() => {});
const clearSessionAndRedirect = mock(() => {});
const redirectToLogin = mock(() => {});
const validateAnalyses = mock(() => true);

const experimentValue = {
  state: {
    experiment_id: 17,
    status: "In Progress",
    selected_industry: "E2E智能制造业",
    selected_company: "E2E样本企业A",
    selected_product: "智能传感器A型",
    selected_best_model: "ensemble_weighted",
    current_step: 8,
    highest_completed_step: 7,
  },
  productSalesData: [],
  updateState,
};

const makeAnalysisSection = (label: string, key: string) => {
  return function AnalysisSection({
    getAnalysisValue,
    getAnalysisSetter,
  }: {
    getAnalysisValue: (key: string) => string;
    getAnalysisSetter: (key: string) => React.Dispatch<React.SetStateAction<string>>;
  }) {
    return (
      <label>
        {label}
        <textarea
          aria-label={label}
          value={getAnalysisValue(key)}
          onChange={(event) => getAnalysisSetter(key)(event.currentTarget.value)}
        />
      </label>
    );
  };
};

mock.module(r("../../../utils/apiClient.ts"), () => ({
  apiClient: {
    get: apiGet,
  },
}));

mock.module(r("../../../utils/session.ts"), () => ({
  clearSession,
  clearSessionAndRedirect,
  redirectToLogin,
}));

mock.module(r("../contexts/ExperimentContext.zustand.tsx"), () => ({
  useExperiment: () => experimentValue,
}));

mock.module(r("../services/reportSubmission.ts"), () => ({
  submitExperimentReport,
}));

mock.module(r("../utils/reportValidation.ts"), () => ({
  validateAnalyses,
}));

mock.module(r("../utils/reportBuilder.ts"), () => ({
  buildReportViewModel: () => ({
    trainingData: [],
    evaluationData: [],
    allModels: [],
    bestModelMetrics: null,
    planSummary: null,
  }),
  buildExperimentReportMarkdown: () => "# 测试学生的实验报告",
}));

mock.module(r("./report_components/ExperimentOverview.tsx"), () => ({
  ExperimentOverview: makeAnalysisSection("数据分析", "data"),
}));

mock.module(r("./report_components/ModelComparison.tsx"), () => ({
  ModelComparison: makeAnalysisSection("模型对比分析", "comparison"),
}));

mock.module(r("./report_components/BestModelSelection.tsx"), () => ({
  BestModelSelection: makeAnalysisSection("模型选择分析", "selection"),
}));

mock.module(r("./report_components/PlanParameters.tsx"), () => ({
  PlanParameters: makeAnalysisSection("计划参数分析", "params"),
}));

mock.module(r("./report_components/PlanDecisionResults.tsx"), () => ({
  PlanDecisionResults: makeAnalysisSection("计划决策分析", "decision"),
}));

const renderExperimentReport = async () => {
  const { default: ExperimentReport } = await import("./ExperimentReport");
  let view!: RenderResult;
  await act(async () => {
    view = render(
      <MemoryRouter>
        <ExperimentReport />
      </MemoryRouter>,
    );
  });
  return view;
};

describe("ExperimentReport", () => {
  let view: RenderResult | null = null;

  beforeEach(() => {
    apiGet.mockClear();
    submitExperimentReport.mockClear();
    submitExperimentReport.mockResolvedValue({ report_id: 1 });
    updateState.mockClear();
    updateState.mockResolvedValue(undefined);
    clearSession.mockClear();
    clearSessionAndRedirect.mockClear();
    redirectToLogin.mockClear();
    validateAnalyses.mockClear();
    validateAnalyses.mockReturnValue(true);
  });

  afterEach(() => {
    if (view) {
      view.unmount();
      view = null;
    }
    mock.clearAllMocks();
  });

  it("clears a stale validation modal when a later preview and submit succeeds", async () => {
    validateAnalyses.mockReturnValueOnce(false).mockReturnValue(true);
    view = await renderExperimentReport();

    await act(async () => {
      fireEvent.click(view!.getByRole("button", { name: "预览报告" }));
    });
    expect(view.getByRole("heading", { name: "内容不完整" })).not.toBeNull();

    await act(async () => {
      fireEvent.click(view!.getByRole("button", { name: "预览报告" }));
    });

    await waitFor(() => {
      expect(view!.getByRole("heading", { name: "报告预览" })).not.toBeNull();
    });
    expect(view.queryByRole("heading", { name: "内容不完整" })).toBeNull();

    await act(async () => {
      fireEvent.click(view!.getByRole("button", { name: "确认无误，提交报告" }));
    });

    await waitFor(() => {
      expect(view!.getByRole("heading", { name: "恭喜！实验完成" })).not.toBeNull();
    });
    expect(view.queryByRole("heading", { name: "内容不完整" })).toBeNull();
    expect(submitExperimentReport).toHaveBeenCalledWith(17, "# 测试学生的实验报告");
  });
});
