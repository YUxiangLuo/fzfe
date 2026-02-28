import { expect, test, type Locator, type Page } from "@playwright/test";

const ASSISTANT_USERNAME = process.env.E2E_ASSISTANT_USERNAME ?? "assistant2";
const ASSISTANT_PASSWORD = process.env.E2E_ASSISTANT_PASSWORD ?? "AssistantE2E!234";
const TEMP_ASSISTANT_PASSWORD = process.env.E2E_ASSISTANT_TEMP_PASSWORD ?? "AssistantE2E!567";
const DEFAULT_CLASS_NAME = "计算机科学与技术2502";
const DEFAULT_CLASS_ID = 2;
const REVIEW_TARGET_USERNAME = "20240052";

function makePhone(offset: number): string {
  const num = (Date.now() + offset) % 1_000_000_000;
  return `13${num.toString().padStart(9, "0")}`;
}

function makeLetters(length: number): string {
  const chars = "abcdefghijklmnopqrstuvwxyz";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
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

function parseIntegerText(raw: string): number {
  const normalized = raw.replace(/,/g, "").trim();
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Cannot parse integer from statistic value: "${raw}"`);
  }
  return parsed;
}

function unwrapDataEnvelope<T>(payload: unknown): T {
  if (payload !== null && typeof payload === "object" && "data" in payload) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

async function getStatisticValue(page: Page, title: string): Promise<number> {
  const stat = page
    .locator(".ant-statistic")
    .filter({ has: page.locator(".ant-statistic-title", { hasText: title }) })
    .first();
  await expect(stat).toBeVisible();
  const valueText = await stat.locator(".ant-statistic-content-value").first().innerText();
  return parseIntegerText(valueText);
}

async function fillFormField(modal: Locator, label: string, value: string) {
  const formItem = modal.locator(".ant-form-item").filter({ hasText: label }).first();
  await expect(formItem).toBeVisible();
  await formItem.locator("input, textarea").first().fill(value);
}

async function setWeightByLabel(page: Page, label: string, value: number) {
  const flowSection = page
    .locator(".ant-card")
    .filter({ has: page.getByText("实验流程细节权重", { exact: false }) })
    .first();
  await expect(flowSection).toBeVisible();

  const itemCard = flowSection
    .locator(".ant-row .ant-col .ant-card")
    .filter({ has: page.getByText(label, { exact: true }) })
    .first();
  await expect(itemCard).toBeVisible();

  const input = itemCard.locator("input.ant-input-number-input").first();
  await expect(input).toBeVisible();
  await input.click();
  await input.press("ControlOrMeta+A");
  await input.fill(String(value));
  await input.press("Enter");
  await expect(input).toHaveValue(String(value));
}

async function loginAsAssistant(page: Page, password = ASSISTANT_PASSWORD) {
  await page.goto("/login.html");
  await page.getByRole("button", { name: /助教/ }).click();
  await page.locator("#login-username").fill(ASSISTANT_USERNAME);
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
  const heading = page.getByRole("heading", { name: headingText, level: 3 });
  if (await heading.isVisible({ timeout: 2_000 }).catch(() => false)) {
    return;
  }

  const parentMenu = page.getByRole("menuitem", { name: parent }).first();
  await expect(parentMenu).toBeVisible();

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await parentMenu.click({ force: attempt > 0 });

    if (await heading.isVisible({ timeout: 1_500 }).catch(() => false)) {
      return;
    }

    const childMenu = page.getByRole("menuitem", { name: child }).first();
    if ((await childMenu.count()) === 0) continue;
    await childMenu.waitFor({ state: "visible", timeout: 3_000 }).catch(() => undefined);
    if (!(await childMenu.isVisible().catch(() => false))) {
      if (await heading.isVisible({ timeout: 1_500 }).catch(() => false)) return;
      continue;
    }

    try {
      await childMenu.click();
    } catch {
      await childMenu.click({ force: true });
    }

    if (await heading.isVisible({ timeout: 5_000 }).catch(() => false)) {
      return;
    }
  }

  await expect(heading).toBeVisible();
}

async function openPersonalInfoPage(page: Page) {
  const heading = page.getByRole("heading", { name: "个人信息管理", level: 3 });
  if (await heading.isVisible({ timeout: 2_000 }).catch(() => false)) {
    return;
  }

  await page.goto("/teacher.html#/account-personal");
  await expect(page).toHaveURL(/\/teacher\.html#\/account-personal/);
  await expect(heading).toBeVisible({ timeout: 20_000 });
}

test("@assistant 布局、菜单与退出登录覆盖", async ({ page }) => {
  await loginAsAssistant(page);
  await expect(page.getByText("助教")).toBeVisible();
  await expect(page.getByRole("menuitem", { name: "助教管理" })).toHaveCount(0);

  const menuToggle = page.locator("header button").first();
  await menuToggle.click();
  await expect(page.getByRole("heading", { level: 4, name: "T" })).toBeVisible();
  await menuToggle.click();
  await expect(page.getByRole("heading", { level: 4, name: "Teacher Portal" })).toBeVisible();

  await openTopLevelPage(page, "班级管理", "班级管理");
  const classRow = tableRowByText(page, DEFAULT_CLASS_NAME);
  await expect(classRow).toBeVisible();
  await classRow.getByRole("button", { name: "学生列表" }).click();
  const studentsModal = await getVisibleModal(page, new RegExp(`学生列表\\s*-\\s*${DEFAULT_CLASS_NAME}`));
  await expect(studentsModal.locator("table")).toBeVisible();
  await studentsModal.getByRole("button", { name: /关\s*闭/ }).click();

  await openTopLevelPage(page, "学生管理", "学生管理");
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

test("@assistant 实验报告核心操作覆盖（检索+评阅+CSV/归档导出）", async ({ page }) => {
  await loginAsAssistant(page);
  await openSubMenuPage(page, "实验管理", "实验报告", "实验报告");

  await expect(page.getByText("报告平均得分")).toBeVisible();
  await page.getByPlaceholder("学号或姓名").fill(REVIEW_TARGET_USERNAME);
  const reportRow = tableRowByText(page, REVIEW_TARGET_USERNAME);
  await expect(reportRow).toBeVisible();
  await expect(reportRow.getByText("待评阅")).toBeVisible();
  const pendingBeforeReview = await getStatisticValue(page, "待评阅");

  await page.getByRole("button", { name: "导出 CSV" }).click();
  await expectSuccessMessage(page, "导出成功");
  await expect(page.getByRole("link", { name: "下载 CSV" })).toBeVisible();

  await page.getByRole("button", { name: "导出所有报告" }).click();
  await expectSuccessMessage(page, "报告文件导出成功");
  await expect(page.getByRole("link", { name: "下载报告文件" })).toBeVisible();

  await reportRow.getByRole("button", { name: "评阅" }).click();
  const reviewModal = await getVisibleModal(page, /评阅报告/);
  await reviewModal.getByPlaceholder("请输入报告得分").fill("89");
  await reviewModal.getByPlaceholder("请输入模型选择得分").fill("91");
  await reviewModal.getByPlaceholder("请输入评语，可为空").fill("Assistant E2E 自动评阅。");
  await reviewModal.getByRole("button", { name: "保存评阅结果" }).click();
  await expectSuccessMessage(page, "评阅结果保存成功");
  await expect(tableRowByText(page, REVIEW_TARGET_USERNAME).getByText("已评阅")).toBeVisible();
  const pendingAfterReview = await getStatisticValue(page, "待评阅");
  expect(pendingAfterReview).toBe(Math.max(pendingBeforeReview - 1, 0));
});

test("@assistant 考核管理覆盖（权重保存+总览聚合+成绩导出）", async ({ page }) => {
  await loginAsAssistant(page);
  await openSubMenuPage(page, "考核管理", "成绩权重", "成绩权重设置");

  await page.getByRole("button", { name: "恢复默认" }).click();
  await expectSuccessMessage(page, "已恢复默认权重");
  const saveDefaultWeightsResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "PUT" &&
      /\/api\/v1\/classes\/\d+\/grading-policy$/.test(response.url()),
  );
  await page.getByRole("button", { name: "保存设置" }).click();
  const saveDefaultWeightsResponse = await saveDefaultWeightsResponsePromise;
  expect(saveDefaultWeightsResponse.ok()).toBeTruthy();
  await expectSuccessMessage(page, "权重保存成功");

  await setWeightByLabel(page, "需求预测 - 数据准备", 6);
  await setWeightByLabel(page, "报告提交", 34);
  const saveUpdatedWeightsResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "PUT" &&
      /\/api\/v1\/classes\/\d+\/grading-policy$/.test(response.url()),
  );
  await page.getByRole("button", { name: "保存设置" }).click();
  const saveUpdatedWeightsResponse = await saveUpdatedWeightsResponsePromise;
  expect(saveUpdatedWeightsResponse.ok()).toBeTruthy();
  const saveUpdatedPayload = saveUpdatedWeightsResponse.request().postDataJSON() as Record<string, unknown>;
  expect(Number(saveUpdatedPayload.exp_flow_demand_data_preparation)).toBe(6);
  expect(Number(saveUpdatedPayload.exp_flow_report_submission)).toBe(34);
  await expectSuccessMessage(page, "权重保存成功");

  await page.getByRole("button", { name: "恢复默认" }).click();
  await expectSuccessMessage(page, "已恢复默认权重");
  const saveRollbackWeightsResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === "PUT" &&
      /\/api\/v1\/classes\/\d+\/grading-policy$/.test(response.url()),
  );
  await page.getByRole("button", { name: "保存设置" }).click();
  const saveRollbackWeightsResponse = await saveRollbackWeightsResponsePromise;
  expect(saveRollbackWeightsResponse.ok()).toBeTruthy();
  await expectSuccessMessage(page, "权重保存成功");

  const assistantSummaryRequest = page.waitForResponse((response) =>
    response.request().method() === "GET" &&
    response.url().includes("/assistants/") &&
    response.url().includes("/grade-summaries")
  );

  await openSubMenuPage(page, "考核管理", "成绩总览", "成绩总览");
  const summaryResponse = await assistantSummaryRequest;
  expect(summaryResponse.ok()).toBeTruthy();

  await expect(page.getByText("各班级平均分对比")).toBeVisible();
  const classCard = page
    .locator(".ant-card")
    .filter({ hasText: DEFAULT_CLASS_NAME })
    .filter({ hasText: "点击查看详情" })
    .first();
  await expect(classCard).toBeVisible();
  const classGradesResponsePromise = page.waitForResponse((response) =>
    response.request().method() === "GET" &&
    /\/api\/v1\/classes\/\d+\/grade-summaries/.test(response.url()),
  );
  await classCard.click();
  const classGradesResponse = await classGradesResponsePromise;
  expect(classGradesResponse.ok()).toBeTruthy();
  const classGradesData = unwrapDataEnvelope<Array<{ report_status?: string | null }>>(await classGradesResponse.json());
  const gradedCount = classGradesData.filter((row) => row.report_status === "graded").length;
  const gradedCardValue = await getStatisticValue(page, "已评分");
  expect(gradedCardValue).toBe(gradedCount);

  await page.getByRole("button", { name: "导出成绩" }).click();
  await expectSuccessMessage(page, "导出成功");
  const exportAlert = page.locator(".ant-alert").filter({ hasText: "导出成功" }).last();
  await expect(exportAlert).toBeVisible();
  await expect(exportAlert.getByRole("link").first()).toBeVisible();

  await page.getByPlaceholder("搜索学号或姓名").fill(REVIEW_TARGET_USERNAME);
  await expect(tableRowByText(page, REVIEW_TARGET_USERNAME)).toBeVisible();
});

test("@assistant 个人信息核心操作覆盖（编辑+修改密码并回滚）", async ({ page }) => {
  await loginAsAssistant(page);
  await openPersonalInfoPage(page);

  await page.getByRole("button", { name: "编辑信息" }).click();
  const editModal = await getVisibleModal(page, "编辑个人信息");
  await fillFormField(editModal, "姓名", `助教${makeLetters(4)}`);
  await fillFormField(editModal, "手机号码", makePhone(51));
  await fillFormField(editModal, "邮箱", `assistant2+${Date.now()}@e2e.test`);
  await editModal.getByRole("button", { name: /保存修改/ }).click();
  await expectSuccessMessage(page, "个人信息保存成功");

  const passwordCard = page.locator(".ant-card").filter({ hasText: "修改密码" }).first();
  await passwordCard.getByPlaceholder("请输入当前密码").fill(ASSISTANT_PASSWORD);
  await passwordCard.getByPlaceholder("至少6个字符").fill(TEMP_ASSISTANT_PASSWORD);
  await passwordCard.getByPlaceholder("再次输入新密码").fill(TEMP_ASSISTANT_PASSWORD);
  await passwordCard.getByRole("button", { name: "保存新密码" }).click();
  await expectSuccessMessage(page, "密码修改成功");

  await page.locator("header .ant-avatar").first().click();
  await page.getByRole("menuitem", { name: "退出登录" }).click();
  const logoutModal = await getVisibleModal(page, "确认退出");
  await logoutModal.getByRole("button", { name: /退\s*出/ }).click();
  await expect(page).toHaveURL(/\/login\.html$/);

  await loginAsAssistant(page, TEMP_ASSISTANT_PASSWORD);
  await openPersonalInfoPage(page);

  const rollbackCard = page.locator(".ant-card").filter({ hasText: "修改密码" }).first();
  await rollbackCard.getByPlaceholder("请输入当前密码").fill(TEMP_ASSISTANT_PASSWORD);
  await rollbackCard.getByPlaceholder("至少6个字符").fill(ASSISTANT_PASSWORD);
  await rollbackCard.getByPlaceholder("再次输入新密码").fill(ASSISTANT_PASSWORD);
  await rollbackCard.getByRole("button", { name: "保存新密码" }).click();
  await expectSuccessMessage(page, "密码修改成功");
});
