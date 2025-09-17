import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AppState } from '../App';
import { Factory, Smartphone, Car, Utensils, Droplets, Sparkles, SprayCan as Spray, Shirt, ArrowRight } from 'lucide-react';

interface Props {
  appState: AppState;
  updateAppState: (updates: Partial<AppState>) => void;
  completeStep: (step: number) => void;
}

const industries = [
  { id: 'automotive', name: '汽车制造业', icon: Car, description: '智能电动车、混合动力车及自动驾驶技术' },
  { id: 'electronics', name: '电子产品制造业', icon: Smartphone, description: '智能家居、可穿戴设备、消费电子产品' },
  { id: 'machinery', name: '重型机械与工业设备', icon: Factory, description: '建筑设备、采矿机械、工业自动化设备' },
  { id: 'food', name: '食品制造业', icon: Utensils, description: '健康包装食品、方便食品、有机食品' },
  { id: 'beverage', name: '饮料制造业', icon: Droplets, description: '功能饮料、健康饮品、茶饮料' },
  { id: 'cosmetics', name: '化妆品制造业', icon: Sparkles, description: '护肤品、彩妆、天然美妆产品' },
  { id: 'cleaning', name: '家用清洁产品', icon: Spray, description: '环保清洁产品、智能清洁解决方案' },
  { id: 'apparel', name: '服装制造业', icon: Shirt, description: '快时尚、可持续面料、功能性服装' },
];

const IndustrySelection: React.FC<Props> = ({ appState, updateAppState, completeStep }) => {
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(appState.selectedIndustry);
  const navigate = useNavigate();

  const handleSelectIndustry = (industryId: string) => {
    setSelectedIndustry(industryId);
  };

  const handleNext = () => {
    if (selectedIndustry) {
      updateAppState({ selectedIndustry });
      completeStep(1);
      navigate('/company');
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">选择目标行业</h1>
          <p className="text-lg text-gray-600">
            请选择您想要进行需求预测分析的目标行业。不同行业的需求模式和影响因素各不相同，
            系统将根据您的选择提供相应的企业和产品数据。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {industries.map((industry) => {
            const Icon = industry.icon;
            const isSelected = selectedIndustry === industry.id;
            
            return (
              <div
                key={industry.id}
                onClick={() => handleSelectIndustry(industry.id)}
                className={`p-6 rounded-xl border-2 cursor-pointer transition-all hover:shadow-lg ${
                  isSelected 
                    ? 'border-blue-500 bg-blue-50 shadow-md' 
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-center space-x-4 mb-4">
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                    isSelected ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900">{industry.name}</h3>
                </div>
                <p className="text-gray-600">{industry.description}</p>
                
                {isSelected && (
                  <div className="mt-4 flex items-center text-blue-600 font-medium">
                    <span>已选择</span>
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleNext}
            disabled={!selectedIndustry}
            className={`px-8 py-3 rounded-lg font-medium transition-all ${
              selectedIndustry
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            下一步：选择企业
          </button>
        </div>
      </div>
    </div>
  );
};

export default IndustrySelection;