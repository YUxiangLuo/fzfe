import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Target,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Users,
  Lightbulb,
  Award,
  AlertCircle,
  CheckCircle2,
  Factory,
  Boxes,
  Briefcase,
} from 'lucide-react';

const ProductionRoleIntroduction: React.FC = () => {
  const navigate = useNavigate();

  const handlePrevious = () => {
    navigate('/production/scenario');
  };

  const handleNext = () => {
    navigate('/production/steps');
  };

  return (
    <div className="h-full flex flex-col gap-4">
      {/* 内容区域 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex-1 min-h-0 overflow-y-auto">
        <div className="space-y-5">
          {/* 头部标语 */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  <Factory className="w-8 h-8" />
                </div>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-2">欢迎！生产部经理</h2>
                <p className="text-indigo-100 text-sm leading-relaxed">
                  您是企业运营的核心枢纽，负责将需求预测转化为可执行的生产计划。
                  您的决策将直接影响库存水平、生产效率和客户满意度。
                  现在，让我们开始制定科学的主生产计划（MPS）！
                </p>
              </div>
            </div>
          </div>

          {/* 两列布局 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* 左列 */}
            <div className="space-y-5">
              {/* 角色职责 */}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                <h3 className="text-lg font-semibold text-indigo-900 mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  核心职责
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-indigo-900 font-medium">生产计划制定</p>
                      <p className="text-xs text-indigo-700 mt-1">
                        根据需求预测制定主生产计划（MPS），平衡产能、库存和需求
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-indigo-900 font-medium">库存控制优化</p>
                      <p className="text-xs text-indigo-700 mt-1">
                        设定安全库存，防止缺货；控制库存成本，避免积压
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-indigo-900 font-medium">服务水平保障</p>
                      <p className="text-xs text-indigo-700 mt-1">
                        确保按时交付率，满足客户需求，提升客户满意度
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-indigo-900 font-medium">资源协调调度</p>
                      <p className="text-xs text-indigo-700 mt-1">
                        协调原材料采购、生产产能、仓储物流等各环节资源
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 典型决策场景 */}
              <div className="bg-gradient-to-br from-pink-50 to-rose-50 border border-pink-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                <h3 className="text-lg font-semibold text-pink-900 mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  典型决策场景
                </h3>
                <div className="space-y-3">
                  <div className="bg-white/60 rounded-lg p-3 border border-pink-200">
                    <p className="text-sm text-pink-900 font-semibold mb-2">
                      场景1：需求波动应对
                    </p>
                    <p className="text-xs text-gray-700">
                      当预测显示未来需求将大幅增加时，需要提前增加安全库存和生产投入，避免缺货损失
                    </p>
                  </div>
                  <div className="bg-white/60 rounded-lg p-3 border border-pink-200">
                    <p className="text-sm text-pink-900 font-semibold mb-2">
                      场景2：成本控制优化
                    </p>
                    <p className="text-xs text-gray-700">
                      需求相对稳定时，可降低安全库存水平，减少资金占用和仓储成本
                    </p>
                  </div>
                  <div className="bg-white/60 rounded-lg p-3 border border-pink-200">
                    <p className="text-sm text-pink-900 font-semibold mb-2">
                      场景3：服务水平权衡
                    </p>
                    <p className="text-xs text-gray-700">
                      高端产品提高服务水平至98%，普通产品保持90%，实现差异化库存策略
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 右列 */}
            <div className="space-y-5">
              {/* MPS制定流程 */}
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                <h3 className="text-lg font-semibold text-purple-900 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  您即将完成的工作流程
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-lg flex items-center justify-center font-bold text-sm shadow-md">
                      1
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-purple-900 text-sm mb-1">规划总览</h4>
                      <p className="text-xs text-gray-700 leading-relaxed">
                        了解MPS表结构，理解各列指标的含义和计算逻辑
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-lg flex items-center justify-center font-bold text-sm shadow-md">
                      2
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-purple-900 text-sm mb-1">生产变量计算</h4>
                      <p className="text-xs text-gray-700 leading-relaxed">
                        学习如何计算期初库存和缺货量，掌握库存动态变化
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-lg flex items-center justify-center font-bold text-sm shadow-md">
                      3
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-purple-900 text-sm mb-1">服务水平评估</h4>
                      <p className="text-xs text-gray-700 leading-relaxed">
                        基于需求与缺货计算服务水平，判断计划是否满足目标
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-lg flex items-center justify-center font-bold text-sm shadow-md">
                      4
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-purple-900 text-sm mb-1">预测量确定</h4>
                      <p className="text-xs text-gray-700 leading-relaxed">
                        应用需求预测结果，计算安全库存和预测需求量
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-lg flex items-center justify-center font-bold text-sm shadow-md">
                      5
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-purple-900 text-sm mb-1">投入量决策</h4>
                      <p className="text-xs text-gray-700 leading-relaxed">
                        确定实际生产投入量，完成学习步骤
                      </p>
                    </div>
                  </div>
                  <div className="rounded-lg border border-purple-200 bg-white/60 p-3">
                    <p className="text-xs text-gray-700 leading-relaxed">
                      完成以上 5 个学习步骤后，系统会自动生成完整 MPS 结果表供您查看与分析。
                    </p>
                  </div>
                </div>
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
            className="flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-all hover:shadow-md font-medium"
          >
            <ChevronLeft className="w-5 h-5" />
            上一步
          </button>
          <button
            onClick={handleNext}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg transition-all hover:shadow-lg font-medium"
          >
            开始制定生产计划
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductionRoleIntroduction;
