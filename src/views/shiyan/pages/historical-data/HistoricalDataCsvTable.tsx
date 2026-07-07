import type { RefObject } from 'react';
import { Download, Info, Settings, Table } from 'lucide-react';
import type { ProductSalesData } from '../../store/experiment/types';

interface HistoricalDataCsvTableProps {
  csvData: NonNullable<ProductSalesData['csvData']>;
  columnSelectorRef: RefObject<HTMLDivElement | null>;
  showColumnSelector: boolean;
  visibleColumns: Set<number>;
  onDownloadCSV: () => void;
  onShowColumnSelectorChange: (show: boolean) => void;
  onToggleAllColumns: () => void;
  onToggleColumn: (columnIndex: number) => void;
}

export function HistoricalDataCsvTable({
  csvData,
  columnSelectorRef,
  showColumnSelector,
  visibleColumns,
  onDownloadCSV,
  onShowColumnSelectorChange,
  onToggleAllColumns,
  onToggleColumn,
}: HistoricalDataCsvTableProps) {
  const headers = csvData[0] ?? [];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center">
          <Table className="w-6 h-6 mr-3 text-green-600" />
          原始数据表格
        </h2>
        <div className="flex items-center gap-3">
          <div className="relative" ref={columnSelectorRef}>
            <button
              onClick={() => onShowColumnSelectorChange(!showColumnSelector)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span>选择列 ({visibleColumns.size}/{headers.length})</span>
            </button>

            {showColumnSelector && (
              <div className="absolute right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-96 overflow-y-auto">
                <div className="p-3 border-b border-gray-200 flex justify-between items-center">
                  <span className="font-medium text-gray-900">选择要显示的列</span>
                  <button
                    onClick={onToggleAllColumns}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    {visibleColumns.size === headers.length ? '取消全选' : '全选'}
                  </button>
                </div>
                <div className="p-2">
                  {headers.map((header, index) => (
                    <label
                      key={index}
                      className="flex items-center px-3 py-2 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={visibleColumns.has(index)}
                        onChange={() => onToggleColumn(index)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="ml-3 text-sm text-gray-700">{header}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={onDownloadCSV}
            disabled={visibleColumns.size === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              visibleColumns.size === 0
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            <Download className="w-4 h-4" />
            <span>下载CSV</span>
          </button>
        </div>
      </div>

      {visibleColumns.size > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-green-50 to-blue-50">
                {headers.map((header, index) =>
                  visibleColumns.has(index) ? (
                    <th
                      key={index}
                      className="border border-gray-300 px-3 py-2 text-left font-semibold text-gray-700 whitespace-nowrap"
                    >
                      {header}
                    </th>
                  ) : null
                )}
              </tr>
            </thead>
            <tbody>
              {csvData.slice(1).map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-gray-50">
                  {row.map((cell, cellIndex) =>
                    visibleColumns.has(cellIndex) ? (
                      <td
                        key={cellIndex}
                        className="border border-gray-300 px-3 py-2 text-gray-700"
                      >
                        {cell}
                      </td>
                    ) : null
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          <Info className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p>请至少选择一列以显示数据</p>
        </div>
      )}
    </div>
  );
}
