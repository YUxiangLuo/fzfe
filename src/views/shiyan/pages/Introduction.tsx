import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Target, Users, Clock, Award, CheckCircle, Play, X, ArrowRight, ArrowLeft, Download, Eye, FileText } from 'lucide-react';

const Introduction: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    { id: 0, title: '实验概述', icon: BookOpen },
    { id: 1, title: '实验流程', icon: Target },
    { id: 2, title: '实验手册', icon: FileText },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // 完成所有步骤，进入首页
      navigate('/industry');
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleExit = () => {
    navigate('/industry');
  };

  const handleDownloadPDF = () => {
    // 模拟PDF下载
    const link = document.createElement('a');
    link.href = '/experiment-manual.pdf'; // 实际项目中应该是真实的PDF文件路径
    link.download = '企业需求预测实验手册.pdf';
    link.click();
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-8">
            {/* 主标题区域 */}
            <div className="text-center">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
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

            {/* 学习目标 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
          </div>
        );

      case 1:
        return (
          <div className="space-y-8">
            <div className="text-center mb-8">
              <h2 className="text-4xl font-bold text-gray-900 mb-6">实验流程概览</h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                通过7个循序渐进的步骤，完整体验企业需求预测与生产计划决策的全过程
              </p>
            </div>

            {/* 实验流程步骤 */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4">
                {[
                  { step: 1, title: '选择行业', icon: '🏭', desc: '从8个行业中选择目标行业' },
                  { step: 2, title: '选择企业', icon: '🏢', desc: '选择具体的企业进行分析' },
                  { step: 3, title: '选择产品', icon: '📱', desc: '确定需要预测的具体产品' },
                  { step: 4, title: '历史数据', icon: '📊', desc: '分析产品的历史销售数据' },
                  { step: 5, title: '预测模型', icon: '🤖', desc: '选择并训练预测算法' },
                  { step: 6, title: '结果评估', icon: '📈', desc: '评估模型预测效果' },
                  { step: 7, title: '生产计划', icon: '📋', desc: '制定基于预测的生产计划' },
                ].map((item, index) => (
                  <div key={item.step} className="relative">
                    <div className="bg-gray-50 rounded-xl p-4 text-center hover:bg-blue-50 transition-colors cursor-pointer">
                      <div className="text-3xl mb-3">{item.icon}</div>
                      <div className="text-xs font-medium text-blue-600 mb-2">步骤 {item.step}</div>
                      <div className="text-sm font-semibold text-gray-900 mb-2">{item.title}</div>
                      <div className="text-xs text-gray-600 leading-tight">{item.desc}</div>
                    </div>
                    {index < 6 && (
                      <div className="hidden lg:block absolute top-1/2 -right-2 w-4 h-0.5 bg-blue-300 transform -translate-y-1/2"></div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-8">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-gray-900 mb-6">实验手册</h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                详细的实验指导手册，包含理论知识、操作步骤和案例分析
              </p>
            </div>

            {/* PDF预览区域 */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900">企业需求预测实验手册.pdf</h3>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={handleDownloadPDF}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span>下载PDF</span>
                    </button>
                    <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                      <Eye className="w-4 h-4" />
                      <span>全屏预览</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* PDF预览内容 */}
              <div className="h-96 bg-gray-100 flex items-center justify-center">
                <div className="text-center">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-700 mb-2">PDF预览</h4>
                  <p className="text-gray-500 mb-4">实验手册包含以下内容：</p>
                  <div className="text-left max-w-md mx-auto space-y-2 text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      <span>第一章：需求预测理论基础</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      <span>第二章：预测算法详解</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      <span>第三章：实验操作指南</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      <span>第四章：案例分析与思考</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      <span>附录：常用公式与参考资料</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 准备开始提示 */}
            <div className="bg-green-50 border border-green-200 rounded-xl p-6">
              <div className="flex items-center space-x-3 mb-4">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <h4 className="font-semibold text-green-800">准备开始实验</h4>
              </div>
              <p className="text-green-700 mb-4">
                您已经完成了实验前的准备工作！建议您先下载实验手册，在实验过程中可以随时参考。
              </p>
              <div className="text-sm text-green-600">
                <p>💡 小贴士：实验过程中遇到问题时，可以参考手册中的相关章节获得帮助。</p>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
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

      <div className="min-h-screen flex flex-col">
        {/* 进度条区域 */}
        <div className="bg-white border-b border-gray-200 px-8 pt-12 pb-4">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = index === currentStep;
                const isCompleted = index < currentStep;
                
                return (
                  <div key={step.id} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all ${
                        isCompleted 
                          ? 'bg-green-600 border-green-600 text-white' 
                          : isActive 
                            ? 'bg-blue-600 border-blue-600 text-white' 
                            : 'bg-gray-100 border-gray-300 text-gray-400'
                      }`}>
                        {isCompleted ? (
                          <CheckCircle className="w-6 h-6" />
                        ) : (
                          <Icon className="w-6 h-6" />
                        )}
                      </div>
                      <span className={`mt-2 text-sm font-medium ${
                        isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        {step.title}
                      </span>
                    </div>
                    
                    {index < steps.length - 1 && (
                      <div className={`flex-1 h-0.5 mx-4 ${
                        index < currentStep ? 'bg-green-600' : 'bg-gray-300'
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-6xl mx-auto w-full">
            {renderStepContent()}
          </div>
        </div>

        {/* 导航按钮区域 */}
        <div className="bg-white border-t border-gray-200 px-8 py-6">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <button
              onClick={handlePrev}
              disabled={currentStep === 0}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-all ${
                currentStep === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <ArrowLeft className="w-5 h-5" />
              <span>上一步</span>
            </button>

            <div className="text-center">
              <span className="text-sm text-gray-500">
                {currentStep + 1} / {steps.length}
              </span>
            </div>

            <button
              onClick={handleNext}
              className="flex items-center space-x-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md hover:shadow-lg transition-all font-medium"
            >
              <span>{currentStep === steps.length - 1 ? '开始实验' : '下一步'}</span>
              {currentStep === steps.length - 1 ? (
                <Play className="w-5 h-5" />
              ) : (
                <ArrowRight className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Introduction;