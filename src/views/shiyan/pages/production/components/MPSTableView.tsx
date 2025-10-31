import React from 'react';
import { useProductionPlan } from '../ProductionPlanContextV2';

const MPSTableView: React.FC = () => {
  const { state } = useProductionPlan();

  // 格式化数值显示
  const formatValue = (value: number | null): string => {
    if (value === null) return '-';
    return value.toLocaleString();
  };

  // 格式化百分比
  const formatPercent = (value: number | null): string => {
    if (value === null) return '-';
    return `${(value * 100).toFixed(1)}%`;
  };

  // 判断字段是否已填充
  const isFilled = (value: number | null): boolean => value !== null;

  // 获取单元格样式
  const getCellStyle = (value: number | null, isHighlight: boolean = false): string => {
    const base = 'py-3 px-4 text-right';
    if (value === null) return `${base} text-gray-300 bg-gray-50`;
    if (isHighlight) return `${base} font-semibold text-blue-700 bg-blue-50`;
    return `${base} text-gray-800`;
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="py-3 px-4 text-left font-semibold text-gray-700 border-b-2 border-gray-300">
              期数
            </th>
            <th className="py-3 px-4 text-right font-semibold text-gray-700 border-b-2 border-gray-300">
              预测需求
            </th>
            <th className="py-3 px-4 text-right font-semibold text-gray-700 border-b-2 border-gray-300">
              安全库存
            </th>
            <th className="py-3 px-4 text-right font-semibold text-gray-700 border-b-2 border-gray-300">
              计划生产
            </th>
            <th className="py-3 px-4 text-right font-semibold text-gray-700 border-b-2 border-gray-300">
              期初库存
            </th>
            <th className="py-3 px-4 text-right font-semibold text-gray-700 border-b-2 border-gray-300">
              产出量
            </th>
            <th className="py-3 px-4 text-right font-semibold text-gray-700 border-b-2 border-gray-300">
              期末库存
            </th>
            <th className="py-3 px-4 text-right font-semibold text-gray-700 border-b-2 border-gray-300">
              缺货量
            </th>
            <th className="py-3 px-4 text-right font-semibold text-gray-700 border-b-2 border-gray-300">
              服务水平
            </th>
          </tr>
        </thead>
        <tbody>
          {/* 第1期：完整数据（作为参考，自动计算） */}
          <tr className="border-b border-gray-200 bg-gray-50">
            <td className="py-3 px-4 text-left text-gray-600 font-medium">
              期 1 <span className="text-xs text-gray-500">(参考)</span>
            </td>
            <td className={getCellStyle(state.period1Data.demandForecast)}>
              {formatValue(state.period1Data.demandForecast)}
            </td>
            <td className={getCellStyle(state.period1Data.safetyStock)}>
              {formatValue(state.period1Data.safetyStock)}
            </td>
            <td className={getCellStyle(state.period1Data.plannedProduction)}>
              {formatValue(state.period1Data.plannedProduction)}
            </td>
            <td className="py-3 px-4 text-right text-gray-700 font-medium">
              {formatValue(state.initialInventory)}
            </td>
            <td className={getCellStyle(state.period1Data.productionOutput)}>
              {formatValue(state.period1Data.productionOutput)}
            </td>
            <td className={getCellStyle(state.period1Data.endingInventory)}>
              {formatValue(state.period1Data.endingInventory)}
            </td>
            <td className={getCellStyle(state.period1Data.stockout)}>
              {state.period1Data.stockout !== null && state.period1Data.stockout > 0 ? (
                <span className="text-red-600 font-semibold">{formatValue(state.period1Data.stockout)}</span>
              ) : (
                formatValue(state.period1Data.stockout)
              )}
            </td>
            <td className={getCellStyle(state.period1Data.serviceLevel)}>
              {formatPercent(state.period1Data.serviceLevel)}
            </td>
          </tr>

          {/* 第2期：渐进式填充（学习重点） */}
          <tr className="border-b-2 border-blue-200 bg-blue-50">
            <td className="py-3 px-4 text-left text-blue-800 font-semibold">
              期 2 <span className="text-xs text-blue-600">(学习演示)</span>
            </td>
            <td className={getCellStyle(state.period2Data.demandForecast, isFilled(state.period2Data.demandForecast))}>
              {formatValue(state.period2Data.demandForecast)}
            </td>
            <td className={getCellStyle(state.period2Data.safetyStock, isFilled(state.period2Data.safetyStock))}>
              {formatValue(state.period2Data.safetyStock)}
            </td>
            <td className={getCellStyle(state.period2Data.plannedProduction, isFilled(state.period2Data.plannedProduction))}>
              {formatValue(state.period2Data.plannedProduction)}
            </td>
            <td className={getCellStyle(state.period2Data.beginningInventory, isFilled(state.period2Data.beginningInventory))}>
              {formatValue(state.period2Data.beginningInventory)}
            </td>
            <td className={getCellStyle(state.period2Data.productionOutput, isFilled(state.period2Data.productionOutput))}>
              {formatValue(state.period2Data.productionOutput)}
            </td>
            <td className={getCellStyle(state.period2Data.endingInventory, isFilled(state.period2Data.endingInventory))}>
              {formatValue(state.period2Data.endingInventory)}
            </td>
            <td className={getCellStyle(state.period2Data.stockout, isFilled(state.period2Data.stockout))}>
              {state.period2Data.stockout !== null && state.period2Data.stockout > 0 ? (
                <span className="text-red-600 font-semibold">{formatValue(state.period2Data.stockout)}</span>
              ) : (
                formatValue(state.period2Data.stockout)
              )}
            </td>
            <td className={getCellStyle(state.period2Data.serviceLevel, isFilled(state.period2Data.serviceLevel))}>
              {formatPercent(state.period2Data.serviceLevel)}
            </td>
          </tr>

          {/* 第3期及以后：显示完整计划或占位符 */}
          {state.isFullPlanGenerated ? (
            // 显示完整生成的计划
            state.fullMPSTable.slice(2).map((row) => (
              <tr key={row.period} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="py-3 px-4 text-left text-gray-700 font-medium">{row.period_label}</td>
                <td className="py-3 px-4 text-right text-gray-800">{formatValue(row.demand_forecast)}</td>
                <td className="py-3 px-4 text-right text-gray-800">{formatValue(row.safety_stock)}</td>
                <td className="py-3 px-4 text-right text-gray-800">{formatValue(row.planned_production)}</td>
                <td className="py-3 px-4 text-right text-gray-800">{formatValue(row.beginning_inventory)}</td>
                <td className="py-3 px-4 text-right text-gray-800">{formatValue(row.production_output)}</td>
                <td className="py-3 px-4 text-right text-gray-800">{formatValue(row.ending_inventory)}</td>
                <td className="py-3 px-4 text-right">
                  {row.stockout !== null ? (
                    row.stockout > 0 ? (
                      <span className="text-red-600 font-semibold">{formatValue(row.stockout)}</span>
                    ) : (
                      <span className="text-gray-600">{formatValue(row.stockout)}</span>
                    )
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className={`py-3 px-4 text-right font-medium ${
                  row.service_level !== null && row.service_level >= 0.95
                    ? 'text-green-600'
                    : row.service_level !== null && row.service_level >= 0.90
                    ? 'text-yellow-600'
                    : 'text-red-600'
                }`}>
                  {formatPercent(row.service_level)}
                </td>
              </tr>
            ))
          ) : (
            // 显示占位符
            Array.from({ length: state.forecastPeriods - 2 }).map((_, idx) => (
              <tr key={idx + 3} className="border-b border-gray-100">
                <td className="py-3 px-4 text-left text-gray-400">期 {idx + 3}</td>
                {Array.from({ length: 8 }).map((_, colIdx) => (
                  <td key={colIdx} className="py-3 px-4 text-center text-gray-300 bg-gray-50">
                    ?
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>

      {/* 说明 */}
      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-800">
          <strong>💡 提示：</strong>
          {state.isFullPlanGenerated
            ? '完整的生产计划已生成！您已掌握MPS制定的全过程。'
            : `第1期作为参考示例，第2期用于渐进式学习。随着您逐步学习每个概念，第2期的数据会自动填充。学完所有概念后，您将能够生成期3-${state.forecastPeriods}的完整计划。`}
        </p>
      </div>
    </div>
  );
};

export default MPSTableView;
