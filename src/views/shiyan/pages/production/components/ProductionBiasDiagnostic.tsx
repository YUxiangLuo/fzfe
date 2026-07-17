import React from 'react';
import { Info, TriangleAlert } from 'lucide-react';
import { calculateSafetyStock } from '../utils/productionCapacityHelper';

interface BiasPredictionPoint {
  calibration_mean_error: number | null;
  calibration_count: number | null;
  std_dev: number;
}

interface ProductionBiasDiagnosticProps {
  predictions?: readonly BiasPredictionPoint[];
  zScore?: number | null;
  focusIndex?: number;
  className?: string;
}

/**
 * Shows calibration bias as a diagnostic only. It never modifies forecasts,
 * safety stock, capacity, or grading inputs.
 */
const ProductionBiasDiagnostic: React.FC<ProductionBiasDiagnosticProps> = ({
  predictions = [],
  zScore = null,
  focusIndex,
  className = '',
}) => {
  const indexed = predictions.map((point, index) => ({ point, index }));
  const candidates = focusIndex === undefined
    ? indexed.filter(({ index }) => index > 0)
    : indexed.filter(({ index }) => index === focusIndex);
  if (candidates.length === 0) return null;

  const calibrated = candidates.filter(({ point }) => (
    point.calibration_mean_error !== null && point.calibration_count !== null
  ));
  if (calibrated.length === 0) {
    return (
      <div className={`flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 ${className}`}>
        <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-slate-500" />
        <p>可用历史误差残差不足，历史平均偏差诊断不可用；这不会阻止继续制定教学计划。</p>
      </div>
    );
  }

  const underpredicted = calibrated.filter(({ point }) => (point.calibration_mean_error ?? 0) > 0);
  const riskPoints = zScore == null
    ? []
    : underpredicted.filter(({ point }) => (
      (point.calibration_mean_error ?? 0) > calculateSafetyStock(point.std_dev, zScore)
    ));
  const representative = calibrated.reduce((largest, current) => (
    Math.abs(current.point.calibration_mean_error ?? 0)
      > Math.abs(largest.point.calibration_mean_error ?? 0)
      ? current
      : largest
  ));

  if (riskPoints.length > 0) {
    const warningPoint = riskPoints.reduce((largest, current) => (
      (current.point.calibration_mean_error ?? 0) > (largest.point.calibration_mean_error ?? 0)
        ? current
        : largest
    ));
    const warningMeanError = warningPoint.point.calibration_mean_error ?? 0;
    const warningCount = warningPoint.point.calibration_count ?? 0;
    return (
      <div className={`flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 ${className}`} role="alert">
        <TriangleAlert className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
        <div>
          <p className="font-semibold">历史平均低估超过当前公式缓冲</p>
          <p className="mt-1">
            误差样本显示模型平均低估约 {warningMeanError.toFixed(1)} 件（样本数 {warningCount}）。这是诊断提示，不会修正点预测、安全库存或产能。
          </p>
        </div>
      </div>
    );
  }

  const meanError = representative.point.calibration_mean_error ?? 0;
  const count = representative.point.calibration_count ?? 0;
  const direction = meanError > 0 ? '低估' : meanError < 0 ? '高估' : '无明显偏差';
  return (
    <div className={`flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900 ${className}`}>
      <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" />
      <p>
        历史偏差诊断：平均{direction}{meanError === 0 ? '' : `约 ${Math.abs(meanError).toFixed(1)} 件`}（样本数 {count}）。
        {zScore == null ? ' 选择目标服务水平后，系统会将其与公式缓冲比较。' : ' 该诊断仅供复核，不参与公式计算。'}
      </p>
    </div>
  );
};

export default ProductionBiasDiagnostic;
