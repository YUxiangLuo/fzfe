import type { StatisticsData } from './types';

interface HistoricalDataStatisticsTableProps {
  statistics: StatisticsData;
}

const formatNumber = (value: number) => value.toLocaleString(undefined, { maximumFractionDigits: 2 });

export function HistoricalDataStatisticsTable({ statistics }: HistoricalDataStatisticsTableProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">统计性表格</h2>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-700">变量名</th>
              <th className="border border-gray-300 px-4 py-3 text-right font-semibold text-gray-700">观测数量</th>
              <th className="border border-gray-300 px-4 py-3 text-right font-semibold text-gray-700">总和</th>
              <th className="border border-gray-300 px-4 py-3 text-right font-semibold text-gray-700">均值</th>
              <th className="border border-gray-300 px-4 py-3 text-right font-semibold text-gray-700">最大值</th>
              <th className="border border-gray-300 px-4 py-3 text-right font-semibold text-gray-700">最小值</th>
              <th className="border border-gray-300 px-4 py-3 text-right font-semibold text-gray-700">方差</th>
              <th className="border border-gray-300 px-4 py-3 text-right font-semibold text-gray-700">标准差</th>
            </tr>
          </thead>
          <tbody>
            <tr className="hover:bg-gray-50">
              <td className="border border-gray-300 px-4 py-3 font-medium text-gray-900">{statistics.variableName}</td>
              <td className="border border-gray-300 px-4 py-3 text-right text-gray-700">{statistics.count}</td>
              <td className="border border-gray-300 px-4 py-3 text-right text-gray-700">{formatNumber(statistics.sum)}</td>
              <td className="border border-gray-300 px-4 py-3 text-right text-gray-700">{formatNumber(statistics.mean)}</td>
              <td className="border border-gray-300 px-4 py-3 text-right text-gray-700">{formatNumber(statistics.max)}</td>
              <td className="border border-gray-300 px-4 py-3 text-right text-gray-700">{formatNumber(statistics.min)}</td>
              <td className="border border-gray-300 px-4 py-3 text-right text-gray-700">{formatNumber(statistics.variance)}</td>
              <td className="border border-gray-300 px-4 py-3 text-right text-gray-700">{formatNumber(statistics.stdDev)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
