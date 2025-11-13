import React from 'react';
import Button from '../../../../../shared/components/common/Button';

interface CalculationStatusProps {
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  isRetryable?: boolean;
}

/**
 * A shared component to display the status of a calculation.
 * It handles showing a loading indicator, an error message with a retry button,
 * or nothing if the calculation is not running and has no errors.
 */
const CalculationStatus: React.FC<CalculationStatusProps> = ({ isLoading, error, onRetry, isRetryable = true }) => {
  if (isLoading) {
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
