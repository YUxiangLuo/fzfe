export const API_BASE_URL = import.meta.env.VITE_API_URL;

if (!API_BASE_URL) {
  throw new Error("VITE_API_URL is not defined. Please check your .env file.");
}

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

  // 模型生产准备 - 无超时（会重新拟合生产预测所需模型）
  if (lowerEndpoint.includes('/models/') && lowerEndpoint.includes('/prepare-production')) {
    return undefined;
  }

  // ADF检验会拉起 Python 进程，真实数据集下可能超过默认 CRUD 超时
  if (lowerEndpoint.includes('/tools/adf')) {
    return 120000;
  }

  // 模型预测 - 60秒（可能需要较长时间计算）
  if (lowerEndpoint.includes('/predict') || lowerEndpoint.includes('/forecast')) {
    return 60000;
  }

  // 生产计划计算 - 60秒（复杂的优化算法）
  if (lowerEndpoint.includes('/production/') && lowerEndpoint.includes('/calculate')) {
    return 60000;
  }

  // 报告提交 - 需要后端生成 PDF，可能排队等待
  if (/\/experiment-runs\/\d+\/report$/.test(lowerEndpoint)) {
    return 120000;
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

interface RequestAbortContext {
  signal: AbortSignal;
  cleanup: () => void;
  didTimeout: () => boolean;
}

const createRequestAbortContext = (timeout: number, externalSignal?: AbortSignal): RequestAbortContext => {
  const controller = new AbortController();
  let timedOut = false;

  const abortFromExternalSignal = () => {
    controller.abort(externalSignal?.reason);
  };

  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeout);

  if (externalSignal) {
    if (externalSignal.aborted) {
      abortFromExternalSignal();
    } else {
      externalSignal.addEventListener("abort", abortFromExternalSignal, { once: true });
    }
  }

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeoutId);
      externalSignal?.removeEventListener("abort", abortFromExternalSignal);
    },
    didTimeout: () => timedOut,
  };
};

const unwrapSuccessPayload = <T = any>(payload: unknown): T => {
  if (payload !== null && typeof payload === "object") {
    const payloadRecord = payload as Record<string, unknown>;
    const keys = Object.keys(payloadRecord);

    // Only auto-unwrap when the payload is exactly { data: ... }.
    // Preserve envelopes like { data, pagination } to avoid losing metadata.
    if (keys.length === 1 && keys[0] === "data") {
      return payloadRecord.data as T;
    }
  }
  return payload as T;
};

const handleResponse = async <T = any>(response: Response, endpoint: string): Promise<T> => {
  if (response.status === 401 && endpoint !== '/users/me/password') {
    localStorage.removeItem("token");
    window.location.href = "/login.html";
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
    const parsedBodyObject =
      parsedBody !== null && typeof parsedBody === "object"
        ? (parsedBody as Record<string, unknown>)
        : null;
    const detail =
      typeof parsedBody === 'string'
        ? parsedBody
        : typeof parsedBodyObject?.error === "string"
          ? parsedBodyObject.error
          : typeof parsedBodyObject?.message === "string"
            ? parsedBodyObject.message
            : parsedBody !== null && parsedBody !== undefined
          ? JSON.stringify(parsedBody)
          : rawBody || '无响应内容';
    const statusLabel = response.statusText
      ? `HTTP ${response.status} ${response.statusText}`
      : `HTTP ${response.status}`;
    const requestError = new Error(detail ? `${statusLabel} - ${detail}` : statusLabel) as Error & {
      status?: number;
      payload?: unknown;
    };
    requestError.status = response.status;
    requestError.payload = parsedBody;
    throw requestError;
  }

  return unwrapSuccessPayload<T>(parsedBody) ?? (null as T);
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

  // Only rewrite teacher-class listing to the assistant equivalent route.
  // Keep this as a strict whitelist to avoid rewriting unrelated teacher endpoints.
  const teacherClassesPattern = /^\/teachers\/\d+\/classes\/?(\?.*)?$/;
  const match = endpoint.match(teacherClassesPattern);
  if (match) {
    const query = match[1] ?? "";
    return `/assistants/${userInfo.sub}/classes${query}`;
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
    const abortContext = createRequestAbortContext(timeout, options.signal ?? undefined);

    try {
      const response = await fetch(buildUrl(finalEndpoint), {
        ...config,
        signal: abortContext.signal,
      });
      return handleResponse<T>(response, finalEndpoint);
    } catch (err: unknown) {
      if (abortContext.didTimeout() && err instanceof Error && err.name === 'AbortError') {
        throw new Error(`请求超时（${timeout / 1000}秒），请检查网络连接后重试`);
      }

      throw err;
    } finally {
      abortContext.cleanup();
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
