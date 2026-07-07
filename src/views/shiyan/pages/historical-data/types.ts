export type HistoricalPeriod = 'all' | '12months' | '6months';
export type ChartType = 'line' | 'histogram' | 'bar' | 'scatter';

export interface ChartTypeOption {
  value: ChartType;
  label: string;
}

export const CHART_TYPES: ChartTypeOption[] = [
  { value: 'line', label: '折线图' },
  { value: 'histogram', label: '直方图' },
  { value: 'bar', label: '条形图' },
  { value: 'scatter', label: '散点图' },
];

export interface StatisticsData {
  variableName: string;
  count: number;
  sum: number;
  mean: number;
  max: number;
  min: number;
  variance: number;
  stdDev: number;
}

export interface HistogramBin {
  range: string;
  count: number;
  minValue: number;
}
