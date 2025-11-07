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
  Briefcase,
  LineChart,
} from 'lucide-react';

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
        <div className="space-y-5">
          {/* 头部标语 */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-lg flex items-center justify-center">
                  <Briefcase className="w-8 h-8" />
                </div>
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-2">欢迎！市场部经理</h2>
                <p className="text-blue-100 text-sm leading-relaxed">
                  您是企业决策链中的关键角色，负责洞察市场动态、预测产品需求。
                  您的预测将影响企业的生产节奏、库存管理和经营效益。
                  现在，让我们开始您的需求预测之旅！
                </p>
              </div>
            </div>
          </div>

          {/* 两列布局 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* 左列 */}
            <div className="space-y-5">
              {/* 角色职责 */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                <h3 className="text-lg font-semibold text-blue-900 mb-4 flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  核心职责
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-blue-900 font-medium">市场趋势分析</p>
                      <p className="text-xs text-blue-700 mt-1">
                        研究历史销售数据，识别季节性、周期性和趋势性规律
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-blue-900 font-medium">需求预测建模</p>
                      <p className="text-xs text-blue-700 mt-1">
                        运用多种预测模型，选择最适合产品特性的预测方法
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-blue-900 font-medium">决策支持输出</p>
                      <p className="text-xs text-blue-700 mt-1">
                        为生产计划、库存管理、采购决策提供数据依据
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-blue-900 font-medium">持续优化改进</p>
                      <p className="text-xs text-blue-700 mt-1">
                        评估预测准确度，不断调整和优化预测模型
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 关键绩效指标 */}
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                <h3 className="text-lg font-semibold text-emerald-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  关键绩效指标（KPIs）
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/60 rounded-lg p-3 border border-emerald-200">
                    <div className="text-2xl font-bold text-emerald-700 mb-1">±5%</div>
                    <div className="text-xs text-emerald-900">预测误差目标</div>
                  </div>
                  <div className="bg-white/60 rounded-lg p-3 border border-emerald-200">
                    <div className="text-2xl font-bold text-emerald-700 mb-1">90%+</div>
                    <div className="text-xs text-emerald-900">预测准确率</div>
                  </div>
                  <div className="bg-white/60 rounded-lg p-3 border border-emerald-200">
                    <div className="text-2xl font-bold text-emerald-700 mb-1">85%+</div>
                    <div className="text-xs text-emerald-900">服务水平目标</div>
                  </div>
                  <div className="bg-white/60 rounded-lg p-3 border border-emerald-200">
                    <div className="text-2xl font-bold text-emerald-700 mb-1">15%↓</div>
                    <div className="text-xs text-emerald-900">库存成本降低</div>
                  </div>
                </div>
              </div>

              {/* 核心技能 */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                <h3 className="text-lg font-semibold text-amber-900 mb-4 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5" />
                  需要的核心技能
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-2 bg-white/60 rounded-lg px-3 py-2 border border-amber-200">
                    <LineChart className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span className="text-xs text-amber-900 font-medium">数据分析</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/60 rounded-lg px-3 py-2 border border-amber-200">
                    <BarChart3 className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span className="text-xs text-amber-900 font-medium">统计建模</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/60 rounded-lg px-3 py-2 border border-amber-200">
                    <TrendingUp className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span className="text-xs text-amber-900 font-medium">趋势识别</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/60 rounded-lg px-3 py-2 border border-amber-200">
                    <Users className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span className="text-xs text-amber-900 font-medium">跨部门协作</span>
                  </div>
                </div>
              </div>
            </div>

            {/* 右列 */}
            <div className="space-y-5">
              {/* 预测工作流程 */}
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
                      <h4 className="font-semibold text-purple-900 text-sm mb-1">选择数据时段</h4>
                      <p className="text-xs text-gray-700 leading-relaxed">
                        划分训练集和评估集，确保模型训练的有效性和结果的可验证性
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-lg flex items-center justify-center font-bold text-sm shadow-md">
                      2
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-purple-900 text-sm mb-1">了解预测模型</h4>
                      <p className="text-xs text-gray-700 leading-relaxed">
                        学习移动平均、指数平滑、ARIMA、LSTM等模型，以及集成学习方法
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-lg flex items-center justify-center font-bold text-sm shadow-md">
                      3
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-purple-900 text-sm mb-1">选择并应用模型</h4>
                      <p className="text-xs text-gray-700 leading-relaxed">
                        训练多种模型，比较MAE、RMSE等性能指标，选出最优方案
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-lg flex items-center justify-center font-bold text-sm shadow-md">
                      4
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-purple-900 text-sm mb-1">评估预测结果</h4>
                      <p className="text-xs text-gray-700 leading-relaxed">
                        分析预测误差，评估模型可靠性，为下游生产计划提供数据支持
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 决策场景示例 */}
              <div className="bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                <h3 className="text-lg font-semibold text-rose-900 mb-4 flex items-center gap-2">
                  <Award className="w-5 h-5" />
                  典型决策场景
                </h3>
                <div className="space-y-3">
                  <div className="bg-white/60 rounded-lg p-3 border border-rose-200">
                    <p className="text-sm text-rose-900 font-semibold mb-2">
                      场景1：淡旺季需求波动
                    </p>
                    <p className="text-xs text-gray-700">
                      产品呈现明显的季节性特征时，需选择能够捕捉周期性规律的模型（如指数平滑、ARIMA），避免库存积压或缺货
                    </p>
                  </div>
                  <div className="bg-white/60 rounded-lg p-3 border border-rose-200">
                    <p className="text-sm text-rose-900 font-semibold mb-2">
                      场景2：新产品市场导入
                    </p>
                    <p className="text-xs text-gray-700">
                      历史数据有限时，应结合市场研判和同类产品经验，采用简单模型（如移动平均）快速响应
                    </p>
                  </div>
                  <div className="bg-white/60 rounded-lg p-3 border border-rose-200">
                    <p className="text-sm text-rose-900 font-semibold mb-2">
                      场景3：复杂多因素影响
                    </p>
                    <p className="text-xs text-gray-700">
                      需求受多种因素影响时，可尝试LSTM深度学习模型或集成模型，提升预测准确度
                    </p>
                  </div>
                </div>
              </div>

              {/* 注意事项 */}
              <div className="bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-200 rounded-lg p-5 hover:shadow-md transition-shadow">
                <h3 className="text-lg font-semibold text-cyan-900 mb-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5" />
                  重要提示
                </h3>
                <div className="space-y-2 text-xs text-cyan-900">
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-600 flex-shrink-0 mt-1.5"></div>
                    <p>
                      <strong>数据质量优先：</strong>确保训练数据的完整性和准确性，数据质量决定预测效果
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-600 flex-shrink-0 mt-1.5"></div>
                    <p>
                      <strong>模型不是万能的：</strong>没有一种模型适用于所有场景，需根据实际情况选择
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-600 flex-shrink-0 mt-1.5"></div>
                    <p>
                      <strong>持续跟踪验证：</strong>预测结果需要与实际销售对比，不断调整优化
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-600 flex-shrink-0 mt-1.5"></div>
                    <p>
                      <strong>跨部门沟通：</strong>与生产、采购、财务部门保持密切沟通，及时反馈市场变化
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
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg transition-all hover:shadow-lg font-medium"
          >
            开始预测工作
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default RoleIntroduction;
