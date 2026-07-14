import React from 'react';

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
          min="0.01"
          max="1"
          className="block w-full max-w-md px-4 py-3 bg-white border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
          placeholder="请输入平滑系数（0 < α ≤ 1）"
        />
      </div>

      <div className="p-5 bg-amber-50 rounded-lg border border-amber-200">
        <h4 className="text-base font-semibold text-gray-800 mb-3">平滑系数α的一般取值原则：</h4>
        <div className="space-y-2 text-gray-700 text-base leading-relaxed">
          <p>(1) α 越大，新观测权重越高，水平更新更快，但也更容易跟随噪声。</p>
          <p>(2) α 越小，历史水平权重越高，结果更平滑，但在水平发生变化时会更滞后。</p>
          <p>(3) 一次指数平滑无论 α 取多大，都不会外推趋势或季节性；α 小不等于能够预测长期趋势。</p>
          <p>(4) 没有对所有数据都最优的固定 α。可另做时间顺序回测比较多个值；本页面训练会原样使用您输入的 α，不执行自动搜索。</p>
        </div>
      </div>
    </div>
  );
};

export default Params;
