import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useExperiment } from '../contexts/ExperimentContext';
import { Building, MapPin, Users, TrendingUp, ArrowRight } from 'lucide-react';

const getCompaniesForIndustry = (industry: string | null) => {
  const companiesMap: Record<string, any[]> = {
    automotive: [
      { id: 'xunchi', name: '迅驰汽车', location: '上海', employees: '8.5万', revenue: '¥1280亿', description: '专注于智能电动车和自动驾驶技术' },
      { id: 'leinuo', name: '雷诺科技', location: '柏林', employees: '6.2万', revenue: '€850亿', description: '专注混合动力和智能网联汽车' },
      { id: 'xingtu', name: '星途汽车', location: '东京', employees: '4.8万', revenue: '¥680亿', description: '专注于轻量化电动车和模块化设计' },
    ],
    electronics: [
      { id: 'zhixin', name: '智芯科技', location: '深圳', employees: '3.2万', revenue: '¥450亿', description: '专注于智能家居和可穿戴设备' },
      { id: 'languang', name: '蓝光创新', location: '硅谷', employees: '1.8万', revenue: '$280亿', description: '专注消费电子和物联网设备' },
      { id: 'jidian', name: '极电科技', location: '首尔', employees: '2.1万', revenue: '₩320亿', description: '专注于便携电子和游戏设备' },
    ],
    machinery: [
      { id: 'taili', name: '泰力重工', location: '慕尼黑', employees: '4.5万', revenue: '€680亿', description: '专注建筑和采矿设备' },
      { id: 'juyan', name: '巨岩机械', location: '徐州', employees: '5.8万', revenue: '¥520亿', description: '专注于工程机械和工业自动化' },
      { id: 'tiefeng', name: '铁峰设备', location: '芝加哥', employees: '3.6万', revenue: '$420亿', description: '专注于能源和工业设备' },
    ],
    food: [
      { id: 'lutian', name: '绿田食品', location: '日内瓦', employees: '1.2万', revenue: 'CHF180亿', description: '专注健康包装食品' },
      { id: 'fenghe', name: '丰禾食品', location: '成都', employees: '2.8万', revenue: '¥320亿', description: '专注于方便食品和地方特色零食' },
      { id: 'chunwei', name: '纯味食品', location: '悉尼', employees: '0.9万', revenue: 'A$150亿', description: '专注天然食品和儿童零食' },
    ],
    beverage: [
      { id: 'qingquan', name: '清泉饮料', location: '广州', employees: '1.5万', revenue: '¥280亿', description: '专注功能饮料和健康饮品' },
      { id: 'bilang', name: '碧浪饮品', location: '洛杉矶', employees: '1.1万', revenue: '$220亿', description: '专注于运动和健康饮料' },
      { id: 'yunxi', name: '云溪饮料', location: '京都', employees: '0.8万', revenue: '¥180亿', description: '专注于传统和现代茶饮料' },
    ],
    cleaning: [
      { id: 'jingxin', name: '净新家居', location: '东京', employees: '0.6万', revenue: '¥120亿', description: '专注环保清洁产品' },
      { id: 'lujie', name: '绿洁科技', location: '伦敦', employees: '0.8万', revenue: '£150亿', description: '专注于智能清洁解决方案' },
      { id: 'qingxin', name: '清新之家', location: '杭州', employees: '1.2万', revenue: '¥180亿', description: '专注家用清洁' },
    ],
    apparel: [
        { id: 'shangliu', name: '尚流服饰', location: '米兰', employees: '3.5万', revenue: '€520亿', description: '专注快时尚和可持续面料' },
        { id: 'yunshang', name: '云裳服饰', location: '苏州', employees: '2.8万', revenue: '¥380亿', description: '专注于传统与现代融合的服装' },
        { id: 'chaozhi', name: '潮织时尚', location: '纽约', employees: '2.1万', revenue: '$320亿', description: '专注于街头潮流和功能性服装' },
    ],
    cosmetics: [
      { id: 'liran', name: '丽然美妆', location: '巴黎', employees: '2.2万', revenue: '€380亿', description: '专注天然护肤和彩妆' },
      { id: 'qingyan', name: '清颜美妆', location: '上海', employees: '1.8万', revenue: '¥260亿', description: '专注于亚洲肌肤护理' },
      { id: 'guangcai', name: '光彩美妆', location: '首尔', employees: '1.4万', revenue: '₩280亿', description: '专注于彩妆和潮流美妆' },
    ],
    // Add other industries if needed
  };
  return companiesMap[industry || ''] || [];
};

const CompanySelection: React.FC = () => {
  const navigate = useNavigate();
  const { state, updateState } = useExperiment();
  
  const companies = getCompaniesForIndustry(state.selected_industry);

  const handleSelectCompany = (companyId: string) => {
    updateState({ selected_company: companyId });
  };

  const handleNext = () => {
    if (state.selected_company) {
      updateState({ 
          highest_completed_step: 2,
          current_step: 3,
      });
      navigate('/product');
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">步骤 2: 选择企业</h1>
          <p className="text-lg text-gray-600">
            基于您选择的行业，请选择一家企业进行深入分析。
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {companies.map((company) => {
            const isSelected = state.selected_company === company.id;
            return (
              <div
                key={company.id}
                onClick={() => handleSelectCompany(company.id)}
                className={`p-6 rounded-xl border-2 cursor-pointer transition-all hover:shadow-lg ${
                  isSelected 
                    ? 'border-blue-500 bg-blue-50 shadow-md' 
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center space-x-4">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${isSelected ? 'bg-blue-100' : 'bg-gray-100'}`}>
                            <Building className={`w-6 h-6 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`} />
                        </div>
                        <div>
                            <h3 className="text-xl font-semibold text-gray-900">{company.name}</h3>
                            <p className="text-sm text-gray-600 mt-1">{company.description}</p>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <span>{company.location}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-gray-400" />
                        <span>{company.employees}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                        <TrendingUp className="w-4 h-4 text-gray-400" />
                        <span>{company.revenue}</span>
                    </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-between items-center">
            <button
                onClick={() => navigate('/industry')}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
                上一步
            </button>
            <button
                onClick={handleNext}
                disabled={!state.selected_company}
                className="flex items-center space-x-2 px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md hover:shadow-lg transition-all disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
                <span>下一步</span>
                <ArrowRight className="w-5 h-5" />
            </button>
        </div>
      </div>
    </div>
  );
};

export default CompanySelection;
