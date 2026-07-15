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
    model_chain?: string[];
    stage_coefficients?: number[];
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
  ma: '移动平均（MA）',
  es: '一次指数平滑（ES）',
  arima: 'ARIMA',
  lstm: 'LSTM',
};

const ModelChainSummary: React.FC<{
  modelChain: string[];
  stageCoefficients: number[];
}> = ({ modelChain, stageCoefficients }) => {
  if (modelChain.length === 0 || modelChain.length !== stageCoefficients.length) return null;

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-5">
      <h4 className="text-lg font-semibold text-gray-800">最终残差提升模型链</h4>
      <p className="mt-1 text-sm leading-6 text-gray-600">
        以下是完整训练区间重训后保留下来的阶段及非负系数；顺序表示逐阶段累加关系，同一种模型可以重复出现。
      </p>
      <ol className="mt-4 space-y-2">
        {modelChain.map((modelName, index) => (
          <li key={`${modelName}-${index}`} className="flex items-center justify-between rounded-md bg-white px-4 py-3 text-sm shadow-sm">
            <span className="font-medium text-gray-800">
              第 {index + 1} 阶段：{BASE_MODEL_LABELS[modelName] ?? modelName}
            </span>
            <span className="font-mono text-amber-800">γ = {stageCoefficients[index]!.toFixed(4)}</span>
          </li>
        ))}
      </ol>
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
      title="Boosting 融合 - 分阶段训练"
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
      {data.model_chain && data.stage_coefficients && (
        <ModelChainSummary
          modelChain={data.model_chain}
          stageCoefficients={data.stage_coefficients}
        />
      )}
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
          title="Boosting 融合 - 计算结果"
          predictions={data.predictions}
        />
      ) : (
        <PredictionChart data={data.predictions} />
      )}
    </div>
  );
};

export default Results;
