import {
  clearSessionAndRedirect,
  getStoredToken,
} from "./session";

export const API_BASE_URL = import.meta.env.VITE_API_URL?.trim() || "/api/v1";

export interface ApiRequestOptions extends RequestInit {
  /**
   * Override the endpoint-derived timeout. Use null to disable frontend timeout
   * for a specific request while still preserving external AbortSignal support.
   */
  timeoutMs?: number | null;
}

const BASE_URL = API_BASE_URL;

/**
 * 根据API端点自动确定超时时间
 * @param endpoint - API端点路径
 * @returns 超时时间（毫秒）或 undefined（无超时）
 */
const getTimeoutForEndpoint = (endpoint: string): number | undefined => {
  const lowerEndpoint = endpoint.toLowerCase();

  // 模型生产准备 - 无超时（会重新拟合生产预测所需模型）
  if (lowerEndpoint.includes('/models/') && lowerEndpoint.includes('/prepare-production')) {
    return undefined;
  }

  // ADF检验会拉起 Python 进程，真实数据集下可能超过默认 CRUD 超时
  if (lowerEndpoint.includes('/tools/adf')) {
    return 120000;
  }

  // 模型预测 - 后端 60 秒预算外保留网络与响应解析余量
  if (lowerEndpoint.includes('/predict') || lowerEndpoint.includes('/forecast')) {
    return 75000;
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

const createBaseUrl = (): URL => {
  if (/^https?:\/\//i.test(BASE_URL)) {
    return new URL(BASE_URL);
  }

  const origin = typeof window !== "undefined" && window.location.origin
    ? window.location.origin
    : "http://localhost";

  return new URL(BASE_URL, `${origin.replace(/\/+$/, "")}/`);
};

const buildUrl = (endpoint: string): string => {
  const base = createBaseUrl();
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

const parseZodIssueMessages = (message: string): string | null => {
  try {
    const parsed = JSON.parse(message);
    if (!Array.isArray(parsed)) return null;

    const messages = parsed
      .map((issue) => {
        if (issue && typeof issue === "object") {
          const maybeMessage = (issue as Record<string, unknown>).message;
          return typeof maybeMessage === "string" ? maybeMessage.trim() : "";
        }
        return "";
      })
      .filter((text): text is string => text.length > 0);

    return messages.length > 0 ? [...new Set(messages)].join("；") : null;
  } catch {
    return null;
  }
};

const getNestedErrorMessage = (value: unknown): string | null => {
  if (typeof value === "string") return value;
  if (value === null || typeof value !== "object") return null;

  const message = (value as Record<string, unknown>).message;
  if (typeof message !== "string") return null;

  return parseZodIssueMessages(message) ?? message;
};

const handleResponse = async <T = any>(response: Response, endpoint: string): Promise<T> => {
  if (response.status === 401 && endpoint !== '/users/me/password') {
    clearSessionAndRedirect();
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
    const nestedErrorMessage = getNestedErrorMessage(parsedBodyObject?.error);
    const detail =
      typeof parsedBody === 'string'
        ? parsedBody
        : nestedErrorMessage
          ? nestedErrorMessage
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

const request = async <T = any>(
  endpoint: string,
  options: ApiRequestOptions = {},
  isFormData = false,
): Promise<T> => {
  const token = getStoredToken();
  const headers: HeadersInit = isFormData
    ? {}
    : { "Content-Type": "application/json" };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const { timeoutMs, ...fetchOptions } = options;
  const config: RequestInit = {
    ...fetchOptions,
    headers: {
      ...headers,
      ...(options.headers ?? {}),
    },
  };

  // 自动确定超时时间，允许调用方对长队列接口按运行时配置覆盖
  const timeout = timeoutMs === null
    ? undefined
    : timeoutMs ?? getTimeoutForEndpoint(endpoint);

  // 如果需要超时控制
  if (timeout !== undefined) {
    const abortContext = createRequestAbortContext(timeout, options.signal ?? undefined);

    try {
      const response = await fetch(buildUrl(endpoint), {
        ...config,
        signal: abortContext.signal,
      });
      return handleResponse<T>(response, endpoint);
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
  const response = await fetch(buildUrl(endpoint), config);
  return handleResponse<T>(response, endpoint);
};

export const apiClient = {
  get: <T = any>(endpoint: string, options?: ApiRequestOptions) =>
    request<T>(endpoint, { ...options, method: "GET" }),

  post: <T = any>(endpoint: string, body: unknown, options?: ApiRequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: "POST",
      body: JSON.stringify(body),
    }),

  postFormData: <T = any>(
    endpoint: string,
    formData: FormData,
    options?: ApiRequestOptions,
  ) => request<T>(endpoint, { ...options, method: "POST", body: formData }, true),

  put: <T = any>(endpoint: string, body: unknown, options?: ApiRequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: "PUT",
      body: JSON.stringify(body),
    }),

  patch: <T = any>(endpoint: string, body: unknown, options?: ApiRequestOptions) =>
    request<T>(endpoint, {
      ...options,
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  delete: <T = any>(endpoint: string, options?: ApiRequestOptions) =>
    request<T>(endpoint, { ...options, method: "DELETE" }),
};
