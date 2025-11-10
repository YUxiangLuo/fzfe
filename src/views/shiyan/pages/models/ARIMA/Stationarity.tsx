import React from 'react';
import { Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import type { AdfStationarityRow } from '../../../contexts/ExperimentContext';

export interface StationarityProps {
  adfResults: AdfStationarityRow[];
  isLoading: boolean;
  error: string | null;
  onRunAdf: () => void;
}

const formatNumber = (value: number | null | undefined, fractionDigits = 3) =>
  typeof value === "number" ? value.toFixed(fractionDigits) : "—";

const Stationarity: React.FC<StationarityProps> = ({ adfResults, isLoading, error, onRunAdf }) => {
  return (
    <div>
      <h3 className="text-lg font-semibold mb-4">ARIMA 法 - 平稳性检验</h3>
      <p className="mb-4">
        ADF（Augmented Dickey-Fuller）检验用于检测序列是否存在单位根。p 值越小，越倾向于接受"序列平稳"的结论。
      </p>
      
      <button
        onClick={onRunAdf}
        disabled={isLoading}
        className="inline-flex items-center gap-2 px-4 py-2 mb-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400"
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {isLoading ? '正在检验...' : adfResults.length > 0 ? '重新执行 ADF 检验' : '执行 ADF 检验'}
      </button>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-md mb-4">
          <AlertTriangle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-2 text-left font-medium text-gray-500">差分阶数 d</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">ADF 统计量</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">p 值</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">是否平稳</th>
              <th className="px-4 py-2 text-left font-medium text-gray-500">临界值 (1%/5%/10%)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {isLoading && adfResults.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-4">正在加载...</td></tr>
            ) : adfResults.length > 0 ? (
              adfResults.map((row) => (
                <tr key={row.diff_order} className={row.stationary ? "bg-green-50" : ""}>
                  <td className="px-4 py-3 font-semibold">d = {row.diff_order}</td>
                  <td className="px-4 py-3">{formatNumber(row.statistic)}</td>
                  <td className="px-4 py-3">{formatNumber(row.p_value)}</td>
                  <td className="px-4 py-3">
                    {row.stationary ? (
                      <span className="inline-flex items-center gap-1 text-green-700">
                        <CheckCircle className="w-4 h-4" /> 平稳
                      </span>
                    ) : '不平稳'}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {`${formatNumber(row.critical_values["1%"])} / ${formatNumber(row.critical_values["5%"])} / ${formatNumber(row.critical_values["10%"])}`}
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={5} className="text-center py-4 text-gray-500">请执行ADF检验以查看结果。</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Stationarity;
