export const API_BASE_URL = "http://localhost:3001/api/v1";

const BASE_URL = API_BASE_URL;

/**
 * 根据API端点自动确定超时时间
 * @param endpoint - API端点路径
 * @returns 超时时间（毫秒）或 undefined（无超时）
 */
const getTimeoutForEndpoint = (endpoint: string): number | undefined => {
  const lowerEndpoint = endpoint.toLowerCase();

  // 模型训练相关 - 无超时（可能需要几分钟）
  if (lowerEndpoint.includes('/models/') && lowerEndpoint.includes('/training')) {
    return undefined;
  }

  // 模型预测 - 60秒（可能需要较长时间计算）
  if (lowerEndpoint.includes('/predict') || lowerEndpoint.includes('/forecast')) {
    return 60000;
  }

  // 生产计划计算 - 60秒（复杂的优化算法）
  if (lowerEndpoint.includes('/production/') && lowerEndpoint.includes('/calculate')) {
    return 60000;
  }

  // 文件上传（CSV导入等）- 30秒
  if (lowerEndpoint.includes('/upload') || lowerEndpoint.includes('/import')) {
    return 30000;
  }

  // 数据加载（历史数据、销售数据等）- 15秒
  if (
    lowerEndpoint.includes('/datasets/') ||
    lowerEndpoint.includes('/sales') ||
    lowerEndpoint.includes('/historical')
  ) {
    return 15000;
  }

  // 普通CRUD操作 - 10秒
  return 10000;
};

const safeDecode = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const buildUrl = (endpoint: string): string => {
  const base = new URL(BASE_URL);
  const [rawPath = "", ...queryParts] = endpoint.split("?");
  const rawQuery = queryParts.length > 0 ? queryParts.join("?") : "";

  const encodedPath = rawPath
    .split("/")
    .map((segment, index) => {
      if (segment === "" && index === 0) return ""; // keep leading slash
      const decoded = safeDecode(segment);
      return decoded === "" ? "" : encodeURIComponent(decoded);
    })
    .join("/");

  const normalizedPath = encodedPath.replace(/^\/+/, "");
  if (normalizedPath.length > 0) {
    const basePath = base.pathname.replace(/\/+$/, "");
    base.pathname = `${basePath}/${normalizedPath}`;
  } else {
    base.pathname = base.pathname.replace(/\/+$/, "");
  }

  if (rawQuery) {
    base.search = rawQuery.startsWith("?") ? rawQuery : `?${rawQuery}`;
  } else {
    base.search = "";
  }

  return base.toString();
};

const handleResponse = async <T = any>(response: Response, endpoint: string): Promise<T> => {
  if (response.status === 401 && endpoint !== '/users/me/password') {
    localStorage.removeItem("token");
    window.location.href = "/login";
    throw new Error("会话已过期，请重新登录");
  }

  const rawBody = await response.text();
  let parsedBody: unknown = null;

  if (rawBody) {
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      parsedBody = rawBody;
    }
  }

  if (!response.ok) {
    const detail =
      typeof parsedBody === 'string'
        ? parsedBody
        : parsedBody !== null && parsedBody !== undefined
          ? JSON.stringify(parsedBody)
          : rawBody || '无响应内容';
    const statusLabel = response.statusText
      ? `HTTP ${response.status} ${response.statusText}`
      : `HTTP ${response.status}`;
    throw new Error(detail ? `${statusLabel} - ${detail}` : statusLabel);
  }

  return (parsedBody as T) ?? (null as T);
};

import { decodeToken, type DecodedToken } from './auth';

// Helper to get user info from token
const getUserInfo = (): DecodedToken | null => {
  const token = localStorage.getItem('token');
  if (!token) return null;
  return decodeToken(token);
};

// Centralized logic for rewriting endpoints based on role
const rewriteEndpointForRole = (endpoint: string): string => {
  const userInfo = getUserInfo();
  if (!userInfo || userInfo.role !== 'Assistant') {
    return endpoint;
  }

  // Rule: If the user is an Assistant, rewrite /teachers/{id} paths to /assistants/{id}
  const teacherPattern = /^\/teachers\/\d+/;
  if (teacherPattern.test(endpoint)) {
    return endpoint.replace(/^\/teachers\/\d+/, `/assistants/${userInfo.sub}`);
  }

  return endpoint;
};


const request = async <T = any>(
  endpoint: string,
  options: RequestInit = {},
  isFormData = false,
): Promise<T> => {
  // Rewrite the endpoint before making the request
  const finalEndpoint = rewriteEndpointForRole(endpoint);

  const token = localStorage.getItem("token");
  const headers: HeadersInit = isFormData
    ? {}
    : { "Content-Type": "application/json" };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const config: RequestInit = {
    ...options,
    headers: {
      ...headers,
      ...(options.headers ?? {}),
    },
  };

  // 自动确定超时时间
  const timeout = getTimeoutForEndpoint(finalEndpoint);

  // 如果需要超时控制
  if (timeout !== undefined) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(buildUrl(finalEndpoint), {
        ...config,
        signal: options.signal || controller.signal, // 优先使用传入的signal
      });
      clearTimeout(timeoutId);
      return handleResponse<T>(response, finalEndpoint);
    } catch (err: unknown) {
      clearTimeout(timeoutId);

      // 处理超时错误
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error(`请求超时（${timeout / 1000}秒），请检查网络连接后重试`);
      }

      throw err;
    }
  }

  // 无超时的默认行为（用于模型训练等长时间操作）
  const response = await fetch(buildUrl(finalEndpoint), config);
  return handleResponse<T>(response, finalEndpoint);
};

export const apiClient = {
  get: <T = any>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: "GET" }),

  post: <T = any>(endpoint: string, body: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: "POST",
      body: JSON.stringify(body),
    }),

  postFormData: <T = any>(
    endpoint: string,
    formData: FormData,
    options?: RequestInit,
  ) => request<T>(endpoint, { ...options, method: "POST", body: formData }, true),

  put: <T = any>(endpoint: string, body: unknown, options?: RequestInit) =>
    request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: JSON.stringify(body),
    }),

  delete: <T = any>(endpoint: string, options?: RequestInit) =>
    request<T>(endpoint, { ...options, method: "DELETE" }),
};

import { initialState } from "../views/shiyan/contexts/ExperimentContext";
import type { ExperimentState } from "../views/shiyan/contexts/ExperimentContext";

const cloneInitialState = (): ExperimentState =>
  JSON.parse(JSON.stringify(initialState)) as ExperimentState;

const mergeWithInitial = (state: Partial<ExperimentState>): ExperimentState => ({
  ...cloneInitialState(),
  ...state,
});

export const createExperimentState = async (): Promise<ExperimentState> => {
  const created = await apiClient.post<ExperimentState>("/students/me/experiment-runs", {});
  return mergeWithInitial(created);
};

export const getExperimentState = async (): Promise<ExperimentState> => {
  const existing = await apiClient.get<ExperimentState>("/students/me/experiment-runs/active");
  return mergeWithInitial(existing);
};

export const updateExperimentState = async (state: ExperimentState): Promise<ExperimentState> => {
  if (!state.experiment_id) {
    throw new Error("Experiment ID is required to update experiment status.");
  }
  const updated = await apiClient.put<ExperimentState>(`/experiment-runs/${state.experiment_id}`, state);
  return mergeWithInitial(updated);
};

export const recordStepEvent = async (
  experimentId: number,
  stepOrder: number,
  eventType: 'STARTED' | 'COMPLETED'
): Promise<{ message: string; event_id: number }> => {
  return await apiClient.post<{ message: string; event_id: number }>(`/experiment-runs/${experimentId}/events`, {
    step_order: stepOrder,
    event_type: eventType,
  });
};
