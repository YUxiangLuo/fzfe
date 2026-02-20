import type { Page, Route } from "@playwright/test";

type JwtPayload = {
  sub?: number;
  username?: string;
  role?: string;
  full_name?: string;
};

type ExperimentState = Record<string, unknown>;
type QuizType = "Single Choice" | "Multiple Choice" | "True/False";

type QuizQuestion = {
  question_id: number;
  knowledge_point: string;
  question_type: QuizType;
  question_text: string;
  options: Record<string, string> | string[];
};

type ExperimentApiMockOptions = {
  initialExperimentState?: Partial<ExperimentState>;
  modelQuizQuestions?: QuizQuestion[];
  planQuizQuestions?: QuizQuestion[];
};

const corsHeaders = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
  "access-control-allow-headers": "*",
};

const jsonResponse = async (
  route: Route,
  status: number,
  body: unknown,
): Promise<void> => {
  const responseBody = status >= 200 && status < 300
    ? { data: body }
    : body;

  await route.fulfill({
    status,
    headers: {
      ...corsHeaders,
      "content-type": "application/json",
    },
    body: JSON.stringify(responseBody),
  });
};

const noContentResponse = async (route: Route): Promise<void> => {
  await route.fulfill({
    status: 204,
    headers: corsHeaders,
    body: "",
  });
};

const parsePath = (route: Route): { path: string; url: URL } => {
  const url = new URL(route.request().url());
  const index = url.pathname.indexOf("/api/v1");
  const rawPath = index >= 0 ? url.pathname.slice(index + "/api/v1".length) : url.pathname;
  const path = rawPath || "/";
  const decodedPath = path
    .split("/")
    .map((segment, idx) => {
      if (idx === 0) return segment;
      try {
        return decodeURIComponent(segment);
      } catch {
        return segment;
      }
    })
    .join("/");
  return { path: decodedPath, url };
};

const readJsonBody = <T = Record<string, unknown>>(route: Route): T => {
  try {
    return route.request().postDataJSON() as T;
  } catch {
    return {} as T;
  }
};

const decodeJwtPayloadFromRequest = (route: Route): JwtPayload | null => {
  const headers = route.request().headers();
  const authHeader = headers.authorization || headers.Authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

  const token = authHeader.slice("Bearer ".length);
  const payloadBase64Url = token.split(".")[1];
  if (!payloadBase64Url) return null;

  try {
    const payloadRaw = Buffer.from(payloadBase64Url, "base64url").toString("utf8");
    return JSON.parse(payloadRaw) as JwtPayload;
  } catch {
    return null;
  }
};

const buildMonthlySales = (
  startYear: number,
  startMonth: number,
  values: number[],
): Array<{ month: string; sales: number }> => {
  return values.map((sales, index) => {
    const monthOffset = startMonth - 1 + index;
    const year = startYear + Math.floor(monthOffset / 12);
    const month = (monthOffset % 12) + 1;
    const monthLabel = `${year}-${String(month).padStart(2, "0")}`;
    return { month: monthLabel, sales };
  });
};

const SALES_VALUES = [
  920, 960, 980, 1010, 1035, 1070, 1110, 1150, 1180, 1220, 1260, 1290,
  1310, 1340, 1380, 1410, 1450, 1490, 1530, 1560, 1590, 1620, 1660, 1700,
];

const SALES_DATASET = buildMonthlySales(2023, 1, SALES_VALUES);

const CSV_HEADERS = ["月份", "销量", "渠道", "营销活动"];
const CSV_ROWS = SALES_DATASET.map((row, index) => [
  row.month,
  String(row.sales),
  index % 2 === 0 ? "线上" : "线下",
  index % 3 === 0 ? "促销" : "常规",
]);
const CSV_DATA = [CSV_HEADERS, ...CSV_ROWS];

const DEFAULT_MODEL_QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    question_id: 101,
    knowledge_point: "模型评价",
    question_type: "Single Choice",
    question_text: "在模型评估中，误差越小通常代表什么？",
    options: {
      A: "预测效果越好",
      B: "预测效果越差",
      C: "与效果无关",
    },
  },
];

const DEFAULT_PLAN_QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    question_id: 201,
    knowledge_point: "生产计划",
    question_type: "Single Choice",
    question_text: "安全库存的主要作用是什么？",
    options: {
      A: "应对需求波动，降低缺货风险",
      B: "降低生产效率",
      C: "替代需求预测",
    },
  },
];

export const installExperimentApiMock = async (
  page: Page,
  options: ExperimentApiMockOptions = {},
): Promise<void> => {
  const now = new Date().toISOString();
  let eventId = 1;
  let reportId = 7000;

  const baseExperimentState: ExperimentState = {
    experiment_id: null,
    student_id: 1001,
    status: "Not Started",
    highest_completed_step: 0,
    current_step: 1,
    selected_industry: null,
    selected_company: null,
    selected_product: null,
    start_time: null,
    last_activity_at: null,
    completion_time: null,
  };
  let experimentState: ExperimentState = {
    ...baseExperimentState,
    ...(options.initialExperimentState ?? {}),
  };

  const modelQuizQuestions = options.modelQuizQuestions ?? DEFAULT_MODEL_QUIZ_QUESTIONS;
  const planQuizQuestions = options.planQuizQuestions ?? DEFAULT_PLAN_QUIZ_QUESTIONS;

  const datasetTree: Record<string, Record<string, string[]>> = {
    消费电子: {
      华东工厂: ["旗舰手机A", "平板设备B"],
    },
    食品饮料: {
      华南工厂: ["果汁饮品C"],
    },
  };

  await page.route("**/api/v1/**", async (route) => {
    const method = route.request().method().toUpperCase();
    const { path } = parsePath(route);
    const payload = decodeJwtPayloadFromRequest(route);

    if (method === "OPTIONS") {
      await noContentResponse(route);
      return;
    }

    // Manual PDF is loaded via iframe and does not include Authorization header.
    if (method === "GET" && /^\/manuals\/.+\.pdf$/i.test(path)) {
      await route.fulfill({
        status: 200,
        headers: {
          ...corsHeaders,
          "content-type": "application/pdf",
        },
        body: "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF",
      });
      return;
    }

    if (!payload?.sub) {
      await jsonResponse(route, 401, { error: "未登录或登录已过期" });
      return;
    }

    if (method === "GET" && path === "/my-latest-report-status") {
      await jsonResponse(route, 200, { is_rejected: false });
      return;
    }

    if (method === "GET" && path === "/manuals/active") {
      await jsonResponse(route, 200, {
        manual_id: 1,
        file_name: "实验手册-2026春.pdf",
        file_path: "manuals/manual-2026-spring.pdf",
        description: "实验手册",
      });
      return;
    }

    if (method === "GET" && path === "/users/me") {
      await jsonResponse(route, 200, {
        user_id: payload.sub,
        username: payload.username || "student_e2e",
        full_name: payload.full_name || "实验学生",
        email: "student.e2e@example.com",
        role: payload.role || "Student",
        phone_number: "13600000000",
        created_at: now,
      });
      return;
    }

    if (method === "GET" && path === "/students/me/experiment-runs/active") {
      await jsonResponse(route, 200, experimentState);
      return;
    }

    if (method === "POST" && path === "/students/me/experiment-runs") {
      experimentState = {
        ...experimentState,
        experiment_id: 9001,
        student_id: payload.sub,
        status: "In Progress",
        highest_completed_step: 0,
        current_step: 1,
        start_time: now,
        last_activity_at: now,
      };
      await jsonResponse(route, 201, experimentState);
      return;
    }

    if (method === "PUT" && /^\/experiment-runs\/\d+$/.test(path)) {
      const statePatch = readJsonBody<Record<string, unknown>>(route);
      experimentState = {
        ...experimentState,
        ...statePatch,
        experiment_id: Number(path.split("/")[2]),
      };
      await jsonResponse(route, 200, experimentState);
      return;
    }

    if (method === "POST" && /^\/experiment-runs\/\d+\/events$/.test(path)) {
      const nextEventId = eventId++;
      await jsonResponse(route, 201, {
        message: "事件记录成功",
        event_id: nextEventId,
      });
      return;
    }

    if (method === "GET" && path === "/quizzes/model/questions") {
      await jsonResponse(route, 200, modelQuizQuestions);
      return;
    }

    if (method === "GET" && path === "/quizzes/plan/questions") {
      await jsonResponse(route, 200, planQuizQuestions);
      return;
    }

    if (method === "POST" && path === "/quizzes/answers") {
      const body = readJsonBody<{ experiment_id?: number; answers?: Array<{ submitted_answer?: string[] }> }>(route);
      const hasAnswers = Array.isArray(body.answers) && body.answers.length > 0;
      const hasEmptyAnswer = hasAnswers
        ? body.answers!.some((item) => !Array.isArray(item.submitted_answer) || item.submitted_answer.length === 0)
        : true;

      if (!hasAnswers || hasEmptyAnswer) {
        await jsonResponse(route, 400, { error: "答案参数错误" });
        return;
      }

      await jsonResponse(route, 201, { message: "答题提交成功" });
      return;
    }

    if (method === "POST" && /^\/experiment-runs\/\d+\/report$/.test(path)) {
      reportId += 1;
      await jsonResponse(route, 201, {
        message: "报告提交成功",
        report_id: reportId,
        pdf_path: `reports/report-${reportId}.pdf`,
      });
      return;
    }

    if (method === "GET" && path === "/datasets/industries") {
      await jsonResponse(route, 200, Object.keys(datasetTree));
      return;
    }

    const companyPathMatch = path.match(/^\/datasets\/industries\/(.+)\/companies$/);
    if (method === "GET" && companyPathMatch?.[1]) {
      const industry = companyPathMatch[1];
      const companies = datasetTree[industry] ? Object.keys(datasetTree[industry]) : [];
      await jsonResponse(route, 200, companies);
      return;
    }

    const productPathMatch = path.match(/^\/datasets\/industries\/(.+)\/companies\/(.+)\/products$/);
    if (method === "GET" && productPathMatch?.[1] && productPathMatch?.[2]) {
      const industry = productPathMatch[1];
      const company = productPathMatch[2];
      const products = datasetTree[industry]?.[company] || [];
      await jsonResponse(route, 200, products);
      return;
    }

    const salesPathMatch = path.match(
      /^\/datasets\/industries\/(.+)\/companies\/(.+)\/products\/(.+)\/sales$/,
    );
    if (method === "GET" && salesPathMatch?.[1] && salesPathMatch?.[2] && salesPathMatch?.[3]) {
      const industry = salesPathMatch[1];
      const company = salesPathMatch[2];
      const product = salesPathMatch[3];
      const exists = (datasetTree[industry]?.[company] || []).includes(product);
      if (!exists) {
        await jsonResponse(route, 404, { error: "产品不存在" });
        return;
      }
      await jsonResponse(route, 200, {
        meta: {
          industry,
          company,
          product,
          name: product,
          description: `${product}历史销量数据`,
          unit: "件",
        },
        monthlySales: SALES_DATASET,
        csvData: CSV_DATA,
      });
      return;
    }

    const fieldsPathMatch = path.match(
      /^\/datasets\/industries\/(.+)\/companies\/(.+)\/products\/(.+)\/fields$/,
    );
    if (method === "GET" && fieldsPathMatch?.[1] && fieldsPathMatch?.[2] && fieldsPathMatch?.[3]) {
      const industry = fieldsPathMatch[1];
      const company = fieldsPathMatch[2];
      const product = fieldsPathMatch[3];
      const exists = (datasetTree[industry]?.[company] || []).includes(product);
      if (!exists) {
        await jsonResponse(route, 404, { error: "产品不存在" });
        return;
      }
      await jsonResponse(route, 200, {
        fields: ["销售数量", "渠道", "营销活动"],
      });
      return;
    }

    await jsonResponse(route, 404, {
      error: `No mock handler for ${method} ${path}`,
    });
  });
};
