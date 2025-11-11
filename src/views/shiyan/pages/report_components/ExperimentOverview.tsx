import React from 'react';
import { Database } from 'lucide-react';
import { ReportCard } from './ReportCard';
import type { ExperimentState } from '../../contexts/ExperimentContext.zustand';

interface MonthlySale {
  month: string;
  sales: number;
}

interface ExperimentOverviewProps {
  state: ExperimentState;
  trainingData: MonthlySale[];
  evaluationData: MonthlySale[];
  getAnalysisValue: (key: string) => string;
  getAnalysisSetter: (key: string) => (value: string) => void;
  isSubmitting: boolean;
  renderValue: (value: string | number | null | undefined) => React.ReactNode;
}

const DataWindowTable = ({ title, data }: { title: string; data: MonthlySale[] }) => (
  <div>
    <h4 className="text-xs font-semibold text-gray-600 mb-2">{title} ({data.length}条)</h4>
    <div className="max-h-40 overflow-y-auto border rounded-lg">
      <table className="w-full text-xs">
        <thead className="bg-gray-50 sticky top-0">
          <tr>
            <th className="py-2 px-3 text-left font-medium text-gray-500">月份</th>
            <th className="py-2 px-3 text-right font-medium text-gray-500">销量</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {data.map(item => (
            <tr key={item.month}>
              <td className="py-2 px-3 text-gray-700">{item.month}</td>
              <td className="py-2 px-3 text-right text-gray-800 font-mono">{item.sales.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export const ExperimentOverview: React.FC<ExperimentOverviewProps> = ({
  state,
  trainingData,
  evaluationData,
  getAnalysisValue,
  getAnalysisSetter,
  isSubmitting,
  renderValue,
}) => (
  <ReportCard
    icon={<Database className="w-6 h-6 text-blue-600" />}
    title="一、实验概述"
    analysisKey="data"
    getAnalysisValue={getAnalysisValue}
    getAnalysisSetter={getAnalysisSetter}
    isSubmitting={isSubmitting}
  >
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">实验选择</h3>
        <table className="w-full text-sm text-left text-gray-700">
          <tbody>
            <tr className="border-b">
              <td className="py-2 font-medium text-gray-500 w-1/3">行业</td>
              <td className="py-2 font-semibold">{renderValue(state.selected_industry)}</td>
            </tr>
            <tr className="border-b">
              <td className="py-2 font-medium text-gray-500">公司</td>
              <td className="py-2 font-semibold">{renderValue(state.selected_company)}</td>
            </tr>
            <tr>
              <td className="py-2 font-medium text-gray-500">产品</td>
              <td className="py-2 font-semibold">{renderValue(state.selected_product)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-2">数据预处理</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DataWindowTable title="训练集" data={trainingData} />
          <DataWindowTable title="评估集" data={evaluationData} />
        </div>
      </div>
    </div>
  </ReportCard>
);
