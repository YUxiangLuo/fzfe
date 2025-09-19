import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExperiment } from '../contexts/ExperimentContext';
import { BarChart3, Calendar, Info, ArrowRight } from 'lucide-react';
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

type SelectionKey = string;

interface MonthlySalesRecord {
  month: string;
  sales: number;
}

interface HistoricalDataset {
  meta: {
    industry: string;
    company: string;
    product: string;
    name: string;
    description: string;
    unit: string;
  };
  monthlySales: MonthlySalesRecord[];
}

const formatKey = (
  industry: string | null,
  company: string | null,
  product: string | null,
): SelectionKey =>
  [industry, company, product].filter((segment): segment is string => Boolean(segment)).join('|') || 'default';

const createSeries = (baseYear: number, baseMonth: number, values: number[]): MonthlySalesRecord[] => {
  let year = baseYear;
  let month = baseMonth;
  return values.map((sales) => {
    const label = `${year}-${String(month).padStart(2, '0')}`;
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
    return { month: label, sales };
  });
};

const MOCK_DATASETS: Record<SelectionKey, HistoricalDataset> = {
  'apparel|yunshang|silkdress': {
    meta: {
      industry: 'apparel',
      company: 'yunshang',
      product: 'silkdress',
      name: '云裳真丝连衣裙',
      description: '融合传统刺绣工艺的高端真丝连衣裙，用于春夏换季主题活动。',
      unit: '件',
    },
    monthlySales: createSeries(2023, 1, [
      980, 1120, 1280, 1360, 1520, 1650,
      1720, 1600, 1480, 1890, 2150, 2240,
      1380, 1420, 1580, 1710, 1860, 2140,
      2280, 2210, 2090, 2360, 2540, 2680,
    ]),
  },
  'automotive|xunchi|e-stream': {
    meta: {
      industry: 'automotive',
      company: 'xunchi',
      product: 'e-stream',
      name: '迅驰E-Stream电动SUV',
      description: '主打城市通勤的电动SUV，配备 500 公里续航与车联网服务。',
      unit: '台',
    },
    monthlySales: createSeries(2023, 1, [
      620, 680, 790, 820, 910, 980,
      1020, 980, 940, 1100, 1250, 1310,
      890, 950, 1040, 1110, 1180, 1240,
      1320, 1400, 1460, 1550, 1680, 1740,
    ]),
  },
  'electronics|zhixin|smartlens': {
    meta: {
      industry: 'electronics',
      company: 'zhixin',
      product: 'smartlens',
      name: '智芯SmartLens AR眼镜',
      description: '定位远程协作与沉浸体验的 AR 智能眼镜，支持导航及虚拟会议。',
      unit: '台',
    },
    monthlySales: createSeries(2023, 1, [
      420, 460, 520, 580, 640, 720,
      760, 810, 840, 920, 990, 1080,
      930, 970, 1010, 1150, 1240, 1350,
      1400, 1450, 1510, 1620, 1760, 1880,
    ]),
  },
  default: {
    meta: {
      industry: 'general',
      company: 'sample-co',
      product: 'sample-product',
      name: '选定产品',
      description: '根据您的选择进行需求预测分析的目标产品。',
      unit: '件',
    },
    monthlySales: createSeries(2023, 1, [
      720, 680, 750, 810, 830, 890,
      910, 870, 840, 900, 960, 980,
      860, 880, 940, 990, 1050, 1090,
      1130, 1180, 1210, 1260, 1320, 1380,
    ]),
  },
};

const HistoricalData: React.FC = () => {
  const navigate = useNavigate();
  const { state, updateState } = useExperiment();
  const [selectedPeriod, setSelectedPeriod] = useState('24months');

  const datasetKey = useMemo(
    () => formatKey(state.selected_industry, state.selected_company, state.selected_product),
    [state.selected_company, state.selected_industry, state.selected_product],
  );

  const activeDataset = useMemo<HistoricalDataset>(() => {
    const dataset = (MOCK_DATASETS as Record<string, HistoricalDataset | undefined>)[datasetKey];
    return (dataset ?? MOCK_DATASETS.default) as HistoricalDataset;
  }, [datasetKey]);

  const productInfo = activeDataset.meta;

  const filteredData = useMemo(() => {
    switch (selectedPeriod) {
      case '6months':
        return activeDataset.monthlySales.slice(-6);
      case '12months':
        return activeDataset.monthlySales.slice(-12);
      default:
        return activeDataset.monthlySales;
    }
  }, [activeDataset.monthlySales, selectedPeriod]);

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
              <option value="24months">近24个月</option>
              <option value="12months">近12个月</option>
              <option value="6months">近6个月</option>
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
