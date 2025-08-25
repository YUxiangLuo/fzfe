import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Target, Users, Clock, Award, CheckCircle, Play, X } from 'lucide-react';

const Introduction: React.FC = () => {
  const navigate = useNavigate();

  const handleStartExperiment = () => {
    navigate('/industry');
  };

  const handleExit = () => {
    // 退出到主界面，显示header和sidebar
    navigate('/industry');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* 退出按钮 */}
      <button
        onClick={handleExit}
        className="absolute top-6 right-6 p-2 text-gray-600 hover:text-gray-900 hover:bg-white hover:shadow-md rounded-lg transition-all z-10"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="min-h-screen flex flex-col items-center justify-center p-8">
        <div className="max-w-6xl mx-auto text-center">
          {/* 主标题区域 */}
          <div className="mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-6">
              <BookOpen className="w-10 h-10 text-blue-600" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
              面向企业多源需求融合预测的
              <br />
              <span className="text-blue-600">生产计划决策虚拟仿真系统</span>
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              通过7个循序渐进的实验步骤，学习企业需求预测的核心理论与实践方法，
              掌握移动平均法、ARIMA、LSTM等多种预测算法的应用场景与效果评估。
            </p>
          </div>

          {/* 核心特色 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Target className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">实践导向</h3>
              <p className="text-gray-600">
                基于真实企业案例，从行业选择到生产计划制定，
                体验完整的商业决策流程
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">多算法对比</h3>
              <p className="text-gray-600">
                学习传统统计方法与现代AI算法，
                理解不同预测模型的优势与适用场景
              </p>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Award className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">能力提升</h3>
              <p className="text-gray-600">
                培养数据分析思维和商业决策能力，
                提升解决实际问题的综合素质
              </p>
            </div>
          </div>

          {/* 实验流程预览 */}
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 mb-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-8">实验流程概览</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4">
              {[
                { step: 1, title: '选择行业', icon: '🏭' },
                { step: 2, title: '选择企业', icon: '🏢' },
                { step: 3, title: '选择产品', icon: '📱' },
                { step: 4, title: '历史数据', icon: '📊' },
                { step: 5, title: '预测模型', icon: '🤖' },
                { step: 6, title: '结果评估', icon: '📈' },
                { step: 7, title: '生产计划', icon: '📋' },
              ].map((item, index) => (
                <div key={item.step} className="relative">
                  <div className="bg-gray-50 rounded-xl p-4 text-center hover:bg-gray-100 transition-colors">
                    <div className="text-2xl mb-2">{item.icon}</div>
                    <div className="text-xs font-medium text-blue-600 mb-1">步骤 {item.step}</div>
                    <div className="text-sm font-semibold text-gray-900">{item.title}</div>
                  </div>
                  {index < 6 && (
                    <div className="hidden lg:block absolute top-1/2 -right-2 w-4 h-0.5 bg-gray-300 transform -translate-y-1/2"></div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 学习目标 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              <div className="flex items-center space-x-3 mb-6">
                <Clock className="w-6 h-6 text-blue-600" />
                <h3 className="text-xl font-semibold text-gray-900">时间安排</h3>
              </div>
              <div className="space-y-4 text-left">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">预计完成时间</span>
                  <span className="font-semibold text-gray-900">60-90分钟</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">建议学习时长</span>
                  <span className="font-semibold text-gray-900">2-3小时</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">实验难度</span>
                  <span className="font-semibold text-orange-600">中等</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              <div className="flex items-center space-x-3 mb-6">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <h3 className="text-xl font-semibold text-gray-900">学习收获</h3>
              </div>
              <ul className="space-y-3 text-left text-gray-600">
                <li className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>掌握企业需求预测的基本理论</span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>学习多种预测算法的应用</span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>体验数据驱动的决策过程</span>
                </li>
                <li className="flex items-start space-x-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>培养商业分析思维能力</span>
                </li>
              </ul>
            </div>
          </div>

          {/* 开始实验按钮 */}
          <div className="relative">
            <button
              onClick={handleStartExperiment}
              className="group relative inline-flex items-center space-x-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-12 py-4 rounded-2xl text-lg font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 z-10"
            >
              <Play className="w-6 h-6 group-hover:scale-110 transition-transform" />
              <span>开始实验</span>
            </button>
          </div>

          <p className="text-gray-500 mt-6">
            点击开始按钮进入实验，系统将引导您完成整个学习流程
          </p>
        </div>
      </div>
    </div>
  );
};

export default Introduction;