import { apiClient } from "../../../utils/apiClient";
import type { DecodedToken } from "../../../utils/auth";
import { getSessionUserOrThrow } from "../../../utils/session";
import type { Class } from "../types";
import type { AcademicTerm } from "./academicTerm";

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

export type TeacherPortalRequestOptions = RequestInit & {
  academicTerm?: AcademicTerm | null;
};

const appendAcademicTermQuery = (endpoint: string, academicTerm?: AcademicTerm | null): string => {
  if (!academicTerm) return endpoint;
  const params = new URLSearchParams({
    academic_year_start: String(academicTerm.academic_year_start),
    semester: String(academicTerm.semester),
  });
  return `${endpoint}?${params.toString()}`;
};

const splitPortalRequestOptions = (options?: TeacherPortalRequestOptions) => {
  const { academicTerm, ...requestOptions } = options ?? {};
  return { academicTerm, requestOptions };
};

export const listManagedClasses = async (options?: TeacherPortalRequestOptions): Promise<Class[]> => {
  const { academicTerm, requestOptions } = splitPortalRequestOptions(options);
  const endpoint = appendAcademicTermQuery(getManagedClassesEndpoint(getTeacherPortalUserOrThrow()), academicTerm);
  return await apiClient.get<Class[]>(endpoint, requestOptions);
};

export const listManagedClassGradeSummaries = async <T>(options?: TeacherPortalRequestOptions): Promise<T> => {
  const { academicTerm, requestOptions } = splitPortalRequestOptions(options);
  const endpoint = appendAcademicTermQuery(getGradeSummariesEndpoint(getTeacherPortalUserOrThrow()), academicTerm);
  return await apiClient.get<T>(endpoint, requestOptions);
};
