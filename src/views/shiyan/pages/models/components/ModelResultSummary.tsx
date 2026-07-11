import React from 'react';
import type { ModelImplementationMetadata, ModelMetrics } from '../modelResultTypes';

interface ModelResultSummaryProps extends ModelImplementationMetadata {
  metrics: ModelMetrics;
}

const METRICS: Array<{
  key: keyof ModelMetrics;
  label: string;
  format: (value: number) => string;
}> = [
  { key: 'rmse', label: 'RMSE', format: value => value.toFixed(4) },
  { key: 'mae', label: 'MAE', format: value => value.toFixed(4) },
  { key: 'mape', label: 'MAPE', format: value => `${value.toFixed(2)}%` },
  { key: 'r2', label: 'R²', format: value => value.toFixed(4) },
];

const ModelResultSummary: React.FC<ModelResultSummaryProps> = ({
  metrics,
  methodName,
  forecastStrategy,
  implementationNotes,
}) => (
  <section className="space-y-4" aria-label="模型评估与实现说明">
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {METRICS.map(({ key, label, format }) => (
        <div key={key} className="rounded-lg border border-blue-100 bg-blue-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-blue-700">{label}</div>
          <div className="mt-1 text-lg font-bold text-gray-900">{format(metrics[key])}</div>
        </div>
      ))}
    </div>

    {(methodName || forecastStrategy || (implementationNotes?.length ?? 0) > 0) && (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
        <h4 className="font-semibold text-gray-900">本次实际实现</h4>
        {methodName && <p className="mt-2">方法：{methodName}</p>}
        {forecastStrategy && (
          <p className="mt-1">
            预测策略：<code className="rounded bg-white px-1.5 py-0.5 text-xs">{forecastStrategy}</code>
          </p>
        )}
        {(implementationNotes?.length ?? 0) > 0 && (
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {implementationNotes!.map(note => <li key={note}>{note}</li>)}
          </ul>
        )}
      </div>
    )}
  </section>
);

export default ModelResultSummary;
