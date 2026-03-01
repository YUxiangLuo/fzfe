/**
 * Admin E2E Tests
 *
 * Tests for admin role covering:
 * - Layout and session (menu navigation, logout)
 * - Manual management (CRUD, download)
 * - Dataset management (CRUD, download, Chinese filename)
 * - User management (add/delete teacher & assistant, batch add, form validation)
 * - Class management (search, view details)
 * - Auth guards and edge cases
 */

import { expect, test, type Page, type Response } from "@playwright/test";
import {
  // Generators
  makeRunId,
  makePhone,
  buildCsv,
  // Navigation
  openTopLevelPage,
  // Locators
  tableRowByText,
  getVisibleModal,
  fillFormField,
  // Modal actions
  confirmModal,
  cancelModal,
  confirmDelete,
  // Assertions
  expectSuccessMessage,
  // Login
  loginAs,
  // Fixtures & Constants
  ACCOUNTS,
  // Selectors
  AdminManualSelectors,
  AdminDatasetSelectors,
  AdminUserSelectors,
  AdminClassSelectors,
  SuccessMessages,
  ModalTitles,
} from "../helpers";

// ===== Admin-specific Utilities =====

function buildTinyPdfBuffer(): Buffer {
  const pdfContent = `%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Count 1 /Kids [3 0 R] >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \ntrailer\n<< /Root 1 0 R /Size 4 >>\nstartxref\n173\n%%EOF\n`;
  return Buffer.from(pdfContent, "utf8");
}

function buildFakeToken(role: string, expSeconds = 3600): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64");
  const payload = Buffer.from(
    JSON.stringify({
      sub: 999,
      username: "fake_user",
      role,
      exp: Math.floor(Date.now() / 1000) + expSeconds,
      iat: Math.floor(Date.now() / 1000),
    }),
  ).toString("base64");
  return `${header}.${payload}.fake_signature`;
}

async function searchUsers(page: Page, keyword: string) {
  const searchInput = page.getByPlaceholder(AdminUserSelectors.searchInput.placeholder);
  await searchInput.fill(keyword);

  const trimmedKeyword = keyword.trim();
  const encodedKeyword = encodeURIComponent(trimmedKeyword);

  const [response] = await Promise.all([
    page.waitForResponse((resp) => {
      if (resp.request().method() !== "GET" || !resp.ok()) return false;
      const url = resp.url();

      if (trimmedKeyword.length > 0) {
        return url.includes("/api/v1/users/search") && url.includes(`q=${encodedKeyword}`);
      }

      return url.includes("/api/v1/users?") && !url.includes("/api/v1/users/search");
    }),
    searchInput.press("Enter"),
  ]);

  expect(response.ok()).toBeTruthy();
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

// ===== Setup =====

async function loginAsAdmin(page: Page): Promise<void> {
  await loginAs(page, {
    username: ACCOUNTS.admin.username,
    password: ACCOUNTS.admin.password,
    role: "admin",
  });
}

// ===== Test Suite =====

test.describe("@admin 布局与会话", () => {
  test("菜单导航与退出登录", async ({ page }) => {
    await loginAsAdmin(page);

    const menuToggle = page.locator("header button").first();
    await menuToggle.click();
    await expect(page.getByRole("heading", { level: 4, name: "A" })).toBeVisible();

    await menuToggle.click();
    await expect(page.getByRole("heading", { level: 4, name: "Admin Portal" })).toBeVisible();

    await openTopLevelPage(page, "实验手册管理", "实验手册管理");
    await openTopLevelPage(page, "实验数据管理", "实验数据管理");
    await openTopLevelPage(page, "用户管理", "用户列表");
    await openTopLevelPage(page, "班级管理", "班级管理");

    await page.locator(".ant-avatar").first().click();
    await page.getByRole("menuitem", { name: "退出登录" }).click();

    const logoutModal = await getVisibleModal(page, ModalTitles.logoutConfirm);
    await cancelModal(logoutModal);
    await expect(page).toHaveURL(/\/admin\.html$/);

    await page.locator(".ant-avatar").first().click();
    await page.getByRole("menuitem", { name: "退出登录" }).click();
    const logoutConfirm = await getVisibleModal(page, ModalTitles.logoutConfirm);
    await logoutConfirm.getByRole("button", { name: /退\s*出/ }).click();

    await expect(page).toHaveURL(/\/login\.html$/);
    const token = await page.evaluate(() => localStorage.getItem("token"));
    expect(token).toBeNull();
  });
});

test.describe("@admin 实验手册管理", () => {
  test("全部操作覆盖", async ({ page }) => {
    await loginAsAdmin(page);
    await openTopLevelPage(page, "实验手册管理", "实验手册管理");

    const manualName = makeRunId("E2E手册");
    const updatedManualName = `${manualName}-更新`;

    // Create cancel
    await page.getByRole(AdminManualSelectors.addBtn.role, { name: AdminManualSelectors.addBtn.name }).click();
    const createModal = await getVisibleModal(page, ModalTitles.addManual);
    await cancelModal(createModal);
    await expect(createModal).not.toBeVisible();

    // Create
    await page.getByRole(AdminManualSelectors.addBtn.role, { name: AdminManualSelectors.addBtn.name }).click();
    const createAgainModal = await getVisibleModal(page, ModalTitles.addManual);
    await fillFormField(createAgainModal, AdminManualSelectors.manualNameInput, manualName);
    await fillFormField(createAgainModal, AdminManualSelectors.remarkInput, "e2e manual upload");
    await createAgainModal.locator(AdminManualSelectors.fileInput).setInputFiles({
      name: `manual-${Date.now()}.pdf`,
      mimeType: "application/pdf",
      buffer: buildTinyPdfBuffer(),
    });
    await confirmModal(createAgainModal);

    await expectSuccessMessage(page, SuccessMessages.uploadSuccess);

    const manualRow = tableRowByText(page, manualName);
    await expect(manualRow).toBeVisible();

    // Edit
    await manualRow.getByRole("button", { name: `编辑 ${manualName}` }).click();
    const editModal = await getVisibleModal(page, ModalTitles.editManual);
    await fillFormField(editModal, AdminManualSelectors.manualNameInput, updatedManualName);
    await fillFormField(editModal, AdminManualSelectors.remarkInput, "e2e manual updated");
    await confirmModal(editModal);

    await expectSuccessMessage(page, SuccessMessages.saveSuccess);
    const updatedRow = tableRowByText(page, updatedManualName);
    await expect(updatedRow).toBeVisible();

    // Toggle status
    await updatedRow.getByRole("switch").click();
    await expectSuccessMessage(page, SuccessMessages.statusUpdated);

    // Download
    const manualDownloadResponse = await waitForAuthedFileResponse(page, "/manuals/", async () => {
      await updatedRow.getByRole("button", { name: `下载 ${updatedManualName}` }).click();
    });
    expect(manualDownloadResponse.headers()["content-disposition"] ?? "").toContain("inline");
    expect(manualDownloadResponse.headers()["content-disposition"] ?? "").toContain("filename*=UTF-8''");

    // Delete
    await updatedRow.getByRole("button", { name: `删除 ${updatedManualName}` }).click();
    await confirmDelete(page);
    await expectSuccessMessage(page, SuccessMessages.deleteSuccess);
    await expect(page.locator("tr").filter({ hasText: updatedManualName })).toHaveCount(0);
  });
});

test.describe("@admin 实验数据管理", () => {
  test("全部操作覆盖（含中文文件名下载）", async ({ page }) => {
    await loginAsAdmin(page);
    await openTopLevelPage(page, "实验数据管理", "实验数据管理");

    const datasetName = makeRunId("E2E数据集");
    const updatedDatasetName = `${datasetName}-更新`;
    const chineseCsvName = `3-726_鲁泰纺织股份有限公司_${Date.now()}.csv`;

    // Create with template download
    await page.getByRole(AdminDatasetSelectors.addBtn.role, { name: AdminDatasetSelectors.addBtn.name }).click();
    const createModal = await getVisibleModal(page, ModalTitles.addDataset);

    const [datasetTemplateDownload] = await Promise.all([
      page.waitForEvent("download"),
      createModal.getByRole(AdminDatasetSelectors.downloadTemplateBtn.role, { name: AdminDatasetSelectors.downloadTemplateBtn.name }).click(),
    ]);
    expect(datasetTemplateDownload.suggestedFilename()).toContain("实验数据导入模板");

    await fillFormField(createModal, AdminDatasetSelectors.datasetNameInput, datasetName);
    await fillFormField(createModal, AdminDatasetSelectors.remarkInput, "e2e dataset upload");
    await createModal.locator(AdminDatasetSelectors.fileInput).setInputFiles({
      name: chineseCsvName,
      mimeType: "text/csv",
      buffer: buildCsv([
        AdminDatasetSelectors.csvHeaders,
        ["纺织行业", "鲁泰纺织股份有限公司", "色织布", "2024", "1", "100", "米"],
        ["纺织行业", "鲁泰纺织股份有限公司", "色织布", "2024", "2", "120", "米"],
      ]),
    });
    await confirmModal(createModal);

    await expectSuccessMessage(page, SuccessMessages.uploadSuccess);

    const datasetRow = tableRowByText(page, datasetName);
    await expect(datasetRow).toBeVisible();

    // Edit
    await datasetRow.getByRole("button", { name: `Edit ${datasetName}` }).click();
    const editModal = await getVisibleModal(page, ModalTitles.editDataset);
    await fillFormField(editModal, AdminDatasetSelectors.datasetNameInput, updatedDatasetName);
    await fillFormField(editModal, AdminDatasetSelectors.remarkInput, "e2e dataset updated");
    await confirmModal(editModal);

    await expectSuccessMessage(page, SuccessMessages.saveSuccess);
    const updatedRow = tableRowByText(page, updatedDatasetName);
    await expect(updatedRow).toBeVisible();

    // Download
    const datasetDownloadResponse = await waitForAuthedFileResponse(page, "/datasets/", async () => {
      await updatedRow.getByRole("button", { name: `Download ${updatedDatasetName}` }).click();
    });
    const contentDisposition = datasetDownloadResponse.headers()["content-disposition"] ?? "";
    expect(contentDisposition).toContain("attachment");
    expect(contentDisposition).toContain("filename*=UTF-8''");

    // Delete
    await updatedRow.getByRole("button", { name: `Delete ${updatedDatasetName}` }).click();
    await confirmDelete(page);
    await expectSuccessMessage(page, SuccessMessages.deleteSuccess);
    await expect(page.locator("tr").filter({ hasText: updatedDatasetName })).toHaveCount(0);
  });
});

test.describe("@admin 用户管理", () => {
  test("单个增删改操作覆盖（含管理员自保护）", async ({ page }) => {
    await loginAsAdmin(page);
    await openTopLevelPage(page, "用户管理", "用户列表");

    // Admin self-protection
    const adminRow = tableRowByText(page, "系统管理员");
    await expect(adminRow.getByRole("button", { name: "重置密码 admin" })).toBeDisabled();
    await expect(adminRow.getByRole("button", { name: "删除用户 admin" })).toBeDisabled();

    // Add teacher
    const teacherUsername = `t${Date.now().toString().slice(-8)}`;
    const teacherName = `E2E教师${makeRunId("S")}`;
    const teacherPhone = makePhone(1);

    await page.locator("button").filter({ hasText: AdminUserSelectors.addTeacherBtn }).first().click();
    const teacherModal = await getVisibleModal(page, ModalTitles.addTeacher);
    await fillFormField(teacherModal, AdminUserSelectors.usernameInput, teacherUsername);
    await fillFormField(teacherModal, AdminUserSelectors.fullNameInput, teacherName);
    await fillFormField(teacherModal, AdminUserSelectors.emailInput, `${teacherUsername}@e2e.test`);
    await fillFormField(teacherModal, AdminUserSelectors.phoneInput, teacherPhone);
    await fillFormField(teacherModal, AdminUserSelectors.passwordInput, "Pass1234");
    await confirmModal(teacherModal);

    await expectSuccessMessage(page, SuccessMessages.teacherAdded);

    await searchUsers(page, teacherName);
    const teacherRow = tableRowByText(page, teacherName);
    await expect(teacherRow).toBeVisible();

    // Reset password
    await teacherRow.getByRole("button", { name: `重置密码 ${teacherUsername}` }).click();
    const passwordModal = await getVisibleModal(page, ModalTitles.resetUserPassword);
    await fillFormField(passwordModal, AdminUserSelectors.newPasswordInput, "Reset1234");
    await fillFormField(passwordModal, AdminUserSelectors.confirmPasswordInput, "Reset1234");
    await confirmModal(passwordModal);
    await expectSuccessMessage(page, SuccessMessages.resetPassword);

    // Delete teacher
    await teacherRow.getByRole("button", { name: `删除用户 ${teacherUsername}` }).click();
    await confirmDelete(page);
    await expectSuccessMessage(page, SuccessMessages.userDeleted);

    // Add assistant
    const assistantUsername = `a${Date.now().toString().slice(-8)}`;
    const assistantName = `E2E助教${makeRunId("S")}`;
    const assistantPhone = makePhone(2);

    await page.locator("button").filter({ hasText: AdminUserSelectors.addAssistantBtn }).first().click();
    const assistantModal = await getVisibleModal(page, ModalTitles.addAssistant);
    await fillFormField(assistantModal, AdminUserSelectors.usernameInput, assistantUsername);
    await fillFormField(assistantModal, AdminUserSelectors.fullNameInput, assistantName);
    await fillFormField(assistantModal, AdminUserSelectors.emailInput, `${assistantUsername}@e2e.test`);
    await fillFormField(assistantModal, AdminUserSelectors.phoneInput, assistantPhone);
    await fillFormField(assistantModal, AdminUserSelectors.passwordInput, "Pass1234");
    await confirmModal(assistantModal);

    await expectSuccessMessage(page, SuccessMessages.assistantAdded);
    await searchUsers(page, assistantName);
    const assistantRow = tableRowByText(page, assistantName);
    await expect(assistantRow).toBeVisible();

    // Delete assistant
    await assistantRow.getByRole("button", { name: `删除用户 ${assistantUsername}` }).click();
    await confirmDelete(page);
    await expectSuccessMessage(page, SuccessMessages.userDeleted);
  });

  test("批量添加教师（模板+上传）", async ({ page }) => {
    await loginAsAdmin(page);
    await openTopLevelPage(page, "用户管理", "用户列表");

    const batchTeacherName = `批量教师${makeRunId("B")}`;
    const batchTeacherPhone = makePhone(3);

    await page.locator("button").filter({ hasText: AdminUserSelectors.batchAddTeacherBtn }).first().click();
    const batchModal = await getVisibleModal(page, ModalTitles.batchAddTeacher);

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

    await expectSuccessMessage(page, SuccessMessages.batchTeacherAdded);
    await searchUsers(page, batchTeacherName);
    await expect(tableRowByText(page, batchTeacherName)).toBeVisible();
  });

  test("批量添加助教（模板+上传）", async ({ page }) => {
    await loginAsAdmin(page);
    await openTopLevelPage(page, "用户管理", "用户列表");

    const batchAssistantName = `批量助教${makeRunId("B")}`;
    const batchAssistantPhone = makePhone(4);

    await page.locator("button").filter({ hasText: AdminUserSelectors.batchAddAssistantBtn }).first().click();
    const batchModal = await getVisibleModal(page, ModalTitles.batchAddAssistant);

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

    await expectSuccessMessage(page, SuccessMessages.batchAssistantAdded);
    await searchUsers(page, batchAssistantName);
    await expect(tableRowByText(page, batchAssistantName)).toBeVisible();
  });

  test("表单校验：各类无效输入", async ({ page }) => {
    await loginAsAdmin(page);
    await openTopLevelPage(page, "用户管理", "用户列表");

    // Empty form submission
    await page.locator("button").filter({ hasText: AdminUserSelectors.addTeacherBtn }).first().click();
    const teacherModal = await getVisibleModal(page, ModalTitles.addTeacher);
    await confirmModal(teacherModal);
    await expect(teacherModal.getByText("请输入用户名")).toBeVisible();
    await expect(teacherModal.getByText("请输入姓名")).toBeVisible();
    await expect(teacherModal.getByText("请输入邮箱")).toBeVisible();
    await expect(teacherModal.getByText("请输入手机号")).toBeVisible();
    await expect(teacherModal.getByText("请输入密码")).toBeVisible();

    // Invalid email
    await fillFormField(teacherModal, AdminUserSelectors.emailInput, "bad-email");
    await confirmModal(teacherModal);
    await expect(teacherModal.getByText("邮箱格式不正确")).toBeVisible();

    // Invalid phone
    await fillFormField(teacherModal, AdminUserSelectors.phoneInput, "12345");
    await confirmModal(teacherModal);
    await expect(teacherModal.getByText("手机号格式不正确")).toBeVisible();

    // Short password
    await fillFormField(teacherModal, AdminUserSelectors.passwordInput, "ab");
    await confirmModal(teacherModal);
    await expect(teacherModal.getByText("密码至少需要6个字符")).toBeVisible();

    await cancelModal(teacherModal);
    await expect(teacherModal).not.toBeVisible();

    // Create temp teacher for reset password validation
    const tempUsername = `t${Date.now().toString().slice(-8)}`;
    const tempName = `E2E校验${makeRunId("V")}`;
    const tempPhone = makePhone(10);

    await page.locator("button").filter({ hasText: AdminUserSelectors.addTeacherBtn }).first().click();
    const createModal = await getVisibleModal(page, ModalTitles.addTeacher);
    await fillFormField(createModal, AdminUserSelectors.usernameInput, tempUsername);
    await fillFormField(createModal, AdminUserSelectors.fullNameInput, tempName);
    await fillFormField(createModal, AdminUserSelectors.emailInput, `${tempUsername}@e2e.test`);
    await fillFormField(createModal, AdminUserSelectors.phoneInput, tempPhone);
    await fillFormField(createModal, AdminUserSelectors.passwordInput, "Pass1234");
    await confirmModal(createModal);
    await expectSuccessMessage(page, SuccessMessages.teacherAdded);

    await searchUsers(page, tempName);
    const tempRow = tableRowByText(page, tempName);
    await expect(tempRow).toBeVisible();

    // Password mismatch
    await tempRow.getByRole("button", { name: `重置密码 ${tempUsername}` }).click();
    const passwordModal = await getVisibleModal(page, ModalTitles.resetUserPassword);
    await fillFormField(passwordModal, AdminUserSelectors.newPasswordInput, "Password1");
    await fillFormField(passwordModal, AdminUserSelectors.confirmPasswordInput, "Password2");
    await confirmModal(passwordModal);
    await expect(passwordModal.getByText("两次输入的密码不一致")).toBeVisible();

    await cancelModal(passwordModal);
    await expect(passwordModal).not.toBeVisible();

    // Cleanup
    await tempRow.getByRole("button", { name: `删除用户 ${tempUsername}` }).click();
    await confirmDelete(page);
    await expectSuccessMessage(page, SuccessMessages.userDeleted);
  });
});

test.describe("@admin 班级管理", () => {
  test("搜索与查看班级详情", async ({ page }) => {
    await loginAsAdmin(page);
    await openTopLevelPage(page, "班级管理", "班级管理");

    const search = page.getByPlaceholder(AdminClassSelectors.searchInput.placeholder);
    await search.fill("计算机科学与技术2501");

    const classRow = tableRowByText(page, "计算机科学与技术2501");
    await expect(classRow).toBeVisible();

    await classRow.getByRole(AdminClassSelectors.viewDetailBtn.role, { name: AdminClassSelectors.viewDetailBtn.name }).click();
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
});

test.describe("@admin 认证与边缘测试", () => {
  test("认证守卫：无token或非admin角色重定向", async ({ page }) => {
    // No token → redirect to login
    await page.goto("/admin.html");
    await expect(page).toHaveURL(/\/login\.html$/);

    // Non-admin role token → redirect to login
    const studentToken = buildFakeToken("Student");
    await page.evaluate((t) => localStorage.setItem("token", t), studentToken);
    await page.goto("/admin.html");
    await expect(page).toHaveURL(/\/login\.html$/);
  });

  test("搜索边缘：清空与无结果", async ({ page }) => {
    await loginAsAdmin(page);
    await openTopLevelPage(page, "用户管理", "用户列表");

    // User search: no results
    await searchUsers(page, "NONEXIST_E2E_xxx");
    await expect(page.locator(".ant-empty").first()).toBeVisible();

    // User search: clear → admin reappears
    await searchUsers(page, "");
    await expect(tableRowByText(page, "系统管理员")).toBeVisible();

    // Class search
    await openTopLevelPage(page, "班级管理", "班级管理");
    const classSearch = page.getByPlaceholder(AdminClassSelectors.searchInput.placeholder);

    // Class search: no results
    await classSearch.fill("NONEXIST_E2E_xxx");
    await expect(page.locator(".ant-empty").first()).toBeVisible();

    // Class search: clear → data reappears
    await classSearch.fill("");
    await expect(tableRowByText(page, "计算机科学与技术2501")).toBeVisible();
  });

  test("取消操作：删除取消与编辑取消", async ({ page }) => {
    await loginAsAdmin(page);

    // ---- Manual: create, delete-cancel, edit-cancel ----
    await openTopLevelPage(page, "实验手册管理", "实验手册管理");
    const manualName = makeRunId("E2E取消手册");

    await page.getByRole(AdminManualSelectors.addBtn.role, { name: AdminManualSelectors.addBtn.name }).click();
    const createManualModal = await getVisibleModal(page, ModalTitles.addManual);
    await fillFormField(createManualModal, AdminManualSelectors.manualNameInput, manualName);
    await fillFormField(createManualModal, AdminManualSelectors.remarkInput, "cancel test");
    await createManualModal.locator(AdminManualSelectors.fileInput).setInputFiles({
      name: `manual-cancel-${Date.now()}.pdf`,
      mimeType: "application/pdf",
      buffer: buildTinyPdfBuffer(),
    });
    await confirmModal(createManualModal);
    await expectSuccessMessage(page, SuccessMessages.uploadSuccess);

    const manualRow = tableRowByText(page, manualName);
    await expect(manualRow).toBeVisible();

    // Delete cancel → manual still exists
    await manualRow.getByRole("button", { name: `删除 ${manualName}` }).click();
    const deleteManualModal = await getVisibleModal(page, ModalTitles.deleteConfirm);
    await cancelModal(deleteManualModal);
    await expect(manualRow).toBeVisible();

    // Edit cancel → original name unchanged
    await manualRow.getByRole("button", { name: `编辑 ${manualName}` }).click();
    const editManualModal = await getVisibleModal(page, ModalTitles.editManual);
    await fillFormField(editManualModal, AdminManualSelectors.manualNameInput, `${manualName}-changed`);
    await cancelModal(editManualModal);
    await expect(editManualModal).not.toBeVisible();
    await expect(tableRowByText(page, manualName)).toBeVisible();

    // ---- Dataset: create, delete-cancel ----
    await openTopLevelPage(page, "实验数据管理", "实验数据管理");
    const datasetName = makeRunId("E2E取消数据集");

    await page.getByRole(AdminDatasetSelectors.addBtn.role, { name: AdminDatasetSelectors.addBtn.name }).click();
    const createDatasetModal = await getVisibleModal(page, ModalTitles.addDataset);
    await fillFormField(createDatasetModal, AdminDatasetSelectors.datasetNameInput, datasetName);
    await fillFormField(createDatasetModal, AdminDatasetSelectors.remarkInput, "cancel test");
    await createDatasetModal.locator(AdminDatasetSelectors.fileInput).setInputFiles({
      name: `dataset-cancel-${Date.now()}.csv`,
      mimeType: "text/csv",
      buffer: buildCsv([
        AdminDatasetSelectors.csvHeaders,
        ["纺织行业", "鲁泰纺织", "布", "2024", "1", "50", "米"],
      ]),
    });
    await confirmModal(createDatasetModal);
    await expectSuccessMessage(page, SuccessMessages.uploadSuccess);

    const datasetRow = tableRowByText(page, datasetName);
    await expect(datasetRow).toBeVisible();

    // Delete cancel → dataset still exists
    await datasetRow.getByRole("button", { name: `Delete ${datasetName}` }).click();
    const deleteDatasetModal = await getVisibleModal(page, ModalTitles.deleteConfirm);
    await cancelModal(deleteDatasetModal);
    await expect(datasetRow).toBeVisible();

    // ---- Cleanup ----
    await datasetRow.getByRole("button", { name: `Delete ${datasetName}` }).click();
    await confirmDelete(page);
    await expectSuccessMessage(page, SuccessMessages.deleteSuccess);

    await openTopLevelPage(page, "实验手册管理", "实验手册管理");
    await tableRowByText(page, manualName).getByRole("button", { name: `删除 ${manualName}` }).click();
    await confirmDelete(page);
    await expectSuccessMessage(page, SuccessMessages.deleteSuccess);
  });
});
