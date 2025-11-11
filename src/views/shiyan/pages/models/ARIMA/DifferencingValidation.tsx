import React, { useMemo } from 'react';
import { CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import type { AdfStationarityRow } from '../../../contexts/ExperimentContext.zustand';
import { ARIMA_CONSTANTS } from '../constants';

export interface DifferencingValidationProps {
  selectedD: number | '';
  adfResults: AdfStationarityRow[];
}

const DifferencingValidation: React.FC<DifferencingValidationProps> = ({ selectedD, adfResults }) => {
  const validationResult = useMemo(() => {
    if (selectedD === '') {
      return { isValid: false, message: '请先选择差分阶数' };
    }

    if (selectedD < ARIMA_CONSTANTS.MIN_DIFFERENCING_ORDER || selectedD > ARIMA_CONSTANTS.MAX_DIFFERENCING_ORDER) {
      return { isValid: false, message: `差分阶数必须在 ${ARIMA_CONSTANTS.MIN_DIFFERENCING_ORDER}-${ARIMA_CONSTANTS.MAX_DIFFERENCING_ORDER} 之间` };
    }

    const adfRow = adfResults.find(r => r.diff_order === selectedD);

    if (!adfRow) {
      return { isValid: false, message: `未找到差分阶数 d=${selectedD} 的检验结果` };
    }

    if (adfRow.stationary) {
      return {
        isValid: true,
        message: `差分阶数 d=${selectedD} 检验通过`,
        detail: `该阶数下序列已达到平稳状态（p值=${adfRow.p_value.toFixed(4)}）`
      };
    } else {
      return {
        isValid: false,
        message: `差分阶数 d=${selectedD} 未能使序列平稳`,
        detail: `该阶数下序列仍为非平稳状态（p值=${adfRow.p_value.toFixed(4)} > 0.05）`
      };
    }
  }, [selectedD, adfResults]);

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="max-w-md w-full">
        {validationResult.isValid ? (
          <div className="text-center space-y-6">
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-2xl font-bold text-gray-800">{validationResult.message}</h3>
              <p className="text-gray-600 text-base">
                {validationResult.detail}
              </p>
              <p className="text-sm text-gray-500">
                点击"下一步"继续进行自动参数寻优
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
              <h3 className="text-2xl font-bold text-gray-800">差分阶数检验未通过</h3>
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="text-left">
                    <p className="text-gray-700 text-base font-semibold mb-1">
                      {validationResult.message}
                    </p>
                    {validationResult.detail && (
                      <p className="text-gray-600 text-sm">
                        {validationResult.detail}
                      </p>
                    )}
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-500">
                点击"上一步"重新选择差分阶数
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DifferencingValidation;
