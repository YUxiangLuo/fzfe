import React from 'react';
import { Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import type { AdfStationarityRow } from '../../../contexts/ExperimentContext';

export interface StationarityTableProps {
  adfResults: AdfStationarityRow[];
  isLoading: boolean;
  error: string | null;
}

const formatNumber = (value: number | null | undefined, fractionDigits = 3) =>
  typeof value === "number" ? value.toFixed(fractionDigits) : "—";

const StationarityTable: React.FC<StationarityTableProps> = ({ adfResults, isLoading, error }) => {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[400px]">
        <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" />
        <p className="text-gray-600 text-lg">正在执行 ADF 平稳性检验...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center gap-2 text-red-600 bg-red-50 p-6 rounded-lg border border-red-200">
        <AlertTriangle className="w-6 h-6" />
        <span className="text-base">{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-800 mb-3">平稳性检验表</h3>
        <p className="text-gray-600 text-base leading-relaxed">
          以下是不同差分阶数下的 ADF 检验结果。p 值越小，越倾向于接受"序列平稳"的结论。
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
          <thead className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">
                差分阶数 d
              </th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">
                ADF 统计量
              </th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">
                p 值
              </th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">
                是否平稳
              </th>
              <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">
                临界值 (1%/5%/10%)
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {adfResults.length > 0 ? (
              adfResults.map((row) => (
                <tr
                  key={row.diff_order}
                  className={`hover:bg-gray-50 transition-colors ${row.stationary ? "bg-green-50/50" : ""}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-800">
                    d = {row.diff_order}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-700">
                    {formatNumber(row.statistic)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-700">
                    {formatNumber(row.p_value)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    {row.stationary ? (
                      <span className="inline-flex items-center gap-1 text-green-700 font-semibold">
                        <CheckCircle className="w-4 h-4" /> 平稳
                      </span>
                    ) : (
                      <span className="text-gray-600">不平稳</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-xs text-center text-gray-600">
                    {`${formatNumber(row.critical_values["1%"])} / ${formatNumber(row.critical_values["5%"])} / ${formatNumber(row.critical_values["10%"])}`}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="text-center py-8 text-gray-500">
                  暂无检验结果
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="p-5 bg-blue-50 rounded-lg border border-blue-200">
        <h4 className="text-base font-semibold text-gray-800 mb-3">判断标准：</h4>
        <div className="space-y-2 text-gray-700 text-sm">
          <p>• <strong>p 值 ≤ 0.05</strong>：拒绝原假设，序列平稳</p>
          <p>• <strong>p 值 &gt; 0.05</strong>：不能拒绝原假设，序列非平稳</p>
          <p>• <strong>ADF统计量 &lt; 临界值</strong>：倾向于平稳结论</p>
        </div>
      </div>
    </div>
  );
};

export default StationarityTable;
