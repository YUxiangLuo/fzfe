import { MPS_CALCULATION } from '../config/mpsConstants';

/**
 * 生产能力计算工具
 *
 * 支持多种模式：
 * 1. scenario - 场景选择模式（学生从三种教学场景中选择）
 * 2. auto - 自动计算模式（保留兼容）
 * 3. custom - 自定义输入模式（保留兼容）
 */

// 产能计算模式
export type CapacityMode = 'scenario' | 'auto' | 'custom';

// 产能场景类型
export type CapacityScenario = 'tight' | 'normal' | 'abundant';

// 场景配置
export interface ScenarioConfig {
  id: CapacityScenario;
  name: string;
  description: string;
  riskLevel: 'high' | 'medium' | 'low';
  badge: string;
  color: string;
  formulaLabel: string;
  recommendation?: string;
}

export interface ForecastLoadPoint {
  period: number;
  demand: number;
  safetyStock: number;
  forecastLoad: number;
}

export interface CapacityScenarioOption extends ScenarioConfig {
  capacity: number;
  averageForecastLoad: number;
  peakForecastLoad: number;
  forecastLoadPoints: ForecastLoadPoint[];
}

// 产能场景定义
export const CAPACITY_SCENARIOS: ScenarioConfig[] = [
  {
    id: 'tight',
    name: '产能紧张',
    description: '低于预测平均负荷，适合观察产能不足的后果',
    riskLevel: 'high',
    badge: '高风险',
    color: 'red',
    formulaLabel: '预测负荷均值 × 90%',
    recommendation: '容易缺货，服务水平难以保证，适合理解产能不足的后果',
  },
  {
    id: 'normal',
    name: '产能正常',
    description: '覆盖预测平均负荷，适合观察均衡配置',
    riskLevel: 'medium',
    badge: '推荐',
    color: 'blue',
    formulaLabel: '预测负荷均值',
    recommendation: '覆盖平均负荷，但峰值月份仍可能受约束，适合理解平衡取舍',
  },
  {
    id: 'abundant',
    name: '产能充裕',
    description: '覆盖预测最高负荷，并保留最低 10% 机动空间',
    riskLevel: 'low',
    badge: '低风险',
    color: 'green',
    formulaLabel: 'max(最高预测负荷, 预测负荷均值 × 110%)',
    recommendation: '很少缺货，但可能产能利用率较低，适合理解产能过剩的成本',
  },
];

const normalizeDemand = (value: unknown): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return Math.max(0, Math.round(parsed));
};

const normalizeStdDev = (value: unknown, demand: number): number => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return demand * MPS_CALCULATION.DEFAULT_STD_DEV_RATIO;
  }
  return parsed;
};

export const calculateForecastLoadPoints = (
  predictions: Array<{ prediction: number; std_dev?: number | null }>,
  zScore: number,
): ForecastLoadPoint[] => predictions.map((prediction, index) => {
  const demand = normalizeDemand(prediction.prediction);
  const stdDev = normalizeStdDev(prediction.std_dev, demand);
  const safetyStock = Math.max(0, Math.round(zScore * stdDev));

  return {
    period: index + 1,
    demand,
    safetyStock,
    forecastLoad: demand + safetyStock,
  };
});

export const calculateForecastLoadStats = (
  predictions: Array<{ prediction: number; std_dev?: number | null }>,
  zScore: number,
): { averageForecastLoad: number; peakForecastLoad: number; forecastLoadPoints: ForecastLoadPoint[] } => {
  const forecastLoadPoints = calculateForecastLoadPoints(predictions, zScore);
  if (forecastLoadPoints.length === 0) {
    return { averageForecastLoad: 0, peakForecastLoad: 0, forecastLoadPoints };
  }

  const totalLoad = forecastLoadPoints.reduce((sum, point) => sum + point.forecastLoad, 0);
  const averageForecastLoad = Math.round(totalLoad / forecastLoadPoints.length);
  const peakForecastLoad = Math.max(...forecastLoadPoints.map((point) => point.forecastLoad));

  return { averageForecastLoad, peakForecastLoad, forecastLoadPoints };
};

/**
 * 计算平均需求
 */
export const calculateAverageDemand = (predictions: Array<{ prediction: number }>): number => {
  if (!predictions || predictions.length === 0) return 0;
  const sum = predictions.reduce((acc, p) => acc + p.prediction, 0);
  return Math.round(sum / predictions.length);
};

/**
 * 计算最大需求
 */
export const calculateMaxDemand = (predictions: Array<{ prediction: number }>): number => {
  if (!predictions || predictions.length === 0) return 0;
  return Math.round(Math.max(...predictions.map(p => p.prediction)));
};

/**
 * 场景模式：根据场景计算产能
 */
export const calculateCapacityByScenario = (
  scenario: CapacityScenario,
  averageForecastLoad: number,
  peakForecastLoad: number = averageForecastLoad,
): number => {
  switch (scenario) {
    case 'tight':
      return Math.max(0, Math.round(averageForecastLoad * 0.9));
    case 'normal':
      return Math.max(0, Math.round(averageForecastLoad));
    case 'abundant':
      return Math.max(
        0,
        Math.max(peakForecastLoad, Math.round(averageForecastLoad * 1.1)),
      );
  }
};

export const calculateCapacityScenarioOptions = (
  predictions: Array<{ prediction: number; std_dev?: number | null }>,
  zScore: number,
): CapacityScenarioOption[] => {
  const { averageForecastLoad, peakForecastLoad, forecastLoadPoints } =
    calculateForecastLoadStats(predictions, zScore);

  return CAPACITY_SCENARIOS.map((scenario) => ({
    ...scenario,
    capacity: calculateCapacityByScenario(scenario.id, averageForecastLoad, peakForecastLoad),
    averageForecastLoad,
    peakForecastLoad,
    forecastLoadPoints,
  }));
};

/**
 * 自动模式：根据预测数据自动计算合理产能
 *
 * 策略：综合考虑平均需求和峰值需求
 * - 基础产能 = 平均需求 * 1.2
 * - 峰值缓冲 = (最大需求 - 平均需求) * 0.5
 * - 总产能 = 基础产能 + 峰值缓冲
 */
export const calculateCapacityAuto = (
  predictions: Array<{ prediction: number; std_dev: number }>
): number => {
  if (!predictions || predictions.length === 0) return 0;

  const avgDemand = calculateAverageDemand(predictions);
  const maxDemand = calculateMaxDemand(predictions);

  // 计算需求波动性（标准差的平均值）
  const avgStdDev = predictions.reduce((sum, p) => sum + p.std_dev, 0) / predictions.length;

  // 策略1：保守型（适合需求波动大的情况）
  if (avgStdDev > avgDemand * 0.1) {
    return Math.round(avgDemand * 1.2 + maxDemand * 0.2);
  }

  // 策略2：均衡型（标准策略）
  return Math.round((avgDemand * 1.2 + maxDemand * 1.1) / 2);
};

/**
 * 获取产能场景的完整信息
 */
export const getScenarioInfo = (scenario: CapacityScenario): ScenarioConfig | undefined => {
  return CAPACITY_SCENARIOS.find(s => s.id === scenario);
};

/**
 * 验证自定义产能是否合理
 */
export const validateCustomCapacity = (
  capacity: number,
  avgDemand: number
): { valid: boolean; warning?: string } => {
  if (capacity <= 0) {
    return { valid: false, warning: '产能必须大于0' };
  }

  if (capacity < avgDemand * 0.8) {
    return {
      valid: true,
      warning: `⚠️ 产能过低（不足平均需求的80%），将导致严重缺货`,
    };
  }

  if (capacity < avgDemand * 1.0) {
    return {
      valid: true,
      warning: `⚠️ 产能低于平均需求，可能频繁缺货`,
    };
  }

  if (capacity > avgDemand * 2.0) {
    return {
      valid: true,
      warning: `⚠️ 产能过高（超过平均需求的2倍），可能导致产能浪费`,
    };
  }

  return { valid: true };
};

/**
 * 统一的产能计算接口
 *
 * 根据模式和参数计算产能，方便未来切换模式
 */
export const calculateProductionCapacity = (
  mode: CapacityMode,
  params: {
    scenario?: CapacityScenario;
    customValue?: number;
    predictions?: Array<{ prediction: number; std_dev: number }>;
    avgDemand?: number;
    peakForecastLoad?: number;
  }
): number => {
  switch (mode) {
    case 'scenario':
      if (!params.scenario || params.avgDemand === undefined) {
        throw new Error('Scenario mode requires scenario and average forecast load');
      }
      return calculateCapacityByScenario(
        params.scenario,
        params.avgDemand,
        params.peakForecastLoad,
      );

    case 'auto':
      if (!params.predictions) {
        throw new Error('Auto mode requires predictions data');
      }
      return calculateCapacityAuto(params.predictions);

    case 'custom':
      if (params.customValue === undefined) {
        throw new Error('Custom mode requires customValue');
      }
      return Math.round(params.customValue);

    default:
      throw new Error(`Unknown capacity mode: ${mode}`);
  }
};

/**
 * 应用产能约束到产出量计算
 */
export const applyCapacityConstraint = (
  plannedInput: number,
  capacity: number
): {
  actualOutput: number;
  capacityUtilization: number; // 产能利用率
  isConstrained: boolean; // 是否受到产能约束
  shortfall: number; // 产能缺口
} => {
  const actualOutput = Math.max(0, Math.min(plannedInput, capacity));
  const capacityUtilization = capacity > 0 ? actualOutput / capacity : 0;
  const isConstrained = plannedInput > capacity;
  const shortfall = Math.max(0, plannedInput - capacity);

  return {
    actualOutput,
    capacityUtilization,
    isConstrained,
    shortfall,
  };
};
