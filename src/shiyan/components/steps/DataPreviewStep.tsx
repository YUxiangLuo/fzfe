import React, { useState } from 'react';
import { BarChart3, TrendingUp, Calendar, Info } from 'lucide-react';

interface DataPreviewStepProps {
  data: any;
  onUpdate: (data: any) => void;
}

const DataPreviewStep: React.FC<DataPreviewStepProps> = ({ data, onUpdate }) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState(data.timeframe || '24months');
  
  // Mock historical data
  const generateMockData = (months: number) => {
    const data = [];
    const baseValues = { 'prod-1': 150, 'prod-2': 80, 'prod-3': 200 };
    
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      
      Object.keys(baseValues).forEach(productId => {
        const baseValue = baseValues[productId as keyof typeof baseValues];
        const seasonalFactor = 1 + 0.3 * Math.sin((date.getMonth() / 12) * 2 * Math.PI);
        const randomFactor = 0.8 + Math.random() * 0.4;
        const value = Math.round(baseValue * seasonalFactor * randomFactor);
        
        data.push({
          date: date.toISOString().slice(0, 7),
          productId,
          demand: value,
          month: date.toLocaleDateString('zh-CN', { month: 'short', year: 'numeric' })
        });
      });
    }
    return data;
  };

  const timeframeOptions = [
    { value: '12months', label: '12个月', months: 12 },
    { value: '24months', label: '24个月', months: 24 },
    { value: '36months', label: '36个月', months: 36 }
  ];

  const selectedOption = timeframeOptions.find(opt => opt.value === selectedTimeframe);
  const mockData = generateMockData(selectedOption?.months || 24);
  const selectedProducts = data.selectedProducts || ['prod-1'];

  const handleTimeframeChange = (timeframe: string) => {
    setSelectedTimeframe(timeframe);
    onUpdate({ ...data, timeframe });
  };

  const getProductName = (productId: string) => {
    const productMap: { [key: string]: string } = {
      'prod-1': '55英寸4K智能电视',
      'prod-2': '冬季夹克系列',
      'prod-3': '有机咖啡豆',
      'prod-4': '夏季连衣裙系列',
      'prod-5': '休闲运动鞋'
    };
    return productMap[productId] || '未知产品';
  };

  const calculateStats = (productId: string) => {
    const productData = mockData.filter(d => d.productId === productId);
    const demands = productData.map(d => d.demand);
    const avg = demands.reduce((a, b) => a + b, 0) / demands.length;
    const max = Math.max(...demands);
    const min = Math.min(...demands);
    const stdDev = Math.sqrt(demands.reduce((sq, n) => sq + Math.pow(n - avg, 2), 0) / demands.length);
    
    return { avg: avg.toFixed(0), max, min, stdDev: stdDev.toFixed(1) };
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">历史需求数据预览</h2>
        <p className="text-gray-600">
          查看您选择产品的历史需求模式。这些数据将用于
          训练和验证您的预测模型。
        </p>
      </div>

      {/* Timeframe Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          选择数据时间范围
        </label>
        <div className="flex space-x-4">
          {timeframeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleTimeframeChange(option.value)}
              className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                selectedTimeframe === option.value
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Product Statistics */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {selectedProducts.map((productId: string) => {
          const stats = calculateStats(productId);
          const productData = mockData.filter(d => d.productId === productId);
          
          return (
            <div key={productId} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center space-x-3 mb-4">
                <BarChart3 className="h-6 w-6 text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">
                  {getProductName(productId)}
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-xs text-blue-600 font-medium">平均需求</p>
                  <p className="text-lg font-bold text-blue-900">{stats.avg}</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-xs text-green-600 font-medium">最大需求</p>
                  <p className="text-lg font-bold text-green-900">{stats.max}</p>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg">
                  <p className="text-xs text-orange-600 font-medium">最小需求</p>
                  <p className="text-lg font-bold text-orange-900">{stats.min}</p>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg">
                  <p className="text-xs text-purple-600 font-medium">标准差</p>
                  <p className="text-lg font-bold text-purple-900">{stats.stdDev}</p>
                </div>
              </div>

              {/* Simple chart visualization */}
              <div className="h-32 bg-gray-50 rounded-lg p-4 flex items-end space-x-1">
                {productData.slice(-12).map((point, index) => (
                  <div
                    key={index}
                    className="bg-blue-500 rounded-t flex-1 transition-all hover:bg-blue-600"
                    style={{ 
                      height: `${(point.demand / Math.max(...productData.map(d => d.demand))) * 100}%`,
                      minHeight: '4px'
                    }}
                    title={`${point.month}: ${point.demand} 单位`}
                  />
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                过去12个月需求模式
              </p>
            </div>
          );
        })}
      </div>

      {/* Data Quality Insights */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Info className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">数据质量洞察</h3>
        </div>
        
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              <span className="font-medium text-green-900">数据完整性</span>
            </div>
            <p className="text-green-700 text-sm">100% - 无缺失数据点</p>
          </div>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              <span className="font-medium text-blue-900">检测到季节性</span>
            </div>
            <p className="text-blue-700 text-sm">识别出明显的季节性模式</p>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
              <span className="font-medium text-yellow-900">趋势分析</span>
            </div>
            <p className="text-yellow-700 text-sm">观察到中等趋势变化</p>
          </div>
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">推荐的预测方法</h4>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>• <strong>季节性产品：</strong> 考虑ARIMA或季节性分解方法</li>
            <li>• <strong>稳定需求：</strong> 移动平均或指数平滑可能效果良好</li>
            <li>• <strong>复杂模式：</strong> LSTM神经网络用于捕获非线性关系</li>
            <li>• <strong>集成方法：</strong> 结合多个模型以提高准确性</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default DataPreviewStep;