/**
 * Playwright Test Fixtures - 统一导出
 * 
 * 提供所有角色的测试 fixtures
 */

// ===== Teacher/Assistant/Admin Fixtures =====
export { test, expect, type UserContext, type TestDataContext, LoginPage } from "./base";

// ===== Shiyan Fixtures =====
export {
  test as shiyanTest,
  expect as shiyanExpect,
  type ShiyanContext,
  type ExperimentState,
  ShiyanLoginPage,
  ShiyanExperimentPage,
} from "./shiyan";
