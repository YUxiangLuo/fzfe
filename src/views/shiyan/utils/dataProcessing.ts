import type { MonthlySalesRecord } from '../data/historicalDatasets';

export const isBlankValue = (value: unknown): boolean => {
  if (value == null) return true;
  if (typeof value === 'number') return Number.isNaN(value) || !Number.isFinite(value);
  if (typeof value === 'string') return value.trim() === '';
  return false;
};

export const fillMissingMonths = (data: MonthlySalesRecord[]): MonthlySalesRecord[] => {
  if (data.length <= 1) return data;

  const result: MonthlySalesRecord[] = [];

  const parseMonth = (monthStr: string): Date => {
    const [year, month] = monthStr.split('-').map(Number);
    return new Date(year!, month! - 1, 1);
  };

  const formatMonth = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  const getNextMonth = (date: Date): Date => {
    const nextMonth = new Date(date);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return nextMonth;
  };

  result.push(data[0]!);

  for (let i = 1; i < data.length; i++) {
    const prevRecord = data[i - 1]!;
    const currentRecord = data[i]!;

    const prevDate = parseMonth(prevRecord.month);
    const currentDate = parseMonth(currentRecord.month);

    let checkDate = getNextMonth(prevDate);
    while (checkDate < currentDate) {
      result.push({
        month: formatMonth(checkDate),
        sales: null,
      });
      checkDate = getNextMonth(checkDate);
    }

    result.push(currentRecord);
  }

  return result;
};

export const hasBlankInRange = (
  data: MonthlySalesRecord[],
  startIndex: number,
  endIndex: number
): { hasBlank: boolean; blankMonths: string[] } => {
  const blankMonths: string[] = [];

  for (let i = startIndex; i <= endIndex && i < data.length; i++) {
    const record = data[i];
    if (!record || isBlankValue(record.month) || isBlankValue(record.sales)) {
      blankMonths.push(record?.month || '未知月份');
    }
  }

  return {
    hasBlank: blankMonths.length > 0,
    blankMonths,
  };
};
