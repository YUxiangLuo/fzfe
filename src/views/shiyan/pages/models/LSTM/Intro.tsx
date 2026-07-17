import React from 'react';
import { Database, Cpu, TrendingUp } from 'lucide-react';

const Intro: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-800 mb-3">LSTM 法 - 方法步骤</h3>
        <p className="text-gray-600 text-base leading-relaxed">
          LSTM 法的一般步骤为:
        </p>
      </div>

      <div className="space-y-4 mt-8">
        <div className="flex gap-4 p-5 bg-gradient-to-r from-blue-50 to-blue-100/50 rounded-lg border border-blue-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex-shrink-0 w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-lg">
            1
          </div>
          <div className="flex-1 pt-1">
            <div className="flex items-center gap-2 mb-1">
              <Database className="w-5 h-5 text-blue-600" />
              <p className="text-gray-800 font-medium">只用训练区间拟合数值缩放器和类别 One-Hot 编码器，再构造历史窗口与多步销量标签。</p>
            </div>
          </div>
        </div>

        <div className="flex gap-4 p-5 bg-gradient-to-r from-purple-50 to-purple-100/50 rounded-lg border border-purple-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex-shrink-0 w-10 h-10 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold text-lg">
            2
          </div>
          <div className="flex-1 pt-1">
            <div className="flex items-center gap-2 mb-1">
              <Cpu className="w-5 h-5 text-purple-600" />
              <p className="text-gray-800 font-medium">按参数预算构建单层 LSTM 与直接多步 Dense 输出头。有限时间验证模式用时间顺序验证 loss 早停选轮数，再在全部窗口重拟合。</p>
            </div>
          </div>
        </div>

        <div className="flex gap-4 p-5 bg-gradient-to-r from-green-50 to-green-100/50 rounded-lg border border-green-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex-shrink-0 w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-lg">
            3
          </div>
          <div className="flex-1 pt-1">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <p className="text-gray-800 font-medium">仅输入训练截止点前由样本量动态确定的最近历史窗口，一次输出完整预测跨度；还原销量尺度后按 max(0, ŷ) 截断。</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-5 bg-sky-50 rounded-lg border border-sky-200">
        <h4 className="text-base font-semibold text-gray-800 mb-3">本系统实现说明</h4>
        <p className="text-gray-700 leading-relaxed text-base">
          教科书重点是 LSTM 单元的门控机制；层数、容量和训练轮数属于工程选择。本系统根据训练长度、预测跨度和编码后特征数动态推导 look-back、隐藏单元、批大小与最大轮数。监督窗口足够时使用带 horizon 隔离的有限时间验证，过小数据进入明确标注的教学演示模式；两者都不等同于生产级泛化验证。模型不会读取未来特征轨迹，也不会自动退回递归单步预测，独立评估结果还应与上一期值、季节上一期值或漂移等朴素基线比较。
        </p>
      </div>
    </div>
  );
};

export default Intro;
