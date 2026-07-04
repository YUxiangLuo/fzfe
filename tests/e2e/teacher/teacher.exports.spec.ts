import { expect, test, type Locator, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import {
  ClassManagementSelectors,
  CommonSelectors,
  ExperimentReportSelectors,
  GradeOverviewSelectors,
  SuccessMessages,
  TEST_DATA,
  getAuthedJson,
  loginAsTeacherAccount,
  openClassManagementPage,
  openCreateClassModal,
  openExperimentReportsPage,
  openGradeOverviewClassDetail,
  openGradeOverviewPage,
  selectTopFilterOption,
  type ExperimentReport,
  type StudentGradeOverview,
} from "../helpers";

const BACKEND_PORT = process.env.E2E_BACKEND_PORT ?? "54102";
const BACKEND_ORIGIN = process.env.E2E_BACKEND_ORIGIN ?? `http://127.0.0.1:${BACKEND_PORT}`;

const UTF8_BOM = Buffer.from([0xef, 0xbb, 0xbf]);

const REPORT_EXPORT_HEADER = [
  "学号",
  "姓名",
  "实验ID",
  "报告ID",
  "报告状态",
  "提交时间",
  "报告得分",
  "评阅人",
  "评语",
];

const GRADE_EXPORT_HEADER = [
  "学号",
  "姓名",
  "实验ID",
  "数据准备",
  "描述性统计",
  "预测模型选择",
  "生成预测结果",
  "库存变量参数计算",
  "服务水平参数计算",
  "生产变量参数计算",
  "制定生产计划",
  "提交实验报告",
  "实验流程",
  "知识点测试",
  "模型选择",
  "实验报告",
  "报告状态",
  "报告评语",
  "最终得分",
];

const EXP_FLOW_FIELD_ORDER = [
  "exp_flow_demand_data_preparation",
  "exp_flow_demand_descriptive_stats",
  "exp_flow_demand_model_selection",
  "exp_flow_demand_generate_results",
  "exp_flow_production_inventory_calc",
  "exp_flow_production_service_level",
  "exp_flow_production_variable_calc",
  "exp_flow_production_plan_creation",
  "exp_flow_report_submission",
] as const;

function expectUtf8Bom(buffer: Buffer) {
  expect(buffer.subarray(0, UTF8_BOM.length).equals(UTF8_BOM)).toBe(true);
}

function parseCsv(text: string): string[][] {
  const normalized = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];

    if (inQuotes) {
      if (char === '"' && normalized[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((cells) => cells.length > 1 || cells[0] !== "");
}

function parseCsvBuffer(buffer: Buffer): string[][] {
  expectUtf8Bom(buffer);
  return parseCsv(buffer.toString("utf8"));
}

async function readBlobBytesFromLink(page: Page, link: Locator): Promise<Buffer> {
  const href = await link.getAttribute("href");
  expect(href).toBeTruthy();
  expect(href!.startsWith("blob:")).toBe(true);

  const bytes = await page.evaluate(async (blobUrl) => {
    const response = await fetch(blobUrl);
    const buffer = await response.arrayBuffer();
    return Array.from(new Uint8Array(buffer));
  }, href);

  return Buffer.from(bytes);
}

function formatNumeric(value: unknown): string {
  if (value === null || value === undefined) return "";
  const num = Number(value);
  return Number.isFinite(num) ? num.toFixed(2) : "";
}

function formatDateTime(value: unknown): string {
  if (value === null || value === undefined || value === "") return "";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toISOString().replace("T", " ").substring(0, 19);
}

function reportStatusLabel(status: ExperimentReport["status"] | null | undefined): string {
  if (status === "submitted") return "待评分";
  if (status === "graded") return "已评分";
  if (status === "rejected") return "已驳回";
  return "未提交";
}

function gradeStatusLabel(status: StudentGradeOverview["report_status"] | null | undefined): string {
  if (status === "submitted") return "待评分";
  if (status === "graded") return "已评分";
  if (status === "rejected") return "已驳回";
  return "未提交";
}

function expectedReportCsvRow(report: ExperimentReport): string[] {
  return [
    report.username,
    report.full_name,
    report.experiment_id === null ? "" : String(report.experiment_id),
    report.report_id === null ? "" : String(report.report_id),
    reportStatusLabel(report.status),
    formatDateTime(report.submitted_at),
    formatNumeric(report.grade),
    report.grader_name ?? "",
    report.feedback ?? "",
  ];
}

function expectedGradeCsvRow(grade: StudentGradeOverview): string[] {
  const breakdownByField = new Map(
    (grade.exp_flow_breakdown ?? []).map((entry) => [entry.field, entry.score] as const),
  );
  const isRejected = grade.report_status === "rejected";
  const isGraded = grade.report_status === "graded";
  const visibleUnlessRejected = (value: string) => isRejected ? "" : value;

  return [
    grade.username,
    grade.full_name,
    grade.experiment_id === null ? "" : String(grade.experiment_id),
    ...EXP_FLOW_FIELD_ORDER.map((field) =>
      visibleUnlessRejected(formatNumeric(breakdownByField.get(field))),
    ),
    visibleUnlessRejected(formatNumeric(grade.exp_flow_score)),
    visibleUnlessRejected(formatNumeric(grade.knowledge_test)),
    visibleUnlessRejected(formatNumeric(grade.model_quality)),
    isGraded ? formatNumeric(grade.report_quality) : "",
    gradeStatusLabel(grade.report_status),
    grade.report_feedback ?? "",
    isGraded ? formatNumeric(grade.final_score) : "",
  ];
}

function rowByUsername(rows: string[][], username: string): string[] {
  const row = rows.find((candidate) => candidate[0] === username);
  expect(row, `CSV row for ${username}`).toBeDefined();
  return row!;
}

function reportArchiveEntryName(report: ExperimentReport): string {
  const rawName = report.username || report.full_name || `student_${report.user_id}`;
  const baseName = `${rawName}_experiment_${report.experiment_id}`
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_\-.]/g, "_");
  return `${baseName}.pdf`;
}

async function listZipEntries(zipBytes: Buffer): Promise<string[]> {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "fz-teacher-export-"));
  const zipPath = path.join(tempDir, "reports.zip");

  try {
    await writeFile(zipPath, zipBytes);
    return execFileSync("unzip", ["-Z1", zipPath], { encoding: "utf8" })
      .split(/\r?\n/)
      .map((entry) => entry.trim())
      .filter(Boolean)
      .sort();
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

async function chooseTeacherClassInReports(page: Page) {
  const teacherStudentRow = page
    .locator(CommonSelectors.tableRow)
    .filter({ hasText: TEST_DATA.students.perfectScore })
    .first();
  if (await teacherStudentRow.isVisible({ timeout: 2_000 }).catch(() => false)) return;

  await selectTopFilterOption(page, TEST_DATA.teacherClassName);
  await expect(teacherStudentRow).toBeVisible();
}

test.describe("@teacher @exports 教师端导出专项", () => {
  test("班级学生导入模板 CSV 字段和样例正确", async ({ page }) => {
    await loginAsTeacherAccount(page);
    await openClassManagementPage(page);

    const createModal = await openCreateClassModal(page);
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      createModal
        .getByRole(ClassManagementSelectors.downloadTemplateBtn.role, {
          name: ClassManagementSelectors.downloadTemplateBtn.name,
        })
        .click(),
    ]);

    expect(download.suggestedFilename()).toBe("学生名单导入模板.csv");
    const downloadPath = await download.path();
    expect(downloadPath).toBeTruthy();

    const rows = parseCsvBuffer(await readFile(downloadPath!));
    expect(rows).toEqual([
      ["学号", "姓名"],
      ["20240001", "张三"],
      ["20240002", "李四"],
    ]);

    await createModal.getByRole("button", { name: /取\s*消/ }).click();
  });

  test("实验报告 CSV 和报告 ZIP 真实文件内容正确", async ({ page }) => {
    await loginAsTeacherAccount(page);
    await openExperimentReportsPage(page);
    await chooseTeacherClassInReports(page);

    const reports = await getAuthedJson<ExperimentReport[]>(
      page,
      BACKEND_ORIGIN,
      `/api/v1/classes/${TEST_DATA.teacherClassId}/reports`,
    );
    expect(reports.length).toBeGreaterThan(0);

    await page
      .getByRole(ExperimentReportSelectors.exportCsvBtn.role, {
        name: ExperimentReportSelectors.exportCsvBtn.name,
      })
      .click();
    await expect(page.locator(CommonSelectors.successMessage).filter({ hasText: SuccessMessages.csvExported }).last()).toBeVisible();

    const csvLink = page.getByRole(ExperimentReportSelectors.downloadCsvLink.role, {
      name: ExperimentReportSelectors.downloadCsvLink.name,
    });
    await expect(csvLink).toBeVisible();

    const csvRows = parseCsvBuffer(await readBlobBytesFromLink(page, csvLink));
    expect(csvRows[0]).toEqual(REPORT_EXPORT_HEADER);
    expect(csvRows.slice(1)).toHaveLength(reports.length);

    for (const username of [
      TEST_DATA.students.perfectScore,
      TEST_DATA.students.pendingTeacher,
      TEST_DATA.students.zeroScore,
    ]) {
      const report = reports.find((candidate) => candidate.username === username);
      expect(report, `API report row for ${username}`).toBeDefined();
      expect(rowByUsername(csvRows, username)).toEqual(expectedReportCsvRow(report!));
    }

    await page
      .getByRole(ExperimentReportSelectors.exportAllBtn.role, {
        name: ExperimentReportSelectors.exportAllBtn.name,
      })
      .click();
    await expect(page.locator(CommonSelectors.successMessage).filter({ hasText: SuccessMessages.reportsExported }).last()).toBeVisible();

    const reportArchiveLink = page.getByRole(ExperimentReportSelectors.downloadReportLink.role, {
      name: ExperimentReportSelectors.downloadReportLink.name,
    });
    await expect(reportArchiveLink).toBeVisible();

    const zipBytes = await readBlobBytesFromLink(page, reportArchiveLink);
    expect(zipBytes.subarray(0, 4).toString("binary")).toBe("PK\u0003\u0004");

    const expectedEntries = reports
      .filter((report) => report.pdf_file_path && report.status !== "rejected")
      .map(reportArchiveEntryName)
      .sort();
    expect(expectedEntries.length).toBeGreaterThan(0);
    expect(await listZipEntries(zipBytes)).toEqual(expectedEntries);
  });

  test("成绩总览 CSV 字段、状态和分数正确", async ({ page }) => {
    await loginAsTeacherAccount(page);
    await openGradeOverviewPage(page);
    await openGradeOverviewClassDetail(page, TEST_DATA.teacherClassName);

    const gradeSummaries = await getAuthedJson<StudentGradeOverview[]>(
      page,
      BACKEND_ORIGIN,
      `/api/v1/classes/${TEST_DATA.teacherClassId}/grade-summaries`,
    );
    expect(gradeSummaries.length).toBeGreaterThan(0);

    await page
      .getByRole(GradeOverviewSelectors.exportBtn.role, {
        name: GradeOverviewSelectors.exportBtn.name,
      })
      .click();

    const exportAlert = page.locator(CommonSelectors.alertMessage).filter({ hasText: "导出成功" }).last();
    await expect(exportAlert).toBeVisible();
    const downloadLink = exportAlert.getByRole("link").first();
    await expect(downloadLink).toBeVisible();

    const csvRows = parseCsvBuffer(await readBlobBytesFromLink(page, downloadLink));
    expect(csvRows[0]).toEqual(GRADE_EXPORT_HEADER);
    expect(csvRows.slice(1)).toHaveLength(gradeSummaries.length);

    for (const username of [
      TEST_DATA.students.perfectScore,
      TEST_DATA.students.pendingTeacher,
      TEST_DATA.students.zeroScore,
    ]) {
      const grade = gradeSummaries.find((candidate) => candidate.username === username);
      expect(grade, `API grade row for ${username}`).toBeDefined();
      expect(rowByUsername(csvRows, username)).toEqual(expectedGradeCsvRow(grade!));
    }
  });
});
