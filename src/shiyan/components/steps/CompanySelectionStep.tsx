import React, { useState } from 'react';
import { Building, Star, MapPin, Users, DollarSign } from 'lucide-react';

interface CompanySelectionStepProps {
  data: any;
  onUpdate: (data: any) => void;
}

const companies = {
  retail: [
    {
      id: 'retail-1',
      name: '环球商城有限公司',
      description: '拥有500多家门店的大型零售连锁企业',
      size: '大型企业',
      employees: '50,000+',
      revenue: '150亿+',
      specialization: '百货商店、杂货、电子产品'
    },
    {
      id: 'retail-2', 
      name: '潮流时尚',
      description: '具有强大在线业务的快时尚零售商',
      size: '中型企业',
      employees: '5,000-10,000',
      revenue: '20-50亿',
      specialization: '服装、配饰、季节性时尚'
    }
  ],
  manufacturing: [
    {
      id: 'mfg-1',
      name: '工业解决方案集团',
      description: '重型机械和设备制造商',
      size: '大型企业',
      employees: '25,000+',
      revenue: '80亿+',
      specialization: '工业设备、B2B制造'
    },
    {
      id: 'mfg-2',
      name: '精密工具有限公司',
      description: '专业制造工具和组件',
      size: '中型企业',
      employees: '1,000-5,000',
      revenue: '5-10亿',
      specialization: '精密工具、定制组件'
    }
  ],
  technology: [
    {
      id: 'tech-1',
      name: '新一代电子',
      description: '消费电子和智能设备',
      size: '大型企业',
      employees: '30,000+',
      revenue: '120亿+',
      specialization: '智能手机、平板电脑、智能家居设备'
    },
    {
      id: 'tech-2',
      name: '云科技解决方案',
      description: '软件和云服务提供商',
      size: '中型企业',
      employees: '2,000-5,000',
      revenue: '10-30亿',
      specialization: '企业软件、云基础设施'
    }
  ]
};

const CompanySelectionStep: React.FC<CompanySelectionStepProps> = ({ data, onUpdate }) => {
  const [selectedCompany, setSelectedCompany] = useState(data.selectedCompany || '');
  const industry = data.selectedIndustry || 'retail';
  const availableCompanies = companies[industry as keyof typeof companies] || companies.retail;

  const handleCompanySelect = (companyId: string) => {
    setSelectedCompany(companyId);
    const company = availableCompanies.find(c => c.id === companyId);
    onUpdate({ selectedCompany: companyId, companyDetails: company });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">选择您的公司</h2>
        <p className="text-gray-600">
          在您选择的行业中选择一家公司进行分析。每家公司都有不同的
          特征，这将影响预测复杂性和业务场景。
        </p>
      </div>

      <div className="space-y-6">
        {availableCompanies.map((company) => (
          <div
            key={company.id}
            onClick={() => handleCompanySelect(company.id)}
            className={`cursor-pointer p-6 rounded-xl border-2 transition-all duration-200 hover:shadow-lg ${
              selectedCompany === company.id
                ? 'border-blue-500 bg-blue-50 shadow-md'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-4">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  <Building className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-xl font-semibold text-gray-900">{company.name}</h3>
                    <Star className="h-4 w-4 text-yellow-500 fill-current" />
                  </div>
                  <p className="text-gray-600 mb-4">{company.description}</p>
                  
                  <div className="grid md:grid-cols-4 gap-4">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">员工数</p>
                        <p className="text-sm font-medium text-gray-900">{company.employees}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">营收</p>
                        <p className="text-sm font-medium text-gray-900">{company.revenue}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Building className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">规模</p>
                        <p className="text-sm font-medium text-gray-900">{company.size}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-500">范围</p>
                        <p className="text-sm font-medium text-gray-900">全球</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-700">
                      <strong>专业领域：</strong> {company.specialization}
                    </p>
                  </div>
                </div>
              </div>
              
              {selectedCompany === company.id && (
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">✓</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {selectedCompany && (
        <div className="mt-8 p-6 bg-white rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">公司分析背景</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">预测复杂性</h4>
              <p className="text-blue-700 text-sm">
                公司规模和市场地位影响预测复杂性和数据可用性。
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h4 className="font-medium text-green-900 mb-2">业务场景</h4>
              <p className="text-green-700 text-sm">
                基于公司特征的不同业务场景和挑战。
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <h4 className="font-medium text-purple-900 mb-2">数据模式</h4>
              <p className="text-purple-700 text-sm">
                特定于此类公司的独特需求模式和季节性变化。
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompanySelectionStep;