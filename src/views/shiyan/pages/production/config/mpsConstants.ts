/**
 * MPS（主生产计划）配置常量
 *
 * 集中管理所有MPS相关的配置参数，避免魔法数字
 */

/**
 * 服务水平配置
 */
export const SERVICE_LEVELS = {
  EXCELLENT: {
    value: 0.99,
    zScore: 2.33,
    label: '99% (追求卓越)',
    description: '追求卓越服务，满足99%的客户需求',
  },
  GOOD: {
    value: 0.95,
    zScore: 1.65,
    label: '95% (良好)',
    description: '良好的服务水平，适合大多数场景',
  },
  NORMAL: {
    value: 0.90,
    zScore: 1.28,
    label: '90% (一般)',
    description: '基本的服务水平，成本较低',
  },
} as const;

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
   * 默认标准差比率
   * 当标准差数据缺失或异常时，使用需求的5%作为替代
   */
  DEFAULT_STD_DEV_RATIO: 0.05,

  /**
   * 异常标准差阈值
   * 如果标准差超过需求的30%，视为异常并发出警告
   */
  ABNORMAL_STD_DEV_THRESHOLD: 0.3,

  /**
   * 提前期（Lead Time）
   * 单位：月
   * 本月投入 → 下月产出
   */
  LEAD_TIME_MONTHS: 1,
} as const;

/**
 * 标准差估算配置
 * 当API未返回标准差或标准差数据异常时使用
 */
export const STD_DEV_ESTIMATION = {
  /**
   * Fallback标准差比率
   * 估算标准差 = 需求预测 × 0.2 (即需求的20%)
   * 这是一个保守的估算，适用于大多数产品
   */
  FALLBACK_RATIO: 0.2,
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
 * （引用自 productionCapacityHelper.ts 的场景配置）
 */
export const CAPACITY_CONFIG = {
  /**
   * 默认产能场景
   */
  DEFAULT_SCENARIO: 'normal' as const,

  /**
   * 简化示例产能倍数
   * 用于Step1的教学演示（简化计算）
   */
  SIMPLE_MULTIPLIER: 1.1,

  /**
   * 产能场景倍数
   * 用于完整MPS计算（结果视图及后续）
   */
  SCENARIOS: {
    TIGHT: {
      multiplier: 0.9,
      label: '产能紧张（90%）',
    },
    NORMAL: {
      multiplier: 1.3,
      label: '产能正常（130%）',
    },
    ABUNDANT: {
      multiplier: 1.8,
      label: '产能充裕（180%）',
    },
  } as const,
} as const;

/**
 * 默认参数配置（用于初始化）
 */
export const DEFAULT_PARAMETERS = {
  forecastPeriods: FORECAST_PERIODS.DEFAULT,
  initialInventory: MPS_CALCULATION.INITIAL_INVENTORY,
  targetServiceLevel: SERVICE_LEVELS.EXCELLENT.value,
  safetyStockZScore: SERVICE_LEVELS.EXCELLENT.zScore,
} as const;

/**
 * 获取服务水平配置
 * @param value - 服务水平值（0-1）
 */
export const getServiceLevelConfig = (value: number) => {
  if (value >= 0.99) return SERVICE_LEVELS.EXCELLENT;
  if (value >= 0.95) return SERVICE_LEVELS.GOOD;
  return SERVICE_LEVELS.NORMAL;
};

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
