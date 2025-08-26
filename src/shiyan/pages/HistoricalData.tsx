import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppState } from '../App';
import { BarChart3, Calendar, Info } from 'lucide-react';

interface Props {
  appState: AppState;
  updateAppState: (updates: Partial<AppState>) => void;
  completeStep: (step: number) => void;
}

const HistoricalData: React.FC<Props> = ({ appState, completeStep }) => {
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState('24months');

  // 根据选择获取产品信息
  const getProductInfo = () => {
    const productMap: Record<string, Record<string, Record<string, any>>> = {
      apparel: {
        yunshang: {
          silkdress: {
            name: '云裳真丝连衣裙',
            description: '融入传统刺绣元素的真丝连衣裙，价格区间 ¥800-1500，主要面向追求品质和文化内涵的消费者群体。',
            unit: '件'
          }
        }
      },
      automotive: {
        xunchi: {
          'e-stream': {
            name: '迅驰E-Stream电动SUV',
            description: '500公里续航的紧凑型电动SUV，价格区间 ¥28-35万，主要面向环保意识强的城市家庭。',
            unit: '台'
          }
        }
      },
      electronics: {
        zhixin: {
          smartlens: {
            name: '智芯SmartLens AR眼镜',
            description: '支持导航和虚拟会议的AR智能眼镜，价格区间 ¥3999-5999，主要面向科技爱好者和商务人士。',
            unit: '台'
          }
        }
      }
    };

    // 行业名称映射
    const industryNames: Record<string, string> = {
      automotive: '汽车制造业',
      electronics: '电子产品制造业',
      machinery: '重型机械与工业设备',
      food: '食品制造业',
      beverage: '饮料制造业',
      cosmetics: '化妆品制造业',
      cleaning: '家用清洁产品',
      apparel: '服装制造业'
    };

    // 公司名称映射
    const companyNames: Record<string, Record<string, string>> = {
      automotive: {
        xunchi: '迅驰汽车',
        leinuo: '雷诺科技',
        xingtu: '星途汽车'
      },
      electronics: {
        zhixin: '智芯科技',
        languang: '蓝光创新',
        jidian: '极电科技'
      },
      apparel: {
        shangliu: '尚流服饰',
        yunshang: '云裳服饰',
        chaozhi: '潮织时尚'
      }
    };

    // 获取选定的产品信息
    const selectedProduct = productMap[appState.selectedIndustry || '']?.[appState.selectedCompany || '']?.[appState.selectedProduct || ''];
    
    if (selectedProduct) {
      return selectedProduct;
    }
    
    // 如果没有找到具体产品信息，但有选择，则显示选择的产品ID
    if (appState.selectedProduct) {
      const industryName = industryNames[appState.selectedIndustry] || appState.selectedIndustry;
      const companyName = companyNames[appState.selectedIndustry]?.[appState.selectedCompany] || appState.selectedCompany;
      
      return {
        name: `${industryName}-${companyName}-${appState.selectedProduct}`,
        description: '根据您的选择进行需求预测分析的目标产品。',
        unit: '件'
      };
    }
    
    // 完全没有选择时的默认显示
    return {
      name: '选定产品',
      description: '根据您的选择进行需求预测分析的目标产品。',
      unit: '件'
    };
  };

  const productInfo = getProductInfo();

  // 云裳服饰真丝连衣裙的历史销售数据（单位：件）
  const salesData = [
    { month: '2023-01', sales: 1250 },
    { month: '2023-02', sales: 2180 }, // 春节前高峰
    { month: '2023-03', sales: 1680 },
    { month: '2023-04', sales: 1420 },
    { month: '2023-05', sales: 1890 }, // 春季婚礼季
    { month: '2023-06', sales: 2340 }, // 毕业季
    { month: '2023-07', sales: 1560 },
    { month: '2023-08', sales: 1380 },
    { month: '2023-09', sales: 1720 }, // 秋季新品
    { month: '2023-10', sales: 2100 }, // 国庆假期
    { month: '2023-11', sales: 2850 }, // 双十一促销
    { month: '2023-12', sales: 1980 },
    { month: '2024-01', sales: 1380 },
    { month: '2024-02', sales: 2450 }, // 春节前高峰
    { month: '2024-03', sales: 1820 },
    { month: '2024-04', sales: 1650 },
    { month: '2024-05', sales: 2120 }, // 春季婚礼季
    { month: '2024-06', sales: 2680 }, // 毕业季
    { month: '2024-07', sales: 1720 },
    { month: '2024-08', sales: 1580 },
    { month: '2024-09', sales: 1950 }, // 秋季新品
    { month: '2024-10', sales: 2380 }, // 国庆假期
    { month: '2024-11', sales: 3150 }, // 双十一促销
    { month: '2024-12', sales: 2180 },
  ];

  const getFilteredData = () => {
    switch (selectedPeriod) {
      case '6months':
        return salesData.slice(-6);
      case '12months':
        return salesData.slice(-12);
      default:
        return salesData;
    }
  };

  const filteredData = getFilteredData();
  const maxSales = Math.max(...filteredData.map(d => d.sales));
  const avgSales = Math.round(filteredData.reduce((sum, d) => sum + d.sales, 0) / filteredData.length);

  const handleNext = () => {
    completeStep(4);
    navigate('/model');
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">历史数据分析</h1>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <div className="flex items-center space-x-2 mb-2">
              <Info className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-800">分析产品：{productInfo.name}</span>
            </div>
            <p className="text-blue-700">
              {productInfo.description}
            </p>
          </div>
        </div>

        {/* 柱状图区域 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 mb-8">
          <div className="flex items-center justify-between mb-20">
            <h2 className="text-2xl font-semibold text-gray-900 flex items-center">
              <BarChart3 className="w-6 h-6 mr-3 text-blue-600" />
              月度销量趋势图
            </h2>
            <div className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-gray-500" />
              <select 
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="text-lg border border-gray-300 rounded-lg px-4 py-2 bg-white"
              >
                <option value="24months">近24个月</option>
                <option value="12months">近12个月</option>
                <option value="6months">近6个月</option>
              </select>
            </div>
          </div>
          
          {/* 柱状图容器 */}
          <div className="h-96 bg-gray-50 rounded-lg p-6 relative">
            {/* Y轴标签 */}
            <div className="absolute left-2 top-6 bottom-16 flex flex-col justify-between text-sm text-gray-600">
              <span>{Math.round(maxSales).toLocaleString()}</span>
              <span>{Math.round(maxSales * 0.75).toLocaleString()}</span>
              <span>{Math.round(maxSales * 0.5).toLocaleString()}</span>
              <span>{Math.round(maxSales * 0.25).toLocaleString()}</span>
              <span>0</span>
            </div>

            {/* 柱状图主体 */}
            <div className="ml-12 h-full flex items-end justify-between space-x-1">
              {filteredData.map((data, index) => {
                const heightPixels = Math.max((data.sales / maxSales) * 320, 8); // 320px是容器高度减去padding
                const isHighlight = data.sales > avgSales * 1.2;
                
                return (
                  <div key={index} className="flex-1 flex flex-col items-center justify-end h-full">
                    <div className="relative group w-full">
                      <div
                        className={`w-full rounded-t-md transition-all duration-300 hover:opacity-80 cursor-pointer ${
                          isHighlight 
                            ? 'bg-gradient-to-t from-blue-600 to-blue-400 shadow-lg' 
                            : 'bg-gradient-to-t from-gray-500 to-gray-400'
                        }`}
                        style={{ 
                          height: `${heightPixels}px`
                        }}
                      />
                      
                      {/* 悬停显示数据 */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-sm rounded-lg px-3 py-2 whitespace-nowrap z-10 shadow-lg">
                        <div className="text-center">
                          <div className="font-medium">{data.month}</div>
                          <div className="text-lg font-bold text-blue-300">{data.sales.toLocaleString()}</div>
                          <div className="text-xs text-gray-300">约¥{(data.sales * 1150).toLocaleString()}</div>
                        </div>
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                      </div>
                    </div>
                    
                    {/* 月份标签 */}
                    <div className="mt-3 text-xs text-gray-600 text-center font-medium">
                      {data.month.split('-')[1]}月
                    </div>
                  </div>
                );
              })}
            </div>

            {/* X轴线 */}
            <div className="absolute bottom-12 left-12 right-6 h-px bg-gray-300"></div>
          </div>

          {/* 图例和统计信息 */}
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center space-x-8">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-gradient-to-t from-blue-600 to-blue-400 rounded"></div>
                <span className="text-sm text-gray-600">高峰期销量 (&gt;{Math.round(avgSales * 1.2)})</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-gradient-to-t from-gray-500 to-gray-400 rounded"></div>
                <span className="text-sm text-gray-600">常规销量</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-8 text-sm">
              <div>
                <span className="text-gray-600">平均月销量：</span>
                <span className="font-bold text-gray-900">{avgSales.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-gray-600">最高月销量：</span>
                <span className="font-bold text-blue-600">{maxSales.toLocaleString()}</span>
              </div>
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
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md hover:shadow-lg transition-all"
          >
            下一步：建立预测模型
          </button>
        </div>
      </div>
    </div>
  );
};

export default HistoricalData;