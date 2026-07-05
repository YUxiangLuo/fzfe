import {
  BACKEND_ORIGIN,
  STUDENT_PASSWORD,
  STUDENT_USERNAME,
} from "./constants";

type HttpMethod = "GET" | "POST" | "PUT" | "DELETE";

export interface ExperimentRecord {
  experiment_id: number;
  status: string | null;
  current_step: number | null;
  highest_completed_step: number | null;
  start_time: string | null;
  last_activity_at: string | null;
  selected_industry?: string | null;
  selected_company?: string | null;
  selected_product?: string | null;
  [key: string]: unknown;
}

export interface LatestReportStatus {
  is_rejected: boolean;
  has_report?: boolean;
  experiment?: Record<string, unknown>;
  report?: {
    report_id?: number;
    experiment_id?: number;
    student_id?: number;
    pdf_file_path?: string | null;
    status?: "submitted" | "graded" | "rejected";
    submitted_at?: string | null;
    grade?: number | null;
    feedback?: string | null;
    graded_by?: number | null;
    [key: string]: unknown;
  };
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public payload: unknown,
    message: string,
  ) {
    super(message);
  }
}

const buildUrl = (path: string) =>
  `${BACKEND_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;

const buildErrorMessage = (status: number, payload: unknown) => {
  if (payload && typeof payload === "object") {
    const asRecord = payload as Record<string, unknown>;
    if (typeof asRecord.error === "string") {
      return asRecord.error;
    }
    if (typeof asRecord.message === "string") {
      return asRecord.message;
    }
  }
  return `HTTP ${status}`;
};

const unwrapSuccessPayload = <T>(payload: unknown): T => {
  if (payload && typeof payload === "object") {
    const asRecord = payload as Record<string, unknown>;
    const keys = Object.keys(asRecord);
    if (keys.length === 1 && keys[0] === "data") {
      return asRecord.data as T;
    }
  }
  return payload as T;
};

const requestJson = async <T>(
  path: string,
  options: {
    method?: HttpMethod;
    token?: string;
    body?: unknown;
  } = {},
): Promise<T> => {
  const response = await fetch(buildUrl(path), {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token
        ? {
            Authorization: `Bearer ${options.token}`,
          }
        : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  const rawText = await response.text();
  let payload: unknown = null;
  if (rawText) {
    try {
      payload = JSON.parse(rawText);
    } catch {
      payload = rawText;
    }
  }

  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload,
      buildErrorMessage(response.status, payload),
    );
  }

  return unwrapSuccessPayload<T>(payload);
};

export const loginStudentViaApi = async (
  username = STUDENT_USERNAME,
  password = STUDENT_PASSWORD,
): Promise<string> => {
  const payload = await requestJson<{ token?: string; data?: { token?: string } }>(
    "/api/v1/sessions",
    {
      method: "POST",
      body: {
        username,
        password,
        role: "Student",
      },
    },
  );

  const token =
    typeof payload?.token === "string"
      ? payload.token
      : typeof payload?.data?.token === "string"
        ? payload.data.token
        : null;

  if (!token) {
    throw new Error("登录响应中未返回 token");
  }

  return token;
};

export interface StudentApiClient {
  changeMyPassword: (
    currentPassword: string,
    newPassword: string,
  ) => Promise<{ message: string }>;
  cleanupInProgressExperiments: () => Promise<void>;
  createExperiment: (body?: Record<string, unknown>) => Promise<ExperimentRecord>;
  deleteExperiment: (experimentId: number) => Promise<{ message: string }>;
  ensureFreshExperiment: (
    body?: Record<string, unknown>,
  ) => Promise<ExperimentRecord>;
  getActiveExperiment: () => Promise<ExperimentRecord | null>;
  getLatestReportStatus: () => Promise<LatestReportStatus>;
  getMe: () => Promise<Record<string, unknown>>;
  listExperiments: () => Promise<ExperimentRecord[]>;
  token: string;
  updateExperiment: (
    experimentId: number,
    updates: Record<string, unknown>,
  ) => Promise<ExperimentRecord>;
}

export const createStudentApiClient = (token: string): StudentApiClient => ({
  token,

  getMe: () => requestJson("/api/v1/users/me", { token }),

  changeMyPassword: (currentPassword, newPassword) =>
    requestJson("/api/v1/users/me/password", {
      method: "PUT",
      token,
      body: { currentPassword, newPassword },
    }),

  listExperiments: () =>
    requestJson<ExperimentRecord[]>("/api/v1/students/me/experiment-runs", {
      token,
    }),

  getActiveExperiment: async () => {
    try {
      return await requestJson<ExperimentRecord>(
        "/api/v1/students/me/experiment-runs/active",
        { token },
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        return null;
      }
      throw error;
    }
  },

  createExperiment: (body = {}) =>
    requestJson<ExperimentRecord>("/api/v1/students/me/experiment-runs", {
      method: "POST",
      token,
      body,
    }),

  updateExperiment: (experimentId, updates) =>
    requestJson<ExperimentRecord>(`/api/v1/experiment-runs/${experimentId}`, {
      method: "PUT",
      token,
      body: updates,
    }),

  deleteExperiment: (experimentId) =>
    requestJson<{ message: string }>(
      `/api/v1/students/me/experiment-runs/${experimentId}`,
      {
        method: "DELETE",
        token,
      },
    ),

  cleanupInProgressExperiments: async () => {
    const experiments = await requestJson<ExperimentRecord[]>(
      "/api/v1/students/me/experiment-runs",
      { token },
    );

    for (const experiment of experiments) {
      if (experiment.status === "Completed") {
        continue;
      }
      await requestJson(
        `/api/v1/students/me/experiment-runs/${experiment.experiment_id}`,
        {
          method: "DELETE",
          token,
        },
      );
    }
  },

  ensureFreshExperiment: async (body = {}) => {
    const api = createStudentApiClient(token);
    await api.cleanupInProgressExperiments();
    return api.createExperiment(body);
  },

  getLatestReportStatus: () =>
    requestJson<LatestReportStatus>("/api/v1/my-latest-report-status", {
      token,
    }),
});
