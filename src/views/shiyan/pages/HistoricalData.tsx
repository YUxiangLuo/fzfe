import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExperiment } from '../contexts/ExperimentContext';
import { BarChart3, Calendar, Info, ArrowRight, Loader2, AlertTriangle, Download, X } from 'lucide-react';
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
import type { MonthlySalesRecord } from '../data/historicalDatasets';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Common/Toast';
import { ROUTES } from '../constants/routes';

// 常量配置
const CURRENT_STEP = 4;
const NEXT_STEP = 5;
const MIN_DATA_MONTHS = 24;
const HISTOGRAM_BINS = 10;

const PATHS = {
  PREVIOUS: ROUTES.PRODUCT,
  NEXT: ROUTES.MODEL,
} as const;

// 图表类型
type ChartType = 'line' | 'histogram' | 'bar' | 'scatter';

interface ChartTypeOption {
  value: ChartType;
  label: string;
}

const CHART_TYPES: ChartTypeOption[] = [
  { value: 'line', label: '折线图' },
  { value: 'histogram', label: '直方图' },
  { value: 'bar', label: '条形图' },
  { value: 'scatter', label: '散点图' },
];

// 统计数据接口
interface StatisticsData {
  variableName: string;
  count: number;
  sum: number;
  mean: number;
  max: number;
  min: number;
  variance: number;
  stdDev: number;
}

// 直方图数据接口
interface HistogramBin {
  range: string;
  count: number;
  minValue: number;
}

const HistoricalData: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const {
    state,
    updateState,
    productSalesData,
    isLoadingSales,
    salesDataError,
    loadProductSalesData,
    recordStepEvent,
  } = useExperiment();
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | '12months' | '6months'>('all');
  const [chartType, setChartType] = useState<ChartType>('line');
  const [showBlankDataDialog, setShowBlankDataDialog] = useState(false);
  const [hasBlankData, setHasBlankData] = useState(false);
  const [blankMonths, setBlankMonths] = useState<string[]>([]);
  const chartRef = useRef<HTMLDivElement>(null);

  const { selected_industry, selected_company, selected_product } = state;
  const hasRecordedStartRef = useRef(false);
  const prevHighestStepRef = useRef(state.highest_completed_step);
  const hasCheckedBlankData = useRef(false);
  const [processedSalesData, setProcessedSalesData] = useState<typeof productSalesData>(null);

  // 加载产品销售数据
  useEffect(() => {
    if (
      productSalesData ||
      isLoadingSales ||
      salesDataError ||
      !selected_industry ||
      !selected_company ||
      !selected_product
    ) {
      return;
    }
    void loadProductSalesData(selected_industry, selected_company, selected_product);
  }, [
    productSalesData,
    isLoadingSales,
    salesDataError,
    loadProductSalesData,
    selected_industry,
    selected_company,
    selected_product,
  ]);

  // 填充缺失月份的函数
  const fillMissingMonths = (data: MonthlySalesRecord[]): MonthlySalesRecord[] => {
    if (data.length <= 1) return data;

    const result: MonthlySalesRecord[] = [];

    // 解析月份字符串为 Date 对象
    const parseMonth = (monthStr: string): Date => {
      const [year, month] = monthStr.split('-').map(Number);
      return new Date(year!, month! - 1, 1);
    };

    // 格式化日期为 YYYY-MM 字符串
    const formatMonth = (date: Date): string => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      return `${year}-${month}`;
    };

    // 获取下一个月
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

      // 检查是否需要填充月份
      let checkDate = getNextMonth(prevDate);
      while (checkDate < currentDate) {
        // 插入缺失的月份
        result.push({
          month: formatMonth(checkDate),
          sales: null as any, // 缺失月份的销量设为 null
        });
        checkDate = getNextMonth(checkDate);
      }

      result.push(currentRecord);
    }

    return result;
  };

  // 处理销售数据：填充缺失月份
  useEffect(() => {
    if (productSalesData) {
      const monthlySales = productSalesData.monthlySales || [];
      const filledData = fillMissingMonths([...monthlySales]);

      setProcessedSalesData({
        ...productSalesData,
        monthlySales: filledData,
      });

      // 重置空白数据检测标志，以便重新检测
      hasCheckedBlankData.current = false;
    } else {
      // 如果原始数据为空，也重置处理后的数据
      setProcessedSalesData(null);
      hasCheckedBlankData.current = false;
    }
  }, [productSalesData]);

  // 记录步骤开始事件
  useEffect(() => {
    if (state.highest_completed_step < prevHighestStepRef.current) {
      hasRecordedStartRef.current = false;
    }
    prevHighestStepRef.current = state.highest_completed_step;

    if (CURRENT_STEP > state.highest_completed_step && !hasRecordedStartRef.current) {
      recordStepEvent(CURRENT_STEP, 'STARTED');
      hasRecordedStartRef.current = true;
    }
  }, [state.highest_completed_step, recordStepEvent]);

  // 检测空白数据（使用处理后的数据）
  useEffect(() => {
    if (processedSalesData && !hasCheckedBlankData.current) {
      const monthlySales = processedSalesData.monthlySales || [];

      // 收集所有有空白值的月份
      const blanks: string[] = [];
      monthlySales.forEach((record) => {
        // 防御性检查：record 本身为 null/undefined
        if (!record) {
          blanks.push('未知月份');
          return;
        }

        // 检查月份是否为空白
        const isMonthBlank =
          record.month == null ||
          record.month === '' ||
          record.month.trim() === ''; // 处理空格字符串

        // 检查销量是否为空白或无效
        const isSalesBlank =
          record.sales == null ||
          isNaN(record.sales) ||
          !isFinite(record.sales); // 检测 Infinity/-Infinity

        if (isMonthBlank || isSalesBlank) {
          blanks.push(record.month?.trim() || '未知月份');
        }
      });

      const hasBlank = blanks.length > 0;
      setHasBlankData(hasBlank);
      setBlankMonths(blanks);

      if (hasBlank) {
        setShowBlankDataDialog(true);
      }
      hasCheckedBlankData.current = true;
    }
  }, [processedSalesData]);

  const activeDataset = processedSalesData;
  const monthlySales = activeDataset?.monthlySales ?? [];
  const totalMonths = monthlySales.length;

  // 筛选数据
  const filteredData = useMemo(() => {
    if (!activeDataset) return [];
    switch (selectedPeriod) {
      case '6months':
        return activeDataset.monthlySales.slice(-6);
      case '12months':
        return activeDataset.monthlySales.slice(-12);
      default:
        return activeDataset.monthlySales;
    }
  }, [activeDataset, selectedPeriod]);

  // 计算统计数据（过滤掉空白值）
  const statistics = useMemo((): StatisticsData | null => {
    if (filteredData.length === 0) return null;

    // 过滤掉 null 和 NaN 值
    const salesValues = filteredData
      .map((d) => d.sales)
      .filter((val) => val != null && !isNaN(val));

    if (salesValues.length === 0) return null;

    const count = salesValues.length;
    const sum = salesValues.reduce((acc, val) => acc + val, 0);
    const mean = sum / count;
    const max = Math.max(...salesValues);
    const min = Math.min(...salesValues);

    // 计算方差
    const variance = salesValues.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / count;
    const stdDev = Math.sqrt(variance);

    return {
      variableName: '月销量',
      count,
      sum,
      mean,
      max,
      min,
      variance,
      stdDev,
    };
  }, [filteredData]);

  // 生成直方图数据（过滤掉空白值）
  const histogramData = useMemo((): HistogramBin[] => {
    if (!statistics || filteredData.length === 0) return [];

    const { min, max } = statistics;
    const range = max - min;
    const binWidth = range / HISTOGRAM_BINS;

    // 初始化bins
    const bins: HistogramBin[] = [];
    for (let i = 0; i < HISTOGRAM_BINS; i++) {
      const binMin = min + i * binWidth;
      const binMax = min + (i + 1) * binWidth;
      bins.push({
        range: `${Math.round(binMin)}-${Math.round(binMax)}`,
        count: 0,
        minValue: binMin,
      });
    }

    // 填充数据到bins（过滤空白值）
    filteredData.forEach((record) => {
      if (record.sales != null && !isNaN(record.sales)) {
        const binIndex = Math.min(
          Math.floor((record.sales - min) / binWidth),
          HISTOGRAM_BINS - 1
        );
        bins[binIndex]!.count++;
      }
    });

    return bins;
  }, [filteredData, statistics]);

  // 散点图数据（添加索引作为x轴）
  const scatterData = useMemo(() => {
    return filteredData.map((record, index) => ({
      index: index + 1,
      month: record.month,
      sales: record.sales,
    }));
  }, [filteredData]);

  const handleNext = () => {
    updateState({
      highest_completed_step: CURRENT_STEP,
      current_step: NEXT_STEP,
    });
    navigate(PATHS.NEXT);
  };

  // 保存图表为图片
  const handleSaveChart = () => {
    if (!chartRef.current) return;

    try {
      // 查找所有 SVG 元素，找到最大的那个（主图表）
      const allSvgs = chartRef.current.querySelectorAll('svg');
      if (allSvgs.length === 0) {
        toast.showToast('未找到图表元素', 'error');
        return;
      }

      // 找到最大的 SVG（通常是主图表）
      let largestSvg: SVGElement | null = null;
      let maxArea = 0;
      allSvgs.forEach((svg) => {
        const svgEl = svg as SVGElement;
        const area = svgEl.clientWidth * svgEl.clientHeight;
        if (area > maxArea) {
          maxArea = area;
          largestSvg = svgEl;
        }
      });

      if (!largestSvg) {
        toast.showToast('未找到图表元素', 'error');
        return;
      }

      // 确保 TypeScript 知道 largestSvg 不为 null
      const svgToSave: SVGElement = largestSvg;

      // 克隆 SVG 以避免修改原始元素
      const clonedSvg = svgToSave.cloneNode(true) as SVGElement;

      // 设置 SVG 的 xmlns 属性（确保独立性）
      clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

      // 获取 SVG 的尺寸
      clonedSvg.setAttribute('width', svgToSave.clientWidth.toString());
      clonedSvg.setAttribute('height', svgToSave.clientHeight.toString());

      // 将 SVG 转换为字符串
      const svgData = new XMLSerializer().serializeToString(clonedSvg);

      // 创建 Blob
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });

      // 创建下载链接
      const url = URL.createObjectURL(svgBlob);
      const downloadLink = document.createElement('a');
      downloadLink.href = url;

      // 生成文件名
      const productName = activeDataset?.meta.name || '产品';
      const timestamp = new Date().toISOString().slice(0, 10);
      const chartTypeLabel = CHART_TYPES.find(t => t.value === chartType)?.label || '图表';
      downloadLink.download = `${productName}_${chartTypeLabel}_${timestamp}.svg`;

      // 触发下载
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      // 清理 URL 对象
      URL.revokeObjectURL(url);
      toast.showToast('图表已保存', 'success');
    } catch (error) {
      console.error('保存图表失败:', error);
      toast.showToast('保存图表失败，请重试', 'error');
    }
  };

  // 渲染图表
  const renderChart = () => {
    const productInfo = activeDataset?.meta;
    if (!productInfo) return null;

    const commonProps = {
      margin: { top: 10, right: 30, left: 0, bottom: 0 },
    };

    switch (chartType) {
      case 'line':
        return (
          <LineChart data={filteredData} {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} angle={-15} textAnchor="end" height={60} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => value.toLocaleString()} />
            <Tooltip
              formatter={(value: number) => [`${value.toLocaleString()} ${productInfo.unit}`, '销量']}
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
              formatter={(value: number) => [`${value} 个月`, '频数']}
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
              formatter={(value: number) => [`${value.toLocaleString()} ${productInfo.unit}`, '销量']}
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
              formatter={(value: number, name: string) => {
                if (name === '销量') return [`${value.toLocaleString()} ${productInfo.unit}`, name];
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

  if (isLoadingSales) {
    return (
      <div className="p-8 flex justify-center items-center h-96">
        <div className="text-center text-gray-500">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p>正在加载历史销量数据...</p>
        </div>
      </div>
    );
  }

  if (salesDataError) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-center">
          <h3 className="font-bold">数据加载失败</h3>
          <p>{salesDataError}</p>
        </div>
      </div>
    );
  }

  if (!activeDataset || monthlySales.length === 0) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-lg text-center">
          <h3 className="font-bold">暂无数据</h3>
          <p>未找到该产品的历史销量数据。</p>
        </div>
      </div>
    );
  }

  const productInfo = activeDataset.meta;

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* 标题和产品信息 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">步骤 {CURRENT_STEP}: 历史数据分析</h1>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Info className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-800">分析产品：{productInfo.name}</span>
            </div>
            <p className="text-blue-700">{productInfo.description}</p>
          </div>
        </div>

        {/* 统计性表格 */}
        {statistics && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">统计性表格</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-700">变量名</th>
                    <th className="border border-gray-300 px-4 py-3 text-right font-semibold text-gray-700">观测数量</th>
                    <th className="border border-gray-300 px-4 py-3 text-right font-semibold text-gray-700">总和</th>
                    <th className="border border-gray-300 px-4 py-3 text-right font-semibold text-gray-700">均值</th>
                    <th className="border border-gray-300 px-4 py-3 text-right font-semibold text-gray-700">最大值</th>
                    <th className="border border-gray-300 px-4 py-3 text-right font-semibold text-gray-700">最小值</th>
                    <th className="border border-gray-300 px-4 py-3 text-right font-semibold text-gray-700">方差</th>
                    <th className="border border-gray-300 px-4 py-3 text-right font-semibold text-gray-700">标准差</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="hover:bg-gray-50">
                    <td className="border border-gray-300 px-4 py-3 font-medium text-gray-900">{statistics.variableName}</td>
                    <td className="border border-gray-300 px-4 py-3 text-right text-gray-700">{statistics.count}</td>
                    <td className="border border-gray-300 px-4 py-3 text-right text-gray-700">{statistics.sum.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    <td className="border border-gray-300 px-4 py-3 text-right text-gray-700">{statistics.mean.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    <td className="border border-gray-300 px-4 py-3 text-right text-gray-700">{statistics.max.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    <td className="border border-gray-300 px-4 py-3 text-right text-gray-700">{statistics.min.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    <td className="border border-gray-300 px-4 py-3 text-right text-gray-700">{statistics.variance.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                    <td className="border border-gray-300 px-4 py-3 text-right text-gray-700">{statistics.stdDev.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 图表区域 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 flex items-center">
              <BarChart3 className="w-6 h-6 mr-3 text-blue-600" />
              数据可视化图表
            </h2>
            <div className="flex items-center gap-4">
              {/* 时间段选择器 */}
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value as typeof selectedPeriod)}
                className="border border-gray-300 rounded-lg px-4 py-2 bg-white"
              >
                <option value="all">全部 ({totalMonths}个月)</option>
                {totalMonths >= 12 && <option value="12months">近12个月</option>}
                {totalMonths >= 6 && <option value="6months">近6个月</option>}
              </select>

              {/* 图表类型选择器 */}
              <select
                value={chartType}
                onChange={(e) => setChartType(e.target.value as ChartType)}
                className="border border-gray-300 rounded-lg px-4 py-2 bg-white"
              >
                {CHART_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>

              {/* 保存按钮 */}
              <button
                onClick={handleSaveChart}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>保存图表</span>
              </button>
            </div>
          </div>

          {/* 图表说明 */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600">
              {chartType === 'line' && '折线图：展示销量随时间的变化趋势'}
              {chartType === 'histogram' && '直方图：展示销量数据的分布情况（频数统计）'}
              {chartType === 'bar' && '条形图：展示每个月份的销量对比'}
              {chartType === 'scatter' && '散点图：展示销量数据的离散分布'}
            </p>
          </div>

          {/* 图表渲染区域 */}
          <div ref={chartRef} className="h-96 bg-gray-50 rounded-lg p-4">
            <ResponsiveContainer width="100%" height="100%">
              {renderChart()}
            </ResponsiveContainer>
          </div>
        </div>

        {/* 导航按钮 */}
        <div className="flex justify-between">
          <button
            onClick={() => navigate(PATHS.PREVIOUS)}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            上一步
          </button>
          <button
            onClick={handleNext}
            className="flex items-center space-x-2 px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md"
          >
            <span>下一步：需求预测</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 空白数据提示弹窗 */}
      {showBlankDataDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">
            <div className="bg-gradient-to-r from-yellow-500 to-orange-600 px-6 py-5 flex items-center justify-between">
              <h3 className="text-2xl font-bold text-white">检测到空白数据</h3>
              <button
                onClick={() => setShowBlankDataDialog(false)}
                className="text-white hover:bg-white/20 rounded-lg p-1 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-yellow-800 font-medium mb-2">⚠️ 重要提示</p>
                <p className="text-yellow-700 text-sm">
                  系统检测到数据中存在 <strong>{blankMonths.length}</strong> 个月份的空白值（缺失数据）。
                </p>
              </div>

              {/* 显示空白月份列表 */}
              <div className="mb-4 p-4 bg-gray-50 border border-gray-200 rounded-lg max-h-40 overflow-y-auto">
                <h4 className="font-semibold text-gray-900 mb-2">空白月份：</h4>
                <div className="flex flex-wrap gap-2">
                  {blankMonths.map((month, index) => (
                    <span
                      key={index}
                      className="inline-block px-3 py-1 bg-red-100 text-red-700 rounded-md text-sm font-medium"
                    >
                      {month}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-3 mb-6">
                <h4 className="font-semibold text-gray-900">空白数据说明：</h4>
                <ul className="space-y-2 text-sm text-gray-700">
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>空白数据可以正常导入和查看</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>空白数据<strong>不能用于需求预测</strong></span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>建议先进行数据清洗或填补缺失值后再进行预测分析</span>
                  </li>
                </ul>
              </div>

              <button
                onClick={() => setShowBlankDataDialog(false)}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
              >
                我已了解
              </button>
            </div>
          </div>
        </div>
      )}

      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={toast.hideToast}
      />
    </div>
  );
};

export default HistoricalData;
