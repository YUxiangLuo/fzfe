import React, { useState } from 'react';
import PredictionResultsTable from '../components/PredictionResultsTable';
import GuidedTrainingPanel from '../components/GuidedTrainingPanel';
import PredictionChart from '../components/PredictionChart';
import type { GuidedTrainingSession } from '../../../services/guidedTraining';
import type { ModelJobProgressEvent } from '../hooks/useModelJob';

export interface ResultsProps {
  data: {
    predictions: { date: string; actual: number; predicted: number | null }[];
    metrics: { rmse: number; mae: number; r2: number };
    meta_model?: {
      kind?: string;
      strategy?: string;
      model_names?: string[];
      coefficients?: number[];
      residual_norm?: number;
    };
  } | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
  guidedSession?: GuidedTrainingSession | null;
  onInitialize: () => void;
  onRunNextStep: () => void;
  currentProgress?: ModelJobProgressEvent | null;
  progressEvents?: ModelJobProgressEvent[];
}

const BASE_MODEL_LABELS: Record<string, string> = {
  ma: '移动平均 (MA)',
  es: '指数平滑 (ES)',
  arima: 'ARIMA',
  lstm: 'LSTM',
};

const MetaModelSummary: React.FC<{ metaModel: NonNullable<NonNullable<ResultsProps['data']>['meta_model']> }> = ({ metaModel }) => {
  const modelNames = metaModel.model_names ?? [];
  const coefficients = metaModel.coefficients ?? [];

  if (modelNames.length === 0 || coefficients.length !== modelNames.length) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-sm font-semibold text-gray-700">
          NNLS 元模型系数（非负、未归一化）
        </p>
        <p className="mt-1 text-xs text-gray-500">
          系数由最多三折扩展窗口 Level-1 OOF 预测合并学习，不要求总和为 1。
        </p>
        <ul className="mt-2 space-y-1">
          {modelNames.map((name, index) => (
            <li key={name} className="flex items-center justify-between text-sm text-gray-600">
              <span>{BASE_MODEL_LABELS[name] ?? name}</span>
              <span className="font-mono">{Number(coefficients[index]).toFixed(4)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

const Results: React.FC<ResultsProps> = ({
  data,
  isLoading,
  error,
  onRetry,
  guidedSession,
  onInitialize,
  onRunNextStep,
}) => {
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');

  const guidedPanel = (
    <GuidedTrainingPanel
      title="Stacking 融合 - 分阶段训练"
      session={guidedSession ?? null}
      isLoading={isLoading}
      error={error}
      onInitialize={onInitialize}
      onRunNextStep={onRunNextStep}
      onRetry={onRetry}
    />
  );

  if (!data) {
    return (
      <div className="space-y-6">
        {guidedPanel}
        <p className="text-sm text-gray-600">完成全部训练阶段后会显示预测结果。</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {guidedPanel}
      {data.meta_model && <MetaModelSummary metaModel={data.meta_model} />}
      <div className="flex justify-end">
        <button
          onClick={() => setViewMode('table')}
          className={`px-4 py-2 text-sm font-medium rounded-l-lg ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          表格
        </button>
        <button
          onClick={() => setViewMode('chart')}
          className={`px-4 py-2 text-sm font-medium rounded-r-lg ${viewMode === 'chart' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}`}
        >
          图表
        </button>
      </div>

      {viewMode === 'table' ? (
        <PredictionResultsTable
          title="Stacking 融合 - 计算结果"
          predictions={data.predictions}
        />
      ) : (
        <PredictionChart data={data.predictions} />
      )}
    </div>
  );
};

export default Results;
