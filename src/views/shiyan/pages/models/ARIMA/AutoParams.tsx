import React from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';

interface AutoParamsProps {
  isLoading: boolean;
  error: string | null;
}

const AutoParams: React.FC<AutoParamsProps> = ({ isLoading, error }) => {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">ARIMA 法 - 参数自动寻优</h3>
      <p className="mb-4">
        确定差分阶数 d 后，我们需要为模型的 p (自回归项数) 和 q (移动平均项数) 参数寻找最优值。
        系统将使用信息准则函数（如 AIC）自动进行选优。
      </p>
      
      {isLoading && (
        <div className="flex items-center justify-center h-full p-8">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="ml-4 text-gray-600">正在训练模型并自动寻优，请稍候...</p>
        </div>
      )}

      {error && (
        <div className="mt-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
          <AlertTriangle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {!isLoading && !error && (
        <div className="p-4 bg-gray-50 border rounded-md">
          <h4 className="font-semibold text-gray-800">自动参数寻优</h4>
          <p className="text-sm text-gray-600 mt-2">
            点击“下一步”后，系统将开始计算不同 p, q 组合下的 AIC 值，并选择使 AIC 值最小的参数组合作为最佳模型。
          </p>
        </div>
      )}
    </div>
  );
};

export default AutoParams;
