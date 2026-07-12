import type { Locator, Page } from "@playwright/test";
import { test, expect } from "../shiyan/fixtures";
import { seedManagedExperimentFixture } from "../shiyan/support/model-training";
import {
  ACCOUNTS,
  CLASSES,
  CommonSelectors,
  QuestionBankSelectors,
  SuccessMessages,
  clearMultiSelectByLabel,
  closeModalWithCloseButton,
  confirmQuestionDelete,
  expectSuccessMessage,
  fillFormField,
  getAuthedJson,
  getVisibleModal,
  loginAsTeacherAccount,
  openQuestionBankPage,
  openQuestionEditModal,
  openQuestionPreviewModal,
  requestSessionToken,
  tableRowByText,
  unwrapDataEnvelope,
} from "../helpers";

const BACKEND_PORT = process.env.E2E_BACKEND_PORT ?? "54126";
const BACKEND_ORIGIN =
  process.env.E2E_BACKEND_ORIGIN ?? `http://127.0.0.1:${BACKEND_PORT}`;
const QUIZ_STUDENT_USERNAME = process.env.E2E_STUDENT_USERNAME ?? "20240002";

interface QuestionBankRecord {
  question_id: number;
  knowledge_point: string | null;
  question_type: "Single Choice" | "Multiple Choice" | "True/False";
  question_text: string;
  options?: Record<string, string> | string[] | null;
  correct_answers: string[];
  answer_explanation?: string | null;
}

interface QuizQuestion {
  question_id: number;
  knowledge_point: string;
  question_type: "Single Choice" | "Multiple Choice" | "True/False";
  question_text: string;
  options: Record<string, string> | string[];
  correct_answers?: never;
}

interface QuizAnswerResult {
  question_id: number;
  is_correct: boolean;
  correct_answers: string[];
  submitted_answer: string[];
  question_text: string;
}

interface GradeSummaryRow {
  username: string;
  knowledge_test: number | null;
  experiment_id: number | null;
  report_status?: string | null;
}

interface AnswerPlan {
  chosenValues: string[];
  expectedCorrect: boolean;
  source: QuestionBankRecord;
}

function arraysEqual(left: string[], right: string[]) {
  return JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
}

function getQuestionOptionValues(question: QuestionBankRecord): string[] {
  if (!question.options) return [];
  return Array.isArray(question.options) ? question.options : Object.keys(question.options);
}

function buildAnswerPlans(
  displayedQuestions: QuestionBankRecord[],
): AnswerPlan[] {
  return displayedQuestions.map((source, index) => {
    const correctAnswers = source.correct_answers;
    const optionValues = getQuestionOptionValues(source);
    const wrongCandidates = optionValues.filter((value) => !correctAnswers.includes(value));
    const chosenValues = index % 2 === 0 || wrongCandidates.length === 0
      ? [...correctAnswers]
      : [wrongCandidates[0]!];

    return {
      chosenValues,
      expectedCorrect: arraysEqual(chosenValues, correctAnswers),
      source,
    };
  });
}

function getRenderedOptionLabel(question: QuestionBankRecord, value: string): string {
  if (Array.isArray(question.options)) {
    return value;
  }
  return `${value}. ${question.options?.[value]}`;
}

async function loadTeacherQuestionBank(page: Page) {
  const teacherToken = await requestSessionToken(page, BACKEND_ORIGIN, {
    username: ACCOUNTS.teacher.username,
    password: ACCOUNTS.teacher.password,
  });
  const questions = await getAuthedJson<QuestionBankRecord[]>(
    page,
    BACKEND_ORIGIN,
    "/api/v1/question-bank/questions",
    teacherToken,
  );

  return {
    teacherToken,
    questionBankById: new Map(questions.map((question) => [question.question_id, question])),
    questionBankByText: new Map(questions.map((question) => [question.question_text, question])),
  };
}

async function getTeacherGradeSummaries(page: Page, teacherToken: string) {
  return getAuthedJson<GradeSummaryRow[]>(
    page,
    BACKEND_ORIGIN,
    `/api/v1/classes/${CLASSES.teacher.id}/grade-summaries`,
    teacherToken,
  );
}

async function getQuizQuestionsViaApi(
  page: Page,
  token: string,
  kind: "model" | "plan",
) {
  const response = await page.request.get(`${BACKEND_ORIGIN}/api/v1/quizzes/${kind}/questions`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  expect(response.ok()).toBeTruthy();
  return unwrapDataEnvelope<QuizQuestion[]>(await response.json());
}

async function submitQuizAnswersViaApi(
  page: Page,
  token: string,
  body: {
    experiment_id: number;
    answers: Array<{ question_id: number; submitted_answer: string[] }>;
  },
) {
  const response = await page.request.post(`${BACKEND_ORIGIN}/api/v1/quizzes/answers`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    data: body,
  });
  return {
    response,
    payload: unwrapDataEnvelope<QuizAnswerResult[]>(await response.json()),
  };
}

async function openCreateQuestionModal(page: Page) {
  await page.getByRole("button", { name: "新增题目" }).click();
  return getVisibleModal(page, "新增题目");
}

async function fillTagSelectOptions(
  page: Page,
  modal: Locator,
  label: string,
  optionTexts: string[],
) {
  const combobox = modal.getByRole("combobox", { name: label }).first();
  await expect(combobox).toBeVisible();
  for (const optionText of optionTexts) {
    await combobox.click();
    await combobox.fill(optionText);
    await combobox.press("Enter");
  }
  await page.keyboard.press("Escape");
}

async function selectQuestionFormOption(
  page: Page,
  modal: Locator,
  label: string,
  optionText: string,
) {
  const formItem = modal.locator(CommonSelectors.formItem).filter({ hasText: label }).first();
  await expect(formItem).toBeVisible();

  await formItem.locator(".ant-select").first().click();

  const dropdown = page.locator(".ant-select-dropdown").last();
  await expect(dropdown).toBeVisible();

  const option = dropdown.locator(".ant-select-item-option").filter({ hasText: optionText }).first();
  await option.evaluate((element) => {
    element.scrollIntoView({ block: "center" });
  });
  await option.click();
  await page.keyboard.press("Escape");
}

async function selectQuestionFormMultiOptions(
  page: Page,
  modal: Locator,
  label: string,
  optionTexts: string[],
) {
  for (const optionText of optionTexts) {
    await selectQuestionFormOption(page, modal, label, optionText);
  }
}

async function answerQuizQuestion(page: Page, plan: AnswerPlan, index: number) {
  const questionCard = page.locator("div.border-b.border-gray-200.pb-6").nth(index);
  await expect(questionCard).toBeVisible();
  await expect(questionCard).toContainText(plan.source.question_text);

  for (const chosenValue of plan.chosenValues) {
    const optionLabel = getRenderedOptionLabel(plan.source, chosenValue);
    await questionCard.locator("label").filter({ hasText: optionLabel }).first().click();
  }
}

async function getRenderedQuestionTexts(page: Page) {
  const texts = await page
    .locator("div.border-b.border-gray-200.pb-6 p.font-semibold.text-gray-800")
    .allTextContents();

  return texts.map((text) => text.replace(/^\s*\d+\.\s*/, "").trim()).filter(Boolean);
}

async function searchQuestion(page: Page, text: string) {
  const searchInput = page.getByPlaceholder(QuestionBankSelectors.searchInput.placeholder).first();
  await searchInput.fill(text);
  return searchInput;
}

test.describe("@quiz 题库与测验", () => {
  test("教师端题库 CRUD 走通 UI 与接口契约", async ({ page }) => {
    await loginAsTeacherAccount(page);
    await openQuestionBankPage(page);

    const { teacherToken } = await loadTeacherQuestionBank(page);
    const createdQuestionText = `E2E测验题-${Date.now()}`;
    const updatedQuestionText = `${createdQuestionText}-更新`;
    const createdExplanation = "E2E 创建解析：选项甲和选项丙共同满足题意。";
    const updatedExplanation = "E2E 更新解析：选项乙和选项丙共同满足题意。";
    const optionTexts = ["选项甲", "选项乙", "选项丙"];

    const createModal = await openCreateQuestionModal(page);
    await fillFormField(createModal, "题目内容", createdQuestionText);
    await selectQuestionFormOption(page, createModal, "题目类型", "多选题");
    await selectQuestionFormOption(page, createModal, "一级知识点", "预测模型");
    await selectQuestionFormOption(page, createModal, "二级知识点", "ARIMA模型");
    await fillFormField(createModal, "答案解析（选填）", createdExplanation);
    await fillTagSelectOptions(page, createModal, "选项", optionTexts);
    await selectQuestionFormMultiOptions(page, createModal, "正确答案", [optionTexts[0]!, optionTexts[2]!]);
    await createModal.getByRole("button", { name: /保\s*存/ }).click();

    await expectSuccessMessage(page, SuccessMessages.questionCreated);

    await searchQuestion(page, createdQuestionText);
    const createdRow = tableRowByText(page, createdQuestionText);
    await expect(createdRow).toBeVisible();
    await expect(createdRow).toContainText("A. 选项甲, C. 选项丙");

    const createdQuestions = await getAuthedJson<QuestionBankRecord[]>(
      page,
      BACKEND_ORIGIN,
      "/api/v1/question-bank/questions",
      teacherToken,
    );
    const createdQuestion = createdQuestions.find((question) => question.question_text === createdQuestionText);
    expect(createdQuestion).toBeDefined();
    expect(createdQuestion?.question_type).toBe("Multiple Choice");
    expect(createdQuestion?.knowledge_point).toBe("预测模型-ARIMA模型");
    expect(createdQuestion?.correct_answers).toEqual(["A", "C"]);
    expect(createdQuestion?.answer_explanation).toBe(createdExplanation);

    const editModal = await openQuestionEditModal(createdRow);
    await fillFormField(editModal, "题目内容", updatedQuestionText);
    await fillFormField(editModal, "答案解析（选填）", updatedExplanation);
    await clearMultiSelectByLabel(editModal, "正确答案");
    await selectQuestionFormMultiOptions(page, editModal, "正确答案", [optionTexts[1]!, optionTexts[2]!]);
    await editModal.getByRole("button", { name: /保\s*存/ }).click();

    await expectSuccessMessage(page, SuccessMessages.questionUpdated);

    await searchQuestion(page, updatedQuestionText);
    const updatedRow = tableRowByText(page, updatedQuestionText);
    await expect(updatedRow).toBeVisible();
    await expect(updatedRow).toContainText("B. 选项乙, C. 选项丙");

    const previewModal = await openQuestionPreviewModal(updatedRow);
    await expect(previewModal.getByText(updatedQuestionText)).toBeVisible();
    await expect(previewModal.getByText("A. 选项甲")).toBeVisible();
    await expect(previewModal.getByText("正确答案：B. 选项乙, C. 选项丙")).toBeVisible();
    await expect(previewModal.getByText("答案解析")).toBeVisible();
    await expect(previewModal.getByText(updatedExplanation)).toBeVisible();
    await closeModalWithCloseButton(previewModal);

    const updatedQuestions = await getAuthedJson<QuestionBankRecord[]>(
      page,
      BACKEND_ORIGIN,
      "/api/v1/question-bank/questions",
      teacherToken,
    );
    const updatedQuestion = updatedQuestions.find((question) => question.question_id === createdQuestion?.question_id);
    expect(updatedQuestion).toBeDefined();
    expect(updatedQuestion?.question_text).toBe(updatedQuestionText);
    expect(updatedQuestion?.correct_answers).toEqual(["B", "C"]);
    expect(updatedQuestion?.answer_explanation).toBe(updatedExplanation);

    await confirmQuestionDelete(updatedRow);
    await expectSuccessMessage(page, SuccessMessages.questionDeleted);

    const remainingQuestions = await getAuthedJson<QuestionBankRecord[]>(
      page,
      BACKEND_ORIGIN,
      "/api/v1/question-bank/questions",
      teacherToken,
    );
    expect(remainingQuestions.some((question) => question.question_id === createdQuestion?.question_id)).toBe(false);
  });

  test("学生端可获取模型测验题目并提交后完成判分", async ({
    page,
    studentApi,
    studentApp,
  }) => {
    await studentApi.cleanupInProgressExperiments();
    const createdExperiment = await studentApi.createExperiment();
    const experiment = await studentApi.updateExperiment(createdExperiment.experiment_id, {
      current_step: 7,
      highest_completed_step: 7,
    });

    try {
      const { teacherToken, questionBankByText } = await loadTeacherQuestionBank(page);
      const questionsResponsePromise = page.waitForResponse(
        (response) =>
          response.request().method() === "GET" &&
          response.url().includes("/api/v1/quizzes/model/questions"),
      );

      await studentApp.open("/quiz");
      await expect(page.getByRole("heading", { name: "预测模型知识测验" })).toBeVisible();

      const questionsResponse = await questionsResponsePromise;
      expect(questionsResponse.ok()).toBeTruthy();
      const questions = unwrapDataEnvelope<QuizQuestion[]>(await questionsResponse.json());
      expect(questions).toHaveLength(4);
      for (const question of questions) {
        expect(question.knowledge_point).toContain("模型");
        expect("correct_answers" in question).toBe(false);
      }

      const renderedQuestionTexts = await getRenderedQuestionTexts(page);
      expect(renderedQuestionTexts).toHaveLength(questions.length);
      const displayedQuestions = renderedQuestionTexts.map((questionText) => {
        const source = questionBankByText.get(questionText);
        expect(source).toBeDefined();
        return source!;
      });

      const answerPlans = buildAnswerPlans(displayedQuestions);
      const expectedCorrectCount = answerPlans.filter((plan) => plan.expectedCorrect).length;
      const expectedScore = Number(((expectedCorrectCount / answerPlans.length) * 100).toFixed(2));

      for (const [index, plan] of answerPlans.entries()) {
        await answerQuizQuestion(page, plan, index);
      }

      const submitResponsePromise = page.waitForResponse(
        (response) =>
          response.request().method() === "POST" &&
          response.url().includes("/api/v1/quizzes/answers"),
      );
      await page.getByRole("button", { name: "提交答案，查看答题结果" }).click();

      const submitResponse = await submitResponsePromise;
      expect(submitResponse.status()).toBe(201);
      const results = unwrapDataEnvelope<QuizAnswerResult[]>(await submitResponse.json());
      expect(results).toHaveLength(answerPlans.length);

      const resultsById = new Map(results.map((result) => [result.question_id, result]));
      for (const plan of answerPlans) {
        const result = resultsById.get(plan.source.question_id);
        expect(result).toBeDefined();
        expect(result?.is_correct).toBe(plan.expectedCorrect);
        expect(result?.correct_answers).toEqual(plan.source.correct_answers);
        expect(result?.submitted_answer).toEqual(plan.chosenValues);
      }

      await expect(page.getByRole("heading", { name: "答题结果" })).toBeVisible();
      await expect.poll(() => new URL(page.url()).hash).toBe("#/quiz");
      await expect(page.getByRole("button", { name: "重新作答" })).toHaveCount(0);

      const restoredResultsResponsePromise = page.waitForResponse(
        (response) =>
          response.request().method() === "GET" &&
          response.url().includes("/api/v1/quizzes/model/results"),
      );
      await page.reload();
      const restoredResultsResponse = await restoredResultsResponsePromise;
      expect(restoredResultsResponse.ok()).toBeTruthy();
      const restoredResults = unwrapDataEnvelope<QuizAnswerResult[]>(
        await restoredResultsResponse.json(),
      );
      expect(restoredResults).toHaveLength(answerPlans.length);
      await expect(page.getByRole("heading", { name: "答题结果" })).toBeVisible();
      await expect(page.getByText(results[0]!.question_text)).toBeVisible();
      await expect(page.getByRole("button", { name: "重新作答" })).toHaveCount(0);
      await expect.poll(() => new URL(page.url()).hash).toBe("#/quiz");

      await page.getByRole("button", { name: "进入生产计划" }).click();
      await expect.poll(() => new URL(page.url()).hash).toMatch(/^#\/production/);

      const activeExperiment = await studentApi.getActiveExperiment();
      expect(activeExperiment?.experiment_id).toBe(experiment.experiment_id);
      expect(activeExperiment?.quiz_about_model_completed).toBe(true);
      expect(activeExperiment?.quiz_about_plan_completed).toBe(false);

      const gradeSummaries = await getTeacherGradeSummaries(page, teacherToken);
      const studentSummary = gradeSummaries.find((row) => row.username === QUIZ_STUDENT_USERNAME);
      expect(studentSummary).toBeDefined();
      expect(studentSummary?.experiment_id).toBe(experiment.experiment_id);
      expect(studentSummary?.knowledge_test).toBe(expectedScore);
    } finally {
      await studentApi.deleteExperiment(experiment.experiment_id).catch(() => undefined);
    }
  });

  test("学生端未答完模型测验时不会发起提交请求", async ({
    page,
    studentApi,
    studentApp,
  }) => {
    await studentApi.cleanupInProgressExperiments();
    const createdExperiment = await studentApi.createExperiment();
    const experiment = await studentApi.updateExperiment(createdExperiment.experiment_id, {
      current_step: 7,
      highest_completed_step: 7,
    });

    try {
      await studentApp.open("/quiz");
      await expect(page.getByRole("heading", { name: "预测模型知识测验" })).toBeVisible();

      const sawSubmitRequest = page
        .waitForRequest(
          (request) =>
            request.method() === "POST" && request.url().includes("/api/v1/quizzes/answers"),
          { timeout: 1_000 },
        )
        .then(() => true)
        .catch(() => false);

      await page.getByRole("button", { name: "提交答案，查看答题结果" }).click();
      await expect(page.getByText(/请完成所有题目后再提交/)).toBeVisible();
      expect(await sawSubmitRequest).toBe(false);

      const activeExperiment = await studentApi.getActiveExperiment();
      expect(activeExperiment?.experiment_id).toBe(experiment.experiment_id);
      expect(activeExperiment?.quiz_about_model_completed).toBe(false);
    } finally {
      await studentApi.deleteExperiment(experiment.experiment_id).catch(() => undefined);
    }
  });

  test("同一实验重复提交模型测验时会重算 knowledge_test 分数", async ({
    page,
    studentApi,
  }) => {
    await studentApi.cleanupInProgressExperiments();
    const createdExperiment = await studentApi.createExperiment();
    const experiment = await studentApi.updateExperiment(createdExperiment.experiment_id, {
      current_step: 7,
      highest_completed_step: 7,
    });

    try {
      const { teacherToken, questionBankById } = await loadTeacherQuestionBank(page);
      const quizQuestions = await getQuizQuestionsViaApi(page, studentApi.token, "model");
      expect(quizQuestions).toHaveLength(4);

      const wrongAnswers = quizQuestions.map((question) => {
        const source = questionBankById.get(question.question_id);
        expect(source).toBeDefined();

        const optionValues = getQuestionOptionValues(source!);
        const wrongChoice = optionValues.find((value) => !source!.correct_answers.includes(value));
        expect(wrongChoice).toBeDefined();

        return {
          question_id: question.question_id,
          submitted_answer: [wrongChoice!],
        };
      });

      const firstSubmission = await submitQuizAnswersViaApi(page, studentApi.token, {
        experiment_id: experiment.experiment_id,
        answers: wrongAnswers,
      });
      expect(firstSubmission.response.status()).toBe(201);
      expect(firstSubmission.payload.every((result) => result.is_correct === false)).toBe(true);

      let gradeSummaries = await getTeacherGradeSummaries(page, teacherToken);
      let studentSummary = gradeSummaries.find((row) => row.username === QUIZ_STUDENT_USERNAME);
      expect(studentSummary?.knowledge_test).toBe(0);

      const correctAnswers = quizQuestions.map((question) => {
        const source = questionBankById.get(question.question_id);
        expect(source).toBeDefined();
        return {
          question_id: question.question_id,
          submitted_answer: [...source!.correct_answers],
        };
      });

      const secondSubmission = await submitQuizAnswersViaApi(page, studentApi.token, {
        experiment_id: experiment.experiment_id,
        answers: correctAnswers,
      });
      expect(secondSubmission.response.status()).toBe(201);
      expect(secondSubmission.payload.every((result) => result.is_correct === true)).toBe(true);

      gradeSummaries = await getTeacherGradeSummaries(page, teacherToken);
      studentSummary = gradeSummaries.find((row) => row.username === QUIZ_STUDENT_USERNAME);
      expect(studentSummary?.experiment_id).toBe(experiment.experiment_id);
      expect(studentSummary?.knowledge_test).toBe(100);
    } finally {
      await studentApi.deleteExperiment(experiment.experiment_id).catch(() => undefined);
    }
  });

  test("学生端可获取生产计划测验题目并提交后更新判分", async ({
    page,
    studentApi,
    studentApp,
  }) => {
    await studentApi.cleanupInProgressExperiments();
    const createdExperiment = await studentApi.createExperiment();
    const experiment = await studentApi.updateExperiment(createdExperiment.experiment_id, {
      current_step: 7,
      highest_completed_step: 7,
    });
    seedManagedExperimentFixture(experiment.experiment_id, {
      quiz_about_model_completed: true,
    });

    try {
      const { teacherToken, questionBankByText } = await loadTeacherQuestionBank(page);
      const questionsResponsePromise = page.waitForResponse(
        (response) =>
          response.request().method() === "GET" &&
          response.url().includes("/api/v1/quizzes/plan/questions"),
      );

      await studentApp.open("/quiz-plan");
      await expect(page.getByRole("heading", { name: "生产计划知识测验" })).toBeVisible();

      const questionsResponse = await questionsResponsePromise;
      expect(questionsResponse.ok()).toBeTruthy();
      const questions = unwrapDataEnvelope<QuizQuestion[]>(await questionsResponse.json());
      expect(questions).toHaveLength(4);
      for (const question of questions) {
        expect(question.knowledge_point).toContain("生产计划");
        expect("correct_answers" in question).toBe(false);
      }

      const renderedQuestionTexts = await getRenderedQuestionTexts(page);
      expect(renderedQuestionTexts).toHaveLength(questions.length);
      const displayedQuestions = renderedQuestionTexts.map((questionText) => {
        const source = questionBankByText.get(questionText);
        expect(source).toBeDefined();
        return source!;
      });

      const answerPlans = buildAnswerPlans(displayedQuestions);
      const expectedCorrectCount = answerPlans.filter((plan) => plan.expectedCorrect).length;
      const expectedScore = Number(((expectedCorrectCount / answerPlans.length) * 100).toFixed(2));

      for (const [index, plan] of answerPlans.entries()) {
        await answerQuizQuestion(page, plan, index);
      }

      const submitResponsePromise = page.waitForResponse(
        (response) =>
          response.request().method() === "POST" &&
          response.url().includes("/api/v1/quizzes/answers"),
      );
      await page.getByRole("button", { name: "提交答案，查看答题结果" }).click();

      const submitResponse = await submitResponsePromise;
      expect(submitResponse.status()).toBe(201);
      const results = unwrapDataEnvelope<QuizAnswerResult[]>(await submitResponse.json());
      expect(results).toHaveLength(answerPlans.length);

      const resultsById = new Map(results.map((result) => [result.question_id, result]));
      for (const plan of answerPlans) {
        const result = resultsById.get(plan.source.question_id);
        expect(result).toBeDefined();
        expect(result?.is_correct).toBe(plan.expectedCorrect);
        expect(result?.correct_answers).toEqual(plan.source.correct_answers);
        expect(result?.submitted_answer).toEqual(plan.chosenValues);
      }

      await expect(page.getByRole("heading", { name: "答题结果" })).toBeVisible();
      await expect.poll(() => new URL(page.url()).hash).toBe("#/quiz-plan");
      await page.getByRole("button", { name: "进入实验报告" }).click();
      await expect.poll(() => new URL(page.url()).hash).toBe("#/report");

      const activeExperiment = await studentApi.getActiveExperiment();
      expect(activeExperiment?.experiment_id).toBe(experiment.experiment_id);
      expect(activeExperiment?.quiz_about_model_completed).toBe(true);
      expect(activeExperiment?.quiz_about_plan_completed).toBe(true);

      const gradeSummaries = await getTeacherGradeSummaries(page, teacherToken);
      const studentSummary = gradeSummaries.find((row) => row.username === QUIZ_STUDENT_USERNAME);
      expect(studentSummary).toBeDefined();
      expect(studentSummary?.experiment_id).toBe(experiment.experiment_id);
      expect(studentSummary?.knowledge_test).toBe(expectedScore);
    } finally {
      await studentApi.deleteExperiment(experiment.experiment_id).catch(() => undefined);
    }
  });
});
