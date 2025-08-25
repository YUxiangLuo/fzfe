import React from 'react';
import { BookOpen, TrendingUp, Cog, Target } from 'lucide-react';
import { User } from '../../App';

interface IntroductionStepProps {
  data: any;
  onUpdate: (data: any) => void;
  user: User | null;
}

const IntroductionStep: React.FC<IntroductionStepProps> = ({ data, onUpdate, user }) => {
  const concepts = [
    {
      icon: TrendingUp,
      title: '需求预测',
      description: '使用历史数据和统计模型预测未来客户需求'
    },
    {
      icon: Cog,
      title: '生产计划',
      description: '基于预测优化生产计划和资源配置'
    },
    {
      icon: Target,
      title: '决策制定',
      description: '使用数据驱动的洞察和分析做出明智的商业决策'
    }
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl p-8 mb-8">
        <div className="flex items-center space-x-4 mb-4">
          <BookOpen className="h-12 w-12" />
          <div>
            <h2 className="text-2xl font-bold">欢迎使用仿真系统</h2>
            {user && (
              <p className="text-blue-100">您好 {user.name}，准备开始学习了吗？</p>
            )}
          </div>
        </div>
        <p className="text-lg text-blue-100">
          这个交互式仿真系统将引导您完成需求预测和生产计划的完整过程，
          使用真实世界的场景和行业标准方法。
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        {concepts.map((concept, index) => (
          <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <concept.icon className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{concept.title}</h3>
            </div>
            <p className="text-gray-600">{concept.description}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">您将学到什么</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-green-600 text-xs font-bold">✓</span>
              </div>
              <span className="text-gray-700">应用各种预测算法（移动平均、ARIMA、LSTM）</span>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-green-600 text-xs font-bold">✓</span>
              </div>
              <span className="text-gray-700">使用统计指标评估预测准确性</span>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-green-600 text-xs font-bold">✓</span>
              </div>
              <span className="text-gray-700">基于需求预测创建生产计划</span>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-green-600 text-xs font-bold">✓</span>
              </div>
              <span className="text-gray-700">分析真实世界的商业场景</span>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-green-600 text-xs font-bold">✓</span>
              </div>
              <span className="text-gray-700">理解集成预测方法</span>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-green-600 text-xs font-bold">✓</span>
              </div>
              <span className="text-gray-700">生成综合分析报告</span>
            </div>
          </div>
        </div>
      </div>

      {!user && (
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-amber-800 text-center">
            请登录以开始仿真并跟踪您的进度
          </p>
        </div>
      )}
    </div>
  );
};

export default IntroductionStep;