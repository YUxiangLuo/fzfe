import React from 'react';

interface ModelMetric {
  model: string;
  rmse: number | null;
  mae: number | null;
  mape: number | null;
  r2: number | null;
}

interface ModelMetricsTableProps {
  title: string;
  models: ModelMetric[];
  highlightRow?: string;
  footerNote?: React.ReactNode;
}

const ModelMetricsTable: React.FC<ModelMetricsTableProps> = ({
  title,
  models,
  highlightRow,
  footerNote,
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-800 mb-3">{title}</h3>
      </div>

      {models.length === 0 ? (
        <div className="p-6 bg-amber-50 rounded-lg border border-amber-200">
          <p className="text-gray-700 text-base">
            暂无已完成的模型数据，请先完成至少一个模型的训练。
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
            <thead className="bg-gradient-to-r from-blue-50 to-indigo-50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">
                  模型名称
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">
                  RMSE
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">
                  MAE
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">
                  MAPE
                </th>
                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700 uppercase tracking-wider border-b-2 border-gray-300">
                  R²
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {models.map((model) => (
                <tr
                  key={model.model}
                  className={`transition-colors ${
                    model.model === highlightRow
                      ? 'bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <td
                    className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                      model.model === highlightRow ? 'text-gray-900 font-bold' : 'text-gray-800'
                    }`}
                  >
                    {model.model}
                  </td>
                  <td
                    className={`px-6 py-4 whitespace-nowrap text-sm text-center font-semibold ${
                      model.model === highlightRow ? 'text-blue-700 font-bold' : 'text-blue-600'
                    }`}
                  >
                    {model.rmse !== null ? model.rmse.toFixed(4) : 'N/A'}
                  </td>
                  <td
                    className={`px-6 py-4 whitespace-nowrap text-sm text-center font-semibold ${
                      model.model === highlightRow ? 'text-green-700 font-bold' : 'text-green-600'
                    }`}
                  >
                    {model.mae !== null ? model.mae.toFixed(4) : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-semibold text-cyan-700">
                    {model.mape !== null ? `${model.mape.toFixed(2)}%` : 'N/A'}
                  </td>
                  <td
                    className={`px-6 py-4 whitespace-nowrap text-sm text-center font-semibold ${
                      model.model === highlightRow ? 'text-indigo-700 font-bold' : 'text-indigo-600'
                    }`}
                  >
                    {model.r2 !== null ? model.r2.toFixed(4) : 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-sm text-gray-600">
        MAPE 表示平均绝对百分比误差，单位为百分比，通常越小越好；当真实值接近 0 时需结合 RMSE 和 MAE 解读。
      </p>

      {footerNote && (
        <div className="p-5 bg-blue-50 rounded-lg border border-blue-200">
          {footerNote}
        </div>
      )}
    </div>
  );
};

export default ModelMetricsTable;
