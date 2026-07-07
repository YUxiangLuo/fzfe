import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExperiment } from '../contexts/ExperimentContext.zustand';
import { Info, ArrowRight, Loader2 } from 'lucide-react';
import { useToast } from '../shared/hooks/useToast';
import { Toast } from '../shared/components/common/Toast';
import { ROUTES } from '../constants/routes';
import Button from '../shared/components/common/Button';
import { fillMissingMonths, isBlankValue } from '../utils/dataProcessing';
import { useStepStartRecorder } from '../hooks/useStepStartRecorder';
import type { ProductSalesData } from '../store/experiment/types';
import { BlankDataDialog } from './historical-data/BlankDataDialog';
import { HistoricalDataChartPanel } from './historical-data/HistoricalDataChartPanel';
import { HistoricalDataCsvTable } from './historical-data/HistoricalDataCsvTable';
import { HistoricalDataStatisticsTable } from './historical-data/HistoricalDataStatisticsTable';
import { CHART_TYPES, type ChartType, type HistogramBin, type HistoricalPeriod, type StatisticsData } from './historical-data/types';

// 常量配置
const CURRENT_STEP = 4;
const NEXT_STEP = 5;
const HISTOGRAM_BINS = 10;

const PATHS = {
  PREVIOUS: ROUTES.PRODUCT,
  NEXT: ROUTES.MODEL,
} as const;

const HistoricalData: React.FC = () => {
  const navigate = useNavigate();
  const { toast, showToast, hideToast } = useToast();
  const {
    state,
    ui,
    updateState,
    productSalesData,
    loadProductSalesData,
    recordStepEvent,
    setIsSubmitting,
  } = useExperiment();
  const [selectedPeriod, setSelectedPeriod] = useState<HistoricalPeriod>('all');
  const [chartType, setChartType] = useState<ChartType>('line');
  const [showBlankDataDialog, setShowBlankDataDialog] = useState(false);
  const [blankMonths, setBlankMonths] = useState<string[]>([]);
  const chartRef = useRef<HTMLDivElement>(null);

  // CSV数据表格相关状态
  const [visibleColumns, setVisibleColumns] = useState<Set<number>>(new Set());
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const columnSelectorRef = useRef<HTMLDivElement>(null);

  const { selected_industry, selected_company, selected_product } = state;
  const hasCheckedBlankData = useRef(false);
  const [processedSalesData, setProcessedSalesData] = useState<ProductSalesData | null>(null);
  useStepStartRecorder(CURRENT_STEP, state.highest_completed_step, recordStepEvent);

  // 加载产品销售数据
  useEffect(() => {
    if (
      productSalesData ||
      ui.isLoadingSales ||
      ui.salesDataError ||
      !selected_industry ||
      !selected_company ||
      !selected_product
    ) {
      return;
    }
    void loadProductSalesData(selected_industry, selected_company, selected_product);
  }, [
    productSalesData,
    ui.isLoadingSales,
    ui.salesDataError,
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
        highest_completed_step: Math.max(state.highest_completed_step, CURRENT_STEP),
        current_step: Math.max(state.current_step, NEXT_STEP),
      }, { forceSync: true, throwOnSyncError: true });
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

  if (ui.isLoadingSales) {
    return (
      <div className="p-8 flex justify-center items-center h-96">
        <div className="text-center text-gray-500">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p>正在加载历史销量数据...</p>
        </div>
      </div>
    );
  }

  if (ui.salesDataError) {
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
          <p>{ui.salesDataError}</p>
          <Button
            onClick={handleRetryLoadSales}
            variant="outline"
            disabled={!canRetryLoadSales || ui.isLoadingSales}
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
        {statistics && <HistoricalDataStatisticsTable statistics={statistics} />}

        {/* 图表区域 */}
        <HistoricalDataChartPanel
          chartRef={chartRef}
          chartType={chartType}
          filteredData={filteredData}
          histogramData={histogramData}
          productInfo={productInfo}
          scatterData={scatterData}
          selectedPeriod={selectedPeriod}
          totalMonths={totalMonths}
          onChartTypeChange={setChartType}
          onSaveChart={handleSaveChart}
          onSelectedPeriodChange={setSelectedPeriod}
        />

        {/* 原始CSV数据表格 */}
        {activeDataset?.csvData && activeDataset.csvData.length > 0 && (
          <HistoricalDataCsvTable
            csvData={activeDataset.csvData}
            columnSelectorRef={columnSelectorRef}
            showColumnSelector={showColumnSelector}
            visibleColumns={visibleColumns}
            onDownloadCSV={handleDownloadCSV}
            onShowColumnSelectorChange={setShowColumnSelector}
            onToggleAllColumns={toggleAllColumns}
            onToggleColumn={toggleColumn}
          />
        )}



        {/* 导航按钮 */}
        <div className="flex justify-between">
          <button
            onClick={() => navigate(PATHS.PREVIOUS)}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={ui.isSubmitting}
          >
            上一步
          </button>
          <Button
            onClick={handleNext}
            isLoading={ui.isSubmitting}
            disabled={ui.isSubmitting}
            size="lg"
          >
            <span>下一步：需求预测</span>
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </div>

      {/* 空白数据提示弹窗 */}
      {showBlankDataDialog && (
        <BlankDataDialog
          blankMonths={blankMonths}
          onClose={() => setShowBlankDataDialog(false)}
        />
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
