import React from 'react';
import { AlertTriangle } from 'lucide-react';

export interface DifferencingProps {
  selectedD: number | '';
  setSelectedD: (value: number | '') => void;
  error: string | null;
  onShowDifferencingInfo: () => void;
}

const Differencing: React.FC<DifferencingProps> = ({ selectedD, setSelectedD, error, onShowDifferencingInfo }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') {
      setSelectedD('');
    } else {
      const numValue = parseInt(value, 10);
      if (!isNaN(numValue)) {
        setSelectedD(numValue);
      }
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-6">
        <div>
          <h3 className="text-2xl font-bold text-gray-800 mb-4">ARIMA 法 - 差分阶数选择</h3>
        </div>

        <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg border border-blue-200 shadow-sm">
          <label htmlFor="diff-order" className="block text-base font-medium text-gray-700 mb-3">
            请根据 ADF 检验表输入要进行几阶差分:
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              id="diff-order"
              min="0"
              max="2"
              value={selectedD}
              onChange={handleChange}
              className="block w-32 px-4 py-3 bg-white border-2 border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base transition-colors"
              placeholder="0-2"
            />
            <span className="text-gray-700 text-base font-medium">阶</span>
          </div>
        </div>

        <div className="p-5 bg-amber-50 rounded-lg border border-amber-200">
          <p className="text-gray-700 leading-relaxed text-base">
            差分阶数仅可填写 0，1，2
          </p>
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
          onClick={onShowDifferencingInfo}
          className="px-5 py-2 bg-gray-200 text-gray-700 font-medium rounded-md hover:bg-gray-300 transition-colors text-sm"
        >
          为什么要进行差分？
        </button>
      </div>
    </div>
  );
};

export default Differencing;
