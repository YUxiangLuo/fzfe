import React from 'react';
import { TrendingUp } from 'lucide-react';
import { ReportCard } from './ReportCard';
import type { ExperimentState, ModelMetrics, SelectedBestModel } from '../../contexts/ExperimentContext';

interface BestModelSelectionProps {
  state: ExperimentState;
  bestModelMetrics: ModelMetrics | null;
  getAnalysisValue: (key: string) => string;
  getAnalysisSetter: (key: string) => (value: string) => void;
  isSubmitting: boolean;
  renderValue: (value: string | number | null | undefined) => React.ReactNode;
}

const modelDisplayNames: Record<SelectedBestModel, string> = {
  ma: '移动平均',
  exp: '指数平滑',
  arima: 'ARIMA',
  lstm: 'LSTM',
  ensemble_weighted: '加权融合',
  ensemble_boosting: 'Boosting融合',
  ensemble_stacking: 'Stacking融合',
};

export const BestModelSelection: React.FC<BestModelSelectionProps> = ({
  state,
  bestModelMetrics,
  getAnalysisValue,
  getAnalysisSetter,
  isSubmitting,
  renderValue,
}) => (
  <ReportCard
    icon={<TrendingUp className="w-6 h-6 text-green-600" />}
    title="三、最优模型选择"
    analysisKey="selection"
    getAnalysisValue={getAnalysisValue}
    getAnalysisSetter={getAnalysisSetter}
    isSubmitting={isSubmitting}
  >
    <table className="w-full text-sm text-left text-gray-700">
      <tbody>
        <tr className="border-b">
          <td className="py-2 font-medium text-gray-500 w-1/4">选定模型</td>
          <td className="py-2 font-semibold">
            {renderValue(state.selected_best_model ? modelDisplayNames[state.selected_best_model] : null)}
          </td>
        </tr>
        <tr className="border-b">
          <td className="py-2 font-medium text-gray-500">RMSE</td>
          <td className="py-2 font-semibold">{renderValue(bestModelMetrics?.rmse?.toFixed(4))}</td>
        </tr>
        <tr className="border-b">
          <td className="py-2 font-medium text-gray-500">MAE</td>
          <td className="py-2 font-semibold">{renderValue(bestModelMetrics?.mae?.toFixed(4))}</td>
        </tr>
        <tr>
          <td className="py-2 font-medium text-gray-500">R²</td>
          <td className="py-2 font-semibold">{renderValue(bestModelMetrics?.r2?.toFixed(4))}</td>
        </tr>
      </tbody>
    </table>
  </ReportCard>
);
