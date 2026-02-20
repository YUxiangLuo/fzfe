/**
 * 路由配置常量
 * 集中管理所有路由路径，避免硬编码
 */

import { STEPS } from './steps';

export const ROUTES = {
  LOGIN: '/login.html',
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
 * 步骤编号到路由路径的映射
 */
const STEP_TO_PATH: Record<number, string> = {
  [STEPS.INDUSTRY]: ROUTES.INDUSTRY,
  [STEPS.COMPANY]: ROUTES.COMPANY,
  [STEPS.PRODUCT]: ROUTES.PRODUCT,
  [STEPS.DATA_WINDOW]: ROUTES.DATA,
  [STEPS.MODEL]: ROUTES.MODEL,
  [STEPS.EVALUATION]: ROUTES.EVALUATION,
  [STEPS.PRODUCTION]: ROUTES.PRODUCTION,
  [STEPS.RESULT]: ROUTES.REPORT,
};

/**
 * 获取步骤路由路径
 */
export const getStepPath = (step: number): string => {
  return STEP_TO_PATH[step] || ROUTES.INDUSTRY;
};
