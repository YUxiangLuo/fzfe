import React from 'react';
import { useProductionPlan } from '../ProductionPlanContextV2';

// 列的类型定义
type ColumnKey =
  | 'period'  // 月份
  | 'demand_forecast'  // 实际需求（需求预测结果）
  | 'safety_stock'  // 安全库存
  | 'forecast_quantity'  // 预测量（需求+安全库存，计算列）
  | 'planned_production'  // 投入量（计划生产）
  | 'production_output'  // 产出量
  | 'ending_inventory'  // 库存（期末库存）
  | 'stockout'  // 缺货
  | 'service_level';  // 服务水平

// 定义每一步应该显示的列
const STEP_COLUMNS: Record<number, ColumnKey[]> = {
  1: ['period', 'demand_forecast', 'safety_stock', 'production_output', 'ending_inventory', 'stockout', 'service_level'],  // Step 1: 显示第一期完整数据
  2: ['period', 'demand_forecast', 'safety_stock', 'production_output', 'ending_inventory', 'stockout', 'service_level'],  // Step 2: 基础列 + 安全库存 + 服务水平
  3: ['period', 'demand_forecast', 'safety_stock', 'production_output', 'ending_inventory', 'stockout', 'service_level'],  // Step 3: 添加服务水平
  4: ['period', 'demand_forecast', 'safety_stock', 'forecast_quantity', 'production_output', 'ending_inventory', 'stockout', 'service_level'],  // Step 4: 添加预测量相关
  5: ['period', 'demand_forecast', 'safety_stock', 'forecast_quantity', 'planned_production', 'production_output', 'ending_inventory', 'stockout', 'service_level'],  // Step 5: 添加投入量
  6: ['period', 'demand_forecast', 'safety_stock', 'forecast_quantity', 'planned_production', 'production_output', 'ending_inventory', 'stockout', 'service_level'],  // Step 6: 完整表
};

const MPSTableViewV2: React.FC = () => {
  const { state } = useProductionPlan();

  // 根据当前步骤获取可见列
  const visibleColumns = STEP_COLUMNS[state.currentStep] || STEP_COLUMNS[1];

  // 格式化数值显示
  const formatValue = (value: number | null): string => {
    if (value === null) return '-';
    return value.toLocaleString();
  };

  // 格式化百分比
  const formatPercent = (value: number | null): string => {
    if (value === null) return '-';
    if (value === 0) return '0.0%';
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

  // 计算预测量（需求预测 + 安全库存）
  const calculateForecastQuantity = (demand: number | null, safety: number | null): number | null => {
    if (demand === null || safety === null) return null;
    return demand + safety;
  };

  // 判断列是否可见
  const isColumnVisible = (column: ColumnKey): boolean => {
    return visibleColumns.includes(column);
  };

  // 获取列的标题和说明
  const getColumnInfo = (column: ColumnKey): { title: string; subtitle?: string } => {
    const info: Record<ColumnKey, { title: string; subtitle?: string }> = {
      period: { title: '月份' },
      demand_forecast: { title: '实际需求', subtitle: '需求预测结果' },
      safety_stock: { title: '安全库存' },
      forecast_quantity: { title: '预测量', subtitle: '需求+安全库存' },
      planned_production: { title: '投入量', subtitle: '计划生产' },
      production_output: { title: '产出量' },
      ending_inventory: { title: '库存', subtitle: '期末库存' },
      stockout: { title: '缺货' },
      service_level: { title: '服务水平' },
    };
    return info[column];
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-100">
            {visibleColumns.map((column) => {
              const { title, subtitle } = getColumnInfo(column);
              return (
                <th
                  key={column}
                  className={`py-3 px-4 font-semibold text-gray-700 border-b-2 border-gray-300 ${
                    column === 'period' ? 'text-left' : 'text-right'
                  }`}
                >
                  <div>{title}</div>
                  {subtitle && <div className="text-xs font-normal text-gray-500">{subtitle}</div>}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {/* 第1期：完整数据（作为参考） */}
          <tr className="border-b border-gray-200 bg-gray-50">
            {isColumnVisible('period') && (
              <td className="py-3 px-4 text-left text-gray-600 font-medium">
                期 1 <span className="text-xs text-gray-500">(参考)</span>
              </td>
            )}
            {isColumnVisible('demand_forecast') && (
              <td className={getCellStyle(state.period1Data.demandForecast)}>
                {formatValue(state.period1Data.demandForecast)}
              </td>
            )}
            {isColumnVisible('safety_stock') && (
              <td className={getCellStyle(state.period1Data.safetyStock)}>
                {formatValue(state.period1Data.safetyStock)}
              </td>
            )}
            {isColumnVisible('forecast_quantity') && (
              <td className={getCellStyle(
                calculateForecastQuantity(state.period1Data.demandForecast, state.period1Data.safetyStock)
              )}>
                {formatValue(calculateForecastQuantity(state.period1Data.demandForecast, state.period1Data.safetyStock))}
              </td>
            )}
            {isColumnVisible('planned_production') && (
              <td className={getCellStyle(state.period1Data.plannedProduction)}>
                {formatValue(state.period1Data.plannedProduction)}
              </td>
            )}
            {isColumnVisible('production_output') && (
              <td className={getCellStyle(state.period1Data.productionOutput)}>
                {formatValue(state.period1Data.productionOutput)}
              </td>
            )}
            {isColumnVisible('ending_inventory') && (
              <td className={getCellStyle(state.period1Data.endingInventory)}>
                {formatValue(state.period1Data.endingInventory)}
              </td>
            )}
            {isColumnVisible('stockout') && (
              <td className={getCellStyle(state.period1Data.stockout)}>
                {state.period1Data.stockout !== null && state.period1Data.stockout > 0 ? (
                  <span className="text-red-600 font-semibold">{formatValue(state.period1Data.stockout)}</span>
                ) : (
                  formatValue(state.period1Data.stockout)
                )}
              </td>
            )}
            {isColumnVisible('service_level') && (
              <td className={getCellStyle(state.period1Data.serviceLevel)}>
                {formatPercent(state.period1Data.serviceLevel)}
              </td>
            )}
          </tr>

          {/* 第2期：渐进式填充（学习重点） */}
          <tr className="border-b-2 border-blue-200 bg-blue-50">
            {isColumnVisible('period') && (
              <td className="py-3 px-4 text-left text-blue-800 font-semibold">
                期 2 <span className="text-xs text-blue-600">(学习演示)</span>
              </td>
            )}
            {isColumnVisible('demand_forecast') && (
              <td className={getCellStyle(state.period2Data.demandForecast, isFilled(state.period2Data.demandForecast))}>
                {formatValue(state.period2Data.demandForecast)}
              </td>
            )}
            {isColumnVisible('safety_stock') && (
              <td className={getCellStyle(state.period2Data.safetyStock, isFilled(state.period2Data.safetyStock))}>
                {formatValue(state.period2Data.safetyStock)}
              </td>
            )}
            {isColumnVisible('forecast_quantity') && (
              <td className={getCellStyle(
                calculateForecastQuantity(state.period2Data.demandForecast, state.period2Data.safetyStock),
                isFilled(calculateForecastQuantity(state.period2Data.demandForecast, state.period2Data.safetyStock))
              )}>
                {formatValue(calculateForecastQuantity(state.period2Data.demandForecast, state.period2Data.safetyStock))}
              </td>
            )}
            {isColumnVisible('planned_production') && (
              <td className={getCellStyle(state.period2Data.plannedProduction, isFilled(state.period2Data.plannedProduction))}>
                {formatValue(state.period2Data.plannedProduction)}
              </td>
            )}
            {isColumnVisible('production_output') && (
              <td className={getCellStyle(state.period2Data.productionOutput, isFilled(state.period2Data.productionOutput))}>
                {formatValue(state.period2Data.productionOutput)}
              </td>
            )}
            {isColumnVisible('ending_inventory') && (
              <td className={getCellStyle(state.period2Data.endingInventory, isFilled(state.period2Data.endingInventory))}>
                {formatValue(state.period2Data.endingInventory)}
              </td>
            )}
            {isColumnVisible('stockout') && (
              <td className={getCellStyle(state.period2Data.stockout, isFilled(state.period2Data.stockout))}>
                {state.period2Data.stockout !== null && state.period2Data.stockout > 0 ? (
                  <span className="text-red-600 font-semibold">{formatValue(state.period2Data.stockout)}</span>
                ) : (
                  formatValue(state.period2Data.stockout)
                )}
              </td>
            )}
            {isColumnVisible('service_level') && (
              <td className={getCellStyle(state.period2Data.serviceLevel, isFilled(state.period2Data.serviceLevel))}>
                {formatPercent(state.period2Data.serviceLevel)}
              </td>
            )}
          </tr>

          {/* 第3期及以后 */}
          {state.currentStep >= 6 && state.isFullPlanGenerated ? (
            // Step 6: 显示完整生成的计划
            state.fullMPSTable.slice(2).map((row) => (
              <tr key={row.period} className="border-b border-gray-100 hover:bg-gray-50">
                {isColumnVisible('period') && (
                  <td className="py-3 px-4 text-left text-gray-700 font-medium">{row.period_label}</td>
                )}
                {isColumnVisible('demand_forecast') && (
                  <td className="py-3 px-4 text-right text-gray-800">{formatValue(row.demand_forecast)}</td>
                )}
                {isColumnVisible('safety_stock') && (
                  <td className="py-3 px-4 text-right text-gray-800">{formatValue(row.safety_stock)}</td>
                )}
                {isColumnVisible('forecast_quantity') && (
                  <td className="py-3 px-4 text-right text-gray-800">
                    {formatValue(calculateForecastQuantity(row.demand_forecast, row.safety_stock))}
                  </td>
                )}
                {isColumnVisible('planned_production') && (
                  <td className="py-3 px-4 text-right text-gray-800">{formatValue(row.planned_production)}</td>
                )}
                {isColumnVisible('production_output') && (
                  <td className="py-3 px-4 text-right text-gray-800">{formatValue(row.production_output)}</td>
                )}
                {isColumnVisible('ending_inventory') && (
                  <td className="py-3 px-4 text-right text-gray-800">{formatValue(row.ending_inventory)}</td>
                )}
                {isColumnVisible('stockout') && (
                  <td className="py-3 px-4 text-right">
                    {row.stockout !== null && row.stockout > 0 ? (
                      <span className="text-red-600 font-semibold">{formatValue(row.stockout)}</span>
                    ) : (
                      <span className="text-gray-600">{formatValue(row.stockout)}</span>
                    )}
                  </td>
                )}
                {isColumnVisible('service_level') && (
                  <td className={`py-3 px-4 text-right font-medium ${
                    row.service_level !== null && row.service_level >= 0.95
                      ? 'text-green-600'
                      : row.service_level !== null && row.service_level >= 0.90
                      ? 'text-yellow-600'
                      : 'text-red-600'
                  }`}>
                    {formatPercent(row.service_level)}
                  </td>
                )}
              </tr>
            ))
          ) : (
            // 显示占位符
            Array.from({ length: Math.max(0, state.forecastPeriods - 2) }).map((_, idx) => (
              <tr key={idx + 3} className="border-b border-gray-100">
                {visibleColumns.map((column, colIdx) => (
                  <td
                    key={column}
                    className={`py-3 px-4 text-gray-300 bg-gray-50 ${
                      column === 'period' ? 'text-left' : 'text-center'
                    }`}
                  >
                    {column === 'period' ? `期 ${idx + 3}` : '?'}
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
          {state.currentStep === 1
            ? '设置生产计划参数后，将开始逐步学习MPS表的每一列。'
            : state.isFullPlanGenerated
            ? '完整的生产计划已生成！您已掌握MPS制定的全过程。'
            : `第1期作为参考示例，第2期用于渐进式学习。随着您逐步学习每个概念，表格会逐列解锁并填充数据。`}
        </p>
      </div>
    </div>
  );
};

export default MPSTableViewV2;
