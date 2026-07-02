import { test, expect } from "./fixtures";
import { prepareProductionStageExperiment } from "./support/model-training";

const buildPredictions = () =>
  Array.from({ length: 6 }, (_unused, index) => ({
    prediction: 100 + index * 10,
    std_dev: 4 + index * 0.5,
  }));

test.describe("@shiyan production prediction manual retries", () => {
  test("production step shows a busy toast and succeeds after a manual retry", async ({
    page,
    studentApi,
    studentApp,
  }) => {
    await prepareProductionStageExperiment(studentApi);

    let prepareAttempts = 0;
    let predictAttempts = 0;

    await page.route("**/api/v1/models/ma/prepare-production", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }

      prepareAttempts += 1;

      if (prepareAttempts === 1) {
        await route.fulfill({
          status: 429,
          contentType: "application/json",
          body: JSON.stringify({ error: "模型服务繁忙，请稍后再试" }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { ok: true } }),
      });
    });

    await page.route("**/api/v1/models/ma/predict", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }

      predictAttempts += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "success",
          results: {
            predictions: buildPredictions(),
          },
        }),
      });
    });

    await studentApp.open("/production/steps");
    await studentApp.expectHash("/production/steps");

    await studentApp.clickEnabledButton(/预测第一期需求/);

    await expect(
      page.getByText("模型服务当前繁忙，请稍后再次点击“重试”。"),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("第一期数据生成成功")).toHaveCount(0);
    expect(prepareAttempts).toBe(1);
    expect(predictAttempts).toBe(0);

    await studentApp.clickEnabledButton(/预测第一期需求/);

    await expect(page.getByText("第一期数据生成成功")).toBeVisible({
      timeout: 30_000,
    });
    expect(prepareAttempts).toBe(2);
    expect(predictAttempts).toBe(1);
  });

  test("production step reruns prepare and predict after a manual retry", async ({
    page,
    studentApi,
    studentApp,
  }) => {
    await prepareProductionStageExperiment(studentApi);

    let prepareAttempts = 0;
    let predictAttempts = 0;

    await page.route("**/api/v1/models/ma/prepare-production", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }

      prepareAttempts += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { ok: true } }),
      });
    });

    await page.route("**/api/v1/models/ma/predict", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }

      predictAttempts += 1;

      if (predictAttempts === 1) {
        await route.fulfill({
          status: 409,
          contentType: "application/json",
          body: JSON.stringify({ error: "同一模型正在训练或预测，请稍后再试" }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "success",
          results: {
            predictions: buildPredictions(),
          },
        }),
      });
    });

    await studentApp.open("/production/steps");
    await studentApp.expectHash("/production/steps");

    await studentApp.clickEnabledButton(/预测第一期需求/);

    await expect(
      page.getByText("当前模型已有训练或预测任务在执行，请稍后再次点击“重试”。"),
    ).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText("第一期数据生成成功")).toHaveCount(0);
    expect(prepareAttempts).toBe(1);
    expect(predictAttempts).toBe(1);

    await studentApp.clickEnabledButton(/预测第一期需求/);

    await expect(page.getByText("第一期数据生成成功")).toBeVisible({
      timeout: 30_000,
    });
    expect(prepareAttempts).toBe(2);
    expect(predictAttempts).toBe(2);
  });

  test("complete plan view shows a manual retry card after the first save attempt fails", async ({
    page,
    studentApi,
    studentApp,
  }) => {
    await prepareProductionStageExperiment(studentApi);

    let prepareAttempts = 0;
    let predictAttempts = 0;
    let saveAttempts = 0;

    await page.route("**/api/v1/models/ma/prepare-production", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }

      prepareAttempts += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: { ok: true } }),
      });
    });

    await page.route("**/api/v1/models/ma/predict", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }

      predictAttempts += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          status: "success",
          results: {
            predictions: buildPredictions(),
          },
        }),
      });
    });

    await page.route("**/api/v1/experiment-runs/*", async (route) => {
      if (route.request().method() !== "PUT") {
        await route.continue();
        return;
      }

      saveAttempts += 1;
      if (saveAttempts === 1) {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "生产计划保存失败" }),
        });
        return;
      }

      await route.continue();
    });

    await studentApp.open("/production/steps");
    await studentApp.expectHash("/production/steps");

    await studentApp.clickEnabledButton(/预测第一期需求/);
    await expect(page.getByText("第一期数据生成成功")).toBeVisible({
      timeout: 30_000,
    });
    await studentApp.clickEnabledButton(/进入下一步/);

    await studentApp.clickEnabledButton(/预测第二期需求|获取第二期需求量/);
    await expect(page.getByText("第二期需求预测成功")).toBeVisible({
      timeout: 30_000,
    });
    await studentApp.clickEnabledButton(/计算库存量和缺货量/);
    await expect(page.getByText("第2期结果总结")).toBeVisible();
    await studentApp.clickEnabledButton("下一步");

    await studentApp.clickEnabledButton(/计算服务水平/);
    await expect(page.getByText("第2期服务水平", { exact: true })).toBeVisible();
    await studentApp.clickEnabledButton("下一步");

    await studentApp.clickEnabledButton(/计算安全库存和预测量/);
    await expect(page.getByText("总预测量")).toBeVisible();
    await studentApp.clickEnabledButton("下一步");

    await studentApp.clickEnabledButton(/计算投入量/);
    await expect(page.getByText("第2期需要投入")).toBeVisible();
    await studentApp.clickEnabledButton("下一步");

    await expect(page.getByText("手动重试生成")).toBeVisible({
      timeout: 30_000,
    });
    expect(prepareAttempts).toBe(1);
    expect(predictAttempts).toBe(1);
    expect(saveAttempts).toBe(1);

    await studentApp.clickEnabledButton(/重新生成完整计划/);

    await expect(page.getByText("数据已安全保存")).toBeVisible({
      timeout: 30_000,
    });
    expect(saveAttempts).toBe(2);
  });
});
