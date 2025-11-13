import React from 'react';
import { CheckCircle } from 'lucide-react';
import type { AdfStationarityRow } from '../../../contexts/ExperimentContext.zustand';
import CalculationStatus from '../components/CalculationStatus';
import type { NavigateFunction } from 'react-router-dom';
import Button from '../../../../../shared/components/common/Button';

export interface StationarityTableProps {
  adfResults: AdfStationarityRow[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  navigate: NavigateFunction;
}

const NON_RETRYABLE_ERROR = "所有差分阶数的检验结果均为非平稳，无法继续进行ARIMA建模。请尝试调整数据窗口或选择其他产品。";

const formatNumber = (value: number | null | undefined, fractionDigits = 3) =>
  typeof value === "number" ? value.toFixed(fractionDigits) : "—";

const formatPValue = (value: number | null | undefined) => {
  if (typeof value !== "number") return "—";
  if (value < 0.001) return "< 0.001";
  return value.toFixed(3);
};

const StationarityTable: React.FC<StationarityTableProps> = ({ adfResults, isLoading, error, onRetry, navigate }) => {
  // Handle the specific non-retryable error case with custom action buttons
  if (error === NON_RETRYABLE_ERROR) {
    return (
      <div className="p-4 border border-amber-300 bg-amber-50 text-amber-800 rounded-md">
        <p className="font-semibold">提示</p>
        <p className="mb-4">{error}</p>
        <div className="flex gap-4">
          <Button onClick={() => navigate('/model/window')} variant="outline" size="sm">
            重新选择数据时段
          </Button>
          <Button onClick={() => navigate('/product')} variant="outline" size="sm">
            重新选择产品
          </Button>
        </div>
      </div>
    );
  }

  // Handle all other cases (loading, other errors) with the generic status component
  const status = <CalculationStatus isLoading={isLoading} error={error} onRetry={onRetry} />;
  if (isLoading || error) {
    return status;
  }

  return (
    <div className="space-y-6">
      {status}
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
                    {formatPValue(row.p_value)}
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
