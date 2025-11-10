import React from 'react';
import { AlertTriangle } from 'lucide-react';

export interface PreprocessingProps {
  normalization: 'minmax' | 'zscore' | null;
  setNormalization: (value: 'minmax' | 'zscore') => void;
  error: string | null;
}

const Preprocessing: React.FC<PreprocessingProps> = ({ normalization, setNormalization, error }) => {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">LSTM - 数据预处理</h3>
      <p className="mb-4">
        数据预处理的目的是将原始数据转换成适合模型训练和预测的格式。
        请选择标准化方法：
      </p>
      <div className="space-y-2">
        <div className="flex items-center">
          <input 
            id="min-max" 
            name="scaling" 
            type="radio" 
            className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
            checked={normalization === 'minmax'}
            onChange={() => setNormalization('minmax')}
          />
          <label htmlFor="min-max" className="ml-3 block text-sm font-medium text-gray-700">
            <strong>最小-最大归一化:</strong> 将数据缩放到 [0, 1] 区间。
          </label>
        </div>
        <div className="flex items-center">
          <input 
            id="z-score" 
            name="scaling" 
            type="radio" 
            className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300"
            checked={normalization === 'zscore'}
            onChange={() => setNormalization('zscore')}
          />
          <label htmlFor="z-score" className="ml-3 block text-sm font-medium text-gray-700">
            <strong>Z-score 标准化:</strong> 将数据转换为均值为0，标准差为1的分布。
          </label>
        </div>
      </div>
      {error && (
        <div className="mt-4 flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md">
          <AlertTriangle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export default Preprocessing;
