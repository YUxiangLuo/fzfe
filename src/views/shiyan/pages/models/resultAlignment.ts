interface PredictionRow {
  date: string;
  actual: number;
  predicted: number;
}

const isFiniteNumber = (value: unknown): value is number => {
  return typeof value === 'number' && Number.isFinite(value);
};

const getArray = (value: unknown): unknown[] => {
  return Array.isArray(value) ? value : [];
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
  const actualArray = getArray(actualValues);
  const predictedArray = getArray(predictedValues);
  const backendMonthArray = getArray(backendMonths);

  const monthSource =
    backendMonthArray.length === actualArray.length && backendMonthArray.length === predictedArray.length
      ? backendMonthArray
      : fallbackMonths;

  const rowCount = Math.min(actualArray.length, predictedArray.length, monthSource.length || Number.MAX_SAFE_INTEGER);
  const rows: PredictionRow[] = [];

  for (let index = 0; index < rowCount; index += 1) {
    const actual = actualArray[index];
    const predicted = predictedArray[index];

    if (!isFiniteNumber(actual) || !isFiniteNumber(predicted)) {
      continue;
    }

    const monthValue = monthSource[index];
    rows.push({
      date: typeof monthValue === 'string' && monthValue.length > 0 ? monthValue : `评估点${index + 1}`,
      actual,
      predicted,
    });
  }

  return rows;
};

export type { PredictionRow };