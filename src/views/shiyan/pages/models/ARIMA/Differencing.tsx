import React from 'react';
import { AlertTriangle } from 'lucide-react';
import type { AdfStationarityRow } from '../../../contexts/ExperimentContext';

export interface DifferencingProps {
  adfResults: AdfStationarityRow[];
  selectedD: number | '';
  setSelectedD: (value: number | '') => void;
  recommendedD: number;
  error: string | null;
}

const Differencing: React.FC<DifferencingProps> = ({ adfResults, selectedD, setSelectedD, recommendedD, error }) => {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">ARIMA 法 - 差分阶数选择</h3>
      <p className="mb-4">
        如果序列非平稳，需要通过差分来使其平稳。差分阶数 d 的选择至关重要。
        请根据 ADF 检验表输入要进行几阶差分。
      </p>

      {adfResults.length > 0 && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md mb-4">
          <p className="text-sm text-blue-700">
            根据ADF检验结果，推荐的差分阶数为 <strong>d = {recommendedD}</strong>。
          </p>
        </div>
      )}

      <div className="mt-4 max-w-sm">
        <label htmlFor="diff-order" className="block text-sm font-medium text-gray-700">
          差分阶数 d (通常为 0, 1, 或 2):
        </label>
        <input
          type="number"
          id="diff-order"
          min="0"
          max="5"
          value={selectedD}
          onChange={(e) => setSelectedD(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
          className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          placeholder="请输入整数"
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

export default Differencing;
