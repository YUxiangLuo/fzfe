import { apiClient } from "../../../utils/apiClient";
import type { DecodedToken } from "../../../utils/auth";
import { getSessionUserOrThrow } from "../../../utils/session";
import type { Class } from "../types";

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

export const listManagedClasses = async (options?: RequestInit): Promise<Class[]> => {
  return await apiClient.get<Class[]>(getManagedClassesEndpoint(getTeacherPortalUserOrThrow()), options);
};

export const listManagedClassGradeSummaries = async <T>(options?: RequestInit): Promise<T> => {
  return await apiClient.get<T>(getGradeSummariesEndpoint(getTeacherPortalUserOrThrow()), options);
};
