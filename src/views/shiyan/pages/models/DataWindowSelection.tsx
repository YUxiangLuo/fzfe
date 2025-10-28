import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExperiment } from '../../contexts/ExperimentContext';
import { AlertTriangle, CalendarRange, CheckCircle2 } from 'lucide-react';
import type { MonthlySalesRecord } from '../../data/historicalDatasets';

// 常量配置
const MIN_TRAINING_POINTS = 2; // 训练集至少需要2个数据点
const MIN_EVALUATION_POINTS = 1; // 评估集至少需要1个数据点
const MIN_TOTAL_POINTS = MIN_TRAINING_POINTS + MIN_EVALUATION_POINTS; // 总共至少需要3个数据点

const PATHS = {
  FIRST_MODEL: '/model/ma',
} as const;

interface RangeSelection {
  startIndex: number | null;
  endIndex: number | null;
}

interface ValidationError {
  type: 'training' | 'evaluation' | 'separation' | 'blank_data' | 'size';
  message: string;
}

// 检测数据是否为空白值
const isBlankValue = (value: any): boolean => {
  return (
    value == null ||
    (typeof value === 'number' && (isNaN(value) || !isFinite(value))) ||
    (typeof value === 'string' && value.trim() === '')
  );
};

// 填充缺失月份
const fillMissingMonths = (data: MonthlySalesRecord[]): MonthlySalesRecord[] => {
  if (data.length <= 1) return data;

  const result: MonthlySalesRecord[] = [];

  const parseMonth = (monthStr: string): Date => {
    const [year, month] = monthStr.split('-').map(Number);
    return new Date(year!, month! - 1, 1);
  };

  const formatMonth = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  const getNextMonth = (date: Date): Date => {
    const nextMonth = new Date(date);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return nextMonth;
  };

  result.push(data[0]!);

  for (let i = 1; i < data.length; i++) {
    const prevRecord = data[i - 1]!;
    const currentRecord = data[i]!;

    const prevDate = parseMonth(prevRecord.month);
    const currentDate = parseMonth(currentRecord.month);

    let checkDate = getNextMonth(prevDate);
    while (checkDate < currentDate) {
      result.push({
        month: formatMonth(checkDate),
        sales: null as any,
      });
      checkDate = getNextMonth(checkDate);
    }

    result.push(currentRecord);
  }

  return result;
};

// 检测区间内是否包含空白值
const hasBlankInRange = (
  data: MonthlySalesRecord[],
  startIndex: number,
  endIndex: number
): { hasBlank: boolean; blankMonths: string[] } => {
  const blankMonths: string[] = [];

  for (let i = startIndex; i <= endIndex && i < data.length; i++) {
    const record = data[i];
    if (!record || isBlankValue(record.month) || isBlankValue(record.sales)) {
      blankMonths.push(record?.month || '未知月份');
    }
  }

  return {
    hasBlank: blankMonths.length > 0,
    blankMonths,
  };
};

// 验证区间是否有效
const isValidRange = (range: RangeSelection, requireStrictGreater: boolean = false): boolean => {
  if (range.startIndex === null || range.endIndex === null) return false;
  if (requireStrictGreater) {
    return range.startIndex < range.endIndex; // 严格大于（不能相等）
  }
  return range.startIndex <= range.endIndex; // 大于或等于
};

// 检查数据是否足够划分区间
const hasEnoughData = (data: MonthlySalesRecord[]): boolean => {
  return data.length >= MIN_TOTAL_POINTS;
};

const DataWindowSelection: React.FC = () => {
  const navigate = useNavigate();
  const {
    state,
    updateState,
    productSalesData,
    isLoadingSales,
    salesDataError,
  } = useExperiment();

  const [processedSalesData, setProcessedSalesData] = useState<typeof productSalesData>(null);

  // 填充缺失月份
  useEffect(() => {
    if (productSalesData) {
      const monthlySales = productSalesData.monthlySales || [];
      const filledData = fillMissingMonths([...monthlySales]);

      setProcessedSalesData({
        ...productSalesData,
        monthlySales: filledData,
      });
    } else {
      setProcessedSalesData(null);
    }
  }, [productSalesData]);

  const points = processedSalesData?.monthlySales ?? [];
  const meta = processedSalesData?.meta;

  const trainingRange: RangeSelection = {
    startIndex: state.data_window_train_start_index,
    endIndex: state.data_window_train_end_index,
  };

  const evaluateRange: RangeSelection = {
    startIndex: state.data_window_evaluate_start_index,
    endIndex: state.data_window_evaluate_end_index,
  };

  // 验证选择的区间
  const validationErrors = useMemo((): ValidationError[] => {
    const errors: ValidationError[] = [];

    // 检查是否选择了完整的区间
    if (
      trainingRange.startIndex === null ||
      trainingRange.endIndex === null ||
      evaluateRange.startIndex === null ||
      evaluateRange.endIndex === null
    ) {
      return errors; // 未完成选择，不显示错误
    }

    // 验证训练区间（必须严格大于）
    if (!isValidRange(trainingRange, true)) {
      errors.push({
        type: 'training',
        message: '训练区间的结束月份必须大于开始月份（至少跨越2个月）',
      });
    } else {
      // 检查训练区间大小
      const trainingSize = trainingRange.endIndex - trainingRange.startIndex + 1;
      if (trainingSize < MIN_TRAINING_POINTS) {
        errors.push({
          type: 'size',
          message: `训练区间至少需要 ${MIN_TRAINING_POINTS} 个数据点（当前只有 ${trainingSize} 个）`,
        });
      }

      // 检查训练区间是否包含空白值
      const trainingBlankCheck = hasBlankInRange(
        points,
        trainingRange.startIndex,
        trainingRange.endIndex
      );
      if (trainingBlankCheck.hasBlank) {
        errors.push({
          type: 'blank_data',
          message: `训练区间包含 ${trainingBlankCheck.blankMonths.length} 个空白数据月份：${trainingBlankCheck.blankMonths.join('、')}`,
        });
      }
    }

    // 验证评估区间
    if (!isValidRange(evaluateRange)) {
      errors.push({
        type: 'evaluation',
        message: '评估区间的结束月份必须晚于或等于开始月份',
      });
    } else {
      // 检查评估区间大小
      const evaluationSize = evaluateRange.endIndex - evaluateRange.startIndex + 1;
      if (evaluationSize < MIN_EVALUATION_POINTS) {
        errors.push({
          type: 'size',
          message: `评估区间至少需要 ${MIN_EVALUATION_POINTS} 个数据点（当前只有 ${evaluationSize} 个）`,
        });
      }

      // 检查评估区间是否包含空白值
      const evaluateBlankCheck = hasBlankInRange(
        points,
        evaluateRange.startIndex,
        evaluateRange.endIndex
      );
      if (evaluateBlankCheck.hasBlank) {
        errors.push({
          type: 'blank_data',
          message: `评估区间包含 ${evaluateBlankCheck.blankMonths.length} 个空白数据月份：${evaluateBlankCheck.blankMonths.join('、')}`,
        });
      }
    }

    // 验证区间分离
    if (
      isValidRange(trainingRange) &&
      isValidRange(evaluateRange) &&
      trainingRange.endIndex! >= evaluateRange.startIndex!
    ) {
      errors.push({
        type: 'separation',
        message: '评估区间必须在训练区间之后，不能重叠',
      });
    }

    return errors;
  }, [trainingRange, evaluateRange, points]);

  const canProceed = validationErrors.length === 0 &&
    trainingRange.startIndex !== null &&
    trainingRange.endIndex !== null &&
    evaluateRange.startIndex !== null &&
    evaluateRange.endIndex !== null;

  if (isLoadingSales) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 flex flex-col items-center justify-center space-y-3">
        <CalendarRange className="w-8 h-8 text-blue-500 animate-pulse" />
        <p className="text-gray-600">正在加载历史销量数据...</p>
      </div>
    );
  }

  if (salesDataError) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 space-y-4">
        <h2 className="text-xl font-semibold text-red-600">数据加载失败</h2>
        <p className="text-red-500">{salesDataError}</p>
      </div>
    );
  }

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

  if (!hasEnoughData(points)) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 space-y-4">
        <h2 className="text-xl font-semibold text-gray-900">数据点不足</h2>
        <p className="text-gray-600">
          当前产品的历史销量记录不足以划分训练与评估区间（至少需要 {MIN_TOTAL_POINTS} 条数据）。请联系管理员补充数据后再尝试。
        </p>
      </div>
    );
  }

  const trainingOptions = points.map((record, index) => ({
    label: `${record.month} (${record.sales != null && !isNaN(record.sales) ? record.sales.toLocaleString() : '空白'} ${meta?.unit ?? ''})`,
    value: index,
    isBlank: isBlankValue(record.sales),
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

  const handleProceed = () => {
    if (!canProceed) return;
    navigate(PATHS.FIRST_MODEL);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 space-y-8">
      <header className="space-y-2">
        <h2 className="text-2xl font-semibold text-gray-900 flex items-center space-x-3">
          <CalendarRange className="w-7 h-7 text-blue-600" />
          <span>选择历史销量数据时段</span>
        </h2>
        <p className="text-gray-600">
          请选择用于训练预测模型的历史数据范围，以及用于评估模型表现的对比区间。每次选择都会即时保存。
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
          <p className="text-sm text-gray-600 mb-3">
            训练区间用于训练预测模型，至少需要 {MIN_TRAINING_POINTS} 个数据点。
          </p>
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
                  <option
                    key={`train-start-${option.value}`}
                    value={option.value}
                    className={option.isBlank ? 'text-red-600' : ''}
                  >
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
                  <option
                    key={`train-end-${option.value}`}
                    value={option.value}
                    className={option.isBlank ? 'text-red-600' : ''}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div>
          <h4 className="text-lg font-semibold text-gray-900 mb-3">评估数据区间</h4>
          <p className="text-sm text-gray-600 mb-3">
            评估区间用于验证模型表现，至少需要 {MIN_EVALUATION_POINTS} 个数据点，且必须在训练区间之后。
          </p>
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
                  <option
                    key={`evaluate-start-${option.value}`}
                    value={option.value}
                    className={option.isBlank ? 'text-red-600' : ''}
                  >
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
                  <option
                    key={`evaluate-end-${option.value}`}
                    value={option.value}
                    className={option.isBlank ? 'text-red-600' : ''}
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {/* 显示所有验证错误 */}
        {validationErrors.length > 0 && (
          <div className="space-y-2">
            {validationErrors.map((error, index) => (
              <div
                key={index}
                className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 flex items-start space-x-2"
              >
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{error.message}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <footer className="flex flex-col md:flex-row md:items-center md:justify-between md:space-x-4 space-y-3 md:space-y-0">
        <div className="text-sm text-gray-500 flex items-center space-x-2">
          {canProceed ? (
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
            <span>请完整选择训练与评估区间，确保无空白数据且符合要求后即可前往模型训练。</span>
          )}
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleProceed}
            disabled={!canProceed}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
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
