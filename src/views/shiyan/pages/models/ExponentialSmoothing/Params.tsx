import React from 'react';
import { AlertTriangle } from 'lucide-react';

export interface ParamsProps {
  alpha: number | '';
  setAlpha: (value: number | '') => void;
}

const Params: React.FC<ParamsProps> = ({ alpha, setAlpha }) => {
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
          step="0.01"
          min="0"
          max="1"
          className="block w-full max-w-md px-4 py-3 bg-white border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
          placeholder="请输入平滑系数（0 < α < 1）"
        />
      </div>

      <div className="p-5 bg-amber-50 rounded-lg border border-amber-200">
        <h4 className="text-base font-semibold text-gray-800 mb-3">平滑系数α的一般取值原则：</h4>
        <div className="space-y-2 text-gray-700 text-base leading-relaxed">
          <p>(1) 在初始值准确性小或者历史数据很少的情况下，α取值要大一些，进行短期预测。</p>
          <p>(2) 时间序列长期呈现比较平稳的发展趋势，α取值要小一些，反映稳定的平均水平。</p>
          <p>(3) 时间序列波动的频率和振幅较大，α取值宜大，强调近期实际变化状态。</p>
          <p>(4) 时间序列波动的频率和振幅较小，α取值宜小，强调历史数据发展趋势。</p>
        </div>
        <p className="mt-3 text-sm text-gray-600">
          注：以上为教科书通用原则。本系统的一次指数平滑对未来多期为水平外推，α 影响的是对历史水平的估计，而不能让模型预测出趋势变化。
        </p>
      </div>
    </div>
  );
};

export default Params;
