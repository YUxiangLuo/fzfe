interface PredictionRow {
  date: string;
  actual: number;
  predicted: number;
  stdDev?: number;
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
  standardDeviations,
  backendMonths,
  fallbackMonths,
}: {
  actualValues: unknown;
  predictedValues: unknown;
  standardDeviations?: unknown;
  backendMonths: unknown;
  fallbackMonths: string[];
}): PredictionRow[] => {
  const actualArray = getArray(actualValues);
  const predictedArray = getArray(predictedValues);
  const stdDevArray = getArray(standardDeviations);
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
    const row: PredictionRow = {
      date: typeof monthValue === 'string' && monthValue.length > 0 ? monthValue : `评估点${index + 1}`,
      actual,
      predicted,
    };
    const stdDev = stdDevArray[index];
    if (isFiniteNumber(stdDev) && stdDev >= 0) {
      row.stdDev = stdDev;
    }
    rows.push(row);
  }

  return rows;
};

export type { PredictionRow };
