/// <reference lib="dom" />
/// <reference types="bun-types" />

import { resolve } from "path";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { act, render, waitFor, type RenderResult } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

mock.restore();

const r = (p: string) => resolve(import.meta.dir, p);

const apiGet = mock(async (_endpoint: string): Promise<unknown> => []);
const apiPost = mock(async (_endpoint: string, _body?: unknown): Promise<unknown> => []);
const updateState = mock(async () => {});

let experimentValue = {
  state: {
    experiment_id: 990001,
    quiz_about_model_completed: true,
    quiz_about_plan_completed: false,
  },
  updateState,
};

mock.module(r("../../../utils/apiClient.ts"), () => ({
  apiClient: {
    get: apiGet,
    post: apiPost,
  },
}));

mock.module(r("../contexts/ExperimentContext.zustand.tsx"), () => ({
  useExperiment: () => experimentValue,
}));

const renderModelQuizPage = async () => {
  const { QuizPage } = await import("./QuizPage");
  return render(
    <MemoryRouter initialEntries={["/quiz"]}>
      <QuizPage
        kind="model"
        title="预测模型知识测验"
        description="请完成测验。"
        accent="blue"
        questionsEndpoint="/quizzes/model/questions"
        submitButtonLabel="提交答案，查看答题结果"
        continueButtonLabel="进入生产计划"
        continuePath="/production"
        completedPatch={{ quiz_about_model_completed: true }}
      />
    </MemoryRouter>,
  );
};

describe("QuizPage", () => {
  beforeEach(() => {
    apiGet.mockReset();
    apiPost.mockReset();
    updateState.mockReset();
    experimentValue = {
      state: {
        experiment_id: 990001,
        quiz_about_model_completed: true,
        quiz_about_plan_completed: false,
      },
      updateState,
    };
  });

  it("does not fall back to fresh questions when restoring completed quiz results fails", async () => {
    apiGet.mockImplementation(async (endpoint: string) => {
      if (endpoint.startsWith("/quizzes/model/results")) {
        throw new Error("HTTP 500 - forced failure");
      }
      if (endpoint === "/quizzes/model/questions") {
        return [
          {
            question_id: 1,
            knowledge_point: "预测模型",
            question_type: "Single Choice",
            question_text: "不应重新出题",
            options: { A: "A" },
          },
        ];
      }
      return [];
    });

    let view!: RenderResult;
    await act(async () => {
      view = await renderModelQuizPage();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(view.getByRole("heading", { name: "加载失败" })).not.toBeNull();
    });
    expect(view.getByText("HTTP 500 - forced failure")).not.toBeNull();
    expect(apiGet).toHaveBeenCalledTimes(1);
    expect(apiGet).not.toHaveBeenCalledWith("/quizzes/model/questions");
  });

  it("shows a completed checkpoint instead of fresh questions when no submitted details exist", async () => {
    apiGet.mockResolvedValue([]);

    let view!: RenderResult;
    await act(async () => {
      view = await renderModelQuizPage();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(view.getByRole("heading", { name: "答题结果" })).not.toBeNull();
    });
    expect(view.getByText(/暂无可展示的历史答题明细/)).not.toBeNull();
    expect(view.getByRole("button", { name: /进入生产计划/ })).not.toBeNull();
    expect(apiGet).toHaveBeenCalledTimes(1);
    expect(apiGet).not.toHaveBeenCalledWith("/quizzes/model/questions");
  });

  it("shows answer explanations only for incorrect submitted answers", async () => {
    apiGet.mockResolvedValue([
      {
        question_id: 101,
        quiz_type: "quiz_about_model",
        knowledge_point: "预测模型-ARIMA模型",
        question_type: "Single Choice",
        question_text: "ARIMA 中 d 表示什么？",
        options: { A: "差分阶数", B: "移动平均阶数" },
        submitted_answer: ["B"],
        correct_answers: ["A"],
        answer_explanation: "d 表示差分阶数，用于使时间序列平稳。",
        is_correct: false,
      },
      {
        question_id: 102,
        quiz_type: "quiz_about_model",
        knowledge_point: "预测模型-评估指标",
        question_type: "Single Choice",
        question_text: "RMSE 越小表示什么？",
        options: { A: "误差更小", B: "误差更大" },
        submitted_answer: ["A"],
        correct_answers: ["A"],
        answer_explanation: "正确题不需要展示解析。",
        is_correct: true,
      },
    ]);

    let view!: RenderResult;
    await act(async () => {
      view = await renderModelQuizPage();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(view.getByRole("heading", { name: "答题结果" })).not.toBeNull();
    });
    expect(view.getByText("答案解析")).not.toBeNull();
    expect(view.getByText("d 表示差分阶数，用于使时间序列平稳。")).not.toBeNull();
    expect(view.queryByText("正确题不需要展示解析。")).toBeNull();
  });
});
