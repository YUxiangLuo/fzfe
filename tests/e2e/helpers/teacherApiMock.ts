import type { Page, Route } from "@playwright/test";

type JwtPayload = {
  sub?: number;
  username?: string;
  full_name?: string;
  role?: string;
};

type MockClass = {
  class_id: number;
  class_name: string;
  class_code: string;
  teacher_id: number;
  teacher_name: string;
  created_at: string;
  assistants?: Array<{
    user_id: number;
    username: string;
    full_name: string;
    email: string;
  }>;
};

type MockStudent = {
  user_id: number;
  username: string;
  full_name: string;
  email: string;
  phone_number: string | null;
  role: "Student";
  created_at: string;
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
  const path = index >= 0 ? url.pathname.slice(index + "/api/v1".length) : url.pathname;
  return { path: path || "/", url };
};

const readJsonBody = <T = Record<string, unknown>>(route: Route): T => {
  try {
    return route.request().postDataJSON() as T;
  } catch {
    return {} as T;
  }
};

const readFormField = (route: Route, fieldName: string): string | undefined => {
  const body = route.request().postData();
  if (!body) return undefined;
  const fieldPattern = new RegExp(`name="${fieldName}"\\r?\\n\\r?\\n([^\\r\\n]+)`);
  const match = body.match(fieldPattern);
  return match?.[1]?.trim();
};

const readMultipartFileContent = (route: Route, fieldName: string): string => {
  const body = route.request().postData();
  if (!body) return "";

  const contentWithType = body.match(
    new RegExp(`name="${fieldName}"[^\\r\\n]*\\r?\\nContent-Type:[^\\r\\n]*\\r?\\n\\r?\\n([\\s\\S]*?)\\r?\\n--`),
  );
  if (contentWithType?.[1]) {
    return contentWithType[1];
  }

  const contentWithoutType = body.match(
    new RegExp(`name="${fieldName}"[^\\r\\n]*\\r?\\n\\r?\\n([\\s\\S]*?)\\r?\\n--`),
  );
  return contentWithoutType?.[1] || "";
};

const parseCsvRows = (content: string): string[][] => {
  const normalized = content.replace(/^\uFEFF/, "").trim();
  if (!normalized) return [];
  return normalized
    .split(/\r?\n/)
    .map((line) => line.split(",").map((cell) => cell.trim()))
    .filter((cells) => cells.some((cell) => cell.length > 0));
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

export const installTeacherApiMock = async (page: Page): Promise<void> => {
  const now = new Date().toISOString();

  let classes: MockClass[] = [
    {
      class_id: 101,
      class_name: "2026 春季一班",
      class_code: "CLS-2026-01",
      teacher_id: 2,
      teacher_name: "李老师",
      created_at: now,
      assistants: [
        {
          user_id: 3,
          username: "assistant_beta",
          full_name: "王助教",
          email: "assistant.beta@example.com",
        },
      ],
    },
  ];

  const studentsByClassId: Record<number, MockStudent[]> = {
    101: [
      {
        user_id: 1001,
        username: "20260001",
        full_name: "张三",
        email: "zhangsan@example.com",
        phone_number: "13600001111",
        role: "Student",
        created_at: now,
      },
    ],
  };

  const teacherAssistants = [
    {
      user_id: 3,
      username: "assistant_beta",
      full_name: "王助教",
      email: "assistant.beta@example.com",
      phone_number: "13700000000",
      role: "Assistant",
      created_at: now,
    },
  ];

  const allAssistants = [
    ...teacherAssistants,
    {
      user_id: 4,
      username: "assistant_gamma",
      full_name: "赵助教",
      email: "assistant.gamma@example.com",
      phone_number: "13700000001",
      role: "Assistant",
      created_at: now,
    },
  ];

  const reportsByClassId: Record<number, unknown[]> = {
    101: [
      {
        user_id: 1001,
        username: "20260001",
        full_name: "张三",
        report_id: 7001,
        experiment_id: 9001,
        status: "submitted",
        submitted_at: now,
        pdf_file_path: "reports/report-7001.pdf",
        grade: null,
        feedback: null,
        grader_name: null,
      },
    ],
  };

  const progressByClassId: Record<number, unknown[]> = {
    101: [
      {
        student_id: 1001,
        username: "20260001",
        full_name: "张三",
        experiment_id: 9001,
        status: "In Progress",
        current_step: 4,
        highest_completed_step: 3,
        start_time: now,
        last_activity_at: now,
        completion_time: null,
        timeline: [
          {
            event_id: 1,
            experiment_id: 9001,
            student_id: 1001,
            step_order: 1,
            event_type: "COMPLETED",
            event_timestamp: now,
          },
        ],
        steps: [
          { step_order: 1, started_at: now, completed_at: now, latest_event_type: "COMPLETED" },
          { step_order: 2, started_at: now, completed_at: now, latest_event_type: "COMPLETED" },
          { step_order: 3, started_at: now, completed_at: now, latest_event_type: "COMPLETED" },
          { step_order: 4, started_at: now, completed_at: null, latest_event_type: "STARTED" },
        ],
      },
    ],
  };

  const logsByClassId: Record<number, unknown[]> = {
    101: [
      {
        student_id: 1001,
        username: "20260001",
        full_name: "张三",
        experiments: [
          {
            experiment_id: 9001,
            status: "In Progress",
            current_step: 4,
            highest_completed_step: 3,
            total_active_duration_seconds: 3600,
            selected_industry: "制造业",
            selected_company: "华东工厂",
            selected_product: "A产品",
            start_time: now,
            last_activity_at: now,
            completion_time: null,
          },
        ],
      },
    ],
  };

  const questionBank = [
    {
      question_id: 1,
      knowledge_point: "时间序列基础",
      question_type: "Single Choice",
      question_text: "E2E 示例题目：哪种模型适合平稳序列？",
      options: {
        A: "ARIMA",
        B: "仅线性回归",
      },
      correct_answers: ["A"],
      creator_id: 2,
      creator_name: "李老师",
    },
  ];

  await page.route("**/api/v1/**", async (route) => {
    const method = route.request().method().toUpperCase();
    const { path } = parsePath(route);

    if (method === "OPTIONS") {
      await noContentResponse(route);
      return;
    }

    if (method === "GET" && path === "/users/me") {
      const payload = decodeJwtPayloadFromRequest(route);
      const role = (payload?.role || "Teacher").toLowerCase();
      const userId = payload?.sub || (role === "assistant" ? 3 : 2);

      const currentUser = role === "assistant"
        ? {
            user_id: userId,
            username: payload?.username || "assistant_beta",
            full_name: payload?.full_name || "王助教",
            email: "assistant.beta@example.com",
            phone_number: "13700000000",
            role: "Assistant",
            created_at: now,
          }
        : {
            user_id: userId,
            username: payload?.username || "teacher_e2e",
            full_name: payload?.full_name || "李老师",
            email: "teacher.e2e@example.com",
            phone_number: "13800000000",
            role: "Teacher",
            created_at: now,
          };

      await jsonResponse(route, 200, currentUser);
      return;
    }

    if (method === "GET" && /^\/teachers\/\d+\/classes$/.test(path)) {
      await jsonResponse(route, 200, classes);
      return;
    }

    if (method === "GET" && /^\/assistants\/\d+\/classes$/.test(path)) {
      await jsonResponse(route, 200, classes);
      return;
    }

    if (method === "GET" && /^\/classes\/\d+\/students$/.test(path)) {
      const classId = Number(path.split("/")[2]);
      await jsonResponse(route, 200, studentsByClassId[classId] || []);
      return;
    }

    if (method === "GET" && /^\/classes\/\d+\/experiment-events$/.test(path)) {
      const classId = Number(path.split("/")[2]);
      await jsonResponse(route, 200, progressByClassId[classId] || []);
      return;
    }

    if (method === "GET" && /^\/classes\/\d+\/reports$/.test(path)) {
      const classId = Number(path.split("/")[2]);
      await jsonResponse(route, 200, reportsByClassId[classId] || []);
      return;
    }

    if (method === "GET" && /^\/classes\/\d+\/experiment-runs$/.test(path)) {
      const classId = Number(path.split("/")[2]);
      await jsonResponse(route, 200, logsByClassId[classId] || []);
      return;
    }

    if (method === "GET" && path === "/question-bank/questions") {
      await jsonResponse(route, 200, questionBank);
      return;
    }

    if (method === "GET" && /^\/teachers\/\d+\/assistants$/.test(path)) {
      await jsonResponse(route, 200, teacherAssistants);
      return;
    }

    if (method === "GET" && /^\/teachers\/\d+\/assistants\/\d+\/classes$/.test(path)) {
      await jsonResponse(route, 200, classes);
      return;
    }

    if (method === "GET" && path === "/assistants") {
      await jsonResponse(route, 200, allAssistants);
      return;
    }

    if (method === "GET" && /^\/classes\/\d+$/.test(path)) {
      const classId = Number(path.split("/")[2]);
      const classInfo = classes.find((item) => item.class_id === classId);
      if (!classInfo) {
        await jsonResponse(route, 404, { error: "班级不存在" });
        return;
      }
      await jsonResponse(route, 200, {
        ...classInfo,
        students: studentsByClassId[classId] || [],
        assistants: classInfo.assistants || [],
      });
      return;
    }

    if (method === "POST" && path === "/classes") {
      const nextId = Math.max(0, ...classes.map((item) => item.class_id)) + 1;
      const className = readFormField(route, "class_name") || `新班级-${nextId}`;
      const classCode = readFormField(route, "class_code") || `CLS-${nextId}`;
      const csvContent = readMultipartFileContent(route, "students_file");
      const rows = parseCsvRows(csvContent);
      const dataRows = rows.slice(1);
      const importedStudents: MockStudent[] = dataRows
        .filter((row) => row.length > 0)
        .map((row, index) => {
          const [usernameRaw, fullNameRaw, emailRaw] = row;
          const username = usernameRaw || `AUTO${nextId}${index + 1}`;
          const full_name = fullNameRaw || `导入学生${index + 1}`;
          return {
            user_id: 2000 + nextId * 10 + index,
            username,
            full_name,
            email: emailRaw || `${username}@example.com`,
            phone_number: null,
            role: "Student",
            created_at: now,
          };
        });

      const newClass: MockClass = {
        class_id: nextId,
        class_name: className,
        class_code: classCode,
        teacher_id: 2,
        teacher_name: "李老师",
        created_at: now,
        assistants: [],
      };
      classes = [newClass, ...classes];
      studentsByClassId[nextId] = importedStudents;

      await jsonResponse(route, 201, {
        class: newClass,
        students_created: importedStudents.length,
        students_enrolled: importedStudents.length,
        students: importedStudents,
        errors: [],
      });
      return;
    }

    if (method === "PUT" && /^\/classes\/\d+$/.test(path)) {
      const classId = Number(path.split("/")[2]);
      const target = classes.find((item) => item.class_id === classId);
      if (!target) {
        await jsonResponse(route, 404, { error: "班级不存在" });
        return;
      }
      const payload = readJsonBody<{ class_name?: string; class_code?: string }>(route);
      target.class_name = payload.class_name || target.class_name;
      target.class_code = payload.class_code || target.class_code;
      await jsonResponse(route, 200, target);
      return;
    }

    await jsonResponse(route, 404, {
      error: `No mock handler for ${method} ${path}`,
    });
  });
};
