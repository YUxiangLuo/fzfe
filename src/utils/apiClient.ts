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

const handleResponse = async <T = any>(response: Response): Promise<T> => {
  if (response.status === 401) {
    localStorage.removeItem("token");
    window.location.href = "/login";
    throw new Error("会话已过期，请重新登录");
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error =
      (data && (data as { error?: string }).error) || response.statusText;
    throw new Error(error);
  }

  return data as T;
};

const request = async <T = any>(
  endpoint: string,
  options: RequestInit = {},
  isFormData = false,
): Promise<T> => {
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

  const response = await fetch(buildUrl(endpoint), config);
  return handleResponse<T>(response);
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
  const created = await apiClient.post<ExperimentState>("/experiment-status", {});
  return mergeWithInitial(created);
};

export const getExperimentState = async (): Promise<ExperimentState> => {
  try {
    const existing = await apiClient.get<ExperimentState>("/experiment-status/me");
    if (existing?.status === "Completed") {
      return await createExperimentState();
    }
    return mergeWithInitial(existing);
  } catch (error) {
    console.error("Failed to fetch experiment state; falling back to initial state.", error);
    return mergeWithInitial(initialState);
  }
};

export const updateExperimentState = async (state: ExperimentState): Promise<ExperimentState> => {
  if (!state.experiment_id) {
    throw new Error("Experiment ID is required to update experiment status.");
  }
  const updated = await apiClient.put<ExperimentState>(`/experiment-status/${state.experiment_id}`, state);
  return mergeWithInitial(updated);
};
