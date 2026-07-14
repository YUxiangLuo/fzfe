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
              <p className="text-gray-800 font-medium">用第一个训练观测初始化水平：S₁ = Y₁</p>
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
              <p className="text-gray-800 font-medium">由用户给定平滑系数 α（0&lt;α≤1）；本系统不自动估计 α</p>
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
              <p className="text-gray-800 font-medium">在训练序列中按 Sₜ=αYₜ+(1-α)Sₜ₋₁ 逐期更新水平</p>
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
              <p className="text-gray-800 font-medium">训练结束后，以最后水平 S<sub>T</sub> 预测所有未来步；未来没有新观测可用于更新，因此多步预测保持水平不变</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-5 bg-sky-50 rounded-lg border border-sky-200">
        <h4 className="text-base font-semibold text-gray-800 mb-3">本系统实现说明</h4>
        <p className="text-gray-700 leading-relaxed text-base">
          本系统实现一次指数平滑，并明确采用首个训练观测初始化、用户固定 α。它适合无明显趋势和季节性的水平型销量序列。多步预测会沿用最新平滑水平；若数据存在明确趋势或季节性，应使用 Holt 或 Holt-Winters 扩展模型。最终销量点预测按 max(0, ŷ) 做非负兜底，残差与指标也使用截断后的值；这不是教科书递推式的一部分。
        </p>
      </div>
    </div>
  );
};

export default Intro;
