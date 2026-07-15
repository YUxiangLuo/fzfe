import React from 'react';
import { TrendingUp, Calendar } from 'lucide-react';

const Intro: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-800 mb-3">移动平均法 - 方法步骤</h3>
        <p className="text-gray-600 text-base leading-relaxed">
          移动平均法的一般步骤为：
        </p>
      </div>

      <div className="space-y-4 mt-8">
        <div className="flex gap-4 p-5 bg-gradient-to-r from-blue-50 to-blue-100/50 rounded-lg border border-blue-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex-shrink-0 w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-lg">
            1
          </div>
          <div className="flex-1 pt-1">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <p className="text-gray-800 font-medium">选择整数窗口 n，并用最近 n 期观测的算术平均预测下一期；本系统要求 2≤n≤训练样本数</p>
            </div>
          </div>
        </div>

        <div className="flex gap-4 p-5 bg-gradient-to-r from-indigo-50 to-indigo-100/50 rounded-lg border border-indigo-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex-shrink-0 w-10 h-10 bg-indigo-500 text-white rounded-full flex items-center justify-center font-bold text-lg">
            2
          </div>
          <div className="flex-1 pt-1">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-5 h-5 text-indigo-600" />
              <p className="text-gray-800 font-medium">预测多期时，把刚得到的预测值放回窗口并移除最早值，再计算下一期；不读取评估期真实值</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-5 bg-sky-50 rounded-lg border border-sky-200">
        <h4 className="text-base font-semibold text-gray-800 mb-3">本系统实现说明</h4>
        <p className="text-gray-700 leading-relaxed text-base">
          移动平均的教科书定义通常先给出下一期预测。本系统为了评估和预测未来多期销量，会把每一期预测值滚入窗口继续递推，不使用未来真实值。窗口 n=1 不体现均值平滑，因此教学入口从 n=2 开始。逐 horizon 的标准差、95%区间和99%上侧误差由训练段 rolling-origin 多步残差校准；区间采用经验分位数，样本不足时会明确标记 fallback。最终销量点预测按 max(0, ŷ) 截断，该截断是业务后处理。
        </p>
      </div>
    </div>
  );
};

export default Intro;
