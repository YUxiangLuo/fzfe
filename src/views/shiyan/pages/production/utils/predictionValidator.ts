/**
 * 预测数据验证工具
 *
 * 职责：
 * - 验证和修正预测数据中的标准差（std_dev）
 * - 确保数据在合理范围内
 * - 提供清晰的警告信息
 */

import { MPS_CALCULATION } from '../config/mpsConstants';

export interface ValidationResult {
  value: number;
  warnings: string[];
  isModified: boolean;
}

/**
 * 验证并修正标准差
 *
 * @param stdDev - 原始标准差
 * @param demandForecast - 需求预测值
 * @param periodIndex - 期数索引（从0开始）
 * @returns 验证结果，包含修正后的值和警告信息
 */
export const validateAndFixStdDev = (
  stdDev: number,
  demandForecast: number,
  periodIndex: number
): ValidationResult => {
  const warnings: string[] = [];
  let value = stdDev;
  let isModified = false;

  // 1. 检查是否为负数或非法值（必须修正，否则会导致NaN）
  if (typeof stdDev !== 'number' || stdDev < 0 || !Number.isFinite(stdDev)) {
    warnings.push(
      `期 ${periodIndex + 1} 的std_dev非法: ${stdDev}，使用需求的${MPS_CALCULATION.DEFAULT_STD_DEV_RATIO * 100}%作为替代`
    );
    value = demandForecast * MPS_CALCULATION.DEFAULT_STD_DEV_RATIO;
    isModified = true;
    return { value, warnings, isModified };
  }

  // 2. 检查是否为0（MA等模型可能返回0）
  if (stdDev === 0) {
    warnings.push(`期 ${periodIndex + 1} 的std_dev为0，安全库存将为0`);
  }

  // 3. 检查是否异常大（超过预测值的30%）- 仅警告
  else if (stdDev > demandForecast * 0.3) {
    warnings.push(
      `期 ${periodIndex + 1} 的std_dev异常大: ${stdDev.toFixed(2)}，占预测值 ${((stdDev / demandForecast) * 100).toFixed(1)}%`
    );
  }

  return { value, warnings, isModified };
};

/**
 * 批量验证预测数据
 *
 * @param predictions - 预测数据数组
 * @returns 验证后的数据和汇总警告
 */
export const validatePredictions = (
  predictions: unknown,
): {
  validatedData: Array<{ prediction: number; std_dev: number }>;
  allWarnings: string[];
  hasModifications: boolean;
} => {
  if (!Array.isArray(predictions)) {
    throw new Error('预测数据格式无效：预测结果必须为数组');
  }

  const allWarnings: string[] = [];
  let hasModifications = false;

  const validatedData = predictions.map((pred, index) => {
    if (typeof pred !== 'object' || pred === null || Array.isArray(pred)) {
      throw new Error(`预测数据格式无效：第 ${index + 1} 期不是有效对象`);
    }

    const point = pred as Record<string, unknown>;
    if (typeof point.prediction !== 'number' || !Number.isFinite(point.prediction)) {
      throw new Error(`预测数据格式无效：第 ${index + 1} 期 prediction 必须是有限数字`);
    }
    if (typeof point.std_dev !== 'number' || !Number.isFinite(point.std_dev) || point.std_dev < 0) {
      throw new Error(`预测数据格式无效：第 ${index + 1} 期 std_dev 必须是非负有限数字`);
    }

    const prediction = point.prediction;
    const stdDev = point.std_dev;
    let normalizedPrediction = prediction;

    if (normalizedPrediction < 0) {
      allWarnings.push(`期 ${index + 1} 的prediction为负数: ${normalizedPrediction}，已修正为0`);
      normalizedPrediction = 0;
      hasModifications = true;
    }

    const demandForecast = Math.round(normalizedPrediction);
    const validationResult = validateAndFixStdDev(stdDev, demandForecast, index);

    if (validationResult.warnings.length > 0) {
      allWarnings.push(...validationResult.warnings);
    }

    if (validationResult.isModified) {
      hasModifications = true;
    }

    return {
      prediction: normalizedPrediction,
      std_dev: validationResult.value,
    };
  });

  return { validatedData, allWarnings, hasModifications };
};
