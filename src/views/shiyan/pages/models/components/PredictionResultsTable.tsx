import React from 'react';

interface Prediction {
  date: string;
  actual: number;
  predicted: number | null;
  stdDev?: number | null;
  uncertaintySource?: 'model' | 'empirical' | 'fallback' | null;
  uncertaintyReason?: string | null;
  calibrationSource?: string | null;
  intervalLower?: number | null;
  intervalUpper?: number | null;
  intervalLevel?: number | null;
  intervalKind?: string | null;
  coverageGuarantee?: boolean | null;
  upperErrorP99Kind?: string | null;
  calibrationOrigins?: number | null;
}

interface PredictionResultsTableProps {
  title: string;
  predictions: Prediction[];
  showAccuracy?: boolean;
}

export const formatPredictionAccuracy = (
  actual: number,
  predicted: number | null,
): string => {
  if (predicted === null || actual === 0) return '不适用';
  const accuracy = (1 - Math.abs(actual - predicted) / Math.abs(actual)) * 100;
  return `${accuracy.toFixed(2)}%`;
};

export const getPredictionAccuracyClassName = (
  actual: number,
  predicted: number | null,
): string => {
  if (predicted === null || actual === 0) return 'bg-gray-100 text-gray-600';
  const accuracy = (1 - Math.abs(actual - predicted) / Math.abs(actual)) * 100;

  if (accuracy >= 85) return 'bg-green-50 text-green-700 font-semibold';
  if (accuracy >= 70) return 'bg-blue-50 text-blue-700 font-semibold';
  if (accuracy >= 60) return 'bg-yellow-50 text-yellow-700 font-semibold';
  return 'bg-red-50 text-red-700 font-semibold';
};

const uncertaintySourceLabels: Record<string, string> = {
  model: '模型解析区间',
  empirical: '内部残差估计',
  fallback: '回退估计',
};

const uncertaintyReasonLabels: Record<string, string> = {
  first_difference_scale: '一阶差分尺度',
  first_difference_rms_floor: '稳定趋势差分均方根',
  insufficient_residuals: '可用残差不足',
  nonfinite_scale: '原尺度无效',
};

const calibrationSourceLabels: Record<string, string> = {
  internal_validation: '内部时间验证段',
  weighted_weight_fit_holdout_reused: '复用的 Weighted 权重拟合时间留出段',
  boosting_selection_holdout_reused: '复用的 Boosting 选模时间留出段',
  stacking_meta_fit_holdout_reused: '复用的 Stacking 元模型拟合 Level-1 留出段',
  level1_holdout: 'Level-1 时间留出段',
  internal_time_validation: '内部时间验证窗口',
  early_stopping_validation_reused: '复用的 EarlyStopping 时间验证窗口',
  training_rolling_origin: '训练段 rolling-origin 回测',
  training_one_step_residuals: '训练期一步预测残差',
  training_history: '训练历史回退尺度',
};

export const formatPredictionInterval = (prediction: Prediction): string => {
  if (prediction.predicted === null) return '未提供';
  const hasStoredInterval = typeof prediction.intervalLower === 'number'
    && Number.isFinite(prediction.intervalLower)
    && typeof prediction.intervalUpper === 'number'
    && Number.isFinite(prediction.intervalUpper);
  if (hasStoredInterval) {
    return `[${prediction.intervalLower!.toFixed(2)}, ${prediction.intervalUpper!.toFixed(2)}]`;
  }
  if (typeof prediction.stdDev === 'number' && Number.isFinite(prediction.stdDev) && prediction.stdDev >= 0) {
    return `[${(prediction.predicted - 1.96 * prediction.stdDev).toFixed(2)}, ${(prediction.predicted + 1.96 * prediction.stdDev).toFixed(2)}]`;
  }
  return '未提供';
};

const PredictionResultsTable: React.FC<PredictionResultsTableProps> = ({
  title,
  predictions,
  showAccuracy = true,
}) => {
  const hasUncertainty = predictions.some((prediction) => (
    typeof prediction.stdDev === 'number' && Number.isFinite(prediction.stdDev)
  ));
  const hasUncalibratedUncertainty = predictions.some(
    (prediction) => prediction.coverageGuarantee === false,
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-bold text-gray-800 mb-3">{title}</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 bg-white rounded-lg shadow-sm border border-gray-200">
          <thead className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <tr>
              <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 border-b-2 border-blue-200">
                日期
              </th>
              <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 border-b-2 border-blue-200">
                真实值
              </th>
              <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 border-b-2 border-blue-200">
                预测值
              </th>
              {hasUncertainty && (
                <>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 border-b-2 border-blue-200">
                    标准差 σ
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 border-b-2 border-blue-200">
                    {hasUncalibratedUncertainty ? '名义 95% 误差范围' : '95% 不确定性范围'}
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 border-b-2 border-blue-200">
                    估计来源
                  </th>
                </>
              )}
              {showAccuracy && (
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 border-b-2 border-blue-200">
                  单点相对准确度（展示值）
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {predictions.map((row) => (
              <tr key={row.date} className="hover:bg-blue-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-base text-gray-700">
                  {row.date}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-base text-gray-900 font-medium">
                  {row.actual}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-base text-blue-600 font-semibold">
                  {row.predicted !== null ? row.predicted.toFixed(2) : '未提供'}
                </td>
                {hasUncertainty && (
                  <>
                    <td className="px-6 py-4 whitespace-nowrap text-base text-gray-700">
                      {typeof row.stdDev === 'number' ? row.stdDev.toFixed(2) : '未提供'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-base text-gray-700">
                      {formatPredictionInterval(row)}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div>{row.uncertaintySource ? uncertaintySourceLabels[row.uncertaintySource] ?? row.uncertaintySource : '未提供'}</div>
                      {row.calibrationSource && (
                        <div className="mt-1 text-xs text-sky-700">
                          估计数据：{calibrationSourceLabels[row.calibrationSource] ?? row.calibrationSource}
                        </div>
                      )}
                      {typeof row.calibrationOrigins === 'number' && (
                        <div className="mt-1 text-xs text-sky-700">
                          历史预测原点：{row.calibrationOrigins}
                        </div>
                      )}
                      {row.coverageGuarantee === false && (
                        <div className="mt-1 text-xs text-amber-700">
                          启发式估计，无覆盖率保证
                        </div>
                      )}
                      {row.uncertaintyReason && (
                        <div className="mt-1 text-xs text-amber-700">
                          {uncertaintyReasonLabels[row.uncertaintyReason] ?? row.uncertaintyReason}
                        </div>
                      )}
                    </td>
                  </>
                )}
                {showAccuracy && (
                  <td className={`px-6 py-4 whitespace-nowrap text-base ${getPredictionAccuracyClassName(row.actual, row.predicted)}`}>
                    {formatPredictionAccuracy(row.actual, row.predicted)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hasUncertainty && (
        <div className="rounded-lg border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-900">
          ARIMA 展示由模型原生名义 95% 预测区间经过非负销量域分位数映射后的区间，其 σ 与 99% 上侧误差仍来自未截断分布；其他模型展示 actual-prediction 残差的 2.5%–97.5% 经验分位数范围，样本不足的期次使用明确标记的正态近似回退。标记“无覆盖率保证”的范围只是启发式误差估计，不能解释为已校准的 95% 概率保证。σ 是残差离散程度的辅助指标，不用于反推经验分位数范围。带非负销量域标记的区间会与点预测同步限制为非负；区间不参与点预测指标计算。
        </div>
      )}

      {showAccuracy && (
        <div className="mt-6 p-6 bg-gradient-to-br from-indigo-50 via-blue-50 to-cyan-50 rounded-xl border-2 border-indigo-200 shadow-md">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-1 h-6 bg-indigo-600 rounded-full"></div>
            <h4 className="text-lg font-bold text-gray-800">单点相对准确度计算说明</h4>
          </div>

          <div className="flex flex-row gap-6">
            {/* 左侧：公式容器 */}
            <div className="flex-[3] bg-white rounded-lg p-5 border-l-4 border-indigo-500 shadow-sm flex items-center justify-center">
              <div className="space-y-4 w-full">
                {/* 主公式 */}
                <div className="text-center">
                  <div className="text-xl font-bold text-gray-800 leading-relaxed">
                    单点相对准确度 = (1 - <span className="text-indigo-600">误差绝对值</span> / |<span className="text-blue-600">实际需求量</span>|) × 100%
                  </div>
                </div>

                {/* 分隔线 */}
                <div className="border-t border-gray-200"></div>

                {/* 辅助说明 */}
                <div className="text-center">
                  <div className="text-sm text-gray-600 leading-relaxed">
                    其中：<span className="font-semibold text-indigo-600">误差绝对值</span> = |<span className="text-blue-600">实际需求量</span> - <span className="text-purple-600">预测需求量</span>|
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    这是由单点绝对百分比误差派生的页面展示值，不是训练或模型选择指标；当误差大于实际值绝对值时可为负数。实际需求量为0时无定义，表中显示“不适用”。
                  </div>
                </div>
              </div>
            </div>

            {/* 右侧：评价标准 */}
            <div className="flex-[2] bg-white rounded-lg p-5 border border-gray-200 shadow-sm">
              <div className="text-sm font-semibold text-gray-700 mb-3">页面色带（非统计标准）</div>
              <div className="space-y-2">
                <div className="flex items-center p-2 bg-green-50 rounded border border-green-200">
                  <div className="flex-1">
                    <div className="text-sm font-bold text-green-700">≥ 85% <span className="text-xs font-normal text-green-600">相对误差较小</span></div>
                  </div>
                </div>
                <div className="flex items-center p-2 bg-blue-50 rounded border border-blue-200">
                  <div className="flex-1">
                    <div className="text-sm font-bold text-blue-700">70% ≤ x &lt; 85% <span className="text-xs font-normal text-blue-600">仅作显示分组</span></div>
                  </div>
                </div>
                <div className="flex items-center p-2 bg-yellow-50 rounded border border-yellow-200">
                  <div className="flex-1">
                    <div className="text-sm font-bold text-yellow-700">60% ≤ x &lt; 70% <span className="text-xs font-normal text-yellow-600">仅作显示分组</span></div>
                  </div>
                </div>
                <div className="flex items-center p-2 bg-red-50 rounded border border-red-200">
                  <div className="flex-1">
                    <div className="text-sm font-bold text-red-700">&lt; 60% <span className="text-xs font-normal text-red-600">相对误差较大</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PredictionResultsTable;
