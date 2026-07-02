import { expect, test, type Browser, type Locator, type Page } from "@playwright/test";
import {
  CommonSelectors,
  GradeOverviewSelectors,
  ExperimentProgressSelectors,
  ExperimentReportSelectors,
  computeClassGradeStats,
  expandGradeOverviewRowDetail,
  expectSuccessMessage,
  fillReportRejectReason,
  fillReportReviewForm,
  getAuthedJson,
  getCurrentUserProfile,
  getGradeOverviewClassCard,
  loginAs,
  openExperimentProgressPage,
  openExperimentReportsPage,
  openGradeOverviewClassDetail,
  openGradeOverviewPage,
  openReportReviewModal,
  selectTopFilterOption,
  type GradeSummaryRow,
} from "../helpers";
import { createStudentApiClient, loginStudentViaApi } from "../shiyan/support/backend";
import { completeWeightedFlowToReportStage } from "../shiyan/support/slow-flow";
import { StudentApp } from "../shiyan/support/student-app";
import {
  completeBaseModelIntroAndSelectTwo,
  completeEnsembleIntroAndSelect,
  completeEvaluationAndModelQuiz,
  completeExponentialSmoothing,
  completeIndustryCompanyProductAndDataWindow,
  completeMovingAverage,
  completeProductionAndPlanQuiz,
  completeReportAndLogout,
  completeWeightedEnsemble,
  enterEvaluation,
} from "../shiyan/support/ui-flow";

const BACKEND_PORT = process.env.E2E_BACKEND_PORT ?? "54106";
const BACKEND_ORIGIN =
  process.env.E2E_BACKEND_ORIGIN ?? `http://127.0.0.1:${BACKEND_PORT}`;
const FRONTEND_PORT = process.env.E2E_FRONTEND_PORT ?? "55106";
const FRONTEND_ORIGIN =
  process.env.E2E_FRONTEND_ORIGIN ?? `http://127.0.0.1:${FRONTEND_PORT}`;

const CLASS_NAMES = {
  highPerforming: "E2E教师多班级-高分班",
  mixedState: "E2E教师多班级-混合班",
  linkedFlow: "E2E教师多班级-联动班",
} as const;

const LIVE_STUDENT = {
  username: process.env.E2E_STUDENT_USERNAME ?? "20247001",
  password: process.env.E2E_STUDENT_PASSWORD ?? "StudentMulti!234",
  fullName: "联动班学生甲",
} as const;

const TEACHER_ACCOUNT = {
  username: process.env.E2E_TEACHER_USERNAME ?? "teacher_multiclass",
  password: process.env.E2E_TEACHER_PASSWORD ?? "TeacherMulti!234",
} as const;

const ASSISTANT_ACCOUNT = {
  username: process.env.E2E_ASSISTANT_USERNAME ?? "assistant_multiclass",
  password: process.env.E2E_ASSISTANT_PASSWORD ?? "AssistantMulti!234",
} as const;

interface TeacherClassSummary {
  class_id: number;
  class_name: string;
  total_students: number;
  graded_count: number;
  submitted_count: number;
  rejected_count: number;
  not_submitted_count: number;
  average_score: number | null;
}

interface ExperimentReportRow {
  user_id: number;
  username: string;
  full_name: string;
  report_id: number | null;
  status: "submitted" | "graded" | "rejected" | null;
  grade: number | null;
}

interface ExperimentStepSummary {
  step_order: number;
  started_at: string | null;
  completed_at: string | null;
}

interface ExperimentProgressRow {
  student_id: number;
  username: string;
  full_name: string;
  status: "Completed" | "In Progress" | null;
  steps: ExperimentStepSummary[];
}

async function loginAsTeacher(page: Page) {
  await loginAs(page, {
    username: TEACHER_ACCOUNT.username,
    password: TEACHER_ACCOUNT.password,
    role: "teacher",
  });
}

async function loginAsAssistant(page: Page) {
  await loginAs(page, {
    username: ASSISTANT_ACCOUNT.username,
    password: ASSISTANT_ACCOUNT.password,
    role: "assistant",
  });
}

async function getManagedClassesByName(page: Page) {
  const currentUser = await getCurrentUserProfile(page, BACKEND_ORIGIN);
  const classes = await getAuthedJson<Array<{ class_id: number; class_name: string }>>(
    page,
    BACKEND_ORIGIN,
    `/api/v1/teachers/${currentUser.user_id}/classes`,
  );

  return new Map(classes.map((item) => [item.class_name, item.class_id] as const));
}

async function getTeacherGradeSummaries(page: Page) {
  const currentUser = await getCurrentUserProfile(page, BACKEND_ORIGIN);
  return getAuthedJson<TeacherClassSummary[]>(
    page,
    BACKEND_ORIGIN,
    `/api/v1/teachers/${currentUser.user_id}/grade-summaries`,
  );
}

async function getClassGradeRows(page: Page, classId: number) {
  return getAuthedJson<GradeSummaryRow[]>(
    page,
    BACKEND_ORIGIN,
    `/api/v1/classes/${classId}/grade-summaries`,
  );
}

async function getClassReports(page: Page, classId: number) {
  return getAuthedJson<ExperimentReportRow[]>(
    page,
    BACKEND_ORIGIN,
    `/api/v1/classes/${classId}/reports`,
  );
}

async function getClassProgress(page: Page, classId: number) {
  return getAuthedJson<ExperimentProgressRow[]>(
    page,
    BACKEND_ORIGIN,
    `/api/v1/classes/${classId}/experiment-events`,
  );
}

function computeReportStats(rows: ExperimentReportRow[]) {
  const submitted = rows.filter((row) =>
    row.status === "submitted" || row.status === "graded" || row.status === "rejected",
  ).length;
  const pendingReview = rows.filter((row) => row.status === "submitted").length;
  const reviewed = rows.filter((row) => row.status === "graded").length;
  const rejected = rows.filter((row) => row.status === "rejected").length;
  const gradedRows = rows.filter(
    (row): row is ExperimentReportRow & { grade: number } =>
      row.status === "graded" && row.grade !== null,
  );
  const averageGrade = gradedRows.length
    ? Number(
        (
          gradedRows.reduce((sum, row) => sum + row.grade, 0) / gradedRows.length
        ).toFixed(1),
      )
    : null;

  return {
    total: rows.length,
    submitted,
    pendingReview,
    reviewed,
    rejected,
    averageGrade,
  };
}

function computeProgressStats(rows: ExperimentProgressRow[]) {
  const total = rows.length;
  const completed = rows.filter((row) => row.status === "Completed").length;
  const inProgress = rows.filter((row) => row.status === "In Progress").length;
  const notStarted = total - completed - inProgress;
  const averageCompletion = total
    ? Math.round(
        rows.reduce((sum, row) => {
          const completedSteps = (row.steps ?? []).filter((step) => step.completed_at).length;
          return sum + Math.round((completedSteps / 7) * 100);
        }, 0) / total,
      )
    : 0;

  return { total, completed, inProgress, notStarted, averageCompletion };
}

async function getStatisticNumber(page: Page, title: string) {
  const stat = page
    .locator(CommonSelectors.statistic)
    .filter({ has: page.locator(CommonSelectors.statisticTitle, { hasText: title }) })
    .first();
  await expect(stat).toBeVisible();
  const rawValue = await stat.locator(CommonSelectors.statisticValue).first().innerText();
  return Number(rawValue.replace(/,/g, "").trim());
}

async function expectStatisticNumber(page: Page, title: string, expected: number) {
  await expect
    .poll(() => getStatisticNumber(page, title), { timeout: 20_000 })
    .toBe(expected);
}

function getChartWrapper(page: Page, index: number) {
  return page.locator(".recharts-wrapper").nth(index);
}

async function hoverLocatorCenter(page: Page, locator: Locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(
    box!.x + box!.width / 2,
    box!.y + box!.height / 2,
  );
}

async function hoverPoint(page: Page, box: NonNullable<Awaited<ReturnType<Locator["boundingBox"]>>>) {
  await page.mouse.move(
    box.x + box.width / 2,
    box.y + box.height / 2,
  );
}

async function readChartTooltipText(page: Page, tooltipIndex: number) {
  return (
    (await page
      .locator(".recharts-tooltip-wrapper")
      .nth(tooltipIndex)
      .textContent()) ?? ""
  )
    .replace(/\s+/g, " ")
    .trim();
}

async function collectUniqueTooltipTexts(
  page: Page,
  chartWrapperIndex: number,
  itemLocator: Locator,
) {
  const values = new Set<string>();
  const count = await itemLocator.count();

  for (let index = 0; index < count; index += 1) {
    const item = itemLocator.nth(index);
    const box = await item.boundingBox();
    if (!box || box.width === 0 || box.height === 0) {
      continue;
    }

    await page.mouse.move(5, 5);
    await page.waitForTimeout(50);
    await hoverPoint(page, box);
    await page.waitForTimeout(150);
    let tooltipText = await readChartTooltipText(page, chartWrapperIndex);
    if (!tooltipText) {
      await page.mouse.move(5, 5);
      await page.waitForTimeout(50);
      await hoverPoint(page, box);
      await page.waitForTimeout(200);
      tooltipText = await readChartTooltipText(page, chartWrapperIndex);
    }
    if (tooltipText) {
      values.add(tooltipText);
    }
  }

  return [...values];
}

function computeHistogramNonEmptyBinCount(rows: GradeSummaryRow[]) {
  const bins = Array.from({ length: 10 }, () => 0);
  for (const row of rows) {
    if (row.report_status !== "graded" || row.final_score === null) {
      continue;
    }
    const index = Math.min(Math.floor(Number(row.final_score) / 10), 9);
    bins[index] += 1;
  }
  return bins.filter((count) => count > 0).length;
}

async function expectSearchResultRow(page: Page, text: string) {
  const row = page.locator(CommonSelectors.tableRow).filter({ hasText: text }).first();
  await expect(row).toBeVisible();
  return row;
}

async function chooseClass(page: Page, className: string) {
  await selectTopFilterOption(page, className);
}

async function searchStudents(page: Page, placeholder: string, query: string) {
  const input = page.getByPlaceholder(placeholder);
  await input.fill(query);
}

async function expectClassCardMatchesSummary(page: Page, summary: TeacherClassSummary) {
  const card = getGradeOverviewClassCard(page, summary.class_name);
  const submittedTotal =
    summary.graded_count + summary.submitted_count + summary.rejected_count;
  const expectedAverage =
    summary.average_score === null ? "—" : summary.average_score.toFixed(1);

  await expect(card).toBeVisible();
  await expect(card).toContainText(expectedAverage);
  await expect(card).toContainText(`总人数: ${summary.total_students}`);
  await expect(card).toContainText(`提交报告: ${submittedTotal}`);
  if (summary.rejected_count > 0) {
    await expect(card).toContainText(`含 ${summary.rejected_count} 份已驳回`);
  }
}

function buildAverageScoreTooltip(summary: TeacherClassSummary) {
  const roundedAverage = summary.average_score === null
    ? null
    : Number(summary.average_score.toFixed(1)).toFixed(2);
  return `${summary.class_name}平均分 : ${roundedAverage} 分`
    .replace(/\s+/g, " ")
    .trim();
}

function buildCompletionTooltip(summary: TeacherClassSummary) {
  return `${summary.class_name}已评分 : ${summary.graded_count} 人已驳回 : ${summary.rejected_count} 人待评分 : ${summary.submitted_count} 人未提交 : ${summary.not_submitted_count} 人`
    .replace(/\s+/g, " ")
    .trim();
}

async function runLinkedStudentFullFlow(browser: Browser) {
  const studentToken = await loginStudentViaApi(
    LIVE_STUDENT.username,
    LIVE_STUDENT.password,
  );
  const studentApi = createStudentApiClient(studentToken);
  await studentApi.cleanupInProgressExperiments();

  const studentContext = await browser.newContext({
    baseURL: FRONTEND_ORIGIN,
    viewport: { width: 1280, height: 800 },
  });
  const studentPage = await studentContext.newPage();
  const studentApp = new StudentApp(studentPage, studentToken);

  try {
    await studentApp.open("/introduction");
    await completeWeightedFlowToReportStage(studentPage);
    await completeReportAndLogout(studentPage);
  } finally {
    await studentContext.close();
  }
}

async function runRejectedStudentResubmissionFlow(
  browser: Browser,
  username: string,
  password: string,
  fullName: string,
) {
  const studentToken = await loginStudentViaApi(
    username,
    password,
  );
  const studentApi = createStudentApiClient(studentToken);
  const latestReportStatus = await studentApi.getLatestReportStatus();
  expect(latestReportStatus.is_rejected).toBe(true);

  const studentContext = await browser.newContext({
    baseURL: FRONTEND_ORIGIN,
    viewport: { width: 1280, height: 800 },
  });
  const studentPage = await studentContext.newPage();
  const studentApp = new StudentApp(studentPage, studentToken);

  try {
    await studentApp.open("/");
    await expect(
      studentPage.getByText("您的上一份实验报告已被驳回"),
    ).toBeVisible();
    await expect(studentPage.getByText(fullName)).toHaveCount(0);
    await studentPage.getByRole("button", { name: "重新进行实验" }).click();
    await studentApp.expectHash("/industry");

    await completeIndustryCompanyProductAndDataWindow(studentPage);
    await completeBaseModelIntroAndSelectTwo(studentPage);
    await completeMovingAverage(studentPage);
    await completeExponentialSmoothing(studentPage);
    await completeEnsembleIntroAndSelect(studentPage, "加权平均融合");
    await completeWeightedEnsemble(studentPage);
    await enterEvaluation(studentPage);
    await completeEvaluationAndModelQuiz(studentPage, "加权平均融合模型");
    await completeProductionAndPlanQuiz(studentPage);
    await completeReportAndLogout(studentPage);
  } finally {
    await studentContext.close();
  }
}

test.describe.serial("@teacher 多班级表格统计与学生联动", () => {
  test("成绩总览支持多班级卡片、明细表格和图表", async ({ page }) => {
    await loginAsTeacher(page);

    const managedClasses = await getManagedClassesByName(page);
    const teacherSummaries = await getTeacherGradeSummaries(page);

    expect(Array.from(managedClasses.keys())).toEqual(
      Object.values(CLASS_NAMES),
    );
    expect(teacherSummaries).toHaveLength(3);

    await openGradeOverviewPage(page);

    for (const summary of teacherSummaries) {
      await expectClassCardMatchesSummary(page, summary);
    }

    const highPerformingClassId = managedClasses.get(CLASS_NAMES.highPerforming);
    expect(highPerformingClassId).toBeDefined();

    const highPerformingRows = await getClassGradeRows(page, highPerformingClassId!);
    const highPerformingStats = computeClassGradeStats(highPerformingRows);

    await openGradeOverviewClassDetail(page, CLASS_NAMES.highPerforming);
    await expectStatisticNumber(page, GradeOverviewSelectors.totalStudentsStat, highPerformingStats.total);
    await expectStatisticNumber(page, GradeOverviewSelectors.gradedCountStat, highPerformingStats.graded);
    await expectStatisticNumber(page, GradeOverviewSelectors.averageScoreStat, highPerformingStats.avg);
    await expectStatisticNumber(page, GradeOverviewSelectors.maxScoreStat, highPerformingStats.max);
    await expectStatisticNumber(page, GradeOverviewSelectors.minScoreStat, highPerformingStats.min);

    await expect(page.getByText("总分排序趋势")).toBeVisible();
    await expect(page.getByText("总分区间分布")).toBeVisible();
    await expect(page.getByText("评分维度平均分")).toBeVisible();

    await searchStudents(page, GradeOverviewSelectors.searchInput.placeholder, "20247002");
    const gradedRow = await expectSearchResultRow(page, "20247002");
    await expandGradeOverviewRowDetail(gradedRow);
    await expect(page.getByText("实验流程", { exact: false }).first()).toBeVisible();
  });

  test("全部班级视图中的图表与提交率文本和汇总数据一致", async ({ page }) => {
    await loginAsTeacher(page);

    const teacherSummaries = await getTeacherGradeSummaries(page);
    await openGradeOverviewPage(page);

    const averageChartTexts = await getChartWrapper(page, 0)
      .locator("svg text")
      .allTextContents();
    for (const summary of teacherSummaries) {
      await expect(
        averageChartTexts.some((text) => text.includes(summary.class_name)),
      ).toBeTruthy();
    }

    await expect(page.getByText("已评分", { exact: true })).toBeVisible();
    await expect(page.getByText("待评分", { exact: true })).toBeVisible();
    await expect(page.getByText("已驳回", { exact: true })).toBeVisible();
    await expect(page.getByText("未提交", { exact: true })).toBeVisible();

    for (const summary of teacherSummaries) {
      const submittedTotal =
        summary.graded_count + summary.submitted_count + summary.rejected_count;
      const submissionRate = summary.total_students
        ? ((submittedTotal / summary.total_students) * 100).toFixed(1)
        : "0.0";

      const submissionRow = page
        .locator("div")
        .filter({ hasText: summary.class_name })
        .filter({ hasText: `${submittedTotal}/${summary.total_students}` })
        .first();
      await expect(submissionRow).toContainText(`${submissionRate}%`);
      await expect(submissionRow).toContainText(
        `${submittedTotal}/${summary.total_students}`,
      );
    }
  });

  test("单班级成绩表格、趋势图点位和分布图非空分箱与后端数据一致", async ({
    page,
  }) => {
    await loginAsTeacher(page);

    const managedClasses = await getManagedClassesByName(page);
    const highPerformingClassId = managedClasses.get(CLASS_NAMES.highPerforming);
    expect(highPerformingClassId).toBeDefined();

    const gradeRows = await getClassGradeRows(page, highPerformingClassId!);
    const expectedTrendScores = [...gradeRows]
      .filter(
        (row): row is GradeSummaryRow & { final_score: number } =>
          row.report_status === "graded" && row.final_score !== null,
      )
      .map((row) => Number(row.final_score))
      .sort((left, right) => right - left);
    const expectedHistogramBinCount = computeHistogramNonEmptyBinCount(gradeRows);

    await openGradeOverviewPage(page);
    await openGradeOverviewClassDetail(page, CLASS_NAMES.highPerforming);

    const knownRows = [
      { username: "20247002", fullName: "高分班学生甲", statusText: "已评分" },
      { username: "20247005", fullName: "高分班学生丁", statusText: "待评分" },
    ] as const;

    for (const expected of knownRows) {
      const apiRow = gradeRows.find((row) => row.username === expected.username);
      expect(apiRow).toBeDefined();

      const row = await expectSearchResultRow(page, expected.username);
      await expect(row).toContainText(expected.fullName);
      await expect(row).toContainText(expected.statusText);
      if (apiRow?.final_score !== null && apiRow?.final_score !== undefined) {
        await expect(row).toContainText(apiRow.final_score.toFixed(1));
      }
    }

    const renderedTrendTooltips: string[] = [];
    const trendDots = getChartWrapper(page, 0).locator(".recharts-line .recharts-dot");
    const trendCount = await trendDots.count();
    expect(trendCount).toBe(expectedTrendScores.length);

    for (let index = 0; index < trendCount; index += 1) {
      await hoverLocatorCenter(page, trendDots.nth(index));
      await page.waitForTimeout(150);
      renderedTrendTooltips.push(await readChartTooltipText(page, 0));
    }

    expect(renderedTrendTooltips).toEqual(
      expectedTrendScores.map(
        (score, index) => `排名 ${index + 1}总分 : ${score.toFixed(2)}`.replace(/\s+/g, " ").trim(),
      ),
    );

    const histogramBars = getChartWrapper(page, 1).locator(".recharts-bar-rectangle");
    let nonEmptyHistogramBars = 0;
    for (let index = 0; index < (await histogramBars.count()); index += 1) {
      const box = await histogramBars.nth(index).boundingBox();
      if (box && box.width > 0 && box.height > 0) {
        nonEmptyHistogramBars += 1;
      }
    }
    expect(nonEmptyHistogramBars).toBe(expectedHistogramBinCount);
  });

  test("实验报告和实验进度支持跨班级切换与表格校验", async ({ page }) => {
    await loginAsTeacher(page);

    const managedClasses = await getManagedClassesByName(page);
    const mixedClassId = managedClasses.get(CLASS_NAMES.mixedState);
    const linkedClassId = managedClasses.get(CLASS_NAMES.linkedFlow);

    expect(mixedClassId).toBeDefined();
    expect(linkedClassId).toBeDefined();

    await openExperimentProgressPage(page);
    await chooseClass(page, CLASS_NAMES.mixedState);

    const mixedProgress = await getClassProgress(page, mixedClassId!);
    const mixedProgressStats = computeProgressStats(mixedProgress);

    await expectStatisticNumber(page, ExperimentProgressSelectors.totalStudentsStat, mixedProgressStats.total);
    await expectStatisticNumber(page, ExperimentProgressSelectors.completedStat, mixedProgressStats.completed);
    await expectStatisticNumber(page, ExperimentProgressSelectors.inProgressStat, mixedProgressStats.inProgress);
    await expectStatisticNumber(page, ExperimentProgressSelectors.notStartedStat, mixedProgressStats.notStarted);
    await expectStatisticNumber(page, ExperimentProgressSelectors.avgCompletionStat, mixedProgressStats.averageCompletion);

    await searchStudents(page, ExperimentProgressSelectors.searchInput.placeholder, "20247010");
    const inProgressRow = await expectSearchResultRow(page, "20247010");
    await inProgressRow.locator(".ant-table-row-expand-icon").first().click();
    await expect(inProgressRow).toContainText("进行中");
    await expect(inProgressRow).toContainText("4/7 步");
    await expect(page.getByText(ExperimentProgressSelectors.stepCompletionText)).toBeVisible();
    await expect(page.getByText(ExperimentProgressSelectors.timelineText)).toBeVisible();

    await searchStudents(page, ExperimentProgressSelectors.searchInput.placeholder, "20247011");
    const notStartedRow = await expectSearchResultRow(page, "20247011");
    await expect(notStartedRow).toContainText("未开始");
    await expect(notStartedRow).toContainText("0/7 步");

    await openExperimentReportsPage(page);
    await chooseClass(page, CLASS_NAMES.linkedFlow);

    const linkedReports = await getClassReports(page, linkedClassId!);
    const linkedReportStats = computeReportStats(linkedReports);

    await expectStatisticNumber(page, "学生总数", linkedReportStats.total);
    await expectStatisticNumber(page, "提交报告", linkedReportStats.submitted);
    await expectStatisticNumber(page, "待评分", linkedReportStats.pendingReview);
    if (linkedReportStats.averageGrade !== null) {
      await expectStatisticNumber(page, "报告平均得分", linkedReportStats.averageGrade);
    }

    await searchStudents(page, ExperimentReportSelectors.searchInput.placeholder, "20247013");
    const pendingRow = await expectSearchResultRow(page, "20247013");
    await expect(pendingRow).toContainText("联动班学生丙");
    await expect(pendingRow).toContainText(ExperimentReportSelectors.statusSubmitted);

    await chooseClass(page, CLASS_NAMES.mixedState);
    await searchStudents(page, ExperimentReportSelectors.searchInput.placeholder, "20247009");
    const rejectedRow = await expectSearchResultRow(page, "20247009");
    await expect(rejectedRow).toContainText("混合班学生丙");
    await expect(rejectedRow).toContainText(ExperimentReportSelectors.statusRejected);
    await expect(rejectedRow).toContainText("报告缺少关键图表，请补充后重提。");
  });

  test("教师完成评阅后报告统计、成绩总览和单班级表格同步更新", async ({
    page,
  }) => {
    await loginAsTeacher(page);

    const managedClasses = await getManagedClassesByName(page);
    const highPerformingClassId = managedClasses.get(CLASS_NAMES.highPerforming);
    expect(highPerformingClassId).toBeDefined();

    const beforeReports = computeReportStats(
      await getClassReports(page, highPerformingClassId!),
    );
    const beforeSummary = (await getTeacherGradeSummaries(page)).find(
      (summary) => summary.class_name === CLASS_NAMES.highPerforming,
    );
    expect(beforeSummary).toBeDefined();

    await openExperimentReportsPage(page);
    await chooseClass(page, CLASS_NAMES.highPerforming);
    await expectStatisticNumber(page, "学生总数", beforeReports.total);
    await expectStatisticNumber(page, "提交报告", beforeReports.submitted);
    await expectStatisticNumber(page, "待评分", beforeReports.pendingReview);
    if (beforeReports.averageGrade !== null) {
      await expectStatisticNumber(page, "报告平均得分", beforeReports.averageGrade);
    }

    await searchStudents(page, ExperimentReportSelectors.searchInput.placeholder, "20247005");
    const pendingRow = await expectSearchResultRow(page, "20247005");
    await expect(pendingRow).toContainText("高分班学生丁");
    await expect(pendingRow).toContainText(ExperimentReportSelectors.statusSubmitted);

    const reviewModal = await openReportReviewModal(pendingRow);
    await fillReportReviewForm(reviewModal, {
      reportScore: "90",
      modelScore: "87",
      feedback: "E2E 教师多班级评阅通过。",
    });
    await reviewModal
      .getByRole(ExperimentReportSelectors.saveReviewBtn.role, {
        name: ExperimentReportSelectors.saveReviewBtn.name,
      })
      .click();
    await expectSuccessMessage(page, "评阅结果保存成功");

    const afterReports = computeReportStats(
      await getClassReports(page, highPerformingClassId!),
    );
    expect(afterReports.pendingReview).toBe(beforeReports.pendingReview - 1);
    expect(afterReports.reviewed).toBe(beforeReports.reviewed + 1);
    expect(afterReports.submitted).toBe(beforeReports.submitted);
    expect(afterReports.averageGrade).not.toBeNull();

    const afterSummary = (await getTeacherGradeSummaries(page)).find(
      (summary) => summary.class_name === CLASS_NAMES.highPerforming,
    );
    expect(afterSummary).toBeDefined();
    expect(afterSummary!.graded_count).toBe(beforeSummary!.graded_count + 1);
    expect(afterSummary!.submitted_count).toBe(beforeSummary!.submitted_count - 1);
    expect(afterSummary!.rejected_count).toBe(beforeSummary!.rejected_count);

    const afterGradeRows = await getClassGradeRows(page, highPerformingClassId!);
    const reviewedGradeRow = afterGradeRows.find((row) => row.username === "20247005");
    expect(reviewedGradeRow).toBeDefined();
    expect(reviewedGradeRow!.report_status).toBe("graded");
    expect(reviewedGradeRow!.final_score).not.toBeNull();

    await expectStatisticNumber(page, "提交报告", afterReports.submitted);
    await expectStatisticNumber(page, "待评分", afterReports.pendingReview);
    if (afterReports.averageGrade !== null) {
      await expectStatisticNumber(page, "报告平均得分", afterReports.averageGrade);
    }
    const reviewedReportRow = await expectSearchResultRow(page, "20247005");
    await expect(reviewedReportRow).toContainText(ExperimentReportSelectors.statusGraded);

    await openGradeOverviewPage(page);
    await expectClassCardMatchesSummary(page, afterSummary!);

    const afterGradeStats = computeClassGradeStats(afterGradeRows);
    await openGradeOverviewClassDetail(page, CLASS_NAMES.highPerforming);
    await expectStatisticNumber(page, GradeOverviewSelectors.totalStudentsStat, afterGradeStats.total);
    await expectStatisticNumber(page, GradeOverviewSelectors.gradedCountStat, afterGradeStats.graded);
    await expectStatisticNumber(page, GradeOverviewSelectors.averageScoreStat, afterGradeStats.avg);

    await searchStudents(page, GradeOverviewSelectors.searchInput.placeholder, "20247005");
    const reviewedGradeOverviewRow = await expectSearchResultRow(page, "20247005");
    await expect(reviewedGradeOverviewRow).toContainText("高分班学生丁");
    await expect(reviewedGradeOverviewRow).toContainText("已评分");
    await expect(reviewedGradeOverviewRow).toContainText(
      reviewedGradeRow!.final_score!.toFixed(1),
    );
  });

  test("教师驳回报告后报告统计、成绩总览和单班级表格同步更新", async ({
    page,
  }) => {
    await loginAsTeacher(page);

    const managedClasses = await getManagedClassesByName(page);
    const linkedClassId = managedClasses.get(CLASS_NAMES.linkedFlow);
    expect(linkedClassId).toBeDefined();

    const beforeReports = computeReportStats(
      await getClassReports(page, linkedClassId!),
    );
    const beforeSummary = (await getTeacherGradeSummaries(page)).find(
      (summary) => summary.class_name === CLASS_NAMES.linkedFlow,
    );
    expect(beforeSummary).toBeDefined();

    await openExperimentReportsPage(page);
    await chooseClass(page, CLASS_NAMES.linkedFlow);
    await expectStatisticNumber(page, "学生总数", beforeReports.total);
    await expectStatisticNumber(page, "提交报告", beforeReports.submitted);
    await expectStatisticNumber(page, "待评分", beforeReports.pendingReview);

    await searchStudents(page, ExperimentReportSelectors.searchInput.placeholder, "20247013");
    const pendingRow = await expectSearchResultRow(page, "20247013");
    await expect(pendingRow).toContainText("联动班学生丙");
    await expect(pendingRow).toContainText(ExperimentReportSelectors.statusSubmitted);

    const rejectReason = "E2E 多班级教师驳回，需补充图表说明。";
    const rejectModal = await openReportReviewModal(pendingRow);
    await fillReportRejectReason(rejectModal, rejectReason);
    await rejectModal.getByRole("button", { name: "驳回报告" }).click();
    await expectSuccessMessage(page, "报告已驳回");

    const afterReports = computeReportStats(
      await getClassReports(page, linkedClassId!),
    );
    expect(afterReports.submitted).toBe(beforeReports.submitted);
    expect(afterReports.pendingReview).toBe(beforeReports.pendingReview - 1);
    expect(afterReports.rejected).toBe(beforeReports.rejected + 1);
    expect(afterReports.reviewed).toBe(beforeReports.reviewed);

    const afterSummary = (await getTeacherGradeSummaries(page)).find(
      (summary) => summary.class_name === CLASS_NAMES.linkedFlow,
    );
    expect(afterSummary).toBeDefined();
    expect(afterSummary!.graded_count).toBe(beforeSummary!.graded_count);
    expect(afterSummary!.submitted_count).toBe(beforeSummary!.submitted_count - 1);
    expect(afterSummary!.rejected_count).toBe(beforeSummary!.rejected_count + 1);
    expect(afterSummary!.not_submitted_count).toBe(beforeSummary!.not_submitted_count);

    await expectStatisticNumber(page, "提交报告", afterReports.submitted);
    await expectStatisticNumber(page, "待评分", afterReports.pendingReview);
    const rejectedReportRow = await expectSearchResultRow(page, "20247013");
    await expect(rejectedReportRow).toContainText(ExperimentReportSelectors.statusRejected);
    await expect(rejectedReportRow).toContainText(rejectReason);

    await openGradeOverviewPage(page);
    await expectClassCardMatchesSummary(page, afterSummary!);

    const afterGradeRows = await getClassGradeRows(page, linkedClassId!);
    const rejectedGradeRow = afterGradeRows.find((row) => row.username === "20247013");
    expect(rejectedGradeRow).toBeDefined();
    expect(rejectedGradeRow!.report_status).toBe("rejected");

    await openGradeOverviewClassDetail(page, CLASS_NAMES.linkedFlow);
    await searchStudents(page, GradeOverviewSelectors.searchInput.placeholder, "20247013");
    const rejectedGradeOverviewRow = await expectSearchResultRow(page, "20247013");
    await expect(rejectedGradeOverviewRow).toContainText("联动班学生丙");
    await expect(rejectedGradeOverviewRow).toContainText("已驳回");
  });

  test("助教完成评阅后教师端报告统计与成绩总览同步更新", async ({
    browser,
    page,
  }) => {
    await loginAsTeacher(page);

    const managedClasses = await getManagedClassesByName(page);
    const linkedClassId = managedClasses.get(CLASS_NAMES.linkedFlow);
    expect(linkedClassId).toBeDefined();

    const beforeReports = computeReportStats(
      await getClassReports(page, linkedClassId!),
    );
    const beforeSummary = (await getTeacherGradeSummaries(page)).find(
      (summary) => summary.class_name === CLASS_NAMES.linkedFlow,
    );
    expect(beforeSummary).toBeDefined();

    await openExperimentReportsPage(page);
    await chooseClass(page, CLASS_NAMES.linkedFlow);
    await searchStudents(page, ExperimentReportSelectors.searchInput.placeholder, "20247015");
    const teacherPendingRow = await expectSearchResultRow(page, "20247015");
    await expect(teacherPendingRow).toContainText("联动班学生戊");
    await expect(teacherPendingRow).toContainText(ExperimentReportSelectors.statusSubmitted);

    const assistantContext = await browser.newContext({
      baseURL: FRONTEND_ORIGIN,
      viewport: { width: 1280, height: 800 },
    });
    const assistantPage = await assistantContext.newPage();

    try {
      await loginAsAssistant(assistantPage);
      await openExperimentReportsPage(assistantPage);
      await chooseClass(assistantPage, CLASS_NAMES.linkedFlow);
      await searchStudents(
        assistantPage,
        ExperimentReportSelectors.searchInput.placeholder,
        "20247015",
      );
      const assistantPendingRow = await expectSearchResultRow(assistantPage, "20247015");
      await expect(assistantPendingRow).toContainText("联动班学生戊");
      await expect(assistantPendingRow).toContainText(ExperimentReportSelectors.statusSubmitted);

      const reviewModal = await openReportReviewModal(assistantPendingRow);
      await fillReportReviewForm(reviewModal, {
        reportScore: "86",
        modelScore: "88",
        feedback: "Assistant multiclass cross-role review.",
      });
      await reviewModal
        .getByRole(ExperimentReportSelectors.saveReviewBtn.role, {
          name: ExperimentReportSelectors.saveReviewBtn.name,
        })
        .click();
      await expectSuccessMessage(assistantPage, "评阅结果保存成功");
      const assistantReviewedRow = await expectSearchResultRow(assistantPage, "20247015");
      await expect(assistantReviewedRow).toContainText(ExperimentReportSelectors.statusGraded);
    } finally {
      await assistantContext.close();
    }

    const afterReports = computeReportStats(
      await getClassReports(page, linkedClassId!),
    );
    expect(afterReports.pendingReview).toBe(beforeReports.pendingReview - 1);
    expect(afterReports.reviewed).toBe(beforeReports.reviewed + 1);
    expect(afterReports.submitted).toBe(beforeReports.submitted);

    const afterSummary = (await getTeacherGradeSummaries(page)).find(
      (summary) => summary.class_name === CLASS_NAMES.linkedFlow,
    );
    expect(afterSummary).toBeDefined();
    expect(afterSummary!.graded_count).toBe(beforeSummary!.graded_count + 1);
    expect(afterSummary!.submitted_count).toBe(beforeSummary!.submitted_count - 1);
    expect(afterSummary!.rejected_count).toBe(beforeSummary!.rejected_count);

    await page.reload();
    await openExperimentReportsPage(page);
    await chooseClass(page, CLASS_NAMES.linkedFlow);
    await expectStatisticNumber(page, "提交报告", afterReports.submitted);
    await expectStatisticNumber(page, "待评分", afterReports.pendingReview);
    if (afterReports.averageGrade !== null) {
      await expectStatisticNumber(page, "报告平均得分", afterReports.averageGrade);
    }
    await searchStudents(page, ExperimentReportSelectors.searchInput.placeholder, "20247015");
    const teacherReviewedRow = await expectSearchResultRow(page, "20247015");
    await expect(teacherReviewedRow).toContainText("联动班学生戊");
    await expect(teacherReviewedRow).toContainText(ExperimentReportSelectors.statusGraded);
    await expect(teacherReviewedRow).toContainText("Assistant multiclass cross-role review.");

    await openGradeOverviewPage(page);
    await expectClassCardMatchesSummary(page, afterSummary!);

    const afterGradeRows = await getClassGradeRows(page, linkedClassId!);
    const reviewedGradeRow = afterGradeRows.find((row) => row.username === "20247015");
    expect(reviewedGradeRow).toBeDefined();
    expect(reviewedGradeRow!.report_status).toBe("graded");
    expect(reviewedGradeRow!.final_score).not.toBeNull();

    await openGradeOverviewClassDetail(page, CLASS_NAMES.linkedFlow);
    await searchStudents(page, GradeOverviewSelectors.searchInput.placeholder, "20247015");
    const reviewedGradeOverviewRow = await expectSearchResultRow(page, "20247015");
    await expect(reviewedGradeOverviewRow).toContainText("联动班学生戊");
    await expect(reviewedGradeOverviewRow).toContainText("已评分");
    await expect(reviewedGradeOverviewRow).toContainText(
      reviewedGradeRow!.final_score!.toFixed(1),
    );
  });

  test("助教驳回报告后教师端报告统计与成绩总览同步更新", async ({
    browser,
    page,
  }) => {
    await loginAsTeacher(page);

    const managedClasses = await getManagedClassesByName(page);
    const linkedClassId = managedClasses.get(CLASS_NAMES.linkedFlow);
    expect(linkedClassId).toBeDefined();

    const beforeReports = computeReportStats(
      await getClassReports(page, linkedClassId!),
    );
    const beforeSummary = (await getTeacherGradeSummaries(page)).find(
      (summary) => summary.class_name === CLASS_NAMES.linkedFlow,
    );
    expect(beforeSummary).toBeDefined();

    await openExperimentReportsPage(page);
    await chooseClass(page, CLASS_NAMES.linkedFlow);
    await searchStudents(page, ExperimentReportSelectors.searchInput.placeholder, "20247016");
    const teacherPendingRow = await expectSearchResultRow(page, "20247016");
    await expect(teacherPendingRow).toContainText("联动班学生己");
    await expect(teacherPendingRow).toContainText(ExperimentReportSelectors.statusSubmitted);

    const assistantContext = await browser.newContext({
      baseURL: FRONTEND_ORIGIN,
      viewport: { width: 1280, height: 800 },
    });
    const assistantPage = await assistantContext.newPage();

    try {
      await loginAsAssistant(assistantPage);
      await openExperimentReportsPage(assistantPage);
      await chooseClass(assistantPage, CLASS_NAMES.linkedFlow);
      await searchStudents(
        assistantPage,
        ExperimentReportSelectors.searchInput.placeholder,
        "20247016",
      );
      const assistantPendingRow = await expectSearchResultRow(assistantPage, "20247016");
      await expect(assistantPendingRow).toContainText("联动班学生己");
      await expect(assistantPendingRow).toContainText(ExperimentReportSelectors.statusSubmitted);

      const rejectReason = "Assistant multiclass cross-role rejection.";
      const rejectModal = await openReportReviewModal(assistantPendingRow);
      await fillReportRejectReason(rejectModal, rejectReason);
      await rejectModal.getByRole("button", { name: "驳回报告" }).click();
      await expectSuccessMessage(assistantPage, "报告已驳回");
      const assistantRejectedRow = await expectSearchResultRow(assistantPage, "20247016");
      await expect(assistantRejectedRow).toContainText(ExperimentReportSelectors.statusRejected);
      await expect(assistantRejectedRow).toContainText(rejectReason);
    } finally {
      await assistantContext.close();
    }

    const afterReports = computeReportStats(
      await getClassReports(page, linkedClassId!),
    );
    expect(afterReports.pendingReview).toBe(beforeReports.pendingReview - 1);
    expect(afterReports.rejected).toBe(beforeReports.rejected + 1);
    expect(afterReports.reviewed).toBe(beforeReports.reviewed);
    expect(afterReports.submitted).toBe(beforeReports.submitted);

    const afterSummary = (await getTeacherGradeSummaries(page)).find(
      (summary) => summary.class_name === CLASS_NAMES.linkedFlow,
    );
    expect(afterSummary).toBeDefined();
    expect(afterSummary!.graded_count).toBe(beforeSummary!.graded_count);
    expect(afterSummary!.submitted_count).toBe(beforeSummary!.submitted_count - 1);
    expect(afterSummary!.rejected_count).toBe(beforeSummary!.rejected_count + 1);
    expect(afterSummary!.not_submitted_count).toBe(beforeSummary!.not_submitted_count);

    await page.reload();
    await openExperimentReportsPage(page);
    await chooseClass(page, CLASS_NAMES.linkedFlow);
    await expectStatisticNumber(page, "提交报告", afterReports.submitted);
    await expectStatisticNumber(page, "待评分", afterReports.pendingReview);
    await searchStudents(page, ExperimentReportSelectors.searchInput.placeholder, "20247016");
    const teacherRejectedRow = await expectSearchResultRow(page, "20247016");
    await expect(teacherRejectedRow).toContainText("联动班学生己");
    await expect(teacherRejectedRow).toContainText(ExperimentReportSelectors.statusRejected);
    await expect(teacherRejectedRow).toContainText("Assistant multiclass cross-role rejection.");

    await openGradeOverviewPage(page);
    await expectClassCardMatchesSummary(page, afterSummary!);

    const afterGradeRows = await getClassGradeRows(page, linkedClassId!);
    const rejectedGradeRow = afterGradeRows.find((row) => row.username === "20247016");
    expect(rejectedGradeRow).toBeDefined();
    expect(rejectedGradeRow!.report_status).toBe("rejected");

    await openGradeOverviewClassDetail(page, CLASS_NAMES.linkedFlow);
    await searchStudents(page, GradeOverviewSelectors.searchInput.placeholder, "20247016");
    const rejectedGradeOverviewRow = await expectSearchResultRow(page, "20247016");
    await expect(rejectedGradeOverviewRow).toContainText("联动班学生己");
    await expect(rejectedGradeOverviewRow).toContainText("已驳回");
  });

  test("教师重新评阅已评分报告后统计均值与趋势图再次变化", async ({
    page,
  }) => {
    await loginAsTeacher(page);

    const managedClasses = await getManagedClassesByName(page);
    const highPerformingClassId = managedClasses.get(CLASS_NAMES.highPerforming);
    expect(highPerformingClassId).toBeDefined();

    const beforeReports = computeReportStats(
      await getClassReports(page, highPerformingClassId!),
    );
    const beforeSummary = (await getTeacherGradeSummaries(page)).find(
      (summary) => summary.class_name === CLASS_NAMES.highPerforming,
    );
    expect(beforeSummary).toBeDefined();

    const beforeGradeRows = await getClassGradeRows(page, highPerformingClassId!);
    const beforeGradeRow = beforeGradeRows.find((row) => row.username === "20247002");
    expect(beforeGradeRow).toBeDefined();

    await openExperimentReportsPage(page);
    await chooseClass(page, CLASS_NAMES.highPerforming);
    await searchStudents(page, ExperimentReportSelectors.searchInput.placeholder, "20247002");
    const gradedRow = await expectSearchResultRow(page, "20247002");
    await expect(gradedRow).toContainText("高分班学生甲");
    await expect(gradedRow).toContainText(ExperimentReportSelectors.statusGraded);

    const reviewModal = await openReportReviewModal(gradedRow);
    await fillReportReviewForm(reviewModal, {
      reportScore: "40",
      modelScore: "40",
      feedback: "E2E regrade lowers scores to verify chart refresh.",
    });
    await reviewModal
      .getByRole(ExperimentReportSelectors.saveReviewBtn.role, {
        name: ExperimentReportSelectors.saveReviewBtn.name,
      })
      .click();
    await expectSuccessMessage(page, "评阅结果保存成功");

    const afterReports = computeReportStats(
      await getClassReports(page, highPerformingClassId!),
    );
    expect(afterReports.pendingReview).toBe(beforeReports.pendingReview);
    expect(afterReports.reviewed).toBe(beforeReports.reviewed);
    expect(afterReports.submitted).toBe(beforeReports.submitted);
    expect(afterReports.averageGrade).not.toBe(beforeReports.averageGrade);

    const afterSummary = (await getTeacherGradeSummaries(page)).find(
      (summary) => summary.class_name === CLASS_NAMES.highPerforming,
    );
    expect(afterSummary).toBeDefined();
    expect(afterSummary!.graded_count).toBe(beforeSummary!.graded_count);
    expect(afterSummary!.submitted_count).toBe(beforeSummary!.submitted_count);
    expect(afterSummary!.average_score).not.toBe(beforeSummary!.average_score);

    const afterGradeRows = await getClassGradeRows(page, highPerformingClassId!);
    const afterGradeRow = afterGradeRows.find((row) => row.username === "20247002");
    expect(afterGradeRow).toBeDefined();
    expect(afterGradeRow!.report_status).toBe("graded");
    expect(afterGradeRow!.final_score).not.toBeNull();
    expect(afterGradeRow!.final_score).not.toBe(beforeGradeRow!.final_score);

    await expectStatisticNumber(page, "提交报告", afterReports.submitted);
    if (afterReports.averageGrade !== null) {
      await expectStatisticNumber(page, "报告平均得分", afterReports.averageGrade);
    }
    const regradedReportRow = await expectSearchResultRow(page, "20247002");
    await expect(regradedReportRow).toContainText("E2E regrade lowers scores to verify chart refresh.");

    await openGradeOverviewPage(page);
    await expectClassCardMatchesSummary(page, afterSummary!);

    const afterGradeStats = computeClassGradeStats(afterGradeRows);
    const expectedTrendScores = [...afterGradeRows]
      .filter(
        (row): row is GradeSummaryRow & { final_score: number } =>
          row.report_status === "graded" && row.final_score !== null,
      )
      .map((row) => Number(row.final_score))
      .sort((left, right) => right - left);

    await openGradeOverviewClassDetail(page, CLASS_NAMES.highPerforming);
    await expectStatisticNumber(page, GradeOverviewSelectors.gradedCountStat, afterGradeStats.graded);
    await expectStatisticNumber(page, GradeOverviewSelectors.averageScoreStat, afterGradeStats.avg);

    await searchStudents(page, GradeOverviewSelectors.searchInput.placeholder, "20247002");
    const regradedOverviewRow = await expectSearchResultRow(page, "20247002");
    await expect(regradedOverviewRow).toContainText("高分班学生甲");
    await expect(regradedOverviewRow).toContainText("已评分");
    await expect(regradedOverviewRow).toContainText(afterGradeRow!.final_score!.toFixed(1));

    const renderedTrendTooltips: string[] = [];
    const trendDots = getChartWrapper(page, 0).locator(".recharts-line .recharts-dot");
    const trendCount = await trendDots.count();
    expect(trendCount).toBe(expectedTrendScores.length);

    for (let index = 0; index < trendCount; index += 1) {
      await hoverLocatorCenter(page, trendDots.nth(index));
      await page.waitForTimeout(150);
      renderedTrendTooltips.push(await readChartTooltipText(page, 0));
    }

    expect(renderedTrendTooltips).toEqual(
      expectedTrendScores.map(
        (score, index) => `排名 ${index + 1}总分 : ${score.toFixed(2)}`.replace(/\s+/g, " ").trim(),
      ),
    );
  });

  test("教师无法直接重评已驳回报告且统计保持不变", async ({
    page,
  }) => {
    await loginAsTeacher(page);

    const managedClasses = await getManagedClassesByName(page);
    const mixedClassId = managedClasses.get(CLASS_NAMES.mixedState);
    expect(mixedClassId).toBeDefined();

    const beforeReports = computeReportStats(
      await getClassReports(page, mixedClassId!),
    );
    const beforeSummary = (await getTeacherGradeSummaries(page)).find(
      (summary) => summary.class_name === CLASS_NAMES.mixedState,
    );
    expect(beforeSummary).toBeDefined();

    await openExperimentReportsPage(page);
    await chooseClass(page, CLASS_NAMES.mixedState);
    await searchStudents(page, ExperimentReportSelectors.searchInput.placeholder, "20247009");
    const rejectedRow = await expectSearchResultRow(page, "20247009");
    await expect(rejectedRow).toContainText("混合班学生丙");
    await expect(rejectedRow).toContainText(ExperimentReportSelectors.statusRejected);

    const reviewModal = await openReportReviewModal(rejectedRow);
    await expect(reviewModal.getByText("报告已驳回")).toBeVisible();
    await expect(
      reviewModal.getByText("需等待学生重新提交后，方可再次评阅。"),
    ).toBeVisible();
    await expect(
      reviewModal.getByPlaceholder(ExperimentReportSelectors.reportScoreInput.placeholder),
    ).toHaveCount(0);
    await expect(
      reviewModal.getByRole(ExperimentReportSelectors.saveReviewBtn.role, {
        name: ExperimentReportSelectors.saveReviewBtn.name,
      }),
    ).toHaveCount(0);
    await reviewModal.getByRole("button", { name: /关\s*闭|关 闭|关闭/ }).click();

    const afterReports = computeReportStats(
      await getClassReports(page, mixedClassId!),
    );
    expect(afterReports.submitted).toBe(beforeReports.submitted);
    expect(afterReports.pendingReview).toBe(beforeReports.pendingReview);
    expect(afterReports.reviewed).toBe(beforeReports.reviewed);
    expect(afterReports.rejected).toBe(beforeReports.rejected);
    expect(afterReports.averageGrade).toBe(beforeReports.averageGrade);

    const afterSummary = (await getTeacherGradeSummaries(page)).find(
      (summary) => summary.class_name === CLASS_NAMES.mixedState,
    );
    expect(afterSummary).toBeDefined();
    expect(afterSummary!.graded_count).toBe(beforeSummary!.graded_count);
    expect(afterSummary!.submitted_count).toBe(beforeSummary!.submitted_count);
    expect(afterSummary!.rejected_count).toBe(beforeSummary!.rejected_count);
    expect(afterSummary!.average_score).toBe(beforeSummary!.average_score);

    await expectStatisticNumber(page, "提交报告", afterReports.submitted);
    await expectStatisticNumber(page, "待评分", afterReports.pendingReview);
    if (afterReports.averageGrade !== null) {
      await expectStatisticNumber(page, "报告平均得分", afterReports.averageGrade);
    }
    const stillRejectedReportRow = await expectSearchResultRow(page, "20247009");
    await expect(stillRejectedReportRow).toContainText(ExperimentReportSelectors.statusRejected);
    await expect(stillRejectedReportRow).toContainText("报告缺少关键图表，请补充后重提。");

    await openGradeOverviewPage(page);
    await expectClassCardMatchesSummary(page, afterSummary!);

    const afterGradeRows = await getClassGradeRows(page, mixedClassId!);
    const rejectedGradeRow = afterGradeRows.find((row) => row.username === "20247009");
    expect(rejectedGradeRow).toBeDefined();
    expect(rejectedGradeRow!.report_status).toBe("rejected");

    const afterGradeStats = computeClassGradeStats(afterGradeRows);
    await openGradeOverviewClassDetail(page, CLASS_NAMES.mixedState);
    await expectStatisticNumber(page, GradeOverviewSelectors.gradedCountStat, afterGradeStats.graded);
    await expectStatisticNumber(page, GradeOverviewSelectors.averageScoreStat, afterGradeStats.avg);
    await searchStudents(page, GradeOverviewSelectors.searchInput.placeholder, "20247009");
    const rejectedOverviewRow = await expectSearchResultRow(page, "20247009");
    await expect(rejectedOverviewRow).toContainText("混合班学生丙");
    await expect(rejectedOverviewRow).toContainText("已驳回");
  });

  test("学生被驳回后重新提交并经教师评阅通过形成完整闭环", async ({
    browser,
    page,
  }) => {
    await loginAsTeacher(page);

    const managedClasses = await getManagedClassesByName(page);
    const mixedClassId = managedClasses.get(CLASS_NAMES.mixedState);
    expect(mixedClassId).toBeDefined();

    const beforeReports = computeReportStats(
      await getClassReports(page, mixedClassId!),
    );
    const beforeSummary = (await getTeacherGradeSummaries(page)).find(
      (summary) => summary.class_name === CLASS_NAMES.mixedState,
    );
    expect(beforeSummary).toBeDefined();

    await openExperimentReportsPage(page);
    await chooseClass(page, CLASS_NAMES.mixedState);
    await searchStudents(page, ExperimentReportSelectors.searchInput.placeholder, "20247009");
    const initialRejectedRow = await expectSearchResultRow(page, "20247009");
    await expect(initialRejectedRow).toContainText("混合班学生丙");
    await expect(initialRejectedRow).toContainText(ExperimentReportSelectors.statusRejected);

    await runRejectedStudentResubmissionFlow(
      browser,
      "20247009",
      LIVE_STUDENT.password,
      "混合班学生丙",
    );

    const afterResubmitReports = computeReportStats(
      await getClassReports(page, mixedClassId!),
    );
    expect(afterResubmitReports.submitted).toBe(beforeReports.submitted);
    expect(afterResubmitReports.pendingReview).toBe(beforeReports.pendingReview + 1);
    expect(afterResubmitReports.reviewed).toBe(beforeReports.reviewed);
    expect(afterResubmitReports.rejected).toBe(beforeReports.rejected - 1);

    const afterResubmitSummary = (await getTeacherGradeSummaries(page)).find(
      (summary) => summary.class_name === CLASS_NAMES.mixedState,
    );
    expect(afterResubmitSummary).toBeDefined();
    expect(afterResubmitSummary!.graded_count).toBe(beforeSummary!.graded_count);
    expect(afterResubmitSummary!.submitted_count).toBe(beforeSummary!.submitted_count + 1);
    expect(afterResubmitSummary!.rejected_count).toBe(beforeSummary!.rejected_count - 1);

    await page.reload();
    await openExperimentReportsPage(page);
    await chooseClass(page, CLASS_NAMES.mixedState);
    await expectStatisticNumber(page, "提交报告", afterResubmitReports.submitted);
    await expectStatisticNumber(page, "待评分", afterResubmitReports.pendingReview);
    await searchStudents(page, ExperimentReportSelectors.searchInput.placeholder, "20247009");
    const pendingRow = await expectSearchResultRow(page, "20247009");
    await expect(pendingRow).toContainText(ExperimentReportSelectors.statusSubmitted);

    const reviewModal = await openReportReviewModal(pendingRow);
    await fillReportReviewForm(reviewModal, {
      reportScore: "88",
      modelScore: "86",
      feedback: "E2E rejected student resubmission approved.",
    });
    await reviewModal
      .getByRole(ExperimentReportSelectors.saveReviewBtn.role, {
        name: ExperimentReportSelectors.saveReviewBtn.name,
      })
      .click();
    await expectSuccessMessage(page, "评阅结果保存成功");

    const finalReports = computeReportStats(
      await getClassReports(page, mixedClassId!),
    );
    expect(finalReports.submitted).toBe(beforeReports.submitted);
    expect(finalReports.pendingReview).toBe(beforeReports.pendingReview);
    expect(finalReports.reviewed).toBe(beforeReports.reviewed + 1);
    expect(finalReports.rejected).toBe(beforeReports.rejected - 1);

    const finalSummary = (await getTeacherGradeSummaries(page)).find(
      (summary) => summary.class_name === CLASS_NAMES.mixedState,
    );
    expect(finalSummary).toBeDefined();
    expect(finalSummary!.graded_count).toBe(beforeSummary!.graded_count + 1);
    expect(finalSummary!.submitted_count).toBe(beforeSummary!.submitted_count);
    expect(finalSummary!.rejected_count).toBe(beforeSummary!.rejected_count - 1);

    await expectStatisticNumber(page, "提交报告", finalReports.submitted);
    await expectStatisticNumber(page, "待评分", finalReports.pendingReview);
    if (finalReports.averageGrade !== null) {
      await expectStatisticNumber(page, "报告平均得分", finalReports.averageGrade);
    }
    const gradedRow = await expectSearchResultRow(page, "20247009");
    await expect(gradedRow).toContainText(ExperimentReportSelectors.statusGraded);
    await expect(gradedRow).toContainText("E2E rejected student resubmission approved.");

    await openGradeOverviewPage(page);
    await expectClassCardMatchesSummary(page, finalSummary!);

    const finalGradeRows = await getClassGradeRows(page, mixedClassId!);
    const recoveredGradeRow = finalGradeRows.find((row) => row.username === "20247009");
    expect(recoveredGradeRow).toBeDefined();
    expect(recoveredGradeRow!.report_status).toBe("graded");
    expect(recoveredGradeRow!.final_score).not.toBeNull();

    const finalGradeStats = computeClassGradeStats(finalGradeRows);
    await openGradeOverviewClassDetail(page, CLASS_NAMES.mixedState);
    await expectStatisticNumber(page, GradeOverviewSelectors.gradedCountStat, finalGradeStats.graded);
    await expectStatisticNumber(page, GradeOverviewSelectors.averageScoreStat, finalGradeStats.avg);
    await searchStudents(page, GradeOverviewSelectors.searchInput.placeholder, "20247009");
    const recoveredOverviewRow = await expectSearchResultRow(page, "20247009");
    await expect(recoveredOverviewRow).toContainText("混合班学生丙");
    await expect(recoveredOverviewRow).toContainText("已评分");
    await expect(recoveredOverviewRow).toContainText(recoveredGradeRow!.final_score!.toFixed(1));
  });

  test("学生重提并评阅通过后混合班趋势图与分布图同步更新", async ({
    browser,
    page,
  }) => {
    await loginAsTeacher(page);

    const managedClasses = await getManagedClassesByName(page);
    const mixedClassId = managedClasses.get(CLASS_NAMES.mixedState);
    expect(mixedClassId).toBeDefined();

    await openExperimentReportsPage(page);
    await chooseClass(page, CLASS_NAMES.mixedState);
    await searchStudents(page, ExperimentReportSelectors.searchInput.placeholder, "20247017");
    const initialRejectedRow = await expectSearchResultRow(page, "20247017");
    await expect(initialRejectedRow).toContainText("混合班学生己");
    await expect(initialRejectedRow).toContainText(ExperimentReportSelectors.statusRejected);

    await runRejectedStudentResubmissionFlow(
      browser,
      "20247017",
      LIVE_STUDENT.password,
      "混合班学生己",
    );

    await page.reload();
    await openExperimentReportsPage(page);
    await chooseClass(page, CLASS_NAMES.mixedState);
    await searchStudents(page, ExperimentReportSelectors.searchInput.placeholder, "20247017");
    const pendingRow = await expectSearchResultRow(page, "20247017");
    await expect(pendingRow).toContainText(ExperimentReportSelectors.statusSubmitted);

    const reviewModal = await openReportReviewModal(pendingRow);
    await fillReportReviewForm(reviewModal, {
      reportScore: "84",
      modelScore: "82",
      feedback: "E2E rejected student resubmission chart refresh.",
    });
    await reviewModal
      .getByRole(ExperimentReportSelectors.saveReviewBtn.role, {
        name: ExperimentReportSelectors.saveReviewBtn.name,
      })
      .click();
    await expectSuccessMessage(page, "评阅结果保存成功");

    const gradeRows = await getClassGradeRows(page, mixedClassId!);
    const recoveredGradeRow = gradeRows.find((row) => row.username === "20247017");
    expect(recoveredGradeRow).toBeDefined();
    expect(recoveredGradeRow!.report_status).toBe("graded");
    expect(recoveredGradeRow!.final_score).not.toBeNull();

    const expectedTrendScores = [...gradeRows]
      .filter(
        (row): row is GradeSummaryRow & { final_score: number } =>
          row.report_status === "graded" && row.final_score !== null,
      )
      .map((row) => Number(row.final_score))
      .sort((left, right) => right - left);
    const expectedHistogramBinCount = computeHistogramNonEmptyBinCount(gradeRows);

    await openGradeOverviewPage(page);
    await openGradeOverviewClassDetail(page, CLASS_NAMES.mixedState);

    await searchStudents(page, GradeOverviewSelectors.searchInput.placeholder, "20247017");
    const recoveredOverviewRow = await expectSearchResultRow(page, "20247017");
    await expect(recoveredOverviewRow).toContainText("混合班学生己");
    await expect(recoveredOverviewRow).toContainText("已评分");
    await expect(recoveredOverviewRow).toContainText(
      recoveredGradeRow!.final_score!.toFixed(1),
    );

    const renderedTrendTooltips: string[] = [];
    const trendDots = getChartWrapper(page, 0).locator(".recharts-line .recharts-dot");
    const trendCount = await trendDots.count();
    expect(trendCount).toBe(expectedTrendScores.length);
    expect(trendCount).toBeGreaterThanOrEqual(3);

    for (let index = 0; index < trendCount; index += 1) {
      await hoverLocatorCenter(page, trendDots.nth(index));
      await page.waitForTimeout(150);
      renderedTrendTooltips.push(await readChartTooltipText(page, 0));
    }

    expect(renderedTrendTooltips).toEqual(
      expectedTrendScores.map(
        (score, index) => `排名 ${index + 1}总分 : ${score.toFixed(2)}`.replace(/\s+/g, " ").trim(),
      ),
    );

    const histogramBars = getChartWrapper(page, 1).locator(".recharts-bar-rectangle");
    let nonEmptyHistogramBars = 0;
    for (let index = 0; index < (await histogramBars.count()); index += 1) {
      const box = await histogramBars.nth(index).boundingBox();
      if (box && box.width > 0 && box.height > 0) {
        nonEmptyHistogramBars += 1;
      }
    }
    expect(nonEmptyHistogramBars).toBe(expectedHistogramBinCount);
  });

  test("学生端真实提交后教师端多班级统计与表格同步更新", async ({
    browser,
    page,
  }) => {
    await loginAsTeacher(page);

    const managedClasses = await getManagedClassesByName(page);
    const linkedClassId = managedClasses.get(CLASS_NAMES.linkedFlow);
    expect(linkedClassId).toBeDefined();

    const beforeSummaries = await getTeacherGradeSummaries(page);
    const beforeSummary = beforeSummaries.find(
      (summary) => summary.class_name === CLASS_NAMES.linkedFlow,
    );
    expect(beforeSummary).toBeDefined();

    const beforeReports = computeReportStats(
      await getClassReports(page, linkedClassId!),
    );
    const beforeProgress = computeProgressStats(
      await getClassProgress(page, linkedClassId!),
    );

    await runLinkedStudentFullFlow(browser);

    const afterSummaries = await getTeacherGradeSummaries(page);
    const afterSummary = afterSummaries.find(
      (summary) => summary.class_name === CLASS_NAMES.linkedFlow,
    );
    expect(afterSummary).toBeDefined();
    expect(afterSummary!.submitted_count).toBe(beforeSummary!.submitted_count + 1);
    expect(afterSummary!.not_submitted_count).toBe(
      beforeSummary!.not_submitted_count - 1,
    );
    expect(afterSummary!.graded_count).toBe(beforeSummary!.graded_count);

    const afterReports = computeReportStats(
      await getClassReports(page, linkedClassId!),
    );
    expect(afterReports.submitted).toBe(beforeReports.submitted + 1);
    expect(afterReports.pendingReview).toBe(beforeReports.pendingReview + 1);
    expect(afterReports.reviewed).toBe(beforeReports.reviewed);

    const afterProgress = computeProgressStats(
      await getClassProgress(page, linkedClassId!),
    );
    expect(afterProgress.completed).toBe(beforeProgress.completed + 1);
    expect(afterProgress.notStarted).toBe(beforeProgress.notStarted - 1);
    expect(afterProgress.inProgress).toBe(beforeProgress.inProgress);

    await openGradeOverviewPage(page);
    await expectClassCardMatchesSummary(page, afterSummary!);

    await openExperimentReportsPage(page);
    await chooseClass(page, CLASS_NAMES.linkedFlow);
    await expectStatisticNumber(page, "提交报告", afterReports.submitted);
    await searchStudents(page, ExperimentReportSelectors.searchInput.placeholder, LIVE_STUDENT.username);
    const submittedRow = await expectSearchResultRow(page, LIVE_STUDENT.username);
    await expect(submittedRow).toContainText(LIVE_STUDENT.fullName);
    await expect(submittedRow).toContainText(ExperimentReportSelectors.statusSubmitted);

    await openExperimentProgressPage(page);
    await chooseClass(page, CLASS_NAMES.linkedFlow);
    await expectStatisticNumber(page, ExperimentProgressSelectors.completedStat, afterProgress.completed);
    await searchStudents(page, ExperimentProgressSelectors.searchInput.placeholder, LIVE_STUDENT.username);
    const liveProgressRow = await expectSearchResultRow(page, LIVE_STUDENT.username);
    await expect(liveProgressRow).toContainText("已完成");
  });
});
