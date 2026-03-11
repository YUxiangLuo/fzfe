import { expect, type Page } from "@playwright/test";

// ── Constants ──────────────────────────────────────────────────────

export const STUDENT_USERNAME =
  process.env.E2E_STUDENT_USERNAME ?? "20240002";
export const STUDENT_PASSWORD =
  process.env.E2E_STUDENT_PASSWORD ?? "StudentE2E!234";

export const SHIYAN_INDUSTRY =
  process.env.E2E_SHIYAN_INDUSTRY ?? "E2E智能制造业";
export const SHIYAN_COMPANY =
  process.env.E2E_SHIYAN_COMPANY ?? "E2E样本企业A";
export const SHIYAN_PRIMARY_PRODUCT =
  process.env.E2E_SHIYAN_PRODUCT_PRIMARY ?? "智能传感器A型";
export const SHIYAN_SECONDARY_PRODUCT =
  process.env.E2E_SHIYAN_PRODUCT_SECONDARY ?? "智能传感器B型";

export const REPORT_ANALYSES = [
  "训练集与评估集区间划分合理，训练集覆盖完整季节波动，评估集用于检验泛化表现。",
  "基础模型与融合模型对比显示融合模型在误差指标上更均衡，稳定性更好。",
  "综合 RMSE、MAE 与 R² 指标，最终选择融合模型以兼顾精度与鲁棒性。",
  "安全库存与预测量计算遵循服务水平约束，能够在需求波动下保持供给连续性。",
  "完整 MPS 结果表明服务水平可接受，缺货周期可控，后续可继续优化产能与库存权衡。",
];

// ── Generic utilities ──────────────────────────────────────────────

export async function expectHashPath(page: Page, hashPath: string) {
  await expect
    .poll(
      () => {
        const url = new URL(page.url());
        return url.hash;
      },
      { timeout: 30_000 },
    )
    .toBe(`#${hashPath}`);
}

export async function clickLastEnabledButton(
  page: Page,
  name: RegExp | string,
  timeout = 15_000,
) {
  const buttons = page.getByRole("button", { name });
  await expect
    .poll(
      async () => {
        const count = await buttons.count();
        for (let idx = count - 1; idx >= 0; idx -= 1) {
          const candidate = buttons.nth(idx);
          if (
            (await candidate.isVisible()) &&
            (await candidate.isEnabled())
          ) {
            return true;
          }
        }
        return false;
      },
      { timeout },
    )
    .toBeTruthy();

  const count = await buttons.count();
  for (let idx = count - 1; idx >= 0; idx -= 1) {
    const candidate = buttons.nth(idx);
    if ((await candidate.isVisible()) && (await candidate.isEnabled())) {
      await candidate.click();
      return;
    }
  }
  throw new Error(`Cannot find enabled button for: ${String(name)}`);
}

function buildWhitespaceAgnosticRegex(text: string): RegExp {
  const compactChars = Array.from(text.replace(/\s+/g, ""));
  const escaped = compactChars.map((char) =>
    char.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
  );
  return new RegExp(escaped.join("\\s*"));
}

// ── Login ──────────────────────────────────────────────────────────

export async function loginAsStudent(page: Page) {
  await page.goto("/login.html");
  await page.locator('[data-role="student"]').click();
  await page.locator("#login-username").fill(STUDENT_USERNAME);
  await page.locator("#login-password").fill(STUDENT_PASSWORD);
  await page.getByRole("button", { name: /登录系统|登录/ }).click();

  await expect(page).toHaveURL(/\/exp\.html/);
}

// ── Introduction ───────────────────────────────────────────────────

export async function completeIntroductionAndStartExperiment(page: Page) {
  await expectHashPath(page, "/introduction");
  await advanceIntroductionToFinalStep(page);

  // 正常为"开始实验"；若检测到历史进度，可能出现继续/回到实验分支。
  if (await page.getByRole("button", { name: "开始实验" }).isVisible()) {
    await clickLastEnabledButton(page, "开始实验");
  } else if (
    await page
      .getByRole("button", { name: "继续未完成的实验" })
      .isVisible({ timeout: 2_000 })
      .catch(() => false)
  ) {
    await clickLastEnabledButton(page, "开始新的实验");
  } else {
    await clickLastEnabledButton(page, /继续实验|回到实验/);
  }

  if (
    await page
      .getByRole("button", { name: "开始新的实验" })
      .isVisible({ timeout: 2_000 })
      .catch(() => false)
  ) {
    await clickLastEnabledButton(page, "开始新的实验");
  }

  await expectHashPath(page, "/industry");
}

export async function advanceIntroductionToFinalStep(page: Page) {
  await expectHashPath(page, "/introduction");
  await clickLastEnabledButton(page, "下一步");
  await clickLastEnabledButton(page, "下一步");
}

export async function logoutFromHeader(page: Page) {
  const iconLogoutButton = page
    .locator("button:has(.lucide-log-out)")
    .first();
  const hasIconLogoutButton = await iconLogoutButton
    .isVisible({ timeout: 2_000 })
    .catch(() => false);

  if (hasIconLogoutButton) {
    await expect(iconLogoutButton).toBeVisible();
    await expect(iconLogoutButton).toBeEnabled();
    await iconLogoutButton.click();
  } else {
    await clickLastEnabledButton(page, /退出登录|退出系统|退出/);
  }

  const confirmBtn = page.getByRole("button", { name: "退出" });
  if (
    await confirmBtn
      .isVisible({ timeout: 2_000 })
      .catch(() => false)
  ) {
    await confirmBtn.click();
  }
  await expect(page).toHaveURL(/\/login\.html$/);
}

// ── Quiz helpers ───────────────────────────────────────────────────

export async function answerAllQuizQuestions(page: Page) {
  const inputNames = await page
    .locator('input[type="radio"], input[type="checkbox"]')
    .evaluateAll((nodes) => {
      const set = new Set<string>();
      for (const node of nodes) {
        const input = node as HTMLInputElement;
        if (input.name) set.add(input.name);
      }
      return Array.from(set);
    });

  for (const inputName of inputNames) {
    const firstOption = page.locator(`input[name="${inputName}"]`).first();
    await firstOption.check({ force: true });
  }
}

// ── Selection + Data Window ────────────────────────────────────────

async function gotoModelScenarioFromHistoricalData(page: Page) {
  const nextButton = page.getByRole("button", { name: "下一步：需求预测" });

  for (let attempt = 0; attempt < 2; attempt += 1) {
    await expect(nextButton).toBeVisible();
    await expect(nextButton).toBeEnabled();
    await nextButton.click({ force: attempt > 0 });

    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline) {
      const hash = new URL(page.url()).hash;
      if (hash === "#/model" || hash === "#/model/scenario") {
        if (hash === "#/model") {
          await expectHashPath(page, "/model/scenario");
        }
        return;
      }
      await page.waitForTimeout(200);
    }
  }

  throw new Error(
    `Failed to leave /data after clicking next. current hash=${new URL(page.url()).hash}`,
  );
}

export async function completeIndustryCompanyProductAndDataWindow(
  page: Page,
) {
  await completeIndustryCompanyProductAndGotoModelWindow(page);

  const selects = page.locator("select");
  await expect(selects).toHaveCount(4);
  await selects.nth(0).selectOption("0");
  await selects.nth(1).selectOption("27");
  await selects.nth(2).selectOption("28");
  await selects.nth(3).selectOption("35");

  await clickLastEnabledButton(page, "下一步");
  await expectHashPath(page, "/model/model-intro");
}

export async function completeIndustryCompanyProductAndGotoModelWindow(
  page: Page,
) {
  await page
    .getByRole("heading", { level: 3, name: SHIYAN_INDUSTRY })
    .click({ force: true });
  await clickLastEnabledButton(page, "下一步");
  await expectHashPath(page, "/company");

  await page
    .getByRole("heading", { level: 3, name: SHIYAN_COMPANY })
    .click({ force: true });
  await clickLastEnabledButton(page, "下一步");
  await expectHashPath(page, "/product");

  await page
    .getByRole("heading", { level: 3, name: SHIYAN_PRIMARY_PRODUCT })
    .click({ force: true });
  await clickLastEnabledButton(page, "下一步");
  await expectHashPath(page, "/data");

  await gotoModelScenarioFromHistoricalData(page);

  await clickLastEnabledButton(page, /下一步/);
  await expectHashPath(page, "/model/role-intro");

  await clickLastEnabledButton(page, /下一步|开始预测工作/);
  await expectHashPath(page, "/model/window");
}

// ── Base model intro & selection ───────────────────────────────────

export async function completeBaseModelIntroAndSelectAll(page: Page) {
  // 4 个模型介绍页：前3次"下一个模型"，最后"选择基础模型"
  for (let i = 0; i < 4; i += 1) {
    await clickLastEnabledButton(page, /下一个模型|选择基础模型/);
  }

  await expect(
    page.getByText("选择基础模型", { exact: true }),
  ).toBeVisible();
  await page.getByRole("checkbox", { name: "移动平均法" }).check();
  await page.getByRole("checkbox", { name: "指数平滑法" }).check();
  await page.getByRole("checkbox", { name: "ARIMA模型" }).check();
  await page.getByRole("checkbox", { name: "LSTM模型" }).check();

  await clickLastEnabledButton(page, "下一步");
  await expectHashPath(page, "/model/model-select");
}

export async function completeBaseModelIntroAndSelectTwo(page: Page) {
  for (let i = 0; i < 4; i += 1) {
    await clickLastEnabledButton(page, /下一个模型|选择基础模型/);
  }

  await expect(
    page.getByText("选择基础模型", { exact: true }),
  ).toBeVisible();
  await page.getByRole("checkbox", { name: "移动平均法" }).check();
  await page.getByRole("checkbox", { name: "指数平滑法" }).check();

  await clickLastEnabledButton(page, "下一步");
  await expectHashPath(page, "/model/model-select");
}

export async function completeBaseModelIntroAndSelectMAAndLSTM(page: Page) {
  for (let i = 0; i < 4; i += 1) {
    await clickLastEnabledButton(page, /下一个模型|选择基础模型/);
  }

  await expect(
    page.getByText("选择基础模型", { exact: true }),
  ).toBeVisible();
  await page.getByRole("checkbox", { name: "移动平均法" }).check();
  await page.getByRole("checkbox", { name: "LSTM模型" }).check();

  await clickLastEnabledButton(page, "下一步");
  await expectHashPath(page, "/model/model-select");
}

// ── Individual base models ─────────────────────────────────────────

export async function completeMovingAverage(page: Page) {
  await page
    .locator("div.cursor-pointer")
    .filter({ hasText: "移动平均法" })
    .first()
    .click();
  await expectHashPath(page, "/model/moving-average/intro");

  await clickLastEnabledButton(page, "下一步");
  await clickLastEnabledButton(page, "下一步");

  await page.locator("#window-size").fill("6");
  await clickLastEnabledButton(page, "下一步");

  await expect(page.getByText("时间窗口填写正确")).toBeVisible();
  await clickLastEnabledButton(page, "下一步");

  await expect(page.getByText("移动平均法 - 计算结果")).toBeVisible({
    timeout: 60_000,
  });
  await clickLastEnabledButton(page, "下一步");

  await expect(page.getByText("模型指标对比")).toBeVisible();
  await clickLastEnabledButton(page, "完成");
  await expectHashPath(page, "/model/model-select");
}

export async function completeExponentialSmoothing(page: Page) {
  await page
    .locator("div.cursor-pointer")
    .filter({ hasText: "指数平滑法" })
    .first()
    .click();
  await expectHashPath(page, "/model/exponential-smoothing/intro");

  await clickLastEnabledButton(page, "下一步");
  await clickLastEnabledButton(page, "下一步");

  await page.locator("#alpha-input").fill("0.3");
  await clickLastEnabledButton(page, "下一步");

  await expect(page.getByText("平滑系数填写正确")).toBeVisible();
  await clickLastEnabledButton(page, "下一步");

  await expect(page.getByText("指数平滑法 - 计算结果")).toBeVisible({
    timeout: 60_000,
  });
  await clickLastEnabledButton(page, "下一步");

  await expect(page.getByText("模型指标对比")).toBeVisible();
  await clickLastEnabledButton(page, "完成");
  await expectHashPath(page, "/model/model-select");
}

export async function completeARIMA(page: Page) {
  await page
    .locator("div.cursor-pointer")
    .filter({ hasText: "ARIMA" })
    .first()
    .click();
  await expectHashPath(page, "/model/arima/intro");

  // intro → stationarity explanation
  await clickLastEnabledButton(page, "下一步", 60_000); // 增加超时到 60 秒
  // stationarity explanation → ADF table (triggers calculation)
  await clickLastEnabledButton(page, "下一步", 60_000); // 增加超时到 60 秒

  // Wait for ADF results table to load, find first stationary d value
  await expect(page.getByText("平稳性检验表")).toBeVisible({ timeout: 120_000 });
  const stationaryCell = page
    .locator("td")
    .filter({ hasText: /^\s*平稳\s*$/ })
    .first();
  await expect(stationaryCell).toBeVisible({ timeout: 120_000 });

  // Read the d value from the same row as the first "平稳" cell
  const stationaryRow = stationaryCell.locator("xpath=ancestor::tr");
  const dCellText = (await stationaryRow.locator("td").first().textContent()) ?? "";
  const dValue = dCellText.match(/\d+/)?.[0] ?? "1";

  // → differencing order input
  await clickLastEnabledButton(page, "下一步", 60_000); // 增加超时到 60 秒
  await page.locator("#diff-order").fill(dValue);
  await clickLastEnabledButton(page, "下一步", 60_000); // 增加超时到 60 秒

  // → differencing validation (should pass)
  await expect(page.getByText("检验通过")).toBeVisible();
  await clickLastEnabledButton(page, "下一步");

  // → auto-params (triggers training)
  await expect(page.getByText(/ARIMA.*自动参数寻优|最佳模型/)).toBeVisible({
    timeout: 120_000,
  });
  await clickLastEnabledButton(page, "下一步");

  // → results view
  await expect(page.getByText(/ARIMA.*预测结果|计算结果/)).toBeVisible({
    timeout: 30_000,
  });
  await clickLastEnabledButton(page, "下一步");

  // → comparison
  await expect(page.getByText("模型指标对比")).toBeVisible();
  await clickLastEnabledButton(page, "完成");
  await expectHashPath(page, "/model/model-select");
}

export async function completeLSTM(page: Page) {
  await page
    .locator("div.cursor-pointer")
    .filter({ hasText: "LSTM" })
    .first()
    .click();
  await expectHashPath(page, "/model/lstm/intro");

  // intro → preprocessing
  await clickLastEnabledButton(page, "下一步");
  await expectHashPath(page, "/model/lstm/preprocessing");

  // Select min-max normalization
  await page.locator("#min-max").check({ force: true });
  await clickLastEnabledButton(page, "下一步");

  // → build: wait for feature list, then proceed (triggers training)
  await expectHashPath(page, "/model/lstm/build");
  await expect(
    page.getByText("请选择需求预测时所使用的特征"),
  ).toBeVisible();

  const featureCandidates = ["年份", "月份", "促销投入", "价格指数", "产能利用率"];
  let selectedFeatureCount = 0;
  for (const name of featureCandidates) {
    const checkbox = page.getByRole("checkbox", { name });
    if ((await checkbox.count()) === 0) continue;
    if (await checkbox.isChecked().catch(() => false)) {
      selectedFeatureCount += 1;
    }
  }
  if (selectedFeatureCount === 0) {
    for (const name of ["年份", "月份"]) {
      const checkbox = page.getByRole("checkbox", { name });
      if ((await checkbox.count()) === 0) continue;
      if (!(await checkbox.isChecked().catch(() => false))) {
        await checkbox.check({ force: true });
      }
    }
  }

  await clickLastEnabledButton(page, "下一步", 30_000);

  // → results: wait for training to complete
  await expect(
    page.getByRole("heading", { name: "LSTM 法 - 计算结果" }),
  ).toBeVisible({
    timeout: 180_000,
  });
  await clickLastEnabledButton(page, "下一步", 120_000);

  // → comparison
  await expect(page.getByText("模型指标对比")).toBeVisible();
  await clickLastEnabledButton(page, "完成");
  await expectHashPath(page, "/model/model-select");
}

// ── Ensemble selection & training ──────────────────────────────────

export async function completeEnsembleIntroAndSelect(
  page: Page,
  ensembleName: string,
) {
  await expect(page.getByText("基础模型已全部完成！")).toBeVisible();
  await clickLastEnabledButton(page, /下一步：学习融合模型/);
  await expectHashPath(page, "/model/ensemble-intro");

  // 3 个融合模型介绍页：前2次"下一个模型"，最后"选择融合模型"
  for (let i = 0; i < 3; i += 1) {
    await clickLastEnabledButton(page, /下一个模型|选择融合模型/);
  }

  await expect(
    page.getByText("选择融合模型", { exact: true }),
  ).toBeVisible();
  await page.getByRole("checkbox", { name: ensembleName }).check();
  await clickLastEnabledButton(page, "下一步");

  await expectHashPath(page, "/model/ensemble-select");
}

export async function completeWeightedEnsemble(page: Page) {
  await page
    .locator("div.cursor-pointer")
    .filter({ hasText: "加权平均融合" })
    .first()
    .click();

  await expectHashPath(page, "/model/weighted-ensemble/intro");
  await clickLastEnabledButton(page, "下一步");

  await expectHashPath(page, "/model/weighted-ensemble/select-models");
  await page.getByRole("checkbox", { name: "移动平均法" }).check();
  await page.getByRole("checkbox", { name: "指数平滑法" }).check();
  await clickLastEnabledButton(page, "下一步");

  await expectHashPath(page, "/model/weighted-ensemble/results");
  await expect(page.getByText("加权平均融合 - 计算结果")).toBeVisible({
    timeout: 180_000,
  });
  await clickLastEnabledButton(page, "下一步");

  await expectHashPath(page, "/model/weighted-ensemble/prediction-comparison");
  await expect(
    page
      .getByRole("heading", { name: "加权平均融合 - 预测结果" })
      .first(),
  ).toBeVisible();
  await clickLastEnabledButton(page, "下一步");

  await expectHashPath(
    page,
    "/model/weighted-ensemble/model-metrics-comparison",
  );
  await expect(page.getByText("模型指标对比")).toBeVisible();
  await clickLastEnabledButton(page, "完成");
  await expectHashPath(page, "/model/ensemble-select");
}

export async function completeWeightedEnsembleWithLSTM(page: Page) {
  await page
    .locator("div.cursor-pointer")
    .filter({ hasText: "加权平均融合" })
    .first()
    .click();

  await expectHashPath(page, "/model/weighted-ensemble/intro");
  await clickLastEnabledButton(page, "下一步");

  await expectHashPath(page, "/model/weighted-ensemble/select-models");
  await page.getByRole("checkbox", { name: "移动平均法" }).check();
  await page.getByRole("checkbox", { name: "LSTM模型" }).check();
  await clickLastEnabledButton(page, "下一步");

  await expectHashPath(page, "/model/weighted-ensemble/results");
  await expect(page.getByText("加权平均融合 - 计算结果")).toBeVisible({
    timeout: 300_000,
  });
  await clickLastEnabledButton(page, "下一步");

  await expectHashPath(page, "/model/weighted-ensemble/prediction-comparison");
  await expect(
    page
      .getByRole("heading", { name: "加权平均融合 - 预测结果" })
      .first(),
  ).toBeVisible();
  await clickLastEnabledButton(page, "下一步");

  await expectHashPath(
    page,
    "/model/weighted-ensemble/model-metrics-comparison",
  );
  await expect(page.getByText("模型指标对比")).toBeVisible();
  await clickLastEnabledButton(page, "完成");
  await expectHashPath(page, "/model/ensemble-select");
}

export async function completeStackingEnsemble(page: Page) {
  await page
    .locator("div.cursor-pointer")
    .filter({ hasText: "Stacking" })
    .first()
    .click();

  await expectHashPath(page, "/model/stacking-ensemble/intro");
  await clickLastEnabledButton(page, "下一步");

  await expectHashPath(page, "/model/stacking-ensemble/select-models");
  await page.getByRole("checkbox", { name: "移动平均法" }).check();
  await page.getByRole("checkbox", { name: "指数平滑法" }).check();
  await clickLastEnabledButton(page, "下一步");

  await expectHashPath(page, "/model/stacking-ensemble/results");
  await expect(
    page.getByText("Stacking 融合 - 计算结果"),
  ).toBeVisible({ timeout: 180_000 });
  await clickLastEnabledButton(page, "下一步");

  await expectHashPath(
    page,
    "/model/stacking-ensemble/model-metrics-comparison",
  );
  await expect(page.getByText("模型指标对比")).toBeVisible();
  await clickLastEnabledButton(page, "完成");
  await expectHashPath(page, "/model/ensemble-select");
}

export async function completeBoostingEnsemble(page: Page) {
  await page
    .locator("div.cursor-pointer")
    .filter({ hasText: "Boosting" })
    .first()
    .click();

  await expectHashPath(page, "/model/boosting-ensemble/intro");
  await clickLastEnabledButton(page, "下一步");

  await expectHashPath(page, "/model/boosting-ensemble/select-models");
  await page.getByRole("checkbox", { name: "移动平均法" }).check();
  await page.getByRole("checkbox", { name: "指数平滑法" }).check();
  await clickLastEnabledButton(page, "下一步");

  await expectHashPath(page, "/model/boosting-ensemble/results");
  await expect(
    page.getByText("Boosting 融合 - 计算结果"),
  ).toBeVisible({ timeout: 180_000 });
  await clickLastEnabledButton(page, "下一步");

  await expectHashPath(
    page,
    "/model/boosting-ensemble/model-metrics-comparison",
  );
  await expect(page.getByText("模型指标对比")).toBeVisible();
  await clickLastEnabledButton(page, "完成");
  await expectHashPath(page, "/model/ensemble-select");
}

// ── Post-model flow ────────────────────────────────────────────────

export async function enterEvaluation(page: Page) {
  await expect(page.getByText("模型构建阶段已全部完成")).toBeVisible();
  await clickLastEnabledButton(page, /进入结果评估/);
  await expectHashPath(page, "/evaluation");
}

export async function completeEvaluationAndModelQuiz(
  page: Page,
  bestModelLabel: string,
) {
  const bestModelPattern = buildWhitespaceAgnosticRegex(bestModelLabel);
  const bestModelOption = page
    .locator("label")
    .filter({ hasText: bestModelPattern })
    .first();
  await expect(bestModelOption).toBeVisible({ timeout: 30_000 });
  await bestModelOption.click();
  await clickLastEnabledButton(page, "下一步");

  await expectHashPath(page, "/quiz");
  await expect(page.getByText("预测模型知识测验")).toBeVisible();
  await answerAllQuizQuestions(page);
  await clickLastEnabledButton(page, /提交答案，开始制定生产计划/);

  await expectHashPath(page, "/production/scenario");
}

export async function completeProductionAndPlanQuiz(page: Page) {
  const scenarioCarouselNext = page.locator(".swiper-button-next-custom");
  await expect(scenarioCarouselNext).toBeVisible();
  await expect(scenarioCarouselNext).toBeEnabled();
  await scenarioCarouselNext.click();
  await clickLastEnabledButton(page, "下一步");

  await expectHashPath(page, "/production/role-intro");
  await clickLastEnabledButton(page, /开始制定生产计划/);

  await expectHashPath(page, "/production/steps");
  await clickLastEnabledButton(page, /预测第一期需求/);
  await expect(page.getByText("第一期数据生成成功")).toBeVisible({
    timeout: 120_000,
  });
  await clickLastEnabledButton(page, /进入下一步/);

  await clickLastEnabledButton(page, /获取第二期需求量/);
  await expect(page.getByText("第二期需求预测成功")).toBeVisible({
    timeout: 60_000,
  });
  await clickLastEnabledButton(page, /计算库存量和缺货量/);
  await expect(page.getByText("第2期结果总结")).toBeVisible();
  await clickLastEnabledButton(page, "下一步");

  await clickLastEnabledButton(page, /计算服务水平/);
  await expect(
    page.getByText("第2期服务水平", { exact: true }),
  ).toBeVisible();
  await clickLastEnabledButton(page, "下一步");

  await clickLastEnabledButton(page, /计算安全库存和预测量/);
  await expect(page.getByText("总预测量")).toBeVisible();
  await clickLastEnabledButton(page, "下一步");

  await clickLastEnabledButton(page, /计算投入量/);
  await expect(page.getByText("第2期需要投入")).toBeVisible();
  await clickLastEnabledButton(page, "下一步");

  await expect(page.getByText("完整生产计划已生成")).toBeVisible({
    timeout: 120_000,
  });
  await clickLastEnabledButton(page, /查看最终MPS表/);

  await clickLastEnabledButton(page, /完成生产计划，进入测验/);
  await expectHashPath(page, "/quiz-plan");

  await expect(page.getByText("生产计划知识测验")).toBeVisible();
  await answerAllQuizQuestions(page);
  await clickLastEnabledButton(page, /提交答案，开始编写实验报告/);

  await expectHashPath(page, "/report");
}

export async function completeReportAndLogout(page: Page) {
  const textareas = page.locator(
    'textarea[placeholder*="请根据上述实验结果"]',
  );
  await expect(textareas).toHaveCount(5);

  for (let idx = 0; idx < REPORT_ANALYSES.length; idx += 1) {
    await textareas.nth(idx).fill(REPORT_ANALYSES[idx]!);
  }

  await clickLastEnabledButton(page, /保存并提交报告/);
  await expect(page.getByText("恭喜！实验完成")).toBeVisible({
    timeout: 60_000,
  });

  await clickLastEnabledButton(page, /退出登录/);
  await expect(page).toHaveURL(/\/login\.html$/);
}
