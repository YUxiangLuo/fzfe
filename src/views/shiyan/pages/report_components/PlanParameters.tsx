import React from 'react';
import { Calculator } from 'lucide-react';
import { ReportCard } from './ReportCard';
import type { ExperimentState } from '../../contexts/ExperimentContext.zustand';

interface PlanParametersProps {
  state: ExperimentState;
  getAnalysisValue: (key: string) => string;
  getAnalysisSetter: (key: string) => (value: string) => void;
  isSubmitting: boolean;
}

const ValueCard = ({ label, value, unit }: { label: string; value: string | number; unit?: string }) => (
  <div className="bg-gray-50 p-3 rounded-lg text-center">
    <div className="text-xs text-gray-500">{label}</div>
    <div className="text-lg font-bold text-gray-800">
      {value}
      {unit && <span className="text-sm font-normal ml-1">{unit}</span>}
    </div>
  </div>
);

const CAPACITY_SCENARIO_LABELS: Record<string, string> = {
  tight: '产能紧张',
  normal: '产能正常',
  abundant: '产能充裕',
};

const formatCapacityMode = (state: ExperimentState) => {
  if (state.production_capacity_mode === 'custom') return '自定义产能';
  if (state.production_capacity_mode === 'auto') return '自动计算';
  if (state.production_capacity_scenario) {
    return CAPACITY_SCENARIO_LABELS[state.production_capacity_scenario] ?? state.production_capacity_scenario;
  }
  return 'N/A';
};

export const PlanParameters: React.FC<PlanParametersProps> = ({
  state,
  getAnalysisValue,
  getAnalysisSetter,
  isSubmitting,
}) => {
  const period1 = state.production_mps_table.length > 0 ? state.production_mps_table[0] : null;
  const period2 = state.production_mps_table.length > 1 ? state.production_mps_table[1] : null;

  const renderContent = () => {
    if (!period1 || !period2) {
      return <p className="text-sm text-gray-500">生产计划数据不完整，无法展示参数计算结果。</p>;
    }

    return (
      <div className="space-y-6">
        <div>
          <h3 className="text-base font-semibold text-gray-800 mb-3">默认参数</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <ValueCard label="目标服务水平" value={`${(state.production_target_service_level || 0) * 100}%`} />
            <ValueCard label="安全库存Z值" value={state.production_safety_stock_z_score || 0} />
            <ValueCard label="产能模式" value={formatCapacityMode(state)} />
            <ValueCard label="产能上限/期" value={(state.production_capacity || 0).toLocaleString()} unit="件" />
          </div>
        </div>

        <div>
          <h3 className="text-base font-semibold text-gray-800 mb-3">期1 vs 期2 数据对比</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr className="border-b">
                  <th className="py-2 px-3 text-left text-gray-600 font-semibold w-1/3">变量/参数</th>
                  <th className="py-2 px-3 text-right text-gray-600 font-semibold">期 1 (参考)</th>
                  <th className="py-2 px-3 text-right text-gray-600 font-semibold">期 2 (学习)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-gray-50"><td colSpan={3} className="px-3 py-1 font-medium text-gray-500">需求与库存</td></tr>
                <tr className="border-b"><td className="py-2 px-3">需求预测</td><td className="py-2 px-3 text-right font-mono">{period1.demand_forecast?.toLocaleString()}</td><td className="py-2 px-3 text-right font-mono">{period2.demand_forecast?.toLocaleString()}</td></tr>
                <tr className="border-b"><td className="py-2 px-3">期初库存</td><td className="py-2 px-3 text-right font-mono">{period1.beginning_inventory?.toLocaleString()}</td><td className="py-2 px-3 text-right font-mono">{period2.beginning_inventory?.toLocaleString()}</td></tr>
                <tr className="border-b"><td className="py-2 px-3">安全库存</td><td className="py-2 px-3 text-right font-mono">{period1.safety_stock?.toLocaleString()}</td><td className="py-2 px-3 text-right font-mono">{period2.safety_stock?.toLocaleString()}</td></tr>
                <tr className="border-b"><td className="py-2 px-3">预测量</td><td className="py-2 px-3 text-right font-mono">{((period1.demand_forecast ?? 0) + (period1.safety_stock ?? 0)).toLocaleString()}</td><td className="py-2 px-3 text-right font-mono">{((period2.demand_forecast ?? 0) + (period2.safety_stock ?? 0)).toLocaleString()}</td></tr>

                <tr className="bg-gray-50"><td colSpan={3} className="px-3 py-1 font-medium text-gray-500">生产与产出</td></tr>
                <tr className="border-b"><td className="py-2 px-3">计划生产 (投入量)</td><td className="py-2 px-3 text-right font-mono">{period1.planned_production?.toLocaleString()}</td><td className="py-2 px-3 text-right font-mono">{period2.planned_production?.toLocaleString()}</td></tr>
                <tr className="border-b"><td className="py-2 px-3">产出量</td><td className="py-2 px-3 text-right font-mono">{period1.production_output?.toLocaleString()}</td><td className="py-2 px-3 text-right font-mono">{period2.production_output?.toLocaleString()}</td></tr>

                <tr className="bg-gray-50"><td colSpan={3} className="px-3 py-1 font-medium text-gray-500">结果与评估</td></tr>
                <tr className="border-b"><td className="py-2 px-3">期末库存</td><td className="py-2 px-3 text-right font-mono">{period1.ending_inventory?.toLocaleString()}</td><td className="py-2 px-3 text-right font-mono">{period2.ending_inventory?.toLocaleString()}</td></tr>
                <tr className="border-b"><td className="py-2 px-3">缺货量</td><td className="py-2 px-3 text-right font-mono text-red-600">{period1.stockout?.toLocaleString()}</td><td className="py-2 px-3 text-right font-mono text-red-600">{period2.stockout?.toLocaleString()}</td></tr>
                <tr><td className="py-2 px-3">服务水平</td><td className="py-2 px-3 text-right font-mono">{`${((period1.service_level ?? 0) * 100).toFixed(1)}%`}</td><td className="py-2 px-3 text-right font-mono">{`${((period2.service_level ?? 0) * 100).toFixed(1)}%`}</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <ReportCard
      icon={<Calculator className="w-6 h-6 text-orange-600" />}
      title="四、生产计划参数计算结果"
      analysisKey="params"
      getAnalysisValue={getAnalysisValue}
      getAnalysisSetter={getAnalysisSetter}
      isSubmitting={isSubmitting}
    >
      {renderContent()}
    </ReportCard>
  );
};
