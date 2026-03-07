/**
 * API Helpers
 * 
 * 通过后端 API 快速准备测试数据，比 UI 操作更高效
 */

import type { Page } from "@playwright/test";
import { ACCOUNTS } from "../fixtures";

const API_BASE = process.env.E2E_API_BASE ?? "http://127.0.0.1:4001/api/v1";

interface APIResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
}

/**
 * 获取登录 Token
 */
export async function getAuthToken(role: "teacher" | "assistant" | "admin" | "student"): Promise<string> {
  const account = ACCOUNTS[role];
  
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: account.username,
      password: account.password,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to login as ${role}: ${response.statusText}`);
  }

  const data = await response.json();
  return data.token;
}

/**
 * 快速创建学生（通过 API）
 */
export async function createStudentViaAPI(
  token: string,
  data: {
    username: string;
    realName?: string;
    email?: string;
    classId?: number;
  }
): Promise<APIResponse> {
  const response = await fetch(`${API_BASE}/students`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      realName: data.realName ?? `Test_${data.username}`,
      email: data.email ?? `${data.username}@test.com`,
      classId: data.classId ?? 1,
      ...data,
    }),
  });

  return {
    success: response.ok,
    data: response.ok ? await response.json() : undefined,
  };
}

/**
 * 快速创建班级（通过 API）
 */
export async function createClassViaAPI(
  token: string,
  data: {
    name: string;
    description?: string;
  }
): Promise<APIResponse<{ classId: number }>> {
  const response = await fetch(`${API_BASE}/classes`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  return {
    success: response.ok,
    data: response.ok ? await response.json() : undefined,
  };
}

/**
 * 提交实验报告（通过 API）
 */
export async function submitReportViaAPI(
  token: string,
  studentId: string,
  data: {
    experimentId: number;
    content?: string;
    usePdf?: boolean;
  }
): Promise<APIResponse> {
  const response = await fetch(`${API_BASE}/students/${studentId}/reports`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      content: data.content ?? "<h1>Test Report</h1>",
      usePdf: data.usePdf ?? true,
      ...data,
    }),
  });

  return {
    success: response.ok,
    data: response.ok ? await response.json() : undefined,
  };
}

/**
 * 评阅报告（通过 API）
 */
export async function gradeReportViaAPI(
  token: string,
  studentId: string,
  data: {
    reportScore: number;
    modelScore?: number;
    feedback?: string;
  }
): Promise<APIResponse> {
  const response = await fetch(`${API_BASE}/students/${studentId}/reports/grade`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  return {
    success: response.ok,
    data: response.ok ? await response.json() : undefined,
  };
}

/**
 * 在 Page 上下文中执行 API 请求（使用浏览器 Cookie）
 */
export async function apiRequest<T = unknown>(
  page: Page,
  endpoint: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    body?: unknown;
  } = {}
): Promise<T> {
  return page.evaluate(async ({ endpoint, method, body }) => {
    const token = localStorage.getItem("token");
    const response = await fetch(`/api/v1${endpoint}`, {
      method: method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }, { endpoint, ...options });
}

/**
 * 批量准备测试数据
 * 
 * 示例：为批量评阅测试快速创建多个待评阅学生
 */
export async function prepareBatchReviewData(
  teacherToken: string,
  count: number
): Promise<string[]> {
  const studentIds: string[] = [];
  
  for (let i = 0; i < count; i++) {
    const username = `batch_test_${Date.now()}_${i}`;
    
    // 创建学生
    await createStudentViaAPI(teacherToken, {
      username,
      classId: 2, // Assistant 班级
    });
    
    // 提交报告
    await submitReportViaAPI(teacherToken, username, {
      experimentId: 900000 + i,
    });
    
    studentIds.push(username);
  }
  
  return studentIds;
}
