import React from 'react';

export interface ParamsProps {
  alpha: number | '';
  setAlpha: (alpha: number | '') => void;
  isLoading: boolean;
  error: string | null;
}

const Params: React.FC<ParamsProps> = ({ alpha, setAlpha, isLoading, error }) => {
  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAlpha(parseFloat(e.target.value));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') {
      setAlpha('');
    } else {
      const numValue = parseFloat(value);
      if (!isNaN(numValue) && numValue >= 0 && numValue <= 1) {
        setAlpha(numValue);
      }
    }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">指数平滑法 - 参数设置</h3>
      <div className="space-y-4">
        <div>
          <label htmlFor="alpha-slider" className="block text-sm font-medium text-gray-700">
            平滑系数 (α): {alpha}
          </label>
          <input
            id="alpha-slider"
            type="range"
            min="0.01"
            max="1"
            step="0.01"
            value={alpha === '' ? 0 : alpha}
            onChange={handleSliderChange}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
        </div>
        <div>
          <label htmlFor="alpha-input" className="block text-sm font-medium text-gray-700">
            精确输入 α 值
          </label>
          <input
            id="alpha-input"
            type="number"
            step="0.01"
            min="0.01"
            max="1"
            value={alpha}
            onChange={handleInputChange}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="例如: 0.5"
          />
        </div>
      </div>
      {error && <p className="text-red-500 mt-4">{error}</p>}
    </div>
  );
};

export default Params;
