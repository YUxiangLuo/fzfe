import React from 'react';
import { AlertTriangle } from 'lucide-react';

export interface PreprocessingProps {
  normalization: 'minmax' | 'zscore' | null;
  setNormalization: (value: 'minmax' | 'zscore') => void;
  error: string | null;
  onShowNormalizationInfo: () => void;
}

const Preprocessing: React.FC<PreprocessingProps> = ({ normalization, setNormalization, error, onShowNormalizationInfo }) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-800 mb-4">LSTM 法 - 数据预处理</h3>
      </div>

      <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 shadow-sm">
        <label className="block text-lg font-semibold text-gray-800 mb-4">
          请选择标准化方法:
        </label>
        <div className="space-y-4">
          <div className="flex items-start p-4 bg-white rounded-lg border-2 border-gray-200 hover:border-blue-400 transition-colors cursor-pointer">
            <input
              id="min-max"
              name="scaling"
              type="radio"
              className="mt-1 focus:ring-blue-500 h-5 w-5 text-blue-600 border-gray-300 cursor-pointer"
              checked={normalization === 'minmax'}
              onChange={() => setNormalization('minmax')}
            />
            <label htmlFor="min-max" className="ml-4 flex-1 cursor-pointer">
              <p className="text-base font-semibold text-gray-800 mb-2">最小-最大归一化</p>
              <p className="text-sm text-gray-700 leading-relaxed">
                在数据需要被压缩到特定区间及不涉及距离度量、梯度、协方差计算时被广泛使用。
              </p>
            </label>
          </div>

          <div className="flex items-start p-4 bg-white rounded-lg border-2 border-gray-200 hover:border-blue-400 transition-colors cursor-pointer">
            <input
              id="z-score"
              name="scaling"
              type="radio"
              className="mt-1 focus:ring-blue-500 h-5 w-5 text-blue-600 border-gray-300 cursor-pointer"
              checked={normalization === 'zscore'}
              onChange={() => setNormalization('zscore')}
            />
            <label htmlFor="z-score" className="ml-4 flex-1 cursor-pointer">
              <p className="text-base font-semibold text-gray-800 mb-2">Z-score 标准化</p>
              <p className="text-sm text-gray-700 leading-relaxed">
                适用于属性 A 的最大值和最小值未知的情况，或有超出取值范围的离群数据的情况。
              </p>
            </label>
          </div>
        </div>
      </div>

      <div className="flex justify-center">
        <button
          onClick={onShowNormalizationInfo}
          className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
        >
          标准化介绍
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-4 rounded-lg border border-red-200">
          <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default Preprocessing;
