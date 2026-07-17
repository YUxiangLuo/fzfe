export interface PredictionRow {
  date: string;
  actual: number;
  predicted: number;
  stdDev?: number;
  uncertaintySource?: 'model' | 'empirical' | 'fallback';
  uncertaintyReason?: string | null;
  calibrationSource?: string | null;
  intervalLower?: number | null;
  intervalUpper?: number | null;
  intervalLevel?: number | null;
  intervalKind?: string | null;
  coverageGuarantee?: boolean | null;
  upperErrorP99Kind?: string | null;
  calibrationOrigins?: number | null;
}

export interface ModelMetrics {
  rmse: number;
  mae: number;
  r2: number;
}

export interface ArimaOrder {
  p: number;
  d: number;
  q: number;
}

const isFiniteNumber = (value: unknown): value is number => {
  return typeof value === 'number' && Number.isFinite(value);
};

const requireFiniteNumberArray = (value: unknown, label: string): number[] => {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${label}必须是非空数组`);
  }

  return value.map((item, index) => {
    if (!isFiniteNumber(item)) {
      throw new Error(`${label}第 ${index + 1} 项必须是有限数字`);
    }
    return item;
  });
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

interface ParsedPredictionPoint {
  prediction: number;
  stdDev: number;
  uncertaintySource: 'model' | 'empirical' | 'fallback';
  uncertaintyReason: string | null;
  calibrationSource: string | null;
  intervalLower: number | null;
  intervalUpper: number | null;
  intervalLevel: number | null;
  intervalKind: string | null;
  coverageGuarantee: boolean | null;
  upperErrorP99Kind: string | null;
  calibrationOrigins: number | null;
}

const parsePredictionPoints = (value: unknown, expectedLength: number): ParsedPredictionPoint[] | null => {
  if (value === undefined || value === null) return null;
  if (!Array.isArray(value) || value.length !== expectedLength) {
    throw new Error(`带不确定性的预测点数量必须为 ${expectedLength}`);
  }

  return value.map((item, index) => {
    if (!isRecord(item) || !isFiniteNumber(item.prediction)) {
      throw new Error(`预测点第 ${index + 1} 项的预测值无效`);
    }
    if (!isFiniteNumber(item.std_dev) || item.std_dev < 0) {
      throw new Error(`预测点第 ${index + 1} 项的标准差必须是非负有限数字`);
    }
    if (!['model', 'empirical', 'fallback'].includes(String(item.uncertainty_source))) {
      throw new Error(`预测点第 ${index + 1} 项的不确定性来源无效`);
    }

    const hasInterval = [
      item.interval_lower,
      item.interval_upper,
      item.interval_level,
      item.interval_kind,
    ].some((field) => field !== undefined);
    if (hasInterval && (
      !isFiniteNumber(item.interval_lower)
      || !isFiniteNumber(item.interval_upper)
      || item.interval_lower > item.interval_upper
      || !isFiniteNumber(item.interval_level)
      || Math.abs(item.interval_level - 0.95) > 1e-9
      || typeof item.interval_kind !== 'string'
      || item.interval_kind.length === 0
    )) {
      throw new Error(`预测点第 ${index + 1} 项的预测区间无效`);
    }
    if (item.uncertainty_reason !== undefined && typeof item.uncertainty_reason !== 'string') {
      throw new Error(`预测点第 ${index + 1} 项的不确定性说明无效`);
    }
    if (item.calibration_source !== undefined && (
      typeof item.calibration_source !== 'string' || item.calibration_source.length === 0
    )) {
      throw new Error(`预测点第 ${index + 1} 项的校准数据来源无效`);
    }
    if (item.coverage_guarantee !== undefined && typeof item.coverage_guarantee !== 'boolean') {
      throw new Error(`预测点第 ${index + 1} 项的覆盖率保证标记无效`);
    }
    if (item.upper_error_p99_kind !== undefined && (
      typeof item.upper_error_p99_kind !== 'string' || item.upper_error_p99_kind.length === 0
    )) {
      throw new Error(`预测点第 ${index + 1} 项的99%上侧误差类型无效`);
    }
    if (item.calibration_origins !== undefined && (
      !Number.isInteger(item.calibration_origins) || (item.calibration_origins as number) <= 0
    )) {
      throw new Error(`预测点第 ${index + 1} 项的历史预测原点数无效`);
    }

    return {
      prediction: item.prediction,
      stdDev: item.std_dev,
      uncertaintySource: item.uncertainty_source as ParsedPredictionPoint['uncertaintySource'],
      uncertaintyReason: typeof item.uncertainty_reason === 'string' ? item.uncertainty_reason : null,
      calibrationSource: typeof item.calibration_source === 'string' ? item.calibration_source : null,
      intervalLower: hasInterval ? item.interval_lower as number : null,
      intervalUpper: hasInterval ? item.interval_upper as number : null,
      intervalLevel: hasInterval ? item.interval_level as number : null,
      intervalKind: hasInterval ? item.interval_kind as string : null,
      coverageGuarantee: typeof item.coverage_guarantee === 'boolean' ? item.coverage_guarantee : null,
      upperErrorP99Kind: typeof item.upper_error_p99_kind === 'string' ? item.upper_error_p99_kind : null,
      calibrationOrigins: typeof item.calibration_origins === 'number' ? item.calibration_origins : null,
    };
  });
};

export const parseModelMetrics = (value: unknown): ModelMetrics => {
  if (
    !isRecord(value)
    || !isFiniteNumber(value.rmse)
    || !isFiniteNumber(value.mae)
    || !isFiniteNumber(value.r2)
  ) {
    throw new Error('模型评估指标格式无效');
  }

  return { rmse: value.rmse, mae: value.mae, r2: value.r2 };
};

export const parseArimaOrder = (value: unknown): ArimaOrder => {
  if (!isRecord(value)) {
    throw new Error('ARIMA 最优阶数格式无效');
  }

  const isValidOrder = (order: unknown): order is number =>
    typeof order === 'number' && Number.isInteger(order) && order >= 0;
  if (!isValidOrder(value.p) || !isValidOrder(value.d) || !isValidOrder(value.q)) {
    throw new Error('ARIMA 最优阶数必须是非负整数');
  }

  return { p: value.p, d: value.d, q: value.q };
};

export const alignPredictionRows = ({
  actualValues,
  predictedValues,
  predictionPoints,
  backendMonths,
  fallbackMonths,
}: {
  actualValues: unknown;
  predictedValues: unknown;
  predictionPoints?: unknown;
  backendMonths: unknown;
  fallbackMonths: string[];
}): PredictionRow[] => {
  const actualArray = requireFiniteNumberArray(actualValues, '实际值');
  const predictedArray = requireFiniteNumberArray(predictedValues, '预测值');
  if (actualArray.length !== predictedArray.length) {
    throw new Error(`实际值与预测值数量不一致：${actualArray.length} / ${predictedArray.length}`);
  }
  const parsedPredictionPoints = parsePredictionPoints(predictionPoints, predictedArray.length);
  parsedPredictionPoints?.forEach((point, index) => {
    if (Math.abs(point.prediction - predictedArray[index]!) > 1e-9) {
      throw new Error(`预测值与带不确定性的预测点第 ${index + 1} 项不一致`);
    }
  });

  const backendMonthArray = Array.isArray(backendMonths) ? backendMonths : [];
  const hasAlignedBackendMonths =
    backendMonthArray.length === actualArray.length
    && backendMonthArray.every((month) => typeof month === 'string' && month.length > 0);

  const monthSource = hasAlignedBackendMonths ? backendMonthArray : fallbackMonths;
  const rows: PredictionRow[] = [];

  for (let index = 0; index < actualArray.length; index += 1) {
    const actual = actualArray[index];
    const predicted = predictedArray[index];
    const predictionPoint = parsedPredictionPoints?.[index] ?? null;

    const monthValue = monthSource[index];
    rows.push({
      date: typeof monthValue === 'string' && monthValue.length > 0 ? monthValue : `评估点${index + 1}`,
      actual: actual!,
      predicted: predicted!,
      ...(predictionPoint ? {
        stdDev: predictionPoint.stdDev,
        uncertaintySource: predictionPoint.uncertaintySource,
        uncertaintyReason: predictionPoint.uncertaintyReason,
        calibrationSource: predictionPoint.calibrationSource,
        intervalLower: predictionPoint.intervalLower,
        intervalUpper: predictionPoint.intervalUpper,
        intervalLevel: predictionPoint.intervalLevel,
        intervalKind: predictionPoint.intervalKind,
        coverageGuarantee: predictionPoint.coverageGuarantee,
        upperErrorP99Kind: predictionPoint.upperErrorP99Kind,
        calibrationOrigins: predictionPoint.calibrationOrigins,
      } : {}),
    });
  }

  return rows;
};
