import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExperiment } from '../contexts/ExperimentContext.zustand';
import { BarChart3, Calendar, Info, ArrowRight, Loader2, AlertTriangle, Download, X, Table, Settings } from 'lucide-react';
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
import { useToast } from '../shared/hooks/useToast';
import { Toast } from '../shared/components/common/Toast';
import { ROUTES } from '../constants/routes';
import Button from '../shared/components/common/Button';
import { fillMissingMonths, isBlankValue } from '../utils/dataProcessing';
import { useStepStartRecorder } from '../hooks/useStepStartRecorder';

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
  const { toast, showToast, hideToast } = useToast();
  const {
    state,
    updateState,
    productSalesData,
    isLoadingSales,
    salesDataError,
    loadProductSalesData,
    recordStepEvent,
    isSubmitting,
    setIsSubmitting,
  } = useExperiment();
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | '12months' | '6months'>('all');
  const [chartType, setChartType] = useState<ChartType>('line');
  const [showBlankDataDialog, setShowBlankDataDialog] = useState(false);
  const [hasBlankData, setHasBlankData] = useState(false);
  const [blankMonths, setBlankMonths] = useState<string[]>([]);
  const chartRef = useRef<HTMLDivElement>(null);

  // CSV数据表格相关状态
  const [visibleColumns, setVisibleColumns] = useState<Set<number>>(new Set());
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const columnSelectorRef = useRef<HTMLDivElement>(null);

  const { selected_industry, selected_company, selected_product } = state;
  const hasCheckedBlankData = useRef(false);
  const [processedSalesData, setProcessedSalesData] = useState<typeof productSalesData>(null);
  useStepStartRecorder(CURRENT_STEP, state.highest_completed_step, recordStepEvent);

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

  // 初始化可见列（默认显示所有列）
  useEffect(() => {
    if (processedSalesData?.csvData && processedSalesData.csvData.length > 0) {
      const headers = processedSalesData.csvData[0];
      if (headers && visibleColumns.size === 0) {
        setVisibleColumns(new Set(headers.map((_, index) => index)));
      }
    }
  }, [processedSalesData?.csvData]);

  // 点击外部关闭列选择器
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (columnSelectorRef.current && !columnSelectorRef.current.contains(event.target as Node)) {
        setShowColumnSelector(false);
      }
    };

    if (showColumnSelector) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showColumnSelector]);

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
        const isMonthBlank = isBlankValue(record.month);

        const isSalesBlank = isBlankValue(record.sales);

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
      .filter((val): val is number => val != null && !Number.isNaN(val));

    if (salesValues.length === 0) return null;

    const count = salesValues.length;
    const sum = salesValues.reduce((acc, val) => acc + val, 0);
    const mean = sum / count;
    const max = Math.max(...salesValues);
    const min = Math.min(...salesValues);

    // 计算样本方差（使用贝塞尔校正，除以 n-1）
    // 当只有一个数据点时，方差为 0
    const variance = count > 1
      ? salesValues.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (count - 1)
      : 0;
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
    const validSalesValues = filteredData
      .map((record) => record.sales)
      .filter((sales): sales is number => sales != null && !Number.isNaN(sales));

    // 全部销量相同时，直方图退化为单个桶，避免除以0导致索引异常。
    if (range === 0) {
      return [{
        range: `${Math.round(min)}`,
        count: validSalesValues.length,
        minValue: min,
      }];
    }

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
    validSalesValues.forEach((sales) => {
      const binIndex = Math.min(
        Math.floor((sales - min) / binWidth),
        HISTOGRAM_BINS - 1
      );
      bins[binIndex]!.count++;
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

  const handleNext = async () => {
    setIsSubmitting(true);
    try {
      // A small delay is kept to ensure the UI has a chance to show the loading state
      // before the synchronous state updates and navigation potentially block the main thread.
      await new Promise(resolve => setTimeout(resolve, 50));
      await updateState({
        highest_completed_step: CURRENT_STEP,
        current_step: NEXT_STEP,
      }, { throwOnSyncError: true });
      navigate(PATHS.NEXT);
    } catch (error) {
      console.error('Failed to update step state:', error);
      showToast('保存进度失败，请重试', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 切换列的可见性
  const toggleColumn = (columnIndex: number) => {
    setVisibleColumns(prev => {
      const newSet = new Set(prev);
      if (newSet.has(columnIndex)) {
        newSet.delete(columnIndex);
      } else {
        newSet.add(columnIndex);
      }
      return newSet;
    });
  };

  // 全选/取消全选
  const toggleAllColumns = () => {
    if (!activeDataset?.csvData || activeDataset.csvData.length === 0) return;
    const headers = activeDataset.csvData[0];
    if (!headers) return;

    if (visibleColumns.size === headers.length) {
      // 全部取消选择
      setVisibleColumns(new Set());
    } else {
      // 全部选择
      setVisibleColumns(new Set(headers.map((_, index) => index)));
    }
  };

  // 下载CSV数据
  const handleDownloadCSV = () => {
    if (!activeDataset?.csvData || activeDataset.csvData.length === 0) {
      showToast('没有可下载的数据', 'error');
      return;
    }

    try {
      const headers = activeDataset.csvData[0];
      if (!headers) return;

      // 过滤可见列
      const filteredData = activeDataset.csvData.map(row =>
        row.filter((_, index) => visibleColumns.has(index))
      );

      // 转换为CSV格式
      const csvContent = filteredData
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');

      // 创建Blob并下载
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const productName = activeDataset.meta.name || '产品';
      const timestamp = new Date().toISOString().slice(0, 10);
      link.download = `${productName}_原始数据_${timestamp}.csv`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast('CSV文件已下载', 'success');
    } catch (error) {
      console.error('下载CSV失败:', error);
      showToast('下载失败，请重试', 'error');
    }
  };

  // 保存图表为图片
  const handleSaveChart = () => {
    if (!chartRef.current) return;

    try {
      // 查找所有 SVG 元素，找到最大的那个（主图表）
      const allSvgs = chartRef.current.querySelectorAll('svg');
      if (allSvgs.length === 0) {
        showToast('未找到图表元素', 'error');
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
        showToast('未找到图表元素', 'error');
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
      showToast('图表已保存', 'success');
    } catch (error) {
      console.error('保存图表失败:', error);
      showToast('保存图表失败，请重试', 'error');
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
    const canRetryLoadSales = !!selected_industry && !!selected_company && !!selected_product;
    const handleRetryLoadSales = () => {
      if (!selected_industry || !selected_company || !selected_product) {
        return;
      }
      void loadProductSalesData(selected_industry, selected_company, selected_product);
    };

    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-center space-y-3">
          <h3 className="font-bold">数据加载失败</h3>
          <p>{salesDataError}</p>
          <Button
            onClick={handleRetryLoadSales}
            variant="outline"
            disabled={!canRetryLoadSales || isLoadingSales}
          >
            重试加载
          </Button>
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

        {/* 原始CSV数据表格 */}
        {activeDataset?.csvData && activeDataset.csvData.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <Table className="w-6 h-6 mr-3 text-green-600" />
                原始数据表格
              </h2>
              <div className="flex items-center gap-3">
                {/* 列选择按钮 */}
                <div className="relative" ref={columnSelectorRef}>
                  <button
                    onClick={() => setShowColumnSelector(!showColumnSelector)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    <span>选择列 ({visibleColumns.size}/{activeDataset.csvData[0]?.length || 0})</span>
                  </button>

                  {/* 列选择下拉面板 */}
                  {showColumnSelector && (
                    <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-96 overflow-y-auto">
                      <div className="p-3 border-b border-gray-200 flex justify-between items-center">
                        <span className="font-medium text-gray-900">选择要显示的列</span>
                        <button
                          onClick={toggleAllColumns}
                          className="text-sm text-blue-600 hover:text-blue-700"
                        >
                          {visibleColumns.size === activeDataset.csvData[0]?.length ? '取消全选' : '全选'}
                        </button>
                      </div>
                      <div className="p-2">
                        {activeDataset.csvData[0]?.map((header, index) => (
                          <label
                            key={index}
                            className="flex items-center px-3 py-2 hover:bg-gray-50 rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={visibleColumns.has(index)}
                              onChange={() => toggleColumn(index)}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                            />
                            <span className="ml-3 text-sm text-gray-700">{header}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 下载CSV按钮 */}
                <button
                  onClick={handleDownloadCSV}
                  disabled={visibleColumns.size === 0}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                    visibleColumns.size === 0
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  <Download className="w-4 h-4" />
                  <span>下载CSV</span>
                </button>
              </div>
            </div>

            {/* 数据表格 */}
            {visibleColumns.size > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-gradient-to-r from-green-50 to-blue-50">
                      {activeDataset.csvData[0]?.map((header, index) =>
                        visibleColumns.has(index) ? (
                          <th
                            key={index}
                            className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700 whitespace-nowrap"
                          >
                            {header}
                          </th>
                        ) : null
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {activeDataset.csvData.slice(1).map((row, rowIndex) => (
                      <tr key={rowIndex} className="hover:bg-gray-50">
                        {row.map((cell, cellIndex) =>
                          visibleColumns.has(cellIndex) ? (
                            <td
                              key={cellIndex}
                              className="border border-gray-300 px-3 py-2 text-gray-700"
                            >
                              {cell}
                            </td>
                          ) : null
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Info className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>请至少选择一列以显示数据</p>
              </div>
            )}
          </div>
        )}



        {/* 导航按钮 */}
        <div className="flex justify-between">
          <button
            onClick={() => navigate(PATHS.PREVIOUS)}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isSubmitting}
          >
            上一步
          </button>
          <Button
            onClick={handleNext}
            isLoading={isSubmitting}
            disabled={isSubmitting}
            size="lg"
          >
            <span>下一步：需求预测</span>
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
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

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}
    </div>
  );
};

export default HistoricalData;
