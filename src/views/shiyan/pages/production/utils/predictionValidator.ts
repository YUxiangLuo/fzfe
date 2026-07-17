/**
 * 预测数据验证工具
 *
 * 职责：
 * - 严格验证当前预测与不确定性契约
 * - 拒绝缺字段或非有限值，避免用前端猜测替代模型结果
 * - 提供清晰的警告信息
 */

import type { ProductionPredictionPoint } from '../ProductionPlanContextV2';

const UNCERTAINTY_REASON_LABELS: Record<string, string> = {
  first_difference_scale: '可用残差不足，改用训练序列一阶差分尺度',
  first_difference_rms_floor: '差分波动接近零但存在稳定趋势，改用一阶差分均方根作为保守尺度',
  insufficient_residuals: '残差和差分样本不足，改用保守的基准波动',
  nonfinite_scale: '估计尺度无效，改用保守的基准波动',
};

export const describeUncertaintyReason = (reason: string): string =>
  UNCERTAINTY_REASON_LABELS[reason] ?? reason;

export interface UncertaintyAuditPoint {
  uncertainty_source?: 'model' | 'empirical' | 'fallback';
  uncertainty_reason?: string;
  coverage_guarantee?: boolean;
  calibration_origins?: number;
  upper_error_p99_kind?: string;
}

export interface FallbackUncertaintySummary {
  fallbackCount: number;
  reasons: string[];
}

export const summarizeFallbackUncertainty = (
  predictions?: readonly UncertaintyAuditPoint[] | null,
): FallbackUncertaintySummary => {
  const fallbackPoints = (predictions ?? []).filter(
    point => point.uncertainty_source === 'fallback',
  );
  const reasons = Array.from(new Set(
    fallbackPoints
      .map(point => point.uncertainty_reason?.trim())
      .filter((reason): reason is string => Boolean(reason))
      .map(describeUncertaintyReason),
  ));
  return { fallbackCount: fallbackPoints.length, reasons };
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
  validatedData: ProductionPredictionPoint[];
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
    if (
      typeof point.upper_error_p99 !== 'number'
      || !Number.isFinite(point.upper_error_p99)
      || point.upper_error_p99 < 0
    ) {
      throw new Error(`预测数据格式无效：第 ${index + 1} 期 upper_error_p99 必须是非负有限数字`);
    }

    const uncertaintySource = point.uncertainty_source;
    const uncertaintyReason = point.uncertainty_reason;
    if (
      !['model', 'empirical', 'fallback'].includes(String(uncertaintySource))
    ) {
      throw new Error(`预测数据格式无效：第 ${index + 1} 期 uncertainty_source 无效`);
    }
    if (uncertaintyReason !== undefined && typeof uncertaintyReason !== 'string') {
      throw new Error(`预测数据格式无效：第 ${index + 1} 期 uncertainty_reason 无效`);
    }
    const coverageGuarantee = point.coverage_guarantee;
    const calibrationOrigins = point.calibration_origins;
    const upperErrorP99Kind = point.upper_error_p99_kind;
    if (coverageGuarantee !== undefined && typeof coverageGuarantee !== 'boolean') {
      throw new Error(`预测数据格式无效：第 ${index + 1} 期 coverage_guarantee 必须是布尔值`);
    }
    if (
      calibrationOrigins !== undefined
      && (
        typeof calibrationOrigins !== 'number'
        || !Number.isInteger(calibrationOrigins)
        || calibrationOrigins <= 0
      )
    ) {
      throw new Error(`预测数据格式无效：第 ${index + 1} 期 calibration_origins 必须是正整数`);
    }
    if (
      upperErrorP99Kind !== undefined
      && (typeof upperErrorP99Kind !== 'string' || upperErrorP99Kind.length === 0)
    ) {
      throw new Error(`预测数据格式无效：第 ${index + 1} 期 upper_error_p99_kind 必须是非空字符串`);
    }
    const hasValidCalibrationDiagnostics = (
      point.calibration_mean_error === null
      && point.calibration_count === null
    ) || (
      typeof point.calibration_mean_error === 'number'
      && Number.isFinite(point.calibration_mean_error)
      && typeof point.calibration_count === 'number'
      && Number.isInteger(point.calibration_count)
      && point.calibration_count > 0
    );
    if (!hasValidCalibrationDiagnostics) {
      throw new Error(
        `预测数据格式无效：第 ${index + 1} 期偏差诊断必须同时为有效均值与样本数，或同时为 null`,
      );
    }
    if (uncertaintySource === 'fallback') {
      allWarnings.push(
        `第 ${index + 1} 期误差区间与安全库存标准差使用回退估计${uncertaintyReason ? `（${describeUncertaintyReason(uncertaintyReason)}）` : ''}；安全库存应结合业务经验复核`,
      );
    }
    if (coverageGuarantee === false) {
      allWarnings.push(
        `第 ${index + 1} 期误差范围与99%上侧误差只是未校准估计，不代表95%或99%覆盖率保证`,
      );
    }
    let normalizedPrediction = prediction;

    if (normalizedPrediction < 0) {
      allWarnings.push(`期 ${index + 1} 的prediction为负数: ${normalizedPrediction}，已修正为0`);
      normalizedPrediction = 0;
      hasModifications = true;
    }

    return {
      prediction: normalizedPrediction,
      std_dev: stdDev,
      upper_error_p99: point.upper_error_p99,
      uncertainty_source: uncertaintySource as ProductionPredictionPoint['uncertainty_source'],
      calibration_mean_error: point.calibration_mean_error as number | null,
      calibration_count: point.calibration_count as number | null,
      ...(typeof uncertaintyReason === 'string'
        ? { uncertainty_reason: uncertaintyReason }
        : {}),
      ...(typeof coverageGuarantee === 'boolean'
        ? { coverage_guarantee: coverageGuarantee }
        : {}),
      ...(typeof upperErrorP99Kind === 'string'
        ? { upper_error_p99_kind: upperErrorP99Kind }
        : {}),
      ...(typeof calibrationOrigins === 'number'
        ? { calibration_origins: calibrationOrigins }
        : {}),
    };
  });

  return { validatedData, allWarnings, hasModifications };
};
