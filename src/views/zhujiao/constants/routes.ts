/**
 * 路由配置常量
 */

export const ROUTES = {
  LOGIN: '/login',
  SHIYAN: '/shiyan',
  JIAOSHI: '/jiaoshi',
  ZHUJIAO: '/zhujiao',
  ADMIN: '/admin',
} as const;

/**
 * 获取登出后的重定向路径
 */
export const getLogoutRedirectPath = (): string => {
  return ROUTES.LOGIN;
};
