import React, { useState } from 'react';
import { Package, TrendingUp, Calendar, DollarSign } from 'lucide-react';

interface ProductSelectionStepProps {
  data: any;
  onUpdate: (data: any) => void;
}

const products = {
  'retail-1': [
    {
      id: 'prod-1',
      name: '55英寸4K智能电视',
      category: '电子产品',
      price: '¥6,999',
      seasonality: '高（节假日季节）',
      volatility: '中等',
      lifecycle: '成熟期'
    },
    {
      id: 'prod-2',
      name: '冬季夹克系列',
      category: '服装',
      price: '¥999',
      seasonality: '极高（季节性）',
      volatility: '高',
      lifecycle: '季节性'
    },
    {
      id: 'prod-3',
      name: '有机咖啡豆',
      category: '食品饮料',
      price: '¥89.99',
      seasonality: '低',
      volatility: '低',
      lifecycle: '稳定期'
    }
  ],
  'retail-2': [
    {
      id: 'prod-4',
      name: '夏季连衣裙系列',
      category: '时尚',
      price: '¥529',
      seasonality: '极高（季节性）',
      volatility: '高',
      lifecycle: '季节性'
    },
    {
      id: 'prod-5',
      name: '休闲运动鞋',
      category: '鞋类',
      price: '¥799',
      seasonality: '中等',
      volatility: '中等',
      lifecycle: '稳定期'
    }
  ]
};

const ProductSelectionStep: React.FC<ProductSelectionStepProps> = ({ data, onUpdate }) => {
  const [selectedProducts, setSelectedProducts] = useState<string[]>(data.selectedProducts || []);
  const companyId = data.selectedCompany || 'retail-1';
  const availableProducts = products[companyId as keyof typeof products] || products['retail-1'];

  const handleProductToggle = (productId: string) => {
    const newSelection = selectedProducts.includes(productId)
      ? selectedProducts.filter(id => id !== productId)
      : [...selectedProducts, productId];
    
    setSelectedProducts(newSelection);
    const selectedProductDetails = availableProducts.filter(p => newSelection.includes(p.id));
    onUpdate({ 
      selectedProducts: newSelection,
      productDetails: selectedProductDetails
    });
  };

  const getSeasonalityColor = (seasonality: string) => {
    if (seasonality.includes('极高')) return 'text-red-600 bg-red-50';
    if (seasonality.includes('高')) return 'text-orange-600 bg-orange-50';
    if (seasonality.includes('中等')) return 'text-yellow-600 bg-yellow-50';
    if (seasonality.includes('低')) return 'text-green-600 bg-green-50';
    return 'text-gray-600 bg-gray-50';
  };

  const getVolatilityColor = (volatility: string) => {
    switch (volatility) {
      case '高': return 'text-red-600 bg-red-50';
      case '中等': return 'text-yellow-600 bg-yellow-50';
      case '低': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">选择要分析的产品</h2>
        <p className="text-gray-600">
          选择一个或多个产品进行需求预测分析。每个产品都有不同的
          特征，这将影响预测方法和准确性。
        </p>
      </div>

      <div className="space-y-4">
        {availableProducts.map((product) => (
          <div
            key={product.id}
            onClick={() => handleProductToggle(product.id)}
            className={`cursor-pointer p-6 rounded-xl border-2 transition-all duration-200 hover:shadow-lg ${
              selectedProducts.includes(product.id)
                ? 'border-blue-500 bg-blue-50 shadow-md'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4 flex-1">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
                  <Package className="h-6 w-6 text-white" />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">{product.name}</h3>
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                      <span className="font-medium text-gray-900">{product.price}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2 mb-4">
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
                      {product.category}
                    </span>
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                      {product.lifecycle}
                    </span>
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">季节性</p>
                        <span className={`text-xs px-2 py-1 rounded-full ${getSeasonalityColor(product.seasonality)}`}>
                          {product.seasonality}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">需求波动性</p>
                        <span className={`text-xs px-2 py-1 rounded-full ${getVolatilityColor(product.volatility)}`}>
                          {product.volatility}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Package className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">产品生命周期</p>
                        <p className="text-sm font-medium text-gray-900">{product.lifecycle}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex-shrink-0">
                <div className={`w-6 h-6 border-2 rounded-md flex items-center justify-center ${
                  selectedProducts.includes(product.id)
                    ? 'bg-blue-600 border-blue-600'
                    : 'border-gray-300'
                }`}>
                  {selectedProducts.includes(product.id) && (
                    <span className="text-white text-sm font-bold">✓</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {selectedProducts.length > 0 && (
        <div className="mt-8 p-6 bg-white rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            已选择产品 ({selectedProducts.length})
          </h3>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">预测考虑因素</h4>
              <ul className="space-y-1 text-blue-700 text-sm">
                <li>• 不同算法可能对不同产品效果更好</li>
                <li>• 季节性产品需要特殊处理</li>
                <li>• 波动性大的产品更难准确预测</li>
              </ul>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium text-green-900 mb-2">分析优势</h4>
              <ul className="space-y-1 text-green-700 text-sm">
                <li>• 比较不同产品的预测准确性</li>
                <li>• 学习不同场景的最优模型</li>
                <li>• 理解预测误差的业务影响</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {selectedProducts.length === 0 && (
        <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-amber-800 text-center">
            请至少选择一个产品以继续分析
          </p>
        </div>
      )}
    </div>
  );
};

export default ProductSelectionStep;