import React from 'react';
import { MOVING_AVERAGE_CONSTANTS } from '../constants';

export interface ParamsProps {
  windowSize: number | '';
  setWindowSize: (value: number | '') => void;
}

export const parseWindowSizeInput = (value: string): number | '' | null => {
  if (value === '') return '';

  const numValue = Number(value);
  return Number.isFinite(numValue) ? numValue : null;
};

const Params: React.FC<ParamsProps> = ({ windowSize, setWindowSize }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const parsedValue = parseWindowSizeInput(e.target.value);
    if (parsedValue !== null) {
      setWindowSize(parsedValue);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-800 mb-4">移动平均法 - 时间窗口选取</h3>
      </div>

      <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 shadow-sm">
        <label htmlFor="window-size" className="block text-base font-medium text-gray-700 mb-3">
          请输入时间窗口 n 的取值:
        </label>
        <input
          type="text"
          id="window-size"
          value={windowSize}
          onChange={handleChange}
          inputMode="numeric"
          pattern="[0-9]*"
          className="block w-full max-w-md px-4 py-3 bg-white border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors"
          placeholder={`请输入大于等于 ${MOVING_AVERAGE_CONSTANTS.MIN_WINDOW_SIZE} 的整数`}
        />
      </div>

      <div className="p-5 bg-amber-50 rounded-lg border border-amber-200">
        <p className="text-gray-700 leading-relaxed text-base">
          请根据您的数据特点和分析目标，选取合适的时间窗口大小 n。窗口大小 n 会影响到移动平均的平滑程度和对数据趋势的反应灵敏度。较小的窗口大小会使移动平均更接近原始数据，但可能保留较多的噪声；较大的窗口大小则会平滑掉更多的波动，但也可能导致对快速变化趋势的反应迟缓。
        </p>
      </div>
    </div>
  );
};

export default Params;
