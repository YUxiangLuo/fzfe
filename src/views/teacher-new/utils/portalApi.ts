import { apiClient } from "../../../utils/apiClient";
import type { DecodedToken } from "../../../utils/auth";
import { getSessionUserOrThrow } from "../../../utils/session";
import type { AcademicTerm, Class } from "../types";

export type TeacherPortalUser = DecodedToken & {
  role: "Teacher" | "Assistant";
};

const isTeacherPortalRole = (role: string): role is TeacherPortalUser["role"] => {
  return role === "Teacher" || role === "Assistant";
};

export const getTeacherPortalUserOrThrow = (): TeacherPortalUser => {
  const user = getSessionUserOrThrow();
  if (!isTeacherPortalRole(user.role)) {
    throw new Error("当前用户不是教师端/助教端账号");
  }

  return user as TeacherPortalUser;
};

export const isAssistantTeacherPortalUser = (user: Pick<TeacherPortalUser, "role">): boolean => {
  return user.role === "Assistant";
};

const getManagedClassesEndpoint = (user: TeacherPortalUser): string => {
  return isAssistantTeacherPortalUser(user)
    ? `/assistants/${user.sub}/classes`
    : `/teachers/${user.sub}/classes`;
};

const getGradeSummariesEndpoint = (user: TeacherPortalUser): string => {
  return isAssistantTeacherPortalUser(user)
    ? `/assistants/${user.sub}/grade-summaries`
    : `/teachers/${user.sub}/grade-summaries`;
};

export interface TermScopedRequestOptions extends RequestInit {
  termId?: number | "current" | null;
}

const appendTermQuery = (endpoint: string, termId: TermScopedRequestOptions["termId"]): string => {
  if (termId === undefined || termId === null) return endpoint;
  const separator = endpoint.includes("?") ? "&" : "?";
  return `${endpoint}${separator}term_id=${encodeURIComponent(String(termId))}`;
};

const splitTermScopedOptions = (options?: TermScopedRequestOptions) => {
  if (!options) return { termId: undefined, requestOptions: undefined };
  const { termId, ...requestOptions } = options;
  return { termId, requestOptions };
};

export const listAcademicTerms = async (options?: RequestInit): Promise<AcademicTerm[]> => {
  return await apiClient.get<AcademicTerm[]>("/academic-terms", options);
};

export const getCurrentAcademicTerm = async (options?: RequestInit): Promise<AcademicTerm> => {
  return await apiClient.get<AcademicTerm>("/academic-terms/current", options);
};

export const listManagedClasses = async (options?: TermScopedRequestOptions): Promise<Class[]> => {
  const { termId, requestOptions } = splitTermScopedOptions(options);
  return await apiClient.get<Class[]>(appendTermQuery(getManagedClassesEndpoint(getTeacherPortalUserOrThrow()), termId), requestOptions);
};

export const listManagedClassGradeSummaries = async <T>(options?: TermScopedRequestOptions): Promise<T> => {
  const { termId, requestOptions } = splitTermScopedOptions(options);
  return await apiClient.get<T>(appendTermQuery(getGradeSummariesEndpoint(getTeacherPortalUserOrThrow()), termId), requestOptions);
};
