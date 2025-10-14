import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExperiment } from '../contexts/ExperimentContext';
import { BarChart3, Calendar, Info, ArrowRight, Loader2, AlertTriangle } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import type { MonthlySalesRecord } from '../data/historicalDatasets';

const HistoricalData: React.FC = () => {
  const navigate = useNavigate();
  const {
    state,
    updateState,
    productSalesData,
    isLoadingSales,
    salesDataError,
    loadProductSalesData,
    recordStepEvent,
  } = useExperiment();
  const [selectedPeriod, setSelectedPeriod] = useState('all');
  const { selected_industry, selected_company, selected_product } = state;

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

  // Record STARTED event when component mounts
  useEffect(() => {
    recordStepEvent(4, 'STARTED');
  }, []);

  const activeDataset = productSalesData;
  const monthlySales = activeDataset?.monthlySales ?? [];
  const totalMonths = monthlySales.length;

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

  const periodStats = useMemo(() => {
    if (filteredData.length === 0) {
      return {
        average: 0,
        peakMonth: '—',
        peakValue: 0,
        trendDelta: 0,
      };
    }

    const firstRecord = filteredData[0]!;
    let total = 0;
    let peak: MonthlySalesRecord = firstRecord;

    for (const record of filteredData) {
      total += record.sales;
      if (record.sales > peak.sales) {
        peak = record;
      }
    }

    const lastRecord = filteredData[filteredData.length - 1]!;
    const trend = lastRecord.sales - firstRecord.sales;
    return {
      average: Math.round(total / filteredData.length),
      peakMonth: peak?.month ?? '—',
      peakValue: peak?.sales ?? 0,
      trendDelta: trend ?? 0,
    };
  }, [filteredData]);

  const handleNext = () => {
    updateState({
      highest_completed_step: 4,
      current_step: 5,
    });
    navigate('/model');
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">步骤 4: 历史数据分析</h1>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <Info className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-800">分析产品：{productInfo.name}</span>
            </div>
            <p className="text-blue-700">{productInfo.description}</p>
          </div>
        </div>

        {totalMonths < 24 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-8 flex items-center space-x-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <p className="text-yellow-800">
              注意：当前产品数据量为 {totalMonths} 个月，不足 24 个月。数据量较少可能影响长期趋势分析的准确性。
            </p>
          </div>
        )}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 flex items-center">
              <BarChart3 className="w-6 h-6 mr-3 text-blue-600" />
              月度销量趋势图
            </h2>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="border border-gray-300 rounded-lg px-4 py-2 bg-white"
            >
              <option value="all">全部 ({totalMonths}个月)</option>
              {totalMonths >= 12 && <option value="12months">近12个月</option>}
              {totalMonths >= 6 && <option value="6months">近6个月</option>}
            </select>
          </div>
          <div className="h-80 bg-gray-50 rounded-lg p-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={filteredData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} angle={-15} textAnchor="end" height={50} />
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
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">平均月销量</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">{periodStats.average.toLocaleString()} {productInfo.unit}</p>
              </div>
              <BarChart3 className="w-6 h-6 text-blue-500" />
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div>
              <p className="text-sm text-gray-500">峰值月份</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">{periodStats.peakMonth}</p>
              <p className="text-sm text-gray-600">峰值销量：{periodStats.peakValue.toLocaleString()} {productInfo.unit}</p>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">周期趋势</p>
                <p className={`text-lg font-semibold mt-1 ${periodStats.trendDelta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {periodStats.trendDelta >= 0 ? '+' : ''}{periodStats.trendDelta.toLocaleString()} {productInfo.unit}
                </p>
                <p className="text-sm text-gray-600">首月 vs. 末月</p>
              </div>
              <Calendar className="w-6 h-6 text-indigo-500" />
            </div>
          </div>
        </div>

        <div className="flex justify-between">
          <button
            onClick={() => navigate('/product')}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            上一步
          </button>
          <button
            onClick={handleNext}
            className="flex items-center space-x-2 px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md"
          >
            <span>下一步：建立预测模型</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default HistoricalData;
