import type { Page, Route } from "@playwright/test";

type MockUser = {
  user_id: number;
  username: string;
  full_name: string;
  email: string;
  role: "Admin" | "Teacher" | "Assistant" | "Student";
  created_at: string;
  phone_number?: string | null;
};

type MockManual = {
  manual_id: number;
  file_name: string;
  file_path: string;
  description: string | null;
  is_active: 0 | 1;
  uploader_id: number;
  uploaded_at: string;
  uploader_name: string;
};

type MockDataset = {
  dataset_id: number;
  data_name: string;
  file_path: string;
  description: string | null;
  uploaded_at: string;
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
  await route.fulfill({
    status,
    headers: {
      ...corsHeaders,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
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

const paginate = <T>(items: T[], page: number, limit: number) => {
  const start = (page - 1) * limit;
  return {
    data: items.slice(start, start + limit),
    pagination: {
      currentPage: page,
      pageSize: limit,
      totalItems: items.length,
    },
  };
};

export const installAdminApiMock = async (page: Page): Promise<void> => {
  const now = new Date().toISOString();

  let users: MockUser[] = [
    {
      user_id: 1,
      username: "admin_e2e",
      full_name: "系统管理员",
      email: "admin@example.com",
      role: "Admin",
      created_at: now,
      phone_number: "13900000000",
    },
    {
      user_id: 2,
      username: "teacher_alpha",
      full_name: "李老师",
      email: "teacher.alpha@example.com",
      role: "Teacher",
      created_at: now,
      phone_number: "13800000000",
    },
    {
      user_id: 3,
      username: "assistant_beta",
      full_name: "王助教",
      email: "assistant.beta@example.com",
      role: "Assistant",
      created_at: now,
      phone_number: "13700000000",
    },
  ];

  let manuals: MockManual[] = [
    {
      manual_id: 1,
      file_name: "实验手册-2026春.pdf",
      file_path: "manuals/manual-2026-spring.pdf",
      description: "默认启用手册",
      is_active: 1,
      uploader_id: 1,
      uploaded_at: now,
      uploader_name: "系统管理员",
    },
  ];

  let datasets: MockDataset[] = [
    {
      dataset_id: 1,
      data_name: "示例销售数据",
      file_path: "datasets/demo-sales.csv",
      description: "用于 E2E Smoke",
      uploaded_at: now,
    },
  ];

  const classList = [
    {
      class_id: 101,
      class_name: "2026 春季一班",
      class_code: "CLS-2026-01",
      teacher_id: 2,
      teacher_name: "李老师",
    },
  ];

  const classDetails: Record<number, unknown> = {
    101: {
      ...classList[0],
      students: [
        {
          user_id: 1001,
          username: "20260001",
          full_name: "张三",
          email: "zhangsan@example.com",
        },
      ],
      assistants: [
        {
          user_id: 3,
          username: "assistant_beta",
          full_name: "王助教",
          email: "assistant.beta@example.com",
          role: "Assistant",
          created_at: now,
        },
      ],
    },
  };

  await page.route("**/api/v1/**", async (route) => {
    const method = route.request().method().toUpperCase();
    const { path, url } = parsePath(route);

    if (method === "OPTIONS") {
      await noContentResponse(route);
      return;
    }

    if (method === "GET" && path === "/datasets") {
      await jsonResponse(route, 200, datasets);
      return;
    }

    if (method === "POST" && path === "/datasets") {
      const payload = readJsonBody<{ data_name?: string; description?: string }>(route);
      const nextId = Math.max(0, ...datasets.map((d) => d.dataset_id)) + 1;
      const newItem: MockDataset = {
        dataset_id: nextId,
        data_name: payload.data_name || `新数据集-${nextId}`,
        description: payload.description || null,
        file_path: `datasets/dataset-${nextId}.csv`,
        uploaded_at: now,
      };
      datasets = [newItem, ...datasets];
      await jsonResponse(route, 201, newItem);
      return;
    }

    if (method === "PUT" && /^\/datasets\/\d+$/.test(path)) {
      const id = Number(path.split("/")[2]);
      const payload = readJsonBody<{ data_name?: string; description?: string }>(route);
      const target = datasets.find((item) => item.dataset_id === id);
      if (!target) {
        await jsonResponse(route, 404, { error: "数据集不存在" });
        return;
      }
      target.data_name = payload.data_name ?? target.data_name;
      target.description = payload.description ?? target.description;
      await jsonResponse(route, 200, target);
      return;
    }

    if (method === "DELETE" && /^\/datasets\/\d+$/.test(path)) {
      const id = Number(path.split("/")[2]);
      datasets = datasets.filter((item) => item.dataset_id !== id);
      await jsonResponse(route, 200, { success: true });
      return;
    }

    if (method === "GET" && path === "/manuals") {
      await jsonResponse(route, 200, manuals);
      return;
    }

    if (method === "POST" && path === "/manuals") {
      const payload = readJsonBody<{ file_name?: string; description?: string }>(route);
      const nextId = Math.max(0, ...manuals.map((m) => m.manual_id)) + 1;
      const newItem: MockManual = {
        manual_id: nextId,
        file_name: payload.file_name || `新手册-${nextId}.pdf`,
        description: payload.description || null,
        file_path: `manuals/manual-${nextId}.pdf`,
        is_active: 0,
        uploader_id: 1,
        uploaded_at: now,
        uploader_name: "系统管理员",
      };
      manuals = [newItem, ...manuals];
      await jsonResponse(route, 201, newItem);
      return;
    }

    if (method === "PUT" && /^\/manuals\/\d+$/.test(path)) {
      const id = Number(path.split("/")[2]);
      const payload = readJsonBody<{ file_name?: string; description?: string; is_active?: boolean }>(route);
      const target = manuals.find((item) => item.manual_id === id);
      if (!target) {
        await jsonResponse(route, 404, { error: "手册不存在" });
        return;
      }
      if (typeof payload.file_name === "string") target.file_name = payload.file_name;
      if (typeof payload.description === "string") target.description = payload.description;
      if (typeof payload.is_active === "boolean") {
        target.is_active = payload.is_active ? 1 : 0;
      }
      await jsonResponse(route, 200, target);
      return;
    }

    if (method === "DELETE" && /^\/manuals\/\d+$/.test(path)) {
      const id = Number(path.split("/")[2]);
      manuals = manuals.filter((item) => item.manual_id !== id);
      await jsonResponse(route, 200, { success: true });
      return;
    }

    if (method === "GET" && path === "/users") {
      const pageParam = Number(url.searchParams.get("page") || "1");
      const limitParam = Number(url.searchParams.get("limit") || "10");
      await jsonResponse(route, 200, paginate(users, pageParam, limitParam));
      return;
    }

    if (method === "GET" && path === "/users/search") {
      const pageParam = Number(url.searchParams.get("page") || "1");
      const limitParam = Number(url.searchParams.get("limit") || "10");
      const q = (url.searchParams.get("q") || "").toLowerCase();
      const filtered = users.filter((user) => {
        return (
          user.username.toLowerCase().includes(q) ||
          user.full_name.toLowerCase().includes(q) ||
          user.email.toLowerCase().includes(q)
        );
      });
      await jsonResponse(route, 200, paginate(filtered, pageParam, limitParam));
      return;
    }

    if (method === "POST" && (path === "/users/teachers" || path === "/users/assistants")) {
      const payload = readJsonBody<{
        username?: string;
        full_name?: string;
        email?: string;
        phone?: string;
      }>(route);

      const role = path === "/users/teachers" ? "Teacher" : "Assistant";
      const nextId = Math.max(0, ...users.map((u) => u.user_id)) + 1;
      const newUser: MockUser = {
        user_id: nextId,
        username: payload.username || `${role.toLowerCase()}_${nextId}`,
        full_name: payload.full_name || `${role} ${nextId}`,
        email: payload.email || `${role.toLowerCase()}_${nextId}@example.com`,
        role,
        created_at: now,
        phone_number: payload.phone || null,
      };
      users = [newUser, ...users];
      await jsonResponse(route, 201, newUser);
      return;
    }

    if (method === "PUT" && /^\/users\/\d+\/password$/.test(path)) {
      await jsonResponse(route, 200, { success: true });
      return;
    }

    if (method === "DELETE" && /^\/users\/\d+$/.test(path)) {
      const id = Number(path.split("/")[2]);
      users = users.filter((user) => user.user_id !== id);
      await jsonResponse(route, 200, { success: true });
      return;
    }

    if (method === "GET" && path === "/classes") {
      await jsonResponse(route, 200, classList);
      return;
    }

    if (method === "GET" && /^\/classes\/\d+$/.test(path)) {
      const id = Number(path.split("/")[2]);
      const detail = classDetails[id];
      if (!detail) {
        await jsonResponse(route, 404, { error: "班级不存在" });
        return;
      }
      await jsonResponse(route, 200, detail);
      return;
    }

    await jsonResponse(route, 404, {
      error: `No mock handler for ${method} ${path}`,
    });
  });
};

