import React, { useState } from 'react';
import { Building2, Factory, ShoppingCart, Zap, Plane, Truck } from 'lucide-react';

interface IndustrySelectionStepProps {
  data: any;
  onUpdate: (data: any) => void;
}

const industries = [
  {
    id: 'retail',
    name: '零售与消费品',
    icon: ShoppingCart,
    description: '快速消费品、季节性模式、促销影响',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50'
  },
  {
    id: 'manufacturing',
    name: '制造业',
    icon: Factory,
    description: '工业设备、供应链复杂性、生产周期',
    color: 'text-green-600',
    bgColor: 'bg-green-50'
  },
  {
    id: 'technology',
    name: '科技行业',
    icon: Zap,
    description: '电子设备、创新周期、快速市场变化',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50'
  },
  {
    id: 'automotive',
    name: '汽车行业',
    icon: Truck,
    description: '汽车制造、季节性需求、经济敏感性',
    color: 'text-red-600',
    bgColor: 'bg-red-50'
  },
  {
    id: 'aerospace',
    name: '航空航天',
    icon: Plane,
    description: '飞机制造、长期项目、监管合规',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50'
  },
  {
    id: 'construction',
    name: '建筑行业',
    icon: Building2,
    description: '建筑材料、天气模式、经济周期',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50'
  }
];

const IndustrySelectionStep: React.FC<IndustrySelectionStepProps> = ({ data, onUpdate }) => {
  const [selectedIndustry, setSelectedIndustry] = useState(data.selectedIndustry || '');

  const handleIndustrySelect = (industryId: string) => {
    setSelectedIndustry(industryId);
    onUpdate({ selectedIndustry: industryId });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">选择您的行业</h2>
        <p className="text-gray-600">
          选择您想要分析的行业部门。每个行业都有独特的需求模式、
          季节性因素和预测挑战。
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {industries.map((industry) => (
          <div
            key={industry.id}
            onClick={() => handleIndustrySelect(industry.id)}
            className={`cursor-pointer p-6 rounded-xl border-2 transition-all duration-200 hover:shadow-lg ${
              selectedIndustry === industry.id
                ? 'border-blue-500 bg-blue-50 shadow-md'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-3 mb-4">
              <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${industry.bgColor}`}>
                <industry.icon className={`h-6 w-6 ${industry.color}`} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{industry.name}</h3>
            </div>
            <p className="text-gray-600 text-sm">{industry.description}</p>
            
            {selectedIndustry === industry.id && (
              <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                <p className="text-blue-800 text-sm font-medium">✓ 已选择</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedIndustry && (
        <div className="mt-8 p-6 bg-white rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">行业分析预览</h3>
          <p className="text-gray-600 mb-4">
            您已选择<strong>{industries.find(i => i.id === selectedIndustry)?.name}</strong>行业。
            这将影响仿真中可用的公司类型、产品和预测场景。
          </p>
          <div className="grid md:grid-cols-3 gap-4 text-sm">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="font-medium text-gray-900">需求模式</p>
              <p className="text-gray-600">因行业特征而异</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="font-medium text-gray-900">季节性</p>
              <p className="text-gray-600">行业特定的季节性趋势</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="font-medium text-gray-900">预测周期</p>
              <p className="text-gray-600">短期到长期规划</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IndustrySelectionStep;