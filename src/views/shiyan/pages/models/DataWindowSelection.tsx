import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExperiment } from '../../contexts/ExperimentContext';
import { AlertTriangle, CalendarRange, CheckCircle2 } from 'lucide-react';

interface RangeSelection {
  startIndex: number | null;
  endIndex: number | null;
}

interface MonthlySalesRecord {
  month: string;
  sales: number;
}

const isValidRange = (range: RangeSelection) => {
  if (range.startIndex === null || range.endIndex === null) return false;
  return range.startIndex <= range.endIndex;
};

const buildDefaultRanges = (
  data: MonthlySalesRecord[],
): { training: RangeSelection; evaluate: RangeSelection } | null => {
  const total = data.length;
  if (total < 2) { // Need at least 2 points to split
    return null;
  }

  // Default to ~70-80% for training, rest for evaluation, with a max of 6 for evaluation
  const evaluateSize = Math.min(6, Math.max(1, Math.floor(total * 0.25)));
  const trainingEndIndex = total - evaluateSize - 1;

  const training: RangeSelection = {
    startIndex: 0,
    endIndex: trainingEndIndex,
  };

  const evaluate: RangeSelection = {
    startIndex: trainingEndIndex + 1,
    endIndex: total - 1,
  };

  if (!isValidRange(training) || !isValidRange(evaluate) || training.endIndex < training.startIndex) {
     // Fallback for very small datasets
     if (total >= 2) {
       return {
         training: { startIndex: 0, endIndex: 0 },
         evaluate: { startIndex: 1, endIndex: total - 1 }
       };
     }
     return null;
  }

  return { training, evaluate };
};

const DataWindowSelection: React.FC = () => {
  const navigate = useNavigate();
  const { state, updateState, productSalesData } = useExperiment();

  const points = productSalesData?.monthlySales ?? [];
  const meta = productSalesData?.meta;

  const defaultRanges = useMemo(() => buildDefaultRanges(points), [points]);
  const trainingRange: RangeSelection = {
    startIndex: state.data_window_train_start_index,
    endIndex: state.data_window_train_end_index,
  };
  const evaluateRange: RangeSelection = {
    startIndex: state.data_window_evaluate_start_index,
    endIndex: state.data_window_evaluate_end_index,
  };

  if (points.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">暂无历史销量数据</h2>
        <p className="text-gray-600">
          当前选定的行业、企业或产品缺少历史销量记录，暂时无法配置训练与评估区间。请返回上一步重新选择。
        </p>
      </div>
    );
  }

  if (!defaultRanges) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">数据点不足</h2>
        <p className="text-gray-600">
          当前产品的历史销量记录不足以划分训练与评估区间（至少需要 2 条数据）。请联系管理员补充数据后再尝试。
        </p>
      </div>
    );
  }

  const trainingOptions = points.map((record, index) => ({
    label: `${record.month} (${record.sales.toLocaleString()} ${meta?.unit ?? ''})`,
    value: index,
  }));

  const evaluateOptions = trainingOptions;

  const updateRangeField = async (
    field:
      | 'data_window_train_start_index'
      | 'data_window_train_end_index'
      | 'data_window_evaluate_start_index'
      | 'data_window_evaluate_end_index',
    rawValue: string,
  ) => {
    const value = rawValue === '' ? null : Number(rawValue);
    await updateState({ [field]: value } as Partial<typeof state>);
  };

  const isTrainingValid = isValidRange(trainingRange);
  const isEvaluateValid = isValidRange(evaluateRange);
  const isSeparated =
    isTrainingValid &&
    isEvaluateValid &&
    trainingRange.endIndex! < evaluateRange.startIndex!;

  const canSave = isTrainingValid && isEvaluateValid && isSeparated;

  const handleProceed = () => {
    if (!canSave) return;
    navigate('/model/ma');
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 space-y-8">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-gray-900 flex items-center space-x-3">
          <CalendarRange className="w-7 h-7 text-blue-600" />
          <span>选择历史销量数据时段</span>
        </h2>
        <p className="text-gray-600">
          请选择用于训练预测模型的历史数据范围，以及用于评估模型表现的对比区间。所有字段默认为空，每次选择都会即时保存。
        </p>
      </header>

      <section className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">当前产品</h3>
        <p className="text-blue-700">
          {meta?.name ?? 'N/A'} · 单位：{meta?.unit ?? 'N/A'}
        </p>
        <p className="text-sm text-blue-600 mt-2">
          数据包含 {points.length} 个月的销量记录，从 {points[0]?.month ?? '—'} 到{' '}
          {points[points.length - 1]?.month ?? '—'}。
        </p>
      </section>

      <section className="space-y-6">
        <div>
          <h4 className="text-lg font-semibold text-gray-900 mb-3">训练数据区间</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm text-gray-600">开始月份</span>
              <select
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
                value={trainingRange.startIndex ?? ''}
                onChange={(event) =>
                  void updateRangeField('data_window_train_start_index', event.target.value)
                }
              >
                <option value="">请选择开始月份</option>
                {trainingOptions.map((option) => (
                  <option key={`train-start-${option.value}`} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm text-gray-600">结束月份</span>
              <select
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
                value={trainingRange.endIndex ?? ''}
                onChange={(event) =>
                  void updateRangeField('data_window_train_end_index', event.target.value)
                }
              >
                <option value="">请选择结束月份</option>
                {trainingOptions.map((option) => (
                  <option key={`train-end-${option.value}`} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {!isTrainingValid && (
            <p className="mt-2 text-sm text-red-600 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4" />
              <span>结束月份必须晚于或等于开始月份。</span>
            </p>
          )}
        </div>

        <div>
          <h4 className="text-lg font-semibold text-gray-900 mb-3">评估数据区间</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm text-gray-600">开始月份</span>
              <select
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
                value={evaluateRange.startIndex ?? ''}
                onChange={(event) =>
                  void updateRangeField('data_window_evaluate_start_index', event.target.value)
                }
              >
                <option value="">请选择开始月份</option>
                {evaluateOptions.map((option) => (
                  <option key={`evaluate-start-${option.value}`} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm text-gray-600">结束月份</span>
              <select
                className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2"
                value={evaluateRange.endIndex ?? ''}
                onChange={(event) =>
                  void updateRangeField('data_window_evaluate_end_index', event.target.value)
                }
              >
                <option value="">请选择结束月份</option>
                {evaluateOptions.map((option) => (
                  <option key={`evaluate-end-${option.value}`} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {!isEvaluateValid && (
            <p className="mt-2 text-sm text-red-600 flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4" />
              <span>结束月份必须晚于或等于开始月份。</span>
            </p>
          )}
        </div>

        {!isSeparated && isTrainingValid && isEvaluateValid && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-sm text-yellow-700 flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4" />
            <span>评估区间应当晚于训练区间，以便使用未参与训练的数据验证模型表现。</span>
          </div>
        )}
      </section>

      <footer className="flex flex-col md:flex-row md:items-center md:justify-between md:space-x-4 space-y-3 md:space-y-0">
        <div className="text-sm text-gray-500 flex items-center space-x-2">
          {canSave ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span>
                已选择训练区间{' '}
                {`${trainingOptions[trainingRange.startIndex!]?.label} 至 ${trainingOptions[trainingRange.endIndex!]?.label}`}
                ，评估区间{' '}
                {`${evaluateOptions[evaluateRange.startIndex!]?.label} 至 ${evaluateOptions[evaluateRange.endIndex!]?.label}`}。
              </span>
            </>
          ) : (
            <span>完整选择训练与评估区间后即可前往模型训练。</span>
          )}
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleProceed}
            disabled={!canSave}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            type="button"
          >
            前往基础模型
          </button>
        </div>
      </footer>
    </div>
  );
};

export default DataWindowSelection;
