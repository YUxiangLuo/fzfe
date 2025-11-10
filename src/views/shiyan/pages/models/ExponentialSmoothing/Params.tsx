import React from 'react';
import { AlertTriangle } from 'lucide-react';

export interface ParamsProps {
  alpha: number | '';
  setAlpha: (value: number | '') => void;
  isLoading: boolean;
  error: string | null;
}

const Params: React.FC<ParamsProps> = ({ alpha, setAlpha, isLoading, error }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') {
      setAlpha('');
    } else {
      const numValue = parseFloat(value);
      if (!isNaN(numValue)) {
        setAlpha(numValue);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-800 mb-4">指数平滑法 - 平滑系数选择</h3>
      </div>

      <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 shadow-sm">
        <label htmlFor="alpha-input" className="block text-base font-medium text-gray-700 mb-3">
          请输入平滑系数α的取值:
        </label>
        <input
          type="number"
          id="alpha-input"
          value={alpha}
          onChange={handleChange}
          disabled={isLoading}
          step="0.01"
          min="0"
          max="1"
          className="block w-full max-w-md px-4 py-3 bg-white border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
          placeholder="请输入平滑系数（0 < α ≤ 1）"
        />
      </div>

      <div className="p-5 bg-amber-50 rounded-lg border border-amber-200">
        <h4 className="text-base font-semibold text-gray-800 mb-3">平滑系数α的一般取值原则：</h4>
        <div className="space-y-2 text-gray-700 text-base leading-relaxed">
          <p>(1) 在初始值准确性小或者历史数据很少的情况下，α取值要大一些，进行短期预测。</p>
          <p>(2) 时间序列长期呈现比较平稳的发展趋势，α取值要小一些，预测长期演变趋势。</p>
          <p>(3) 时间序列波动的频率和振幅较大，α取值宜大，强调近期实际变化状态。</p>
          <p>(4) 时间序列波动的频率和振幅较小，α取值宜小，强调历史数据发展趋势。</p>
        </div>
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

export default Params;
