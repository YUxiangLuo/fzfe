import { expect, test, type Page } from "@playwright/test";
import {
  completeBaseModelIntroAndSelectTwo,
  completeEnsembleIntroAndSelect,
  completeEvaluationAndModelQuiz,
  completeExponentialSmoothing,
  completeIndustryCompanyProductAndDataWindow,
  completeIntroductionAndStartExperiment,
  completeMovingAverage,
  completeProductionAndPlanQuiz,
  completeWeightedEnsemble,
  enterEvaluation,
  expectHashPath,
  loginAsStudent,
} from "./helpers";

type MockExperimentState = Record<string, unknown>;

const OLD_EXPERIMENT_ID = 990001;
const NEW_EXPERIMENT_ID = 990002;
const STUDENT_ID = 20240002;

const buildQuestion = (questionId: number, title: string) => ({
  question_id: questionId,
  knowledge_point: title,
  question_type: "Single Choice" as const,
  question_text: title,
  options: {
    A: "选项A",
    B: "选项B",
  },
});

async function mockRestartedExperimentFlow(page: Page) {
  let currentState: MockExperimentState = {
    experiment_id: OLD_EXPERIMENT_ID,
    student_id: STUDENT_ID,
    status: "Completed",
    highest_completed_step: 8,
    current_step: 8,
    selected_industry: "E2E智能制造业",
    selected_company: "E2E样本企业A",
    selected_product: "智能传感器A型",
    quiz_about_model_completed: true,
    quiz_about_plan_completed: true,
    production_plan_completed: true,
    start_time: "2026-02-10T09:00:00.000Z",
    last_activity_at: "2026-02-10T11:00:00.000Z",
    completion_time: "2026-02-10T11:00:00.000Z",
  };

  await page.route("**/api/v1/my-latest-report-status", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        is_rejected: true,
        experiment: {
          experiment_id: OLD_EXPERIMENT_ID,
          status: "Completed",
          current_step: 8,
          start_time: "2026-02-10T09:00:00.000Z",
          last_activity_at: "2026-02-10T11:00:00.000Z",
          completion_time: "2026-02-10T11:00:00.000Z",
        },
        report: {
          report_id: 880001,
          experiment_id: OLD_EXPERIMENT_ID,
          student_id: STUDENT_ID,
          report_content: "<h1>旧报告</h1>",
          pdf_file_path: null,
          status: "rejected",
          submitted_at: "2026-02-10T11:10:00.000Z",
          grade: null,
          feedback: "请重新完成实验并重新提交。",
          graded_by: 101,
        },
      }),
    });
  });

  await page.route("**/api/v1/students/me/experiment-runs/active", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(currentState),
    });
  });

  await page.route("**/api/v1/students/me/experiment-runs", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }

    currentState = {
      experiment_id: NEW_EXPERIMENT_ID,
      student_id: STUDENT_ID,
      status: "In Progress",
      highest_completed_step: 0,
      current_step: 1,
      selected_industry: null,
      selected_company: null,
      selected_product: null,
      quiz_about_model_completed: false,
      quiz_about_plan_completed: false,
      production_plan_completed: false,
      start_time: "2026-02-11T09:00:00.000Z",
      last_activity_at: "2026-02-11T09:00:00.000Z",
      completion_time: null,
    };

    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify(currentState),
    });
  });

  await page.route(/\/api\/v1\/experiment-runs\/\d+$/, async (route) => {
    if (route.request().method() !== "PUT") {
      await route.continue();
      return;
    }

    const payload = route.request().postDataJSON() as Record<string, unknown>;
    currentState = {
      ...currentState,
      ...payload,
      experiment_id: NEW_EXPERIMENT_ID,
      student_id: STUDENT_ID,
      last_activity_at: "2026-02-11T09:30:00.000Z",
    };

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(currentState),
    });
  });

  await page.route(/\/api\/v1\/experiment-runs\/\d+\/events$/, async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }

    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ message: "ok", event_id: 1 }),
    });
  });
}

test("@shiyan 实验隔离：重开实验后训练与预测请求都必须使用新的 experiment_id", async ({
  page,
}) => {
  test.setTimeout(15 * 60 * 1000);

  const trainingExperimentIds: number[] = [];
  const predictionExperimentIds: number[] = [];
  const quizExperimentIds: number[] = [];

  await mockRestartedExperimentFlow(page);

  await page.route("**/api/v1/quizzes/model/questions", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([buildQuestion(1, "模型测验题")]),
    });
  });

  await page.route("**/api/v1/quizzes/plan/questions", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([buildQuestion(2, "计划测验题")]),
    });
  });

  await page.route("**/api/v1/quizzes/answers", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }

    const payload = route.request().postDataJSON() as { experiment_id?: number };
    quizExperimentIds.push(payload.experiment_id ?? -1);

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    });
  });

  await page.route("**/api/v1/models/ma/training", async (route) => {
    const payload = route.request().postDataJSON() as { experiment_id?: number };
    trainingExperimentIds.push(payload.experiment_id ?? -1);

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        results: {
          metrics: { rmse: 12.3, mae: 9.1, r2: 0.82 },
          eval_y_true: [100, 110, 120, 130, 140, 150, 160, 170],
          eval_predictions: [101, 109, 121, 129, 141, 149, 159, 171],
        },
      }),
    });
  });

  await page.route("**/api/v1/models/es/training", async (route) => {
    const payload = route.request().postDataJSON() as { experiment_id?: number };
    trainingExperimentIds.push(payload.experiment_id ?? -1);

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        results: {
          metrics: { rmse: 13.5, mae: 10.4, r2: 0.79 },
          eval_y_true: [100, 110, 120, 130, 140, 150, 160, 170],
          eval_predictions: [99, 111, 118, 132, 138, 152, 158, 169],
        },
      }),
    });
  });

  await page.route("**/api/v1/models/weighted_avg/training", async (route) => {
    const payload = route.request().postDataJSON() as { experiment_id?: number };
    trainingExperimentIds.push(payload.experiment_id ?? -1);

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        results: {
          metrics: { rmse: 11.1, mae: 8.4, r2: 0.86 },
          eval_y_true: [100, 110, 120, 130, 140, 150, 160, 170],
          eval_predictions: [100, 111, 119, 131, 140, 151, 161, 169],
          weights: [0.55, 0.45],
          model_names: ["ma", "es"],
        },
      }),
    });
  });

  await page.route("**/api/v1/models/ma/predict", async (route) => {
    const payload = route.request().postDataJSON() as { experiment_id?: number };
    predictionExperimentIds.push(payload.experiment_id ?? -1);

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "success",
        results: {
          predictions: [
            { prediction: 100, std_dev: 12 },
            { prediction: 104, std_dev: 11 },
            { prediction: 108, std_dev: 10 },
            { prediction: 112, std_dev: 9 },
            { prediction: 116, std_dev: 8 },
            { prediction: 120, std_dev: 7 },
          ],
        },
      }),
    });
  });

  await loginAsStudent(page);

  await expect(page.getByText("您的上一份实验报告已被驳回")).toBeVisible();
  await page.getByRole("button", { name: "重新进行实验" }).click();
  await expectHashPath(page, "/industry");

  await completeIndustryCompanyProductAndDataWindow(page);
  await completeBaseModelIntroAndSelectTwo(page);
  await completeMovingAverage(page);
  await completeExponentialSmoothing(page);
  await completeEnsembleIntroAndSelect(page, "加权平均融合");
  await completeWeightedEnsemble(page);
  await enterEvaluation(page);
  await completeEvaluationAndModelQuiz(page, "移动平均法");
  await completeProductionAndPlanQuiz(page);

  expect(trainingExperimentIds.length).toBeGreaterThanOrEqual(2);
  expect(trainingExperimentIds.every((id) => id === NEW_EXPERIMENT_ID)).toBe(true);
  expect(trainingExperimentIds.includes(OLD_EXPERIMENT_ID)).toBe(false);

  expect(predictionExperimentIds.length).toBeGreaterThanOrEqual(1);
  expect(predictionExperimentIds.every((id) => id === NEW_EXPERIMENT_ID)).toBe(true);
  expect(predictionExperimentIds.includes(OLD_EXPERIMENT_ID)).toBe(false);

  expect(quizExperimentIds).toEqual([NEW_EXPERIMENT_ID, NEW_EXPERIMENT_ID]);
});