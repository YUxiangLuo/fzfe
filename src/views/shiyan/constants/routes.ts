/**
 * 路由配置常量
 * 集中管理所有路由路径，避免硬编码
 */

export const ROUTES = {
  LOGIN: '/login',
  INTRODUCTION: '/introduction',
  PROFILE: '/profile',

  // 实验步骤路由
  INDUSTRY: '/industry',
  COMPANY: '/company',
  PRODUCT: '/product',
  DATA: '/data',
  MODEL: '/model',
  EVALUATION: '/evaluation',
  PRODUCTION: '/production',

  // 测验路由
  QUIZ_MODEL: '/quiz',
  QUIZ_PLAN: '/quiz-plan',

  // 报告路由
  REPORT: '/report',
} as const;

/**
 * 获取登出后的重定向路径
 */
export const getLogoutRedirectPath = (): string => {
  return ROUTES.LOGIN;
};

/**
 * 获取步骤路由路径
 */
export const getStepPath = (step: number): string => {
  const stepPaths: Record<number, string> = {
    1: ROUTES.INDUSTRY,
    2: ROUTES.COMPANY,
    3: ROUTES.PRODUCT,
    4: ROUTES.DATA,
    5: ROUTES.MODEL,
    6: ROUTES.EVALUATION,
    7: ROUTES.PRODUCTION,
  };
  return stepPaths[step] || ROUTES.INDUSTRY;
};
