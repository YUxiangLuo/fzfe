import React from 'react';
import { CheckCircle, XCircle } from 'lucide-react';

export interface ValidationProps {
  windowSize: number | '';
  isValid: boolean;
}

const Validation: React.FC<ValidationProps> = ({ windowSize, isValid }) => {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="max-w-md w-full">
        {isValid ? (
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-2xl font-bold text-gray-800">时间窗口填写正确</h3>
              <p className="text-gray-600 text-base">
                您选择的时间窗口大小为 <span className="font-semibold text-blue-600">{windowSize}</span>
              </p>
              <p className="text-sm text-gray-500">
                点击"下一步"继续查看计算结果
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="w-12 h-12 text-red-600" />
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-2xl font-bold text-gray-800">未通过合法性检验</h3>
              <p className="text-gray-600 text-base">
                时间窗口值不合法，请确保输入的是大于0的正整数
              </p>
              <p className="text-sm text-gray-500">
                点击"上一步"重新填写时间窗口
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Validation;
