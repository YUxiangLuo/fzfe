import React from 'react';
import type { NavigateFunction } from 'react-router-dom';
import Button from '../../../shared/components/common/Button';

interface RetryExceededFallbackProps {
  navigate: NavigateFunction;
}

const RetryExceededFallback: React.FC<RetryExceededFallbackProps> = ({ navigate }) => {
  return (
    <div className="p-4 border border-amber-300 bg-amber-50 text-amber-800 rounded-md">
      <p className="font-semibold">计算失败</p>
      <p className="mb-4">我们已经重试一次，但仍然无法成功计算。这可能是由于当前的数据窗口或产品选择不适合此模型。请尝试调整数据窗口或选择其他产品。</p>
      <div className="flex gap-4">
        <Button onClick={() => navigate('/model/window')} variant="outline" size="sm">
          重新选择数据时段
        </Button>
        <Button onClick={() => navigate('/product')} variant="outline" size="sm">
          重新选择产品
        </Button>
      </div>
    </div>
  );
};

export default RetryExceededFallback;
