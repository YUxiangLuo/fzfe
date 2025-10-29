import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';

const RoleIntroduction: React.FC = () => {
  const navigate = useNavigate();

  const handlePrevious = () => {
    navigate('/model/scenario');
  };

  const handleNext = () => {
    navigate('/model/window');
  };

  return (
    <div className="h-full flex flex-col gap-4">
      {/* 内容区域 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex-1 min-h-0 overflow-y-auto">
        {/* 角色职责 */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-5 mb-5">
          <h3 className="text-lg font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <Target className="w-5 h-5" />
            角色职责
          </h3>
          <div className="text-blue-800 space-y-2 text-sm">
            <p>
              作为市场部经理，您负责分析市场趋势、预测产品需求，并为生产计划提供数据支持。
              您的决策将直接影响企业的库存管理、生产安排和经营效益。
            </p>
            <p className="font-medium">
              在本次实验中，您需要运用科学的预测方法，为企业的生产决策提供可靠依据。
            </p>
          </div>
        </div>

        {/* 预测工作流程 */}
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-5">
          <h3 className="text-lg font-semibold text-purple-900 mb-3 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            您即将完成的工作流程
          </h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-7 h-7 bg-purple-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                1
              </div>
              <div>
                <h4 className="font-semibold text-purple-900 text-sm">选择数据时段</h4>
                <p className="text-xs text-gray-700">划分训练集和评估集，为模型训练做准备</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-7 h-7 bg-purple-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                2
              </div>
              <div>
                <h4 className="font-semibold text-purple-900 text-sm">了解预测模型</h4>
                <p className="text-xs text-gray-700">学习4种基础模型和3种融合模型的原理与特点</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-7 h-7 bg-purple-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                3
              </div>
              <div>
                <h4 className="font-semibold text-purple-900 text-sm">选择并应用模型</h4>
                <p className="text-xs text-gray-700">尝试多种预测方法，比较模型效果，选出最佳方案</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-7 h-7 bg-purple-600 text-white rounded-full flex items-center justify-center font-semibold text-sm">
                4
              </div>
              <div>
                <h4 className="font-semibold text-purple-900 text-sm">评估预测结果</h4>
                <p className="text-xs text-gray-700">分析模型性能指标，为生产计划提供决策依据</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 底部导航按钮 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex-shrink-0">
        <div className="flex justify-between items-center">
          <button
            onClick={handlePrevious}
            className="flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium"
          >
            <ChevronLeft className="w-5 h-5" />
            上一步
          </button>
          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            下一步
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleIntroduction;
