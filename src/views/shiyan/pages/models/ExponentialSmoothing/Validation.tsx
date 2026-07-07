import React, { useMemo } from 'react';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';

export interface ValidationProps {
  alpha: number | '';
  isValid: boolean;
}

const Validation: React.FC<ValidationProps> = ({ alpha, isValid }) => {
  const errorMessage = useMemo(() => {
    if (isValid) return null;

    if (alpha === '' || alpha <= 0) {
      return '请输入一个有效的平滑系数（α > 0）';
    }
    if (alpha >= 1) {
      return '平滑系数必须小于 1';
    }
    return '平滑系数值不合法';
  }, [isValid, alpha]);

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
              <h3 className="text-2xl font-bold text-gray-800">平滑系数填写正确</h3>
              <p className="text-gray-600 text-base">
                您选择的平滑系数为 <span className="font-semibold text-blue-600">{alpha}</span>
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
            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-gray-800">未通过合法性检验</h3>
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-gray-700 text-base text-left">
                    {errorMessage}
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-500">
                点击"上一步"重新填写平滑系数
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Validation;
