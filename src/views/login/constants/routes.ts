// 登录后的重定向路径配置
export const ROLE_REDIRECT_PATHS = {
  student: "/exp",
  teacher: "/teacher",
  assistant: "/teacher",
  admin: "/admin",
} as const;

export type RoleId = keyof typeof ROLE_REDIRECT_PATHS;

/**
 * 根据角色获取重定向路径
 */
export const getRedirectPath = (role: RoleId): string => {
  return ROLE_REDIRECT_PATHS[role] || ROLE_REDIRECT_PATHS.student;
};
