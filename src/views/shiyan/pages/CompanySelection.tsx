import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { AppState } from '../App';
import { Building, MapPin, Users, TrendingUp, ArrowRight } from 'lucide-react';

interface Props {
  appState: AppState;
  updateAppState: (updates: Partial<AppState>) => void;
  completeStep: (step: number) => void;
}

const getCompaniesForIndustry = (industry: string | null) => {
  const companiesMap: Record<string, any[]> = {
    automotive: [
      { 
        id: 'xunchi', 
        name: '迅驰汽车 (Xunchi Motors)', 
        location: '上海', 
        employees: '8.5万', 
        revenue: '¥1280亿',
        description: '专注于智能电动车和自动驾驶技术，目标为城市通勤和环保出行'
      },
      { 
        id: 'leinuo', 
        name: '雷诺科技 (Leinuo Tech)', 
        location: '柏林', 
        employees: '6.2万', 
        revenue: '€850亿',
        description: '专注混合动力和智能网联汽车，主打欧洲市场'
      },
      { 
        id: 'xingtu', 
        name: '星途汽车 (Xingtu Auto)', 
        location: '东京', 
        employees: '4.8万', 
        revenue: '¥680亿',
        description: '专注于轻量化电动车和模块化设计，面向亚洲市场'
      },
    ],
    electronics: [
      { 
        id: 'zhixin', 
        name: '智芯科技 (ZhiXin Tech)', 
        location: '深圳', 
        employees: '3.2万', 
        revenue: '¥450亿',
        description: '专注于智能家居和可穿戴设备，强调高性价比和创新设计'
      },
      { 
        id: 'languang', 
        name: '蓝光创新 (Languang Innovations)', 
        location: '硅谷', 
        employees: '1.8万', 
        revenue: '$280亿',
        description: '专注消费电子和物联网设备，主打高端市场'
      },
      { 
        id: 'jidian', 
        name: '极电科技 (Jidian Tech)', 
        location: '首尔', 
        employees: '2.1万', 
        revenue: '₩320亿',
        description: '专注于便携电子和游戏设备，注重年轻消费者市场'
      },
    ],
    machinery: [
      { 
        id: 'taili', 
        name: '泰力重工 (Taili Heavy Industries)', 
        location: '慕尼黑', 
        employees: '4.5万', 
        revenue: '€680亿',
        description: '专注建筑和采矿设备，强调智能化和可持续性'
      },
      { 
        id: 'juyan', 
        name: '巨岩机械 (Juyan Machinery)', 
        location: '徐州', 
        employees: '5.8万', 
        revenue: '¥520亿',
        description: '专注于工程机械和工业自动化，服务全球基建市场'
      },
      { 
        id: 'tiefeng', 
        name: '铁峰设备 (Tiefeng Equipment)', 
        location: '芝加哥', 
        employees: '3.6万', 
        revenue: '$420亿',
        description: '专注于能源和工业设备，注重耐用性和高效性'
      },
    ],
    food: [
      { 
        id: 'lutian', 
        name: '绿田食品 (Lütian Foods)', 
        location: '日内瓦', 
        employees: '1.2万', 
        revenue: 'CHF180亿',
        description: '专注健康包装食品，强调有机和可持续'
      },
      { 
        id: 'fenghe', 
        name: '丰禾食品 (Fenghe Foods)', 
        location: '成都', 
        employees: '2.8万', 
        revenue: '¥320亿',
        description: '专注于方便食品和地方特色零食，主打亚洲市场'
      },
      { 
        id: 'chunwei', 
        name: '纯味食品 (Chunwei Foods)', 
        location: '悉尼', 
        employees: '0.9万', 
        revenue: 'A$150亿',
        description: '专注天然食品和儿童零食，强调无添加剂'
      },
    ],
    beverage: [
      { 
        id: 'qingquan', 
        name: '清泉饮料 (Qingquan Beverages)', 
        location: '广州', 
        employees: '1.5万', 
        revenue: '¥280亿',
        description: '专注功能饮料和健康饮品，注重环保包装'
      },
      { 
        id: 'bilang', 
        name: '碧浪饮品 (Bilang Drinks)', 
        location: '洛杉矶', 
        employees: '1.1万', 
        revenue: '$220亿',
        description: '专注于运动和健康饮料，主打年轻市场'
      },
      { 
        id: 'yunxi', 
        name: '云溪饮料 (Yunxi Beverages)', 
        location: '京都', 
        employees: '0.8万', 
        revenue: '¥180亿',
        description: '专注于传统和现代茶饮料，强调文化体验'
      },
    ],
    cosmetics: [
      { 
        id: 'liran', 
        name: '丽然美妆 (Liran Cosmetics)', 
        location: '巴黎', 
        employees: '2.2万', 
        revenue: '€380亿',
        description: '专注天然护肤和彩妆，强调可持续性'
      },
      { 
        id: 'qingyan', 
        name: '清颜美妆 (Qingyan Beauty)', 
        location: '上海', 
        employees: '1.8万', 
        revenue: '¥260亿',
        description: '专注于亚洲肌肤护理，主打植物成分'
      },
      { 
        id: 'guangcai', 
        name: '光彩美妆 (Guangcai Cosmetics)', 
        location: '首尔', 
        employees: '1.4万', 
        revenue: '₩280亿',
        description: '专注于彩妆和潮流美妆，面向年轻消费者'
      },
    ],
    cleaning: [
      { 
        id: 'jingxin', 
        name: '净新家居 (Jingxin Home)', 
        location: '东京', 
        employees: '0.6万', 
        revenue: '¥120亿',
        description: '专注环保清洁产品，主打安全和高效'
      },
      { 
        id: 'lujie', 
        name: '绿洁科技 (Lüjie Tech)', 
        location: '伦敦', 
        employees: '0.8万', 
        revenue: '£150亿',
        description: '专注于智能清洁解决方案，结合环保材料'
      },
      { 
        id: 'qingxin', 
        name: '清新之家 (Qingxin Home)', 
        location: '杭州', 
        employees: '1.2万', 
        revenue: '¥180亿',
        description: '专注家用清洁，强调天然成分和低成本'
      },
    ],
    apparel: [
      { 
        id: 'shangliu', 
        name: '尚流服饰 (Shangliu Fashion)', 
        location: '米兰', 
        employees: '3.5万', 
        revenue: '€520亿',
        description: '专注快时尚和可持续面料，面向年轻消费者'
      },
      { 
        id: 'yunshang', 
        name: '云裳服饰 (Yunshang Apparel)', 
        location: '苏州', 
        employees: '2.8万', 
        revenue: '¥380亿',
        description: '专注于传统与现代融合的服装，主打亚洲市场'
      },
      { 
        id: 'chaozhi', 
        name: '潮织时尚 (Chaozhi Fashion)', 
        location: '纽约', 
        employees: '2.1万', 
        revenue: '$320亿',
        description: '专注于街头潮流和功能性服装，面向全球年轻人'
      },
    ],
  };
  
  return companiesMap[industry || ''] || [];
};

const CompanySelection: React.FC<Props> = ({ appState, updateAppState, completeStep }) => {
  const [selectedCompany, setSelectedCompany] = useState<string | null>(appState.selectedCompany);
  const navigate = useNavigate();
  
  const companies = getCompaniesForIndustry(appState.selectedIndustry);

  const handleSelectCompany = (companyId: string) => {
    setSelectedCompany(companyId);
  };

  const handleNext = () => {
    if (selectedCompany) {
      updateAppState({ selectedCompany });
      completeStep(2);
      navigate('/product');
    }
  };

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">选择目标企业</h1>
          <p className="text-lg text-gray-600">
            请选择您想要分析的目标企业。每个企业都有不同的产品组合和市场表现，
            系统将提供该企业的历史销售数据和市场信息。
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {companies.map((company) => {
            const isSelected = selectedCompany === company.id;
            
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
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      isSelected ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                    }`}>
                      <Building className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">{company.name}</h3>
                      <div className="flex items-center text-gray-500 mt-1">
                        <MapPin className="w-4 h-4 mr-1" />
                        <span>{company.location}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-2">{company.description}</p>
                    </div>
                  </div>
                  
                  {isSelected && (
                    <div className="text-blue-600">
                      <ArrowRight className="w-5 h-5" />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">员工人数</p>
                      <p className="font-medium">{company.employees}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <TrendingUp className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-500">年营收</p>
                      <p className="font-medium">{company.revenue}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-between">
          <button
            onClick={() => navigate('/industry')}
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            上一步
          </button>
          
          <button
            onClick={handleNext}
            disabled={!selectedCompany}
            className={`px-8 py-3 rounded-lg font-medium transition-all ${
              selectedCompany
                ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-md hover:shadow-lg'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            下一步：选择产品
          </button>
        </div>
      </div>
    </div>
  );
};

export default CompanySelection;