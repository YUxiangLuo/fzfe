import React from 'react';
import { CheckSquare, GitCompare, Target, ClipboardCheck, TrendingUp } from 'lucide-react';

const Intro: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-800 mb-3">ARIMA 法 - 方法步骤</h3>
        <p className="text-gray-600 text-base leading-relaxed">
          ARIMA 法的一般步骤为:
        </p>
      </div>

      <div className="space-y-4 mt-8">
        <div className="flex gap-4 p-5 bg-gradient-to-r from-blue-50 to-blue-100/50 rounded-lg border border-blue-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex-shrink-0 w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-lg">
            1
          </div>
          <div className="flex-1 pt-1">
            <div className="flex items-center gap-2 mb-1">
              <CheckSquare className="w-5 h-5 text-blue-600" />
              <p className="text-gray-800 font-medium"><strong>平稳性检验:</strong> 使用 ADF 单位根检验对原始数据进行平稳性检验。</p>
            </div>
          </div>
        </div>

        <div className="flex gap-4 p-5 bg-gradient-to-r from-indigo-50 to-indigo-100/50 rounded-lg border border-indigo-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex-shrink-0 w-10 h-10 bg-indigo-500 text-white rounded-full flex items-center justify-center font-bold text-lg">
            2
          </div>
          <div className="flex-1 pt-1">
            <div className="flex items-center gap-2 mb-1">
              <GitCompare className="w-5 h-5 text-indigo-600" />
              <p className="text-gray-800 font-medium"><strong>差分处理:</strong> 若当前检验未通过，尝试非季节差分，使序列更接近平稳，再重新检验。</p>
            </div>
          </div>
        </div>

        <div className="flex gap-4 p-5 bg-gradient-to-r from-purple-50 to-purple-100/50 rounded-lg border border-purple-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex-shrink-0 w-10 h-10 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold text-lg">
            3
          </div>
          <div className="flex-1 pt-1">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-5 h-5 text-purple-600" />
              <p className="text-gray-800 font-medium"><strong>模型定阶:</strong> 教科书通常借助 ACF/PACF 与信息准则识别阶数；本系统在固定 d 下执行一次 AICc stepwise 搜索来选择 p、q。</p>
            </div>
          </div>
        </div>

        <div className="flex gap-4 p-5 bg-gradient-to-r from-pink-50 to-pink-100/50 rounded-lg border border-pink-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex-shrink-0 w-10 h-10 bg-pink-500 text-white rounded-full flex items-center justify-center font-bold text-lg">
            4
          </div>
          <div className="flex-1 pt-1">
            <div className="flex items-center gap-2 mb-1">
              <ClipboardCheck className="w-5 h-5 text-pink-600" />
              <p className="text-gray-800 font-medium"><strong>参数估计与检查:</strong> 检查优胜模型收敛状态；必要时提高迭代上限重试，并用自由度修正的 Ljung–Box 检验记录残差白噪声诊断。</p>
            </div>
          </div>
        </div>

        <div className="flex gap-4 p-5 bg-gradient-to-r from-green-50 to-green-100/50 rounded-lg border border-green-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex-shrink-0 w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center font-bold text-lg">
            5
          </div>
          <div className="flex-1 pt-1">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-5 h-5 text-green-600" />
              <p className="text-gray-800 font-medium"><strong>模型预测:</strong> 生成多步ARIMA预测，并将最终销量点预测按 max(0, ŷ) 截断。</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-5 bg-sky-50 rounded-lg border border-sky-200">
        <h4 className="text-base font-semibold text-gray-800 mb-3">本系统实现说明</h4>
        <p className="text-gray-700 leading-relaxed text-base">
          ARIMA 的教科书流程通常结合平稳性检验、ACF/PACF、信息准则和残差诊断。本系统实现非季节 ARIMA：用户固定 d，系统按差分后有效样本量限制 p/q，并执行一次 AICc stepwise 搜索。stepwise 不穷举全部组合。优胜模型必须收敛；零创新的确定性随机游走/漂移边界会被明确标注。原始销量点预测与 95% 区间上下分位数均按 max(0, 分位数值) 映射为非负；std_dev 与 99% 上侧误差仍来自未截断的 ARIMA 预测分布。
        </p>
      </div>
    </div>
  );
};

export default Intro;
