interface PredictionRow {
  date: string;
  actual: number;
  predicted: number;
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
  backendMonths,
  fallbackMonths,
}: {
  actualValues: unknown;
  predictedValues: unknown;
  backendMonths: unknown;
  fallbackMonths: string[];
}): PredictionRow[] => {
  const actualArray = requireFiniteNumberArray(actualValues, '实际值');
  const predictedArray = requireFiniteNumberArray(predictedValues, '预测值');
  if (actualArray.length !== predictedArray.length) {
    throw new Error(`实际值与预测值数量不一致：${actualArray.length} / ${predictedArray.length}`);
  }

  const backendMonthArray = Array.isArray(backendMonths) ? backendMonths : [];
  const hasAlignedBackendMonths =
    backendMonthArray.length === actualArray.length
    && backendMonthArray.every((month) => typeof month === 'string' && month.length > 0);

  const monthSource = hasAlignedBackendMonths ? backendMonthArray : fallbackMonths;
  const rows: PredictionRow[] = [];

  for (let index = 0; index < actualArray.length; index += 1) {
    const actual = actualArray[index];
    const predicted = predictedArray[index];

    const monthValue = monthSource[index];
    rows.push({
      date: typeof monthValue === 'string' && monthValue.length > 0 ? monthValue : `评估点${index + 1}`,
      actual: actual!,
      predicted: predicted!,
    });
  }

  return rows;
};

export type { PredictionRow };
