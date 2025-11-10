import React from 'react';
import { ClipboardList } from 'lucide-react';
import { ReportCard } from './ReportCard';
import type { ExperimentState } from '../../contexts/ExperimentContext';

interface PlanDecisionResultsProps {
  state: ExperimentState;
  planSummary: {
    avgServiceLevel: number;
    totalStockout: number;
    avgInventory: number;
    periodsWithStockout: number;
    totalPeriods: number;
  } | null;
  getAnalysisValue: (key: string) => string;
  getAnalysisSetter: (key: string) => (value: string) => void;
  isSubmitting: boolean;
}

export const PlanDecisionResults: React.FC<PlanDecisionResultsProps> = ({
  state,
  planSummary,
  getAnalysisValue,
  getAnalysisSetter,
  isSubmitting,
}) => (
  <ReportCard
    icon={<ClipboardList className="w-6 h-6 text-indigo-600" />}
    title="五、生产计划决策结果"
    analysisKey="decision"
    getAnalysisValue={getAnalysisValue}
    getAnalysisSetter={getAnalysisSetter}
    isSubmitting={isSubmitting}
  >
    <div className="space-y-4">
      {state.production_mps_table.length > 0 ? (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-100 text-gray-600 text-xs">
                <tr>
                  {['周期', '预测需求', '安全库存', '计划生产', '期初库存', '产出量', '期末库存', '缺货量', '服务水平'].map(h => <th key={h} className="p-2 font-semibold">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {state.production_mps_table.map((row, i) => (
                  <tr key={i} className="border-b">
                    <td className="p-2 font-medium">{row.period_label}</td>
                    <td className="p-2">{row.demand_forecast}</td>
                    <td className="p-2">{row.safety_stock}</td>
                    <td className="p-2">{row.planned_production}</td>
                    <td className="p-2">{row.beginning_inventory}</td>
                    <td className="p-2">{row.production_output}</td>
                    <td className="p-2">{row.ending_inventory}</td>
                    <td className="p-2">{row.stockout > 0 ? <span className="text-red-600 font-semibold">{row.stockout}</span> : row.stockout}</td>
                    <td className="p-2">{`${(row.service_level * 100).toFixed(1)}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {planSummary && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">计划总体评估</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-xs text-gray-500">平均服务水平</div>
                  <div className={`text-2xl font-bold ${planSummary.avgServiceLevel >= 0.99 ? 'text-green-600' : 'text-orange-600'}`}>
                    {(planSummary.avgServiceLevel * 100).toFixed(1)}%
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-xs text-gray-500">总缺货量</div>
                  <div className={`text-2xl font-bold ${planSummary.totalStockout > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {planSummary.totalStockout.toLocaleString()}
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-xs text-gray-500">平均期末库存</div>
                  <div className="text-2xl font-bold text-indigo-600">
                    {Math.round(planSummary.avgInventory).toLocaleString()}
                  </div>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-xs text-gray-500">缺货周期数</div>
                  <div className="text-2xl font-bold">
                    {planSummary.periodsWithStockout} / {planSummary.totalPeriods}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div>{/* Fallback content */}</div>
      )}
    </div>
  </ReportCard>
);
