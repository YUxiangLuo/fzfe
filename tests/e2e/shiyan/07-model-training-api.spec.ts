import { test, expect } from "./fixtures";
import {
  BACKEND_ORIGIN,
  DEFAULT_DATA_WINDOW,
  SECONDARY_STUDENT_PASSWORD,
  SECONDARY_STUDENT_USERNAME,
  SHIYAN_COMPANY,
  SHIYAN_INDUSTRY,
  SHIYAN_PRIMARY_PRODUCT,
} from "./support/constants";
import {
  prepareModelStageExperiment,
  seedManagedExperimentFixture,
} from "./support/model-training";
import { acquireAllModelSlots } from "./support/model-slot-locks";
import { loginStudentViaApi } from "./support/backend";

const buildTrainingBody = (
  experimentId: number,
  overrides: Record<string, unknown> = {},
) => ({
  experiment_id: experimentId,
  selected_industry: SHIYAN_INDUSTRY,
  selected_company: SHIYAN_COMPANY,
  selected_product: SHIYAN_PRIMARY_PRODUCT,
  data_window_train_start_index: Number(DEFAULT_DATA_WINDOW.trainStart),
  data_window_train_end_index: Number(DEFAULT_DATA_WINDOW.trainEnd),
  data_window_evaluate_start_index: Number(DEFAULT_DATA_WINDOW.evaluateStart),
  data_window_evaluate_end_index: Number(DEFAULT_DATA_WINDOW.evaluateEnd),
  ...overrides,
});

const buildMinimalTrainingBody = (
  experimentId: number,
  overrides: Record<string, unknown> = {},
) => ({
  experiment_id: experimentId,
  ...overrides,
});

const authHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
});

const readJson = async (response: { json: () => Promise<unknown> }) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

test.describe("@shiyan model training api", () => {
  test("training controller rejects invalid model types with 400", async ({
    page,
    studentApi,
    studentToken,
  }) => {
    const experiment = await prepareModelStageExperiment(studentApi);

    const response = await page.request.post(
      `${BACKEND_ORIGIN}/api/v1/models/not-a-model/training`,
      {
        headers: authHeaders(studentToken),
        data: buildTrainingBody(experiment.experiment_id, {
          moving_average_window: 6,
        }),
      },
    );

    expect(response.status()).toBe(400);
    expect(await readJson(response)).toMatchObject({
      error: "指定的模型类型无效",
    });
  });

  test("training controller schema rejects inverted training windows with 400", async ({
    page,
    studentApi,
    studentToken,
  }) => {
    await studentApi.cleanupInProgressExperiments();
    const experiment = await studentApi.createExperiment({
      current_step: 5,
      highest_completed_step: 4,
      selected_industry: SHIYAN_INDUSTRY,
      selected_company: SHIYAN_COMPANY,
      selected_product: SHIYAN_PRIMARY_PRODUCT,
      data_window_train_start_index: 10,
      data_window_train_end_index: 5,
      data_window_evaluate_start_index: Number(DEFAULT_DATA_WINDOW.evaluateStart),
      data_window_evaluate_end_index: Number(DEFAULT_DATA_WINDOW.evaluateEnd),
    });
    expect(experiment.data_window_train_start_index).toBe(10);
    expect(experiment.data_window_train_end_index).toBe(5);

    const response = await page.request.post(
      `${BACKEND_ORIGIN}/api/v1/models/ma/training`,
      {
        headers: authHeaders(studentToken),
        data: {
          ...buildTrainingBody(experiment.experiment_id, {
            moving_average_window: 6,
          }),
          data_window_train_start_index: 10,
          data_window_train_end_index: 5,
        },
      },
    );

    expect(response.status()).toBe(400);
    expect(await readJson(response)).toMatchObject({
      error: "训练起始索引必须小于等于训练结束索引",
    });
  });

  test("training service rejects experiments whose persisted window exceeds dataset size", async ({
    page,
    studentApi,
    studentToken,
  }) => {
    await studentApi.cleanupInProgressExperiments();
    const experiment = await studentApi.createExperiment({
      current_step: 5,
      highest_completed_step: 4,
      selected_industry: SHIYAN_INDUSTRY,
      selected_company: SHIYAN_COMPANY,
      selected_product: SHIYAN_PRIMARY_PRODUCT,
      data_window_train_start_index: Number(DEFAULT_DATA_WINDOW.trainStart),
      data_window_train_end_index: Number(DEFAULT_DATA_WINDOW.trainEnd),
      data_window_evaluate_start_index: Number(DEFAULT_DATA_WINDOW.evaluateStart),
      data_window_evaluate_end_index: 99,
    });
    expect(experiment.data_window_evaluate_end_index).toBe(99);

    const response = await page.request.post(
      `${BACKEND_ORIGIN}/api/v1/models/ma/training`,
      {
        headers: authHeaders(studentToken),
        data: {
          ...buildTrainingBody(experiment.experiment_id, {
            moving_average_window: 6,
          }),
          data_window_evaluate_end_index: 99,
        },
      },
    );

    expect(response.status()).toBe(400);
    expect(await readJson(response)).toMatchObject({
      error: "数据窗口索引超出范围",
      dataset_size: 36,
    });
  });

  test("training service returns 403 when another student accesses the experiment", async ({
    page,
    studentApi,
  }) => {
    const experiment = await prepareModelStageExperiment(studentApi);
    const secondaryToken = await loginStudentViaApi(
      SECONDARY_STUDENT_USERNAME,
      SECONDARY_STUDENT_PASSWORD,
    );

    const response = await page.request.post(
      `${BACKEND_ORIGIN}/api/v1/models/ma/training`,
      {
        headers: authHeaders(secondaryToken),
        data: buildTrainingBody(experiment.experiment_id, {
          moving_average_window: 6,
        }),
      },
    );

    expect(response.status()).toBe(403);
    expect(await readJson(response)).toMatchObject({
      error: "权限不足：该实验不属于当前用户",
    });
  });

  test("training service returns 404 when the experiment does not exist", async ({
    page,
    studentToken,
  }) => {
    const response = await page.request.post(
      `${BACKEND_ORIGIN}/api/v1/models/ma/training`,
      {
        headers: authHeaders(studentToken),
        data: buildMinimalTrainingBody(999999, {
          moving_average_window: 6,
        }),
      },
    );

    expect(response.status()).toBe(404);
    expect(await readJson(response)).toMatchObject({
      error: "实验不存在",
    });
  });

  test("training service rejects completed experiments with 400", async ({
    page,
    studentApi,
    studentToken,
  }) => {
    await studentApi.cleanupInProgressExperiments();
    const experiment = await studentApi.createExperiment({
      current_step: 7,
      highest_completed_step: 7,
      selected_industry: SHIYAN_INDUSTRY,
      selected_company: SHIYAN_COMPANY,
      selected_product: SHIYAN_PRIMARY_PRODUCT,
      data_window_train_start_index: Number(DEFAULT_DATA_WINDOW.trainStart),
      data_window_train_end_index: Number(DEFAULT_DATA_WINDOW.trainEnd),
      data_window_evaluate_start_index: Number(DEFAULT_DATA_WINDOW.evaluateStart),
      data_window_evaluate_end_index: Number(DEFAULT_DATA_WINDOW.evaluateEnd),
    });
    seedManagedExperimentFixture(experiment.experiment_id, { status: "Completed" });

    const response = await page.request.post(
      `${BACKEND_ORIGIN}/api/v1/models/ma/training`,
      {
        headers: authHeaders(studentToken),
        data: buildMinimalTrainingBody(experiment.experiment_id, {
          moving_average_window: 6,
        }),
      },
    );

    expect(response.status()).toBe(400);
    expect(await readJson(response)).toMatchObject({
      error: "已完成的实验不允许继续训练或预测模型",
    });
  });

  test("training controller maps python validation failures from ensemble models to 400 responses", async ({
    page,
    studentApi,
    studentToken,
  }) => {
    const experiment = await prepareModelStageExperiment(studentApi);

    const response = await page.request.post(
      `${BACKEND_ORIGIN}/api/v1/models/weighted_avg/training`,
      {
        headers: authHeaders(studentToken),
        data: buildTrainingBody(experiment.experiment_id, {
          models: "ma",
          moving_average_window: 6,
        }),
      },
    );

    expect(response.status()).toBe(400);
    expect(await readJson(response)).toMatchObject({
      error: "融合模型至少需要选择两个有效且不重复的基础模型",
    });
  });

  test("training service rejects experiments without dataset selection", async ({
    page,
    studentApi,
    studentToken,
  }) => {
    await studentApi.cleanupInProgressExperiments();
    const experiment = await studentApi.createExperiment({
      current_step: 5,
      highest_completed_step: 4,
      data_window_train_start_index: Number(DEFAULT_DATA_WINDOW.trainStart),
      data_window_train_end_index: Number(DEFAULT_DATA_WINDOW.trainEnd),
      data_window_evaluate_start_index: Number(DEFAULT_DATA_WINDOW.evaluateStart),
      data_window_evaluate_end_index: Number(DEFAULT_DATA_WINDOW.evaluateEnd),
    });

    const response = await page.request.post(
      `${BACKEND_ORIGIN}/api/v1/models/ma/training`,
      {
        headers: authHeaders(studentToken),
        data: buildMinimalTrainingBody(experiment.experiment_id, {
          moving_average_window: 6,
        }),
      },
    );

    expect(response.status()).toBe(400);
    expect(await readJson(response)).toMatchObject({
      error: "实验尚未完成数据集选择，无法训练模型",
    });
  });

  test("training service rejects experiments without data windows", async ({
    page,
    studentApi,
    studentToken,
  }) => {
    await studentApi.cleanupInProgressExperiments();
    const experiment = await studentApi.createExperiment({
      current_step: 5,
      highest_completed_step: 4,
      selected_industry: SHIYAN_INDUSTRY,
      selected_company: SHIYAN_COMPANY,
      selected_product: SHIYAN_PRIMARY_PRODUCT,
    });

    const response = await page.request.post(
      `${BACKEND_ORIGIN}/api/v1/models/ma/training`,
      {
        headers: authHeaders(studentToken),
        data: buildMinimalTrainingBody(experiment.experiment_id, {
          moving_average_window: 6,
        }),
      },
    );

    expect(response.status()).toBe(400);
    expect(await readJson(response)).toMatchObject({
      error: "实验尚未完成数据窗口配置，无法训练模型",
    });
  });

  test("training controller maps python validation failures from model runtime to 400 responses", async ({
    page,
    studentApi,
    studentToken,
  }) => {
    await studentApi.cleanupInProgressExperiments();
    const experiment = await studentApi.createExperiment({
      current_step: 5,
      highest_completed_step: 4,
      selected_industry: SHIYAN_INDUSTRY,
      selected_company: SHIYAN_COMPANY,
      selected_product: SHIYAN_PRIMARY_PRODUCT,
      data_window_train_start_index: Number(DEFAULT_DATA_WINDOW.trainStart),
      data_window_train_end_index: Number(DEFAULT_DATA_WINDOW.trainEnd),
      data_window_evaluate_start_index: Number(DEFAULT_DATA_WINDOW.trainEnd),
      data_window_evaluate_end_index: Number(DEFAULT_DATA_WINDOW.evaluateEnd),
    });

    const response = await page.request.post(
      `${BACKEND_ORIGIN}/api/v1/models/ma/training`,
      {
        headers: authHeaders(studentToken),
        data: buildMinimalTrainingBody(experiment.experiment_id, {
          moving_average_window: 6,
        }),
      },
    );

    const payload = (await readJson(response)) as Record<string, unknown>;
    expect(response.status()).toBe(400);
    expect(payload).toMatchObject({
      error: expect.stringContaining("评估起始索引必须大于训练结束索引"),
    });
    expect(String(payload.error)).toContain("重新选择数据窗口");
  });

  test("training controller schema rejects inverted evaluation windows with 400", async ({
    page,
    studentApi,
    studentToken,
  }) => {
    await studentApi.cleanupInProgressExperiments();
    const experiment = await studentApi.createExperiment({
      current_step: 5,
      highest_completed_step: 4,
      selected_industry: SHIYAN_INDUSTRY,
      selected_company: SHIYAN_COMPANY,
      selected_product: SHIYAN_PRIMARY_PRODUCT,
      data_window_train_start_index: Number(DEFAULT_DATA_WINDOW.trainStart),
      data_window_train_end_index: Number(DEFAULT_DATA_WINDOW.trainEnd),
      data_window_evaluate_start_index: 35,
      data_window_evaluate_end_index: 28,
    });

    const response = await page.request.post(
      `${BACKEND_ORIGIN}/api/v1/models/ma/training`,
      {
        headers: authHeaders(studentToken),
        data: buildTrainingBody(experiment.experiment_id, {
          moving_average_window: 6,
          data_window_evaluate_start_index: 35,
          data_window_evaluate_end_index: 28,
        }),
      },
    );

    expect(response.status()).toBe(400);
    expect(await readJson(response)).toMatchObject({
      error: "评估起始索引必须小于等于评估结束索引",
    });
  });

  test("training service rejects experiments with invalid persisted training windows", async ({
    page,
    studentApi,
    studentToken,
  }) => {
    await studentApi.cleanupInProgressExperiments();
    const experiment = await studentApi.createExperiment({
      current_step: 5,
      highest_completed_step: 4,
      selected_industry: SHIYAN_INDUSTRY,
      selected_company: SHIYAN_COMPANY,
      selected_product: SHIYAN_PRIMARY_PRODUCT,
      data_window_train_start_index: 10,
      data_window_train_end_index: 5,
      data_window_evaluate_start_index: Number(DEFAULT_DATA_WINDOW.evaluateStart),
      data_window_evaluate_end_index: Number(DEFAULT_DATA_WINDOW.evaluateEnd),
    });

    const response = await page.request.post(
      `${BACKEND_ORIGIN}/api/v1/models/ma/training`,
      {
        headers: authHeaders(studentToken),
        data: buildMinimalTrainingBody(experiment.experiment_id, {
          moving_average_window: 6,
        }),
      },
    );

    expect(response.status()).toBe(400);
    expect(await readJson(response)).toMatchObject({
      error: "实验记录中的训练数据窗口无效，请重新选择数据窗口后重试",
    });
  });

  test("training service rejects experiments with invalid persisted evaluation windows", async ({
    page,
    studentApi,
    studentToken,
  }) => {
    await studentApi.cleanupInProgressExperiments();
    const experiment = await studentApi.createExperiment({
      current_step: 5,
      highest_completed_step: 4,
      selected_industry: SHIYAN_INDUSTRY,
      selected_company: SHIYAN_COMPANY,
      selected_product: SHIYAN_PRIMARY_PRODUCT,
      data_window_train_start_index: Number(DEFAULT_DATA_WINDOW.trainStart),
      data_window_train_end_index: Number(DEFAULT_DATA_WINDOW.trainEnd),
      data_window_evaluate_start_index: 35,
      data_window_evaluate_end_index: 28,
    });

    const response = await page.request.post(
      `${BACKEND_ORIGIN}/api/v1/models/ma/training`,
      {
        headers: authHeaders(studentToken),
        data: buildMinimalTrainingBody(experiment.experiment_id, {
          moving_average_window: 6,
        }),
      },
    );

    expect(response.status()).toBe(400);
    expect(await readJson(response)).toMatchObject({
      error: "实验记录中的评估数据窗口无效，请重新选择数据窗口后重试",
    });
  });

  test("training service rejects request payloads that drift from persisted company selection", async ({
    page,
    studentApi,
    studentToken,
  }) => {
    const experiment = await prepareModelStageExperiment(studentApi);

    const response = await page.request.post(
      `${BACKEND_ORIGIN}/api/v1/models/ma/training`,
      {
        headers: authHeaders(studentToken),
        data: buildMinimalTrainingBody(experiment.experiment_id, {
          selected_company: "错误企业",
          moving_average_window: 6,
        }),
      },
    );

    expect(response.status()).toBe(400);
    expect(await readJson(response)).toMatchObject({
      error: "请求中的企业与实验记录不一致，请刷新页面后重试",
      field: "selected_company",
      request_value: "错误企业",
      persisted_value: SHIYAN_COMPANY,
    });
  });

  test("training service rejects request payloads that drift from persisted evaluation windows", async ({
    page,
    studentApi,
    studentToken,
  }) => {
    const experiment = await prepareModelStageExperiment(studentApi);

    const response = await page.request.post(
      `${BACKEND_ORIGIN}/api/v1/models/ma/training`,
      {
        headers: authHeaders(studentToken),
        data: buildMinimalTrainingBody(experiment.experiment_id, {
          data_window_evaluate_end_index: 34,
          moving_average_window: 6,
        }),
      },
    );

    expect(response.status()).toBe(400);
    expect(await readJson(response)).toMatchObject({
      error: "请求中的评估结束索引与实验记录不一致，请刷新页面后重试",
      field: "data_window_evaluate_end_index",
      request_value: 34,
      persisted_value: Number(DEFAULT_DATA_WINDOW.evaluateEnd),
    });
  });

  test("training controller returns 429 when all model slots are occupied", async ({
    page,
    studentApi,
    studentToken,
  }) => {
    const experiment = await prepareModelStageExperiment(studentApi);
    const slotLocks = await acquireAllModelSlots();

    try {
      const response = await page.request.post(
        `${BACKEND_ORIGIN}/api/v1/models/ma/training`,
        {
          headers: authHeaders(studentToken),
          data: buildTrainingBody(experiment.experiment_id, {
            moving_average_window: 6,
          }),
        },
      );

      expect(response.status()).toBe(429);
      expect(await readJson(response)).toMatchObject({
        error: "模型服务繁忙，请稍后再试",
      });
    } finally {
      await slotLocks.release();
    }
  });

  test("training controller returns 409 when the same model is trained concurrently", async ({
    page,
    studentApi,
    studentToken,
  }) => {
    const experiment = await prepareModelStageExperiment(studentApi);
    const url = `${BACKEND_ORIGIN}/api/v1/models/lstm/training`;
    const requestBody = buildTrainingBody(experiment.experiment_id, {
      lstmNormalization: "minmax",
      lstmTargetFeature: "销售数量",
      lstmFeatures: "价格指数,产能利用率",
    });

    const firstRequest = page.request.post(url, {
      headers: authHeaders(studentToken),
      data: requestBody,
    });

    await new Promise((resolve) => setTimeout(resolve, 100));

    const secondResponse = await page.request.post(url, {
      headers: authHeaders(studentToken),
      data: requestBody,
    });
    const firstResponse = await firstRequest;

    const firstPayload = await readJson(firstResponse);
    const secondPayload = await readJson(secondResponse);
    const outcomes = [
      { status: firstResponse.status(), payload: firstPayload },
      { status: secondResponse.status(), payload: secondPayload },
    ];

    expect(outcomes.some((entry) => entry.status === 200)).toBe(true);
    expect(outcomes.some((entry) => entry.status === 409)).toBe(true);
    expect(outcomes.find((entry) => entry.status === 409)?.payload).toMatchObject({
      error: "同一模型正在训练或预测，请稍后再试",
    });
  });
});
