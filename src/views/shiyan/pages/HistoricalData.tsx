import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExperiment } from '../contexts/ExperimentContext';
import { BarChart3, Calendar, Info, ArrowRight } from 'lucide-react';

const HistoricalData: React.FC = () => {
  const navigate = useNavigate();
  const { state, updateState } = useExperiment();
  const [selectedPeriod, setSelectedPeriod] = useState('24months');

  const getProductInfo = () => {
    // This data should ideally come from a config or API, but is mocked here for simplicity.
    const productMap: Record<string, any> = {
      'apparel-yunshang-silkdress': { name: '云裳真丝连衣裙', description: '融入传统刺绣元素的真丝连衣裙。', unit: '件' },
      'automotive-xunchi-e-stream': { name: '迅驰E-Stream电动SUV', description: '500公里续航的紧凑型电动SUV。', unit: '台' },
      'electronics-zhixin-smartlens': { name: '智芯SmartLens AR眼镜', description: '支持导航和虚拟会议的AR智能眼镜。', unit: '台' },
    };
    const key = `${state.selected_industry}-${state.selected_company}-${state.selected_product}`;
    return productMap[key] || { name: '选定产品', description: '根据您的选择进行需求预测分析的目标产品。', unit: '件' };
  };

  const productInfo = getProductInfo();

  // Mock sales data
  const salesData = [
    { month: '2023-01', sales: 1250 }, { month: '2023-02', sales: 2180 }, { month: '2023-03', sales: 1680 },
    { month: '2023-04', sales: 1420 }, { month: '2023-05', sales: 1890 }, { month: '2023-06', sales: 2340 },
    { month: '2023-07', sales: 1560 }, { month: '2023-08', sales: 1380 }, { month: '2023-09', sales: 1720 },
    { month: '2023-10', sales: 2100 }, { month: '2023-11', sales: 2850 }, { month: '2023-12', sales: 1980 },
    { month: '2024-01', sales: 1380 }, { month: '2024-02', sales: 2450 }, { month: '2024-03', sales: 1820 },
    { month: '2024-04', sales: 1650 }, { month: '2024-05', sales: 2120 }, { month: '2024-06', sales: 2680 },
    { month: '2024-07', sales: 1720 }, { month: '2024-08', sales: 1580 }, { month: '2024-09', sales: 1950 },
    { month: '2024-10', sales: 2380 }, { month: '2024-11', sales: 3150 }, { month: '2024-12', sales: 2180 },
  ];

  const getFilteredData = () => {
    switch (selectedPeriod) {
      case '6months': return salesData.slice(-6);
      case '12months': return salesData.slice(-12);
      default: return salesData;
    }
  };

  const filteredData = getFilteredData();
  const maxSales = Math.max(...filteredData.map(d => d.sales));
  const avgSales = Math.round(filteredData.reduce((sum, d) => sum + d.sales, 0) / filteredData.length);

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
          
          <div className="h-80 bg-gray-50 rounded-lg p-4 relative flex items-end justify-around">
            {filteredData.map((data, index) => (
              <div key={index} className="h-full flex items-end" style={{ width: `${100 / filteredData.length}%`}}>
                <div className="relative group w-3/4 mx-auto">
                  <div
                    className="w-full rounded-t-md bg-blue-500 hover:bg-blue-600 transition-all"
                    style={{ height: `${(data.sales / maxSales) * 100}%` }}
                  />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs rounded py-1 px-2">
                    {data.month}: {data.sales.toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
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