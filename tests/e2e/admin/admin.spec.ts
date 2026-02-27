import { expect, test, type Locator, type Page, type Response } from "@playwright/test";

const ADMIN_USERNAME = process.env.E2E_ADMIN_USERNAME ?? "admin";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "AdminE2E!234";

const datasetCsvHeaders = ["行业名称", "公司名称", "产品名称", "年份", "月份", "销售数量", "数量单位"];

function makeRunId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function makePhone(offset: number): string {
  const num = (Date.now() + offset) % 1_000_000_000;
  return `18${num.toString().padStart(9, "0")}`;
}

function buildCsv(rows: string[][]): Buffer {
  return Buffer.from(rows.map((row) => row.join(",")).join("\n"), "utf8");
}

function buildTinyPdfBuffer(): Buffer {
  const pdfContent = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \ntrailer\n<< /Root 1 0 R /Size 4 >>\nstartxref\n173\n%%EOF\n`;
  return Buffer.from(pdfContent, "utf8");
}

async function getVisibleModal(page: Page, title: string): Promise<Locator> {
  const modal = page.getByRole("dialog", { name: new RegExp(title) }).first();
  await expect(modal).toBeVisible();
  return modal;
}

async function fillFormField(modal: Locator, label: string, value: string) {
  const formItem = modal.locator(".ant-form-item").filter({ hasText: label }).first();
  await expect(formItem).toBeVisible();
  await formItem.locator("input, textarea").first().fill(value);
}

async function confirmModal(modal: Locator) {
  await modal.getByRole("button", { name: /确\s*定/ }).click();
}

async function cancelModal(modal: Locator) {
  await modal.getByRole("button", { name: /取\s*消/ }).click();
}

async function confirmDelete(page: Page) {
  const deleteModal = await getVisibleModal(page, "确认删除");
  await deleteModal.getByRole("button", { name: /删\s*除/ }).click();
}

async function expectSuccessMessage(page: Page, keyword: string) {
  const notice = page.locator(".ant-message-notice-content");
  await expect(notice.filter({ hasText: keyword }).last()).toBeVisible({ timeout: 20_000 });
}

async function loginAsAdmin(page: Page) {
  await page.goto("/login.html");
  await page.getByRole("button", { name: /管理员/ }).click();
  await page.locator("#login-username").fill(ADMIN_USERNAME);
  await page.locator("#login-password").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: /登录系统|登录/ }).click();

  await expect(page).toHaveURL(/\/admin\.html$/);
  await expect(page.getByRole("heading", { name: "实验数据管理", level: 3 })).toBeVisible();
}

async function openMenu(page: Page, menuLabel: string, headingText: string) {
  await page.getByRole("menuitem", { name: menuLabel }).click();
  await expect(page.getByRole("heading", { name: headingText, level: 3 })).toBeVisible();
}

async function searchUsers(page: Page, keyword: string) {
  const searchInput = page.getByPlaceholder("输入关键字搜索");
  await searchInput.fill(keyword);
  await searchInput.press("Enter");
}

function tableRowByText(page: Page, text: string): Locator {
  return page.locator("tr").filter({ hasText: text }).first();
}

async function waitForAuthedFileResponse(
  page: Page,
  pathSegment: string,
  clickAction: () => Promise<void>,
): Promise<Response> {
  const [response] = await Promise.all([
    page.waitForResponse((resp) => resp.url().includes(pathSegment) && resp.status() === 200),
    clickAction(),
  ]);
  return response;
}

test("@admin 布局与会话操作覆盖（含退出登录）", async ({ page }) => {
  await loginAsAdmin(page);

  const menuToggle = page.locator("header button").first();
  await menuToggle.click();
  await expect(page.getByRole("heading", { level: 4, name: "A" })).toBeVisible();

  await menuToggle.click();
  await expect(page.getByRole("heading", { level: 4, name: "Admin Portal" })).toBeVisible();

  await openMenu(page, "实验手册管理", "实验手册管理");
  await openMenu(page, "实验数据管理", "实验数据管理");
  await openMenu(page, "用户管理", "用户列表");
  await openMenu(page, "班级管理", "班级管理");

  await page.locator(".ant-avatar").first().click();
  await page.getByRole("menuitem", { name: "退出登录" }).click();

  const logoutModal = await getVisibleModal(page, "确认退出");
  await logoutModal.getByRole("button", { name: /取\s*消/ }).click();
  await expect(page).toHaveURL(/\/admin\.html$/);

  await page.locator(".ant-avatar").first().click();
  await page.getByRole("menuitem", { name: "退出登录" }).click();
  const logoutConfirm = await getVisibleModal(page, "确认退出");
  await logoutConfirm.getByRole("button", { name: /退\s*出/ }).click();

  await expect(page).toHaveURL(/\/login\.html$/);
  const token = await page.evaluate(() => localStorage.getItem("token"));
  expect(token).toBeNull();
});

test("@admin 实验手册全部操作覆盖", async ({ page }) => {
  await loginAsAdmin(page);
  await openMenu(page, "实验手册管理", "实验手册管理");

  const manualName = makeRunId("E2E手册");
  const updatedManualName = `${manualName}-更新`;

  await page.getByRole("button", { name: "新增" }).click();
  const createModal = await getVisibleModal(page, "新增实验手册");
  await cancelModal(createModal);
  await expect(createModal).not.toBeVisible();

  await page.getByRole("button", { name: "新增" }).click();
  const createAgainModal = await getVisibleModal(page, "新增实验手册");
  await fillFormField(createAgainModal, "手册名称", manualName);
  await fillFormField(createAgainModal, "备注", "e2e manual upload");
  await createAgainModal.locator('input[type="file"]').setInputFiles({
    name: `manual-${Date.now()}.pdf`,
    mimeType: "application/pdf",
    buffer: buildTinyPdfBuffer(),
  });
  await confirmModal(createAgainModal);

  await expectSuccessMessage(page, "上传成功");

  const manualRow = tableRowByText(page, manualName);
  await expect(manualRow).toBeVisible();

  await manualRow.getByRole("button", { name: `编辑 ${manualName}` }).click();
  const editModal = await getVisibleModal(page, "修改实验手册");
  await fillFormField(editModal, "手册名称", updatedManualName);
  await fillFormField(editModal, "备注", "e2e manual updated");
  await confirmModal(editModal);

  await expectSuccessMessage(page, "保存成功");
  const updatedRow = tableRowByText(page, updatedManualName);
  await expect(updatedRow).toBeVisible();

  await updatedRow.getByRole("switch").click();
  await expectSuccessMessage(page, "状态更新成功");

  const manualDownloadResponse = await waitForAuthedFileResponse(page, "/manuals/", async () => {
    await updatedRow.getByRole("button", { name: `下载 ${updatedManualName}` }).click();
  });
  expect(manualDownloadResponse.headers()["content-disposition"] ?? "").toContain("inline");
  expect(manualDownloadResponse.headers()["content-disposition"] ?? "").toContain("filename*=UTF-8''");

  await updatedRow.getByRole("button", { name: `删除 ${updatedManualName}` }).click();
  await confirmDelete(page);
  await expectSuccessMessage(page, "删除成功");
  await expect(page.locator("tr").filter({ hasText: updatedManualName })).toHaveCount(0);
});

test("@admin 实验数据全部操作覆盖（含中文文件名下载）", async ({ page }) => {
  await loginAsAdmin(page);
  await openMenu(page, "实验数据管理", "实验数据管理");

  const datasetName = makeRunId("E2E数据集");
  const updatedDatasetName = `${datasetName}-更新`;
  const chineseCsvName = `3-726_鲁泰纺织股份有限公司_${Date.now()}.csv`;

  await page.getByRole("button", { name: "新增数据" }).click();
  const createModal = await getVisibleModal(page, "新增实验数据");

  const [datasetTemplateDownload] = await Promise.all([
    page.waitForEvent("download"),
    createModal.getByRole("button", { name: "下载模板" }).click(),
  ]);
  expect(datasetTemplateDownload.suggestedFilename()).toContain("实验数据导入模板");

  await fillFormField(createModal, "数据集名称", datasetName);
  await fillFormField(createModal, "备注", "e2e dataset upload");
  await createModal.locator('input[type="file"]').setInputFiles({
    name: chineseCsvName,
    mimeType: "text/csv",
    buffer: buildCsv([
      datasetCsvHeaders,
      ["纺织行业", "鲁泰纺织股份有限公司", "色织布", "2024", "1", "100", "米"],
      ["纺织行业", "鲁泰纺织股份有限公司", "色织布", "2024", "2", "120", "米"],
    ]),
  });
  await confirmModal(createModal);

  await expectSuccessMessage(page, "上传成功");

  const datasetRow = tableRowByText(page, datasetName);
  await expect(datasetRow).toBeVisible();

  await datasetRow.getByRole("button", { name: `Edit ${datasetName}` }).click();
  const editModal = await getVisibleModal(page, "修改实验数据");
  await fillFormField(editModal, "数据集名称", updatedDatasetName);
  await fillFormField(editModal, "备注", "e2e dataset updated");
  await confirmModal(editModal);

  await expectSuccessMessage(page, "保存成功");
  const updatedRow = tableRowByText(page, updatedDatasetName);
  await expect(updatedRow).toBeVisible();

  const datasetDownloadResponse = await waitForAuthedFileResponse(page, "/datasets/", async () => {
    await updatedRow.getByRole("button", { name: `Download ${updatedDatasetName}` }).click();
  });
  const contentDisposition = datasetDownloadResponse.headers()["content-disposition"] ?? "";
  expect(contentDisposition).toContain("attachment");
  expect(contentDisposition).toContain("filename*=UTF-8''");

  await updatedRow.getByRole("button", { name: `Delete ${updatedDatasetName}` }).click();
  await confirmDelete(page);
  await expectSuccessMessage(page, "删除成功");
  await expect(page.locator("tr").filter({ hasText: updatedDatasetName })).toHaveCount(0);
});

test("@admin 用户单个增删改操作覆盖（含管理员自保护）", async ({ page }) => {
  await loginAsAdmin(page);
  await openMenu(page, "用户管理", "用户列表");

  const adminRow = tableRowByText(page, "系统管理员");
  await expect(adminRow.getByRole("button", { name: "重置密码 admin" })).toBeDisabled();
  await expect(adminRow.getByRole("button", { name: "删除用户 admin" })).toBeDisabled();

  const teacherUsername = `t${Date.now().toString().slice(-8)}`;
  const teacherName = `E2E教师${makeRunId("S")}`;
  const teacherPhone = makePhone(1);

  await page.locator("button").filter({ hasText: /^添加教师$/ }).first().click();
  const teacherModal = await getVisibleModal(page, "添加教师");
  await fillFormField(teacherModal, "用户名", teacherUsername);
  await fillFormField(teacherModal, "姓名", teacherName);
  await fillFormField(teacherModal, "邮箱", `${teacherUsername}@e2e.test`);
  await fillFormField(teacherModal, "手机号", teacherPhone);
  await fillFormField(teacherModal, "密码", "Pass1234");
  await confirmModal(teacherModal);

  await expectSuccessMessage(page, "教师添加成功");

  await searchUsers(page, teacherName);
  const teacherRow = tableRowByText(page, teacherName);
  await expect(teacherRow).toBeVisible();

  await teacherRow.getByRole("button", { name: `重置密码 ${teacherUsername}` }).click();
  const passwordModal = await getVisibleModal(page, "修改用户");
  await fillFormField(passwordModal, "新密码", "Reset1234");
  await fillFormField(passwordModal, "确认密码", "Reset1234");
  await confirmModal(passwordModal);
  await expectSuccessMessage(page, "重置密码");

  await teacherRow.getByRole("button", { name: `删除用户 ${teacherUsername}` }).click();
  await confirmDelete(page);
  await expectSuccessMessage(page, "用户删除成功");

  const assistantUsername = `a${Date.now().toString().slice(-8)}`;
  const assistantName = `E2E助教${makeRunId("S")}`;
  const assistantPhone = makePhone(2);

  await page.locator("button").filter({ hasText: /^添加助教$/ }).first().click();
  const assistantModal = await getVisibleModal(page, "添加助教");
  await fillFormField(assistantModal, "用户名", assistantUsername);
  await fillFormField(assistantModal, "姓名", assistantName);
  await fillFormField(assistantModal, "邮箱", `${assistantUsername}@e2e.test`);
  await fillFormField(assistantModal, "手机号", assistantPhone);
  await fillFormField(assistantModal, "密码", "Pass1234");
  await confirmModal(assistantModal);

  await expectSuccessMessage(page, "助教添加成功");
  await searchUsers(page, assistantName);
  const assistantRow = tableRowByText(page, assistantName);
  await expect(assistantRow).toBeVisible();

  await assistantRow.getByRole("button", { name: `删除用户 ${assistantUsername}` }).click();
  await confirmDelete(page);
  await expectSuccessMessage(page, "用户删除成功");
});

test("@admin 批量添加教师操作覆盖（模板+上传）", async ({ page }) => {
  await loginAsAdmin(page);
  await openMenu(page, "用户管理", "用户列表");

  const batchTeacherName = `批量教师${makeRunId("B")}`;
  const batchTeacherPhone = makePhone(3);

  await page.locator("button").filter({ hasText: /^批量添加教师$/ }).first().click();
  const batchModal = await getVisibleModal(page, "批量添加教师");

  await expect(batchModal.getByText("CSV 字段说明")).toBeVisible();
  await expect(batchModal.getByText("账号自动生成")).toBeVisible();
  await expect(batchModal.getByText("prof_手机号")).toBeVisible();

  const [teacherTemplateDownload] = await Promise.all([
    page.waitForEvent("download"),
    batchModal.getByRole("button", { name: "下载模板" }).click(),
  ]);
  expect(teacherTemplateDownload.suggestedFilename()).toContain("教师批量导入模板");

  await batchModal.locator('input[type="file"]').setInputFiles({
    name: "batch-teachers.csv",
    mimeType: "text/csv",
    buffer: buildCsv([
      ["姓名", "手机号"],
      [batchTeacherName, batchTeacherPhone],
    ]),
  });
  await confirmModal(batchModal);

  await expectSuccessMessage(page, "批量添加教师成功");
  await searchUsers(page, batchTeacherName);
  await expect(tableRowByText(page, batchTeacherName)).toBeVisible();
});

test("@admin 批量添加助教操作覆盖（模板+上传）", async ({ page }) => {
  await loginAsAdmin(page);
  await openMenu(page, "用户管理", "用户列表");

  const batchAssistantName = `批量助教${makeRunId("B")}`;
  const batchAssistantPhone = makePhone(4);

  await page.locator("button").filter({ hasText: /^批量添加助教$/ }).first().click();
  const batchModal = await getVisibleModal(page, "批量添加助教");

  await expect(batchModal.getByText("CSV 字段说明")).toBeVisible();
  await expect(batchModal.getByText("账号自动生成")).toBeVisible();
  await expect(batchModal.getByText("ta_手机号")).toBeVisible();

  const [assistantTemplateDownload] = await Promise.all([
    page.waitForEvent("download"),
    batchModal.getByRole("button", { name: "下载模板" }).click(),
  ]);
  expect(assistantTemplateDownload.suggestedFilename()).toContain("助教批量导入模板");

  await batchModal.locator('input[type="file"]').setInputFiles({
    name: "batch-assistants.csv",
    mimeType: "text/csv",
    buffer: buildCsv([
      ["姓名", "手机号"],
      [batchAssistantName, batchAssistantPhone],
    ]),
  });
  await confirmModal(batchModal);

  await expectSuccessMessage(page, "批量添加助教成功");
  await searchUsers(page, batchAssistantName);
  await expect(tableRowByText(page, batchAssistantName)).toBeVisible();
});

test("@admin 班级管理全部操作覆盖", async ({ page }) => {
  await loginAsAdmin(page);
  await openMenu(page, "班级管理", "班级管理");

  const search = page.getByPlaceholder("请输入班级名称或编号");
  await search.fill("计算机科学与技术2501");

  const classRow = tableRowByText(page, "计算机科学与技术2501");
  await expect(classRow).toBeVisible();

  await classRow.getByRole("button", { name: "查看班级详情" }).click();
  const detailsModal = await getVisibleModal(page, "班级详情 - 计算机科学与技术2501");

  await expect(detailsModal.getByText("所属教师")).toBeVisible();
  await detailsModal.getByRole("tab", { name: "助教列表" }).click();
  await expect(detailsModal.getByText("助教列表")).toBeVisible();
  await detailsModal.getByRole("tab", { name: "学生列表" }).click();
  await expect(detailsModal.getByText("学生列表")).toBeVisible();

  await detailsModal.getByRole("button", { name: /关\s*闭/ }).click();
  await expect(detailsModal).not.toBeVisible();

  await search.fill("");
  await expect(tableRowByText(page, "计算机科学与技术2502")).toBeVisible();
});
