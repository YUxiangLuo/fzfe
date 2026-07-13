import React from 'react';

const Formula: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-800 mb-3">移动平均法 - 计算公式</h3>
        <p className="text-gray-600 text-base leading-relaxed">
          一次移动平均数公式如下:
        </p>
      </div>

      <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 shadow-sm">
        <div className="flex items-center justify-center text-xl font-mono text-gray-800 mb-2">
          <code className="px-4 py-3 bg-white rounded-md shadow-sm">
            M(t) = (Y(t-1) + Y(t-2) + ... + Y(t-n)) / n
          </code>
          <span className="ml-4 text-base text-gray-600 font-sans">t ≥ n</span>
        </div>
      </div>

      <div className="mt-6 p-5 bg-gray-50 rounded-lg border border-gray-200">
        <h4 className="text-base font-semibold text-gray-800 mb-3">符号说明：</h4>
        <div className="space-y-2 text-gray-700">
          <div className="flex items-start gap-3">
            <span className="font-mono font-semibold text-blue-600 min-w-[3rem]">M(t)</span>
            <span>—— 第 t 期的一次移动平均数</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="font-mono font-semibold text-blue-600 min-w-[3rem]">Y(t)</span>
            <span>—— 第 t 期的实际值</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="font-mono font-semibold text-blue-600 min-w-[3rem]">n</span>
            <span>—— 移动平均的项数</span>
          </div>
          <div className="flex items-start gap-3">
            <span className="font-mono font-semibold text-blue-600 min-w-[3rem]">t</span>
            <span>—— 时间周期</span>
          </div>
        </div>
      </div>

      <div className="mt-6 p-5 bg-sky-50 rounded-lg border border-sky-200">
        <h4 className="text-base font-semibold text-gray-800 mb-3">本系统实现说明：</h4>
        <p className="text-gray-700 leading-relaxed text-base">
          上式是移动平均的单期定义，窗口内使用实际值计算。本系统预测多期未来销量时，会把每一期预测值滚入窗口继续递推，因此从第二期起窗口中会含有前面的预测值，全程不使用评估集或未来真实值参与计算。
        </p>
      </div>
    </div>
  );
};

export default Formula;
