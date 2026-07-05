import React, { useState } from 'react';
import PredictionResultsTable from '../components/PredictionResultsTable';
import CalculationStatus from '../components/CalculationStatus';
import PredictionChart from '../components/PredictionChart';
import type { ModelJobProgressEvent } from '../hooks/useModelJob';

export interface ResultsProps {
  data: {
    predictions: { date: string; actual: number; predicted: number | null }[];
    metrics: { rmse: number; mae: number; r2: number };
    meta_model?: {
      kind?: string;
      strategy?: string;
      model_names?: string[];
      weights?: number[];
      raw_coefficients?: number[];
      fallback_reason?: string;
      condition_number?: number | null;
      level1_mae?: number[];
    };
  } | null;
  isLoading: boolean;
  error: string | null;
  onRetry: () => void;
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
  const weights = metaModel.weights ?? [];
  const isFallback = metaModel.strategy === 'inverse_mae_fallback';

  if (modelNames.length === 0 || weights.length !== modelNames.length) {
    return null;
  }

  return (
    <div className="space-y-3">
      {isFallback && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          <p className="font-semibold">本次 Stacking 已回退为逆 MAE 加权</p>
          <p className="mt-1">
            元模型的训练样本（Level-1 留出段）不足以稳定拟合线性元学习器，系统自动改用各基础模型验证误差倒数作为组合权重。
            此时 Stacking 的效果等价于按误差加权平均，与教科书中"元学习器学习组合"的 Stacking 有所不同。
            增加训练区间长度或减少基础模型数量可以避免回退。
          </p>
          {metaModel.fallback_reason && (
            <p className="mt-1 text-xs text-amber-700">回退原因：{metaModel.fallback_reason}</p>
          )}
        </div>
      )}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <p className="text-sm font-semibold text-gray-700">
          元模型组合权重{isFallback ? '（逆 MAE 回退）' : '（非负线性回归）'}
        </p>
        <ul className="mt-2 space-y-1">
          {modelNames.map((name, index) => (
            <li key={name} className="flex items-center justify-between text-sm text-gray-600">
              <span>{BASE_MODEL_LABELS[name] ?? name}</span>
              <span className="font-mono">{(Number(weights[index]) * 100).toFixed(1)}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

const Results: React.FC<ResultsProps> = ({ data, isLoading, error, onRetry, currentProgress, progressEvents }) => {
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');

  const status = <CalculationStatus isLoading={isLoading} error={error} onRetry={onRetry} modelType="stacking" isEnsembleModel={true} currentProgress={currentProgress} progressEvents={progressEvents} />;
  if (isLoading || error) {
    return status;
  }

  if (!data) {
    return (
      <div>
        {status}
        <p>没有可用的结果。</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {status}
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
