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

// --- NEW FUNCTIONS FOR EXPERIMENT STATE ---

const EXPERIMENT_STATE_KEY = "experiment_state";

/**
 * Simulates fetching the current experiment state from the backend.
 * For now, it uses localStorage to persist the state across reloads.
 */
export const getExperimentState = async (): Promise<ExperimentState> => {
  console.log("API: Getting experiment state...");
  return new Promise((resolve) => {
    setTimeout(() => {
      try {
        const savedState = localStorage.getItem(EXPERIMENT_STATE_KEY);
        if (savedState) {
          console.log("API: Found saved state in localStorage.");
          resolve(JSON.parse(savedState));
        } else {
          console.log("API: No saved state found, returning initial state.");
          // Return the new data structure
          const newState = {
            ...initialState,
            student_id: 123,
            experiment_id: 1,
            // Example of a partially completed experiment for testing
            // highest_completed_step: 1,
            // current_step: 2,
            // selected_industry: 'automotive',
          };
          resolve(newState);
        }
      } catch (error) {
        console.error(
          "API: Error getting state, returning initial state.",
          error,
        );
        resolve({ ...initialState, student_id: 123, experiment_id: 1 });
      }
    }, 500); // Simulate network delay
  });
};

/**
 * Simulates updating the experiment state on the backend.
 * For now, it saves the state to localStorage.
 */
export const updateExperimentState = async (
  newState: ExperimentState,
): Promise<void> => {
  console.log("API: Updating experiment state...", newState);
  return new Promise((resolve) => {
    setTimeout(() => {
      try {
        localStorage.setItem(EXPERIMENT_STATE_KEY, JSON.stringify(newState));
        console.log("API: State successfully saved to localStorage.");
      } catch (error) {
        console.error("API: Error saving state.", error);
      }
      resolve();
    }, 300); // Simulate network delay
  });
};

/**
 * Simulates resetting the experiment state on the backend.
 * For now, it just removes the state from localStorage.
 */
export const resetExperimentState = async (): Promise<void> => {
  console.log("API: Resetting experiment state...");
  return new Promise((resolve) => {
    setTimeout(() => {
      try {
        localStorage.removeItem(EXPERIMENT_STATE_KEY);
        console.log("API: State successfully removed from localStorage.");
      } catch (error) {
        console.error("API: Error removing state.", error);
      }
      resolve();
    }, 200); // Simulate network delay
  });
};
