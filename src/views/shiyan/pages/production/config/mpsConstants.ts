/**
 * MPS（主生产计划）配置常量
 *
 * 集中管理所有MPS相关的配置参数，避免魔法数字
 */

/** 客户需求文档指定的三档服务水平及其单侧正态 Z 值。 */
export const SERVICE_LEVEL_OPTIONS = [
  {
    value: 0.90,
    zScore: 1.28,
    label: '90%',
    description: '较低库存缓冲，缺货风险相对较高',
  },
  {
    value: 0.95,
    zScore: 1.65,
    label: '95%',
    description: '在库存成本与缺货风险之间折中',
  },
  {
    value: 0.99,
    zScore: 2.33,
    label: '99%',
    description: '较高库存缓冲，库存占用也更高',
  },
] as const;

export type ServiceLevel = typeof SERVICE_LEVEL_OPTIONS[number]['value'];
export type ServiceLevelOption = typeof SERVICE_LEVEL_OPTIONS[number];

export const getServiceLevelOption = (value: unknown): ServiceLevelOption | null =>
  SERVICE_LEVEL_OPTIONS.find((option) => option.value === value) ?? null;

export const resolvePersistedServiceLevel = (
  targetServiceLevel: unknown,
  zScore: unknown,
): ServiceLevelOption | null => {
  const option = getServiceLevelOption(targetServiceLevel);
  return option && option.zScore === zScore ? option : null;
};

/**
 * MPS计算相关常量
 */
export const MPS_CALCULATION = {
  /**
   * 初始库存（第一月标准化基准）
   * 第一期固定为0，用于标准化起点
   */
  INITIAL_INVENTORY: 0,

  /**
   * 提前期（Lead Time）
   * 单位：月
   * 本月投入 → 下月产出
   */
  LEAD_TIME_MONTHS: 1,
} as const;

/**
 * 预测期数配置
 */
export const FORECAST_PERIODS = {
  MIN: 2, // 最小预测期数
  MAX: 12, // 最大预测期数
  RECOMMENDED_MIN: 4, // 推荐最小值
  RECOMMENDED_MAX: 8, // 推荐最大值
  DEFAULT: 6, // 默认值
} as const;

/**
 * 产能配置
 * 三种场景的实际数值由 productionCapacityHelper.ts 基于预测负荷计算。
 */
export const CAPACITY_CONFIG = {
  /**
   * 推荐初始展示场景
   */
  DEFAULT_SCENARIO: 'normal' as const,

  SCENARIOS: {
    TIGHT: {
      label: '产能紧张',
      formula: '预测负荷均值 × 90%',
    },
    NORMAL: {
      label: '产能正常',
      formula: '预测负荷均值',
    },
    ABUNDANT: {
      label: '产能充裕',
      formula: 'max(最高预测负荷, 预测负荷均值 × 110%)',
    },
  } as const,
} as const;

/**
 * 默认参数配置（用于初始化）
 */
export const DEFAULT_PARAMETERS = {
  forecastPeriods: FORECAST_PERIODS.DEFAULT,
  initialInventory: MPS_CALCULATION.INITIAL_INVENTORY,
  targetServiceLevel: null,
  safetyStockZScore: null,
} as const;

/**
 * 验证预测期数是否有效
 * @param periods - 预测期数
 */
export const isValidForecastPeriods = (periods: number): boolean => {
  return periods >= FORECAST_PERIODS.MIN && periods <= FORECAST_PERIODS.MAX;
};

/**
 * 获取预测期数的建议文本
 */
export const getForecastPeriodsRecommendation = (): string => {
  return `推荐设置 ${FORECAST_PERIODS.RECOMMENDED_MIN}-${FORECAST_PERIODS.RECOMMENDED_MAX} 期`;
};
