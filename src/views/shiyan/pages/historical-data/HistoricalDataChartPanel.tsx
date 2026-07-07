import type { RefObject } from 'react';
import { BarChart3, Download } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';
import type { ProductSalesData } from '../../store/experiment/types';
import { CHART_TYPES, type ChartType, type HistoricalPeriod, type HistogramBin } from './types';

interface ScatterPoint {
  index: number;
  month: string;
  sales: number | null;
}

interface HistoricalDataChartPanelProps {
  chartRef: RefObject<HTMLDivElement | null>;
  chartType: ChartType;
  filteredData: ProductSalesData['monthlySales'];
  histogramData: HistogramBin[];
  productInfo: ProductSalesData['meta'];
  scatterData: ScatterPoint[];
  selectedPeriod: HistoricalPeriod;
  totalMonths: number;
  onChartTypeChange: (chartType: ChartType) => void;
  onSaveChart: () => void;
  onSelectedPeriodChange: (period: HistoricalPeriod) => void;
}

export function HistoricalDataChartPanel({
  chartRef,
  chartType,
  filteredData,
  histogramData,
  productInfo,
  scatterData,
  selectedPeriod,
  totalMonths,
  onChartTypeChange,
  onSaveChart,
  onSelectedPeriodChange,
}: HistoricalDataChartPanelProps) {
  const commonProps = {
    margin: { top: 10, right: 30, left: 0, bottom: 0 },
  };

  const renderChart = () => {
    switch (chartType) {
      case 'line':
        return (
          <LineChart data={filteredData} {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} angle={-15} textAnchor="end" height={60} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => value.toLocaleString()} />
            <Tooltip
              formatter={(value) => [`${Number(value).toLocaleString()} ${productInfo.unit}`, '销量']}
              labelFormatter={(label) => `${label} 月度销量`}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="sales"
              name={`${productInfo.name} 月销量`}
              stroke="#2563eb"
              strokeWidth={3}
              dot={{ r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        );

      case 'histogram':
        return (
          <BarChart data={histogramData} {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="range" tick={{ fontSize: 12 }} angle={-15} textAnchor="end" height={60} />
            <YAxis tick={{ fontSize: 12 }} label={{ value: '频数', angle: -90, position: 'insideLeft' }} />
            <Tooltip
              formatter={(value) => [`${value} 个月`, '频数']}
              labelFormatter={(label) => `销量区间: ${label}`}
            />
            <Legend />
            <Bar dataKey="count" name="频数分布" fill="#3b82f6" />
          </BarChart>
        );

      case 'bar':
        return (
          <BarChart data={filteredData} {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} angle={-15} textAnchor="end" height={60} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => value.toLocaleString()} />
            <Tooltip
              formatter={(value) => [`${Number(value).toLocaleString()} ${productInfo.unit}`, '销量']}
              labelFormatter={(label) => `${label} 月度销量`}
            />
            <Legend />
            <Bar dataKey="sales" name={`${productInfo.name} 月销量`} fill="#10b981">
              {filteredData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={`hsl(${(index * 360) / filteredData.length}, 70%, 50%)`} />
              ))}
            </Bar>
          </BarChart>
        );

      case 'scatter':
        return (
          <ScatterChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              type="number"
              dataKey="index"
              name="序号"
              tick={{ fontSize: 12 }}
              label={{ value: '月份序号', position: 'insideBottom', offset: -5 }}
            />
            <YAxis
              type="number"
              dataKey="sales"
              name="销量"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => value.toLocaleString()}
            />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              formatter={(value, name) => {
                if (name === '销量') return [`${Number(value).toLocaleString()} ${productInfo.unit}`, name];
                return [value, name];
              }}
              labelFormatter={(value, payload) => {
                const data = payload?.[0]?.payload;
                return data ? `${data.month} (第${data.index}个月)` : '';
              }}
            />
            <Legend />
            <Scatter name={`${productInfo.name} 月销量`} data={scatterData} fill="#8b5cf6" />
          </ScatterChart>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-gray-900 flex items-center">
          <BarChart3 className="w-6 h-6 mr-3 text-blue-600" />
          数据可视化图表
        </h2>
        <div className="flex items-center gap-4">
          <select
            value={selectedPeriod}
            onChange={(e) => onSelectedPeriodChange(e.target.value as HistoricalPeriod)}
            className="border border-gray-300 rounded-lg px-4 py-2 bg-white"
          >
            <option value="all">全部 ({totalMonths}个月)</option>
            {totalMonths >= 12 && <option value="12months">近12个月</option>}
            {totalMonths >= 6 && <option value="6months">近6个月</option>}
          </select>

          <select
            value={chartType}
            onChange={(e) => onChartTypeChange(e.target.value as ChartType)}
            className="border border-gray-300 rounded-lg px-4 py-2 bg-white"
          >
            {CHART_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>

          <button
            onClick={onSaveChart}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>保存图表</span>
          </button>
        </div>
      </div>

      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600">
          {chartType === 'line' && '折线图：展示销量随时间的变化趋势'}
          {chartType === 'histogram' && '直方图：展示销量数据的分布情况（频数统计）'}
          {chartType === 'bar' && '条形图：展示每个月份的销量对比'}
          {chartType === 'scatter' && '散点图：展示销量数据的离散分布'}
        </p>
      </div>

      <div ref={chartRef} className="h-96 bg-gray-50 rounded-lg p-4">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
