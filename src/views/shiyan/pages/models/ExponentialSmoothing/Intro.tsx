import React from 'react';
import { PlayCircle, Settings, TrendingUp, RefreshCw } from 'lucide-react';

const Intro: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-800 mb-3">指数平滑法 - 方法步骤</h3>
        <p className="text-gray-600 text-base leading-relaxed">
          指数平滑法的一般步骤为：
        </p>
      </div>

      <div className="space-y-4 mt-8">
        <div className="flex gap-4 p-5 bg-gradient-to-r from-blue-50 to-blue-100/50 rounded-lg border border-blue-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex-shrink-0 w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-lg">
            1
          </div>
          <div className="flex-1 pt-1">
            <div className="flex items-center gap-2 mb-1">
              <PlayCircle className="w-5 h-5 text-blue-600" />
              <p className="text-gray-800 font-medium">选择一个初始值作为预测的起点</p>
            </div>
          </div>
        </div>

        <div className="flex gap-4 p-5 bg-gradient-to-r from-indigo-50 to-indigo-100/50 rounded-lg border border-indigo-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex-shrink-0 w-10 h-10 bg-indigo-500 text-white rounded-full flex items-center justify-center font-bold text-lg">
            2
          </div>
          <div className="flex-1 pt-1">
            <div className="flex items-center gap-2 mb-1">
              <Settings className="w-5 h-5 text-indigo-600" />
              <p className="text-gray-800 font-medium">选择一个平滑系数（常用符号为α）</p>
            </div>
          </div>
        </div>

        <div className="flex gap-4 p-5 bg-gradient-to-r from-purple-50 to-purple-100/50 rounded-lg border border-purple-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex-shrink-0 w-10 h-10 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold text-lg">
            3
          </div>
          <div className="flex-1 pt-1">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-5 h-5 text-purple-600" />
              <p className="text-gray-800 font-medium">使用指数平滑公式计算下一个时间点的预测值</p>
            </div>
          </div>
        </div>

        <div className="flex gap-4 p-5 bg-gradient-to-r from-pink-50 to-pink-100/50 rounded-lg border border-pink-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex-shrink-0 w-10 h-10 bg-pink-500 text-white rounded-full flex items-center justify-center font-bold text-lg">
            4
          </div>
          <div className="flex-1 pt-1">
            <div className="flex items-center gap-2 mb-1">
              <RefreshCw className="w-5 h-5 text-pink-600" />
              <p className="text-gray-800 font-medium">根据得到的预测值和新的观测值，继续迭代计算下一个时间点的预测值，直至需要预测的时间段结束</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Intro;
