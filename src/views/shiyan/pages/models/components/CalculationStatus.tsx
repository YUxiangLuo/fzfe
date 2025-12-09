import React from 'react';
import Button from '../../../../../shared/components/common/Button';
import { Clock, AlertCircle } from 'lucide-react';

interface CalculationStatusProps {
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  isRetryable?: boolean;
  isEnsembleModel?: boolean;
}

/**
 * A shared component to display the status of a calculation.
 * It handles showing a loading indicator, an error message with a retry button,
 * or nothing if the calculation is not running and has no errors.
 */
const CalculationStatus: React.FC<CalculationStatusProps> = ({ isLoading, error, onRetry, isRetryable = true, isEnsembleModel = false }) => {
  if (isLoading) {
    if (isEnsembleModel) {
      return (
        <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border-2 border-blue-200 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-200 border-t-blue-600"></div>
            </div>
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <h4 className="text-lg font-bold text-gray-800">融合模型训练中</h4>
              </div>
              <div className="space-y-2 text-gray-700">
                <p className="text-base font-medium">
                  融合模型的训练需要整合多个基础模型的预测结果，计算过程相对复杂，<span className="text-blue-600 font-semibold">预计需要几分钟时间</span>。
                </p>
                <div className="flex items-start gap-2 mt-3 p-3 bg-white rounded-md border border-blue-200">
                  <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold text-amber-700">温馨提示：</span>请耐心等待，不要刷新或切换页面，以免中断训练过程。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex justify-center items-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <p className="ml-2">计算中，请稍候...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 border border-red-300 bg-red-50 text-red-700 rounded-md">
        <p className="font-semibold">{isRetryable ? "计算失败" : "提示"}</p>
        <p className="mb-2">{error}</p>
        {isRetryable && (
          <Button onClick={onRetry} variant="outline" size="sm">
            重试
          </Button>
        )}
      </div>
    );
  }

  return null;
};

export default CalculationStatus;
