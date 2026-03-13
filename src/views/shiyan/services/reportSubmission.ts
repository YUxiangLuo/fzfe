import { apiClient } from "@/utils/apiClient";

type ApiRequestError = Error & {
  status?: number;
  payload?: unknown;
};

type ReportSubmissionErrorKind = "service_busy" | "unknown";

export interface SubmitReportResult {
  message: string;
  report_id: number;
  pdf_path: string;
}

export class ReportSubmissionError extends Error {
  readonly status?: number;
  readonly kind: ReportSubmissionErrorKind;
  readonly originalError: unknown;

  constructor(
    message: string,
    options: {
      status?: number;
      kind: ReportSubmissionErrorKind;
      originalError: unknown;
    },
  ) {
    super(message);
    this.name = "ReportSubmissionError";
    this.status = options.status;
    this.kind = options.kind;
    this.originalError = options.originalError;
  }
}

const extractPayloadErrorMessage = (payload: unknown): string | null => {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }

  const maybePayload = payload as Record<string, unknown>;
  if (typeof maybePayload.error === "string" && maybePayload.error.trim().length > 0) {
    return maybePayload.error.trim();
  }
  if (typeof maybePayload.message === "string" && maybePayload.message.trim().length > 0) {
    return maybePayload.message.trim();
  }
  return null;
};

const stripHttpPrefix = (message: string): string | null => {
  const trimmed = message.trim();
  if (!trimmed) {
    return null;
  }

  if (!trimmed.startsWith("HTTP ")) {
    return trimmed;
  }

  const detailSeparatorIndex = trimmed.indexOf(" - ");
  if (detailSeparatorIndex === -1) {
    return trimmed;
  }

  const detail = trimmed.slice(detailSeparatorIndex + 3).trim();
  return detail.length > 0 ? detail : null;
};

const extractErrorDetail = (error: ApiRequestError): string | null =>
  extractPayloadErrorMessage(error.payload) ?? stripHttpPrefix(error.message);

const appendErrorDetail = (baseMessage: string, detail: string | null): string => {
  if (!detail || baseMessage.includes(detail)) {
    return baseMessage;
  }
  return `${baseMessage} 具体原因：${detail}`;
};

const getErrorKind = (error: ApiRequestError): ReportSubmissionErrorKind =>
  error.status === 503 ? "service_busy" : "unknown";

const buildErrorMessage = (error: ApiRequestError): string => {
  const detail = extractErrorDetail(error);

  switch (error.status) {
    case 503:
      return appendErrorDetail(
        "PDF 生成服务当前繁忙，排队等待超时。请稍后重新提交报告。",
        detail,
      );
    default:
      return detail ?? "提交报告失败，请稍后重试。";
  }
};

export const submitExperimentReport = async (
  experimentId: number,
  reportContent: string,
): Promise<SubmitReportResult> => {
  try {
    return await apiClient.post<SubmitReportResult>(
      `/experiment-runs/${experimentId}/report`,
      { report_content: reportContent },
    );
  } catch (error) {
    const requestError = error instanceof Error
      ? (error as ApiRequestError)
      : (new Error("未知错误") as ApiRequestError);

    throw new ReportSubmissionError(buildErrorMessage(requestError), {
      status: requestError.status,
      kind: getErrorKind(requestError),
      originalError: error,
    });
  }
};
