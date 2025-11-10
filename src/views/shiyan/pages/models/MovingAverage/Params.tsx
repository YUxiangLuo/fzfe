import React from 'react';
import { AlertTriangle } from 'lucide-react';

export interface ParamsProps {
  windowSize: number | '';
  setWindowSize: (value: number | '') => void;
  isLoading: boolean;
  error: string | null;
}

const Params: React.FC<ParamsProps> = ({ windowSize, setWindowSize, isLoading, error }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') {
      setWindowSize('');
    } else {
      const numValue = parseInt(value, 10);
      if (!isNaN(numValue)) {
        setWindowSize(numValue);
      }
    }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">移动平均法 - 时间窗口选取</h3>
      <p>请根据您的数据特点和分析目标，选取合适的时间窗口大小n。</p>
      <div className="mt-4 max-w-sm">
        <label htmlFor="window-size" className="block text-sm font-medium text-gray-700">
          时间窗口 n 的取值:
        </label>
        <input
          type="number"
          id="window-size"
          value={windowSize}
          onChange={handleChange}
          disabled={isLoading}
          className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:bg-gray-100"
          placeholder="例如: 3"
        />
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

export default Params;
