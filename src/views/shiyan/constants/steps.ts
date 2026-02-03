/**
 * 实验步骤常量配置
 * 集中管理所有步骤编号，避免硬编码
 */

/**
 * 步骤编号枚举
 * 每个步骤对应实验流程中的一个阶段
 */
export const STEPS = {
  /** 步骤1: 选择行业 */
  INDUSTRY: 1,
  /** 步骤2: 选择企业 */
  COMPANY: 2,
  /** 步骤3: 选择产品 */
  PRODUCT: 3,
  /** 步骤4: 数据窗口选择 */
  DATA_WINDOW: 4,
  /** 步骤5: 模型构建 */
  MODEL: 5,
  /** 步骤6: 模型评估 */
  EVALUATION: 6,
  /** 步骤7: 生产计划 */
  PRODUCTION: 7,
  /** 步骤8: 结果报告 */
  RESULT: 8,
} as const;

/**
 * 步骤类型
 */
export type StepNumber = (typeof STEPS)[keyof typeof STEPS];

/**
 * 步骤名称映射
 */
export const STEP_NAMES: Record<StepNumber, string> = {
  [STEPS.INDUSTRY]: '选择行业',
  [STEPS.COMPANY]: '选择企业',
  [STEPS.PRODUCT]: '选择产品',
  [STEPS.DATA_WINDOW]: '数据窗口选择',
  [STEPS.MODEL]: '模型构建',
  [STEPS.EVALUATION]: '模型评估',
  [STEPS.PRODUCTION]: '生产计划',
  [STEPS.RESULT]: '结果报告',
};

/**
 * 获取下一步骤编号
 * @param currentStep 当前步骤
 * @returns 下一步骤编号，如果已是最后一步则返回当前步骤
 */
export const getNextStep = (currentStep: StepNumber): StepNumber => {
  const nextStep = currentStep + 1;
  return nextStep <= STEPS.RESULT ? (nextStep as StepNumber) : currentStep;
};

/**
 * 获取上一步骤编号
 * @param currentStep 当前步骤
 * @returns 上一步骤编号，如果已是第一步则返回当前步骤
 */
export const getPreviousStep = (currentStep: StepNumber): StepNumber => {
  const prevStep = currentStep - 1;
  return prevStep >= STEPS.INDUSTRY ? (prevStep as StepNumber) : currentStep;
};

/**
 * 初始步骤
 */
export const INITIAL_STEP = STEPS.INDUSTRY;

/**
 * 初始完成步骤 (未完成任何步骤)
 */
export const INITIAL_COMPLETED_STEP = 0;
