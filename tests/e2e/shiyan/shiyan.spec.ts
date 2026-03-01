/**
 * Shiyan E2E Test - Main Flow
 * 
 * 学生端全链路覆盖测试（使用重构后的架构）
 */

import { shiyanTest as test, expect } from "../fixtures/index.js";
import { runWeightedEnsembleExperiment } from "./experiment-flow";

test.describe("@shiyan 学生端全链路测试", () => {
  
  test("加权平均融合模型完整流程", async ({ studentPage, shiyanContext }) => {
    // 设置超时 15 分钟
    test.setTimeout(15 * 60 * 1000);
    
    // 运行完整实验流程
    await runWeightedEnsembleExperiment(studentPage);
    
    // 验证报告提交成功
    await expect(studentPage.locator('[data-status="submitted"]')).toBeVisible({ timeout: 30_000 });
    
    // 验证页面 URL
    await expect(studentPage).toHaveURL(/\/report/);
  });
  
  test("使用新架构的独立测试", async ({ studentPage, experimentPage }) => {
    test.setTimeout(15 * 60 * 1000);
    
    // 登录后处理介绍页
    await experimentPage.handleIntroduction({ forceNew: true });
    
    // 验证跳转到行业选择页
    await expect(studentPage).toHaveURL(/\/industry/);
    
    // 可以继续后续步骤...
  });
});
