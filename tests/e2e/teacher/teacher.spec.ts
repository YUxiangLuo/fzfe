import { expect, test, type Locator, type Page } from "@playwright/test";

const TEACHER_USERNAME = process.env.E2E_TEACHER_USERNAME ?? "teacher1";
const TEACHER_PASSWORD = process.env.E2E_TEACHER_PASSWORD ?? "TeacherE2E!234";
const TEMP_TEACHER_PASSWORD = process.env.E2E_TEACHER_TEMP_PASSWORD ?? "TeacherE2E!567";
const DEFAULT_CLASS_NAME = "计算机科学与技术2501";

function makeRunId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

function makePhone(offset: number): string {
  const num = (Date.now() + offset) % 1_000_000_000;
  return `13${num.toString().padStart(9, "0")}`;
}

function makeLetters(length: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyz";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function makeStudentNo(offset: number): string {
  const num = (Date.now() + offset) % 1_000_000_000;
  return `9${num.toString().padStart(9, "0")}`;
}

function buildCsv(rows: string[][]): Buffer {
  return Buffer.from(rows.map((row) => row.join(",")).join("\n"), "utf8");
}

function tableRowByText(page: Page, text: string): Locator {
  return page.locator("tr").filter({ hasText: text }).first();
}

async function getVisibleModal(page: Page, title: RegExp | string): Promise<Locator> {
  const modal = page.getByRole("dialog", { name: title }).first();
  await expect(modal).toBeVisible();
  return modal;
}

async function expectSuccessMessage(page: Page, keyword: string) {
  const notice = page.locator(".ant-message-notice-content");
  await expect(notice.filter({ hasText: keyword }).last()).toBeVisible({ timeout: 20_000 });
}

async function fillFormField(modal: Locator, label: string, value: string) {
  const formItem = modal.locator(".ant-form-item").filter({ hasText: label }).first();
  await expect(formItem).toBeVisible();
  await formItem.locator("input, textarea").first().fill(value);
}

async function selectOptionByLabel(page: Page, modal: Locator, label: string, optionText: string) {
  const formItem = modal.locator(".ant-form-item").filter({ hasText: label }).first();
  await expect(formItem).toBeVisible();

  const combobox = formItem.getByRole("combobox").first();
  await combobox.click();

  const dropdown = page.locator(".ant-select-dropdown").filter({ hasText: optionText }).last();
  await expect(dropdown).toBeVisible();
  const option = dropdown.getByText(optionText, { exact: false }).first();
  await option.scrollIntoViewIfNeeded();
  await option.click({ force: true });
  await page.keyboard.press("Escape");
}

async function clearMultiSelectByLabel(modal: Locator, label: string) {
  const formItem = modal.locator(".ant-form-item").filter({ hasText: label }).first();
  await expect(formItem).toBeVisible();

  const select = formItem.locator(".ant-select").first();
  await select.hover();

  const clear = select.locator(".ant-select-clear");
  if (await clear.count()) {
    await clear.first().click();
    return;
  }

  const removeButtons = select.locator(".ant-select-selection-item-remove");
  let count = await removeButtons.count();
  while (count > 0) {
    await removeButtons.first().click();
    count = await removeButtons.count();
  }
}

async function loginAsTeacher(page: Page, password = TEACHER_PASSWORD) {
  await page.goto("/login.html");
  await page.getByRole("button", { name: /教师/ }).click();
  await page.locator("#login-username").fill(TEACHER_USERNAME);
  await page.locator("#login-password").fill(password);
  await page.getByRole("button", { name: /登录系统|登录/ }).click();

  await expect(page).toHaveURL(/\/teacher\.html/);
  await expect(page.getByRole("heading", { name: "实验进度", level: 3 })).toBeVisible();
}

async function openTopLevelPage(page: Page, menuLabel: string, headingText: string) {
  await page.getByRole("menuitem", { name: menuLabel }).first().click();
  await expect(page.getByRole("heading", { name: headingText, level: 3 })).toBeVisible();
}

async function openSubMenuPage(page: Page, parent: string, child: string, headingText: string) {
  const parentMenu = page.getByRole("menuitem", { name: parent }).first();
  await parentMenu.click();

  const childMenu = page.getByRole("menuitem", { name: child }).first();
  if (!(await childMenu.isVisible())) {
    await parentMenu.click();
  }

  await childMenu.click();
  await expect(page.getByRole("heading", { name: headingText, level: 3 })).toBeVisible();
}

test("@teacher 布局、菜单与退出登录覆盖", async ({ page }) => {
  await loginAsTeacher(page);

  const menuToggle = page.locator("header button").first();
  await menuToggle.click();
  await expect(page.getByRole("heading", { level: 4, name: "T" })).toBeVisible();
  await menuToggle.click();
  await expect(page.getByRole("heading", { level: 4, name: "Teacher Portal" })).toBeVisible();

  await openTopLevelPage(page, "班级管理", "班级管理");
  await openTopLevelPage(page, "学生管理", "学生管理");
  await openSubMenuPage(page, "账户设置", "助教管理", "助教管理");
  await openSubMenuPage(page, "账户设置", "个人信息", "个人信息管理");
  await openSubMenuPage(page, "考核管理", "题库管理", "题库管理");

  await page.locator("header .ant-avatar").first().click();
  await page.getByRole("menuitem", { name: "退出登录" }).click();
  const logoutModal = await getVisibleModal(page, "确认退出");
  await logoutModal.getByRole("button", { name: /取\s*消/ }).click();
  await expect(page).toHaveURL(/\/teacher\.html/);

  await page.locator("header .ant-avatar").first().click();
  await page.getByRole("menuitem", { name: "退出登录" }).click();
  const logoutConfirm = await getVisibleModal(page, "确认退出");
  await logoutConfirm.getByRole("button", { name: /退\s*出/ }).click();

  await expect(page).toHaveURL(/\/login\.html$/);
  const token = await page.evaluate(() => localStorage.getItem("token"));
  expect(token).toBeNull();
});

test("@teacher 班级管理核心操作覆盖（创建+编辑+学生列表+删除）", async ({ page }) => {
  await loginAsTeacher(page);
  await openTopLevelPage(page, "班级管理", "班级管理");

  const className = makeRunId("E2E班级");
  const classCode = `TC${Date.now()}`;
  const updatedClassName = `${className}-更新`;
  const updatedClassCode = `${classCode}-U`;

  await page.getByRole("button", { name: "新增班级" }).click();
  const createModal = await getVisibleModal(page, "新增班级");

  const [templateDownload] = await Promise.all([
    page.waitForEvent("download"),
    createModal.getByRole("button", { name: "下载模板" }).click(),
  ]);
  expect(templateDownload.suggestedFilename()).toContain("学生名单导入模板");

  await fillFormField(createModal, "班级名称", className);
  await fillFormField(createModal, "班级编号", classCode);
  await createModal.locator('input[type="file"]').setInputFiles({
    name: `students-${Date.now()}.csv`,
    mimeType: "text/csv",
    buffer: buildCsv([
      ["学号", "姓名"],
      [makeStudentNo(11), "班级导入学生"],
    ]),
  });
  await createModal.getByRole("button", { name: /创\s*建/ }).click();

  await expectSuccessMessage(page, "班级创建成功");
  const resultModal = await getVisibleModal(page, "创建结果");
  await expect(resultModal.getByText("新建学生数")).toBeVisible();
  await resultModal.getByRole("button", { name: /确\s*定/ }).click();

  const classRow = tableRowByText(page, className);
  await expect(classRow).toBeVisible();

  await classRow.getByRole("button", { name: "编辑" }).click();
  const editModal = await getVisibleModal(page, "编辑班级");
  await fillFormField(editModal, "班级名称", updatedClassName);
  await fillFormField(editModal, "班级编号", updatedClassCode);
  await editModal.getByRole("button", { name: /保\s*存/ }).click();
  await expectSuccessMessage(page, "班级信息更新成功");

  const updatedRow = tableRowByText(page, updatedClassName);
  await expect(updatedRow).toBeVisible();

  await updatedRow.getByRole("button", { name: "学生列表" }).click();
  const studentsModal = await getVisibleModal(page, new RegExp(`学生列表\\s*-\\s*${updatedClassName}`));
  await expect(studentsModal.locator("table")).toBeVisible();
  await studentsModal.getByRole("button", { name: /关\s*闭/ }).click();

  await updatedRow.getByRole("button", { name: "删除" }).click();
  const deleteModal = await getVisibleModal(page, /确定要删除班级/);
  await deleteModal.getByRole("button", { name: /删\s*除/ }).click();
  await expectSuccessMessage(page, "班级删除成功");
  await expect(page.locator("tr").filter({ hasText: updatedClassName })).toHaveCount(0);
});

test("@teacher 学生管理核心操作覆盖（添加+设密+移除+从库添加）", async ({ page }) => {
  await loginAsTeacher(page);
  await openTopLevelPage(page, "学生管理", "学生管理");

  const studentNo = makeStudentNo(21);
  const studentName = `Student${makeLetters(6)}`;

  await page.getByRole("button", { name: "添加学生" }).click();
  const addModal = await getVisibleModal(page, "添加学生");
  await fillFormField(addModal, "学号", studentNo);
  await fillFormField(addModal, "姓名", studentName);
  await fillFormField(addModal, "初始密码", "Student@123");
  await addModal.getByRole("button", { name: /添\s*加/ }).click();
  await expectSuccessMessage(page, "学生添加成功");

  const searchInput = page.getByPlaceholder("学号或姓名");
  await searchInput.fill(studentName);
  const studentRow = tableRowByText(page, studentName);
  await expect(studentRow).toBeVisible();

  await studentRow.getByRole("button", { name: "设置密码" }).click();
  const resetModal = await getVisibleModal(page, /重置密码/);
  await fillFormField(resetModal, "新密码", "Reset@123");
  await fillFormField(resetModal, "确认密码", "Reset@123");
  await resetModal.getByRole("button", { name: /确\s*认重置/ }).click();
  await expectSuccessMessage(page, "密码重置成功");

  await studentRow.getByRole("button", { name: "移除" }).click();
  const removeModal = await getVisibleModal(page, "确认移除学生");
  await removeModal.getByRole("button", { name: /移\s*除/ }).click();
  await expectSuccessMessage(page, "学生已移除");
  await expect(page.locator("tr").filter({ hasText: studentName })).toHaveCount(0);

  await page.getByRole("button", { name: "从学生库添加" }).click();
  const selectModal = await getVisibleModal(page, "从学生库中添加");
  await selectModal.getByPlaceholder("按学号或姓名搜索").fill(studentNo);
  await expect(selectModal.getByText(studentName)).toBeVisible();
  await selectModal.getByRole("button", { name: "添加到班级" }).click();
  await expectSuccessMessage(page, "添加成功");
  await selectModal.getByRole("button", { name: /关\s*闭/ }).click();

  await expect(tableRowByText(page, studentName)).toBeVisible();

  await tableRowByText(page, studentName).getByRole("button", { name: "移除" }).click();
  const removeAgainModal = await getVisibleModal(page, "确认移除学生");
  await removeAgainModal.getByRole("button", { name: /移\s*除/ }).click();
  await expectSuccessMessage(page, "学生已移除");
});

test("@teacher 助教管理核心操作覆盖（创建+重新分配+从库选择）", async ({ page }) => {
  await loginAsTeacher(page);
  await openSubMenuPage(page, "账户设置", "助教管理", "助教管理");

  const assistantUsername = `ta${Date.now().toString().slice(-8)}`;
  const assistantName = `Assistant${makeLetters(6)}`;
  const assistantEmail = `${assistantUsername}@e2e.test`;

  await page.getByRole("button", { name: "创建助教" }).click();
  const createModal = await getVisibleModal(page, "创建助教");
  await fillFormField(createModal, "用户名", assistantUsername);
  await fillFormField(createModal, "姓名", assistantName);
  await fillFormField(createModal, "邮箱", assistantEmail);
  await fillFormField(createModal, "手机号", makePhone(31));
  await fillFormField(createModal, "密码", "Assistant@123");
  await selectOptionByLabel(page, createModal, "分配到班级", DEFAULT_CLASS_NAME);
  await createModal.getByRole("button", { name: /创\s*建/ }).click();

  await expectSuccessMessage(page, "助教创建成功");
  const createdAssistantRow = tableRowByText(page, assistantName);
  await expect(createdAssistantRow).toBeVisible();

  await createdAssistantRow.getByRole("button", { name: "重新分配" }).click();
  const reassignModal = await getVisibleModal(page, /重新分配/);
  await clearMultiSelectByLabel(reassignModal, "分配到班级");
  await reassignModal.getByRole("button", { name: /保\s*存/ }).click();
  await expectSuccessMessage(page, "助教已从所有班级解绑");
  await expect(page.locator("tr").filter({ hasText: assistantName })).toHaveCount(0);

  await page.getByRole("button", { name: "从库中选择" }).click();
  const selectModal = await getVisibleModal(page, "从库中选择助教");
  await selectOptionByLabel(page, selectModal, "选择助教", "助教小赵");
  await selectOptionByLabel(page, selectModal, "分配到班级", DEFAULT_CLASS_NAME);
  await selectModal.getByRole("button", { name: /分\s*配/ }).click();

  await expectSuccessMessage(page, "助教分配成功");
  const selectedAssistantRow = tableRowByText(page, "助教小赵");
  await expect(selectedAssistantRow).toBeVisible();

  await selectedAssistantRow.getByRole("button", { name: "重新分配" }).click();
  const reassignSelectedModal = await getVisibleModal(page, /重新分配/);
  await clearMultiSelectByLabel(reassignSelectedModal, "分配到班级");
  await reassignSelectedModal.getByRole("button", { name: /保\s*存/ }).click();
  await expectSuccessMessage(page, "助教已从所有班级解绑");
});

test("@teacher 实验管理覆盖（进度+日志+报告评阅+CSV/归档导出）", async ({ page }) => {
  await loginAsTeacher(page);

  await openSubMenuPage(page, "实验管理", "实验进度", "实验进度");
  await expect(page.getByText("平均完成度")).toBeVisible();

  const progressSearch = page.getByPlaceholder("学号或姓名");
  await progressSearch.fill("20240001");
  await expect(tableRowByText(page, "20240001")).toBeVisible();

  await page.locator(".ant-table-row-expand-icon").first().click();
  await expect(page.getByText("步骤完成情况")).toBeVisible();

  await openSubMenuPage(page, "实验管理", "实验日志", "实验日志");
  await expect(page.getByText("总实验次数")).toBeVisible();
  await page.getByPlaceholder("学号或姓名").fill("20240001");
  await expect(tableRowByText(page, "20240001")).toBeVisible();

  await openSubMenuPage(page, "实验管理", "实验报告", "实验报告");
  await expect(page.getByText("报告平均得分")).toBeVisible();
  await page.getByPlaceholder("学号或姓名").fill("20240001");
  const reportRow = tableRowByText(page, "20240001");
  await expect(reportRow).toBeVisible();

  await page.getByRole("button", { name: "导出 CSV" }).click();
  await expectSuccessMessage(page, "导出成功");
  await expect(page.getByRole("link", { name: "下载 CSV" })).toBeVisible();

  await reportRow.getByRole("button", { name: "评阅" }).click();
  const reviewModal = await getVisibleModal(page, /评阅报告/);
  await reviewModal.getByPlaceholder("请输入报告得分").fill("88");
  await reviewModal.getByPlaceholder("请输入模型选择得分").fill("92");
  await reviewModal.getByPlaceholder("请输入评语，可为空").fill("E2E 自动评阅通过。");
  await reviewModal.getByRole("button", { name: "保存评阅结果" }).click();
  await expectSuccessMessage(page, "评阅结果保存成功");

  await expect(tableRowByText(page, "20240001").getByText("已评阅")).toBeVisible();

  await page.getByRole("button", { name: "导出所有报告" }).click();
  await expectSuccessMessage(page, "报告文件导出成功");
  await expect(page.getByRole("link", { name: "下载报告文件" })).toBeVisible();
});

test("@teacher 考核管理覆盖（题库增改删+权重保存+成绩导出）", async ({ page }) => {
  await loginAsTeacher(page);
  await openSubMenuPage(page, "考核管理", "题库管理", "题库管理");

  const backendOrigin = process.env.E2E_BACKEND_ORIGIN ?? "http://127.0.0.1:3101";
  const createdQuestionText = `E2E题目${Date.now()}`;
  const updatedQuestionText = `${createdQuestionText}-更新`;

  const token = await page.evaluate(() => localStorage.getItem("token"));
  expect(token).not.toBeNull();

  const createQuestionResponse = await page.request.post(`${backendOrigin}/api/v1/question-bank/questions`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    data: {
      question_text: createdQuestionText,
      question_type: "Single Choice",
      knowledge_point: "时间序列基础",
      options: ["选项A", "选项B"],
      correct_answers: ["选项A"],
    },
  });
  expect(createQuestionResponse.ok()).toBeTruthy();

  await page.getByRole("button", { name: "刷新" }).click();
  const questionSearchInput = page.locator('input[placeholder="输入题目内容"]').first();
  await questionSearchInput.fill(createdQuestionText);
  const createdRow = tableRowByText(page, createdQuestionText);
  await expect(createdRow).toBeVisible();

  await createdRow.getByRole("button").nth(1).click();
  const editQuestionModal = await getVisibleModal(page, "编辑题目");
  await fillFormField(editQuestionModal, "题目内容", updatedQuestionText);
  await editQuestionModal.getByRole("button", { name: /保\s*存/ }).click();
  await expectSuccessMessage(page, "题目更新成功");

  await questionSearchInput.fill(updatedQuestionText);
  const updatedRow = tableRowByText(page, updatedQuestionText);
  await expect(updatedRow).toBeVisible();

  await updatedRow.getByRole("button").nth(0).click();
  const previewModal = await getVisibleModal(page, "题目预览");
  await expect(previewModal.getByText(updatedQuestionText)).toBeVisible();
  await previewModal.getByRole("button", { name: "Close" }).click();

  await updatedRow.getByRole("button").nth(2).click();
  const deletePopover = page.locator(".ant-popover").filter({ hasText: "确定删除该题目？" }).last();
  await expect(deletePopover).toBeVisible();
  await deletePopover.getByRole("button", { name: /确\s*定/ }).click();
  await expectSuccessMessage(page, "题目已删除");
  await questionSearchInput.fill(updatedQuestionText);
  await expect(page.locator("tr").filter({ hasText: updatedQuestionText })).toHaveCount(0);

  await openSubMenuPage(page, "考核管理", "成绩权重", "成绩权重设置");
  await expect(page.getByText("顶层权重")).toBeVisible();

  const expFlowTopCard = page.locator(".ant-card").filter({ hasText: /^实验流程/ }).first();
  await expFlowTopCard.getByRole("spinbutton").fill("50");
  await page.getByRole("button", { name: "保存设置" }).click();
  await expectSuccessMessage(page, "顶层权重总和必须为 100%");

  await page.getByRole("button", { name: "恢复默认" }).click();
  await expectSuccessMessage(page, "已恢复默认权重");
  await page.getByRole("button", { name: "保存设置" }).click();
  await expectSuccessMessage(page, "权重保存成功");

  await openSubMenuPage(page, "考核管理", "成绩总览", "成绩总览");
  await expect(page.getByRole("heading", { name: "成绩总览", level: 3 })).toBeVisible();

  const classSelect = page.locator(".ant-select").filter({ hasText: "全部班级" }).first();
  await classSelect.click();
  const classDropdown = page.locator(".ant-select-dropdown").filter({ hasText: DEFAULT_CLASS_NAME }).last();
  await expect(classDropdown).toBeVisible();
  await classDropdown.getByText(DEFAULT_CLASS_NAME).first().click();

  await expect(page.getByRole("button", { name: "导出成绩" })).toBeVisible();
  await page.getByRole("button", { name: "导出成绩" }).click();
  await expectSuccessMessage(page, "导出成功");

  await page.getByPlaceholder("搜索学号或姓名").fill("20240001");
  await expect(tableRowByText(page, "20240001")).toBeVisible();
});

test("@teacher 成绩总览看板覆盖（全班级看板+明细展开）", async ({ page }) => {
  await loginAsTeacher(page);
  await openSubMenuPage(page, "考核管理", "成绩总览", "成绩总览");

  await expect(page.getByText("各班级平均分对比")).toBeVisible();
  const classCard = page
    .locator(".ant-card")
    .filter({ hasText: DEFAULT_CLASS_NAME })
    .filter({ hasText: "点击查看详情" })
    .first();
  await expect(classCard).toBeVisible();
  await classCard.click();

  await expect(page.getByRole("button", { name: "导出成绩" })).toBeVisible();
  await page.getByPlaceholder("搜索学号或姓名").fill("20240001");
  const targetRow = tableRowByText(page, "20240001");
  await expect(targetRow).toBeVisible();

  await targetRow.getByRole("button", { name: "详情" }).click();
  await expect(page.getByText("最终得分构成")).toBeVisible();
  await expect(page.getByText("实验流程细分")).toBeVisible();

  await targetRow.getByRole("button", { name: "收起" }).click();
});

test("@teacher 个人信息核心操作覆盖（编辑+修改密码并回滚）", async ({ page }) => {
  await loginAsTeacher(page);
  await openSubMenuPage(page, "账户设置", "个人信息", "个人信息管理");

  await page.getByRole("button", { name: "编辑信息" }).click();
  const editModal = await getVisibleModal(page, "编辑个人信息");
  await fillFormField(editModal, "姓名", `张教授${Date.now().toString().slice(-4)}`);
  await fillFormField(editModal, "手机号码", makePhone(41));
  await fillFormField(editModal, "邮箱", `teacher1+${Date.now()}@e2e.test`);
  await editModal.getByRole("button", { name: /保存修改/ }).click();
  await expectSuccessMessage(page, "个人信息保存成功");

  const passwordCard = page.locator(".ant-card").filter({ hasText: "修改密码" }).first();
  await passwordCard.getByPlaceholder("请输入当前密码").fill(TEACHER_PASSWORD);
  await passwordCard.getByPlaceholder("至少6个字符").fill(TEMP_TEACHER_PASSWORD);
  await passwordCard.getByPlaceholder("再次输入新密码").fill(TEMP_TEACHER_PASSWORD);
  await passwordCard.getByRole("button", { name: "保存新密码" }).click();
  await expectSuccessMessage(page, "密码修改成功");

  await page.locator("header .ant-avatar").first().click();
  await page.getByRole("menuitem", { name: "退出登录" }).click();
  const logoutModal = await getVisibleModal(page, "确认退出");
  await logoutModal.getByRole("button", { name: /退\s*出/ }).click();
  await expect(page).toHaveURL(/\/login\.html$/);

  await loginAsTeacher(page, TEMP_TEACHER_PASSWORD);
  await openSubMenuPage(page, "账户设置", "个人信息", "个人信息管理");

  const passwordRollbackCard = page.locator(".ant-card").filter({ hasText: "修改密码" }).first();
  await passwordRollbackCard.getByPlaceholder("请输入当前密码").fill(TEMP_TEACHER_PASSWORD);
  await passwordRollbackCard.getByPlaceholder("至少6个字符").fill(TEACHER_PASSWORD);
  await passwordRollbackCard.getByPlaceholder("再次输入新密码").fill(TEACHER_PASSWORD);
  await passwordRollbackCard.getByRole("button", { name: "保存新密码" }).click();
  await expectSuccessMessage(page, "密码修改成功");
});
