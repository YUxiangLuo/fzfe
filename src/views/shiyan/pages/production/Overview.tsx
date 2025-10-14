import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Factory, ArrowRight } from 'lucide-react';

const Overview: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
      <div className="flex items-center space-x-4 mb-6">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
          <Factory className="w-8 h-8 text-blue-600" />
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-gray-900">企业大脑：主生产计划 (MPS)</h2>
          <p className="text-blue-600 font-medium">探索企业如何平衡客户需求与生产能力</p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-800 mb-3">🎯 什么是主生产计划 (Master Production Schedule)？</h3>
          <p className="text-blue-700">
            主生产计划 (MPS) 是连接企业战略目标与生产执行的桥梁。它是一个详细的计划，明确说明了在特定时间段内，<strong>需要生产哪些最终产品</strong>、<strong>生产多少</strong>以及<strong>何时生产</strong>。MPS 不是一个简单的销售预测，而是一个综合考虑了市场需求、现有订单、库存水平和生产能力的切实可行的生产指令。
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">核心输入1：需求预测</h4>
            <p className="text-gray-700 text-sm">基于您选择的最佳模型（如LSTM）预测的未来市场需求量。</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">核心输入2：生产能力</h4>
            <p className="text-gray-700 text-sm">包括设备产能、人力资源和原材料供应等现实约束条件。</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="font-semibold text-gray-800 mb-2">核心输入3：库存策略</h4>
            <p className="text-gray-700 text-sm">期望的期末库存水平、安全库存量以及库存持有成本。</p>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-green-800 mb-3">💡 为什么 MPS 至关重要？</h3>
          <ul className="space-y-2 text-green-700 text-sm list-disc list-inside">
            <li><strong>稳定生产</strong>：避免因需求波动导致生产线频繁启停，提高生产效率。</li>
            <li><strong>控制库存</strong>：防止库存积压或缺货，优化现金流，降低仓储成本。</li>
            <li><strong>提升客户满意度</strong>：确保按时交付订单，提高企业信誉。</li>
            <li><strong>指导物料采购</strong>：为物料需求计划 (MRP) 提供准确的输入，确保原材料及时到位。</li>
          </ul>
        </div>

        <button
          onClick={() => navigate('/production/variables')}
          className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md hover:shadow-lg transition-all font-medium"
        >
          <span>下一步：计算生产变量</span>
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default Overview;
