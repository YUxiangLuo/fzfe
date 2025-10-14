import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, ArrowRight } from 'lucide-react';

const ServiceLevel: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
      <div className="flex items-center space-x-4 mb-6">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
          <Target className="w-8 h-8 text-blue-600" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">计算服务水平</h2>
          <p className="text-blue-600 font-medium">量化我们满足客户需求的能力</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">🎯 什么是服务水平 (Service Level)？</h3>
          <p className="text-blue-700">
            服务水平是一个关键绩效指标 (KPI)，它衡量的是在客户需要时，我们能多大程度上成功满足他们的需求。简单来说，它就是"有货率"或"订单满足率"的量化体现。服务水平越高，客户满意度越高，但通常也意味着更高的库存成本。
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">服务水平计算公式</h3>
          <p className="text-gray-600 mb-4">
            计算服务水平的核心在于"缺货率"，即需求中有多少比例我们没能满足。公式如下：
          </p>
          <div className="bg-white border border-gray-200 rounded-lg p-4 text-center">
            <p className="text-lg font-mono text-gray-800">
              <span className="font-bold text-blue-600">服务水平</span> ={' '}
              <span className="text-gray-600">1</span> -{' '}
              <span className="font-bold text-red-600">(缺货量 / 实际需求量)</span>
            </p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">举个例子</h3>
          <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3 text-sm">
            <p>• 假设某月，市场对您的产品总需求为 <strong>1,000</strong> 件。</p>
            <p>• 由于生产或库存原因，您最终只交付了 <strong>920</strong> 件，产生了 <strong>80</strong> 件的缺货。</p>
            <p>• <strong>缺货率</strong> = 80 / 1,000 = 0.08 (或 8%)</p>
            <p className="border-t border-gray-200 pt-3 mt-3 font-semibold">
              • <strong>服务水平</strong> = 1 - 0.08 = 0.92，即 <span className="text-xl text-blue-600">92%</span>。
            </p>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-800 mb-3">💡 关键权衡：成本 vs 满意度</h3>
          <p className="text-green-700 text-sm">
            追求100%的服务水平在现实中几乎是不可能的，且成本极高。企业的目标是在<strong>库存持有成本</strong>（为维持高服务水平而预备的安全库存）和<strong>缺货成本</strong>（因缺货导致的销售损失和客户流失）之间找到最佳平衡点。
          </p>
        </div>

        <button
          onClick={() => navigate('/production/forecast')}
          className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md hover:shadow-lg transition-all font-medium"
        >
          <span>我已理解，开始计算预测量</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default ServiceLevel;
