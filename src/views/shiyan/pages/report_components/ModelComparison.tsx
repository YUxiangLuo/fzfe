import React from 'react';
import { Brain } from 'lucide-react';
import { ReportCard } from './ReportCard';

interface ModelComparisonProps {
  allModels: any[]; // Replace with a more specific type if available
  getAnalysisValue: (key: string) => string;
  getAnalysisSetter: (key: string) => (value: string) => void;
  isSubmitting: boolean;
  renderValue: (value: string | number | null | undefined) => React.ReactNode;
}

export const ModelComparison: React.FC<ModelComparisonProps> = ({
  allModels,
  getAnalysisValue,
  getAnalysisSetter,
  isSubmitting,
  renderValue,
}) => (
  <ReportCard
    icon={<Brain className="w-6 h-6 text-purple-600" />}
    title="二、模型性能对比"
    analysisKey="comparison"
    getAnalysisValue={getAnalysisValue}
    getAnalysisSetter={getAnalysisSetter}
    isSubmitting={isSubmitting}
  >
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="bg-gray-100 text-gray-600">
          <tr>
            <th className="p-3 font-semibold">模型</th>
            <th className="p-3 font-semibold">参数</th>
            <th className="p-3 font-semibold">RMSE</th>
            <th className="p-3 font-semibold">MAE</th>
            <th className="p-3 font-semibold">R²</th>
          </tr>
        </thead>
        <tbody>
          {allModels.map((m, i) => (
            <tr key={i} className="border-b">
              <td className="p-3 font-medium">{m.name}</td>
              <td className="p-3 font-mono text-xs">{m.params}</td>
              <td className="p-3">{renderValue(m.rmse?.toFixed(4))}</td>
              <td className="p-3">{renderValue(m.mae?.toFixed(4))}</td>
              <td className="p-3">{renderValue(m.r2?.toFixed(4))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </ReportCard>
);
