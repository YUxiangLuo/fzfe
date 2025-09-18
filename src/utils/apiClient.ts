export const API_BASE_URL = "http://localhost:3001/api";

const BASE_URL = API_BASE_URL;

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

const handleResponse = async (response: Response) => {
  if (response.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/login";
    throw new Error("会话已过期，请重新登录");
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = (data && (data as { error?: string }).error) || response.statusText;
    throw new Error(error);
  }

  return data;
};

const request = async (endpoint: string, options: RequestInit = {}, isFormData = false) => {
  const token = localStorage.getItem("token");
  const headers: HeadersInit = isFormData ? {} : { "Content-Type": "application/json" };

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

  const response = await fetch(buildUrl(endpoint), config);
  return handleResponse(response);
};

export const apiClient = {
  get: (endpoint: string, options?: RequestInit) =>
    request(endpoint, { ...options, method: "GET" }),

  post: (endpoint: string, body: unknown, options?: RequestInit) =>
    request(endpoint, { ...options, method: "POST", body: JSON.stringify(body) }),

  postFormData: (endpoint: string, formData: FormData, options?: RequestInit) =>
    request(endpoint, { ...options, method: "POST", body: formData }, true),

  put: (endpoint: string, body: unknown, options?: RequestInit) =>
    request(endpoint, { ...options, method: "PUT", body: JSON.stringify(body) }),

  delete: (endpoint: string, options?: RequestInit) =>
    request(endpoint, { ...options, method: "DELETE" }),
};
