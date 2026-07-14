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
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-6">
        <div>
          <h3 className="text-2xl font-bold text-gray-800 mb-4">LSTM 法 - 数据预处理</h3>
        </div>

        <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 shadow-sm">
          <label className="block text-lg font-semibold text-gray-800 mb-4">
            请选择标准化方法:
          </label>
          <div className="space-y-4">
            <label htmlFor="min-max" className="flex items-start p-4 bg-white rounded-lg border-2 border-gray-200 hover:border-blue-400 transition-colors cursor-pointer">
              <input
                id="min-max"
                name="scaling"
                type="radio"
                className="mt-1 focus:ring-blue-500 h-5 w-5 text-blue-600 border-gray-300 cursor-pointer"
                checked={normalization === 'minmax'}
                onChange={() => setNormalization('minmax')}
              />
              <span className="ml-4 flex-1 cursor-pointer">
                <p className="text-base font-semibold text-gray-800 mb-2">最小-最大归一化</p>
                <p className="text-sm text-gray-700 leading-relaxed">
                  按训练区间的最小值和最大值做线性缩放；训练值通常落在 [0,1]，评估或未来值超出训练范围时可以小于0或大于1。
                </p>
              </span>
            </label>

            <label htmlFor="z-score" className="flex items-start p-4 bg-white rounded-lg border-2 border-gray-200 hover:border-blue-400 transition-colors cursor-pointer">
              <input
                id="z-score"
                name="scaling"
                type="radio"
                className="mt-1 focus:ring-blue-500 h-5 w-5 text-blue-600 border-gray-300 cursor-pointer"
                checked={normalization === 'zscore'}
                onChange={() => setNormalization('zscore')}
              />
              <span className="ml-4 flex-1 cursor-pointer">
                <p className="text-base font-semibold text-gray-800 mb-2">Z-score 标准化</p>
                <p className="text-sm text-gray-700 leading-relaxed">
                  按训练区间均值和标准差做中心化与缩放，不限制取值范围，也不会把非正态数据变成正态分布；均值和标准差同样会受离群值影响。
                </p>
              </span>
            </label>
          </div>
        </div>

        <div className="p-4 bg-sky-50 rounded-lg border border-sky-200 text-sm text-sky-900 leading-relaxed">
          两种变换都只应用于数值字段，并且只在训练区间拟合参数；类别字段使用 One-Hot 编码。这样可避免评估数据参与预处理造成信息泄漏。
        </div>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-4 rounded-lg border border-red-200">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      <div>
        <button
          onClick={onShowNormalizationInfo}
          className="px-5 py-2 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300 transition-colors text-sm"
        >
          什么是标准化？
        </button>
      </div>

    </div>
  );
};

export default Preprocessing;
