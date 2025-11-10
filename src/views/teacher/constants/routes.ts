/**
 * 路由配置常量
 */

export const ROUTES = {
  LOGIN: '/login',
  EXPERIMENT: '/exp',
  TEACHER: '/teacher',
  ASSISTANT: '/teacher',  // 助教使用相同的 teacher 端
  ADMIN: '/admin',
} as const;

/**
 * 获取登出后的重定向路径
 */
export const getLogoutRedirectPath = (): string => {
  return ROUTES.LOGIN;
};
