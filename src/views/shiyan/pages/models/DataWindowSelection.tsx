import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useExperiment } from '../../contexts/ExperimentContext.zustand';
import { AlertTriangle, CalendarRange, CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import type { MonthlySalesRecord } from '../../data/historicalDatasets';
import { useConfirm } from '../../../../shared/contexts/ConfirmContext';

// 常量配置
const MIN_TRAINING_POINTS = 2; // 训练集至少需要2个数据点
const MIN_EVALUATION_POINTS = 1; // 评估集至少需要1个数据点
const MIN_TOTAL_POINTS = MIN_TRAINING_POINTS + MIN_EVALUATION_POINTS; // 总共至少需要3个数据点

const PATHS = {
  ROLE_INTRO: '/model/role-intro',
  MODEL_INTRO: '/model/model-intro',
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
    handleDataWindowChange,
    productSalesData,
    isLoadingSales,
    salesDataError,
  } = useExperiment();
  const { confirm } = useConfirm();

  const [processedSalesData, setProcessedSalesData] = useState<typeof productSalesData>(null);
  const [filledToOriginalIndexMap, setFilledToOriginalIndexMap] = useState<(number | null)[]>([]);
  const [originalToFilledIndexMap, setOriginalToFilledIndexMap] = useState<Map<number, number>>(new Map());

  const [localTrainingRange, setLocalTrainingRange] = useState<RangeSelection>({ startIndex: null, endIndex: null });
  const [localEvaluateRange, setLocalEvaluateRange] = useState<RangeSelection>({ startIndex: null, endIndex: null });

  useEffect(() => {
    if (productSalesData) {
      const originalMonthlySales = productSalesData.monthlySales || [];
      const filledData = fillMissingMonths([...originalMonthlySales]);

      const indexMap: (number | null)[] = [];
      const reverseMap = new Map<number, number>();
      let originalIndex = 0;

      for (let filledIndex = 0; filledIndex < filledData.length; filledIndex++) {
        const record = filledData[filledIndex];
        if (record && record.sales !== null && !isNaN(record.sales)) {
          const foundIndex = originalMonthlySales.findIndex(
            (item, idx) => idx >= originalIndex && item.month === record.month
          );
          if (foundIndex !== -1) {
            indexMap.push(foundIndex);
            reverseMap.set(foundIndex, filledIndex);
            originalIndex = foundIndex + 1;
          } else {
            indexMap.push(null);
          }
        } else {
          indexMap.push(null);
        }
      }

      setFilledToOriginalIndexMap(indexMap);
      setOriginalToFilledIndexMap(reverseMap);
      setProcessedSalesData({
        ...productSalesData,
        monthlySales: filledData,
      });

      setLocalTrainingRange({
        startIndex: state.data_window_train_start_index !== null ? (reverseMap.get(state.data_window_train_start_index) ?? null) : null,
        endIndex: state.data_window_train_end_index !== null ? (reverseMap.get(state.data_window_train_end_index) ?? null) : null,
      });
      setLocalEvaluateRange({
        startIndex: state.data_window_evaluate_start_index !== null ? (reverseMap.get(state.data_window_evaluate_start_index) ?? null) : null,
        endIndex: state.data_window_evaluate_end_index !== null ? (reverseMap.get(state.data_window_evaluate_end_index) ?? null) : null,
      });

    } else {
      setProcessedSalesData(null);
      setFilledToOriginalIndexMap([]);
      setOriginalToFilledIndexMap(new Map());
    }
  }, [productSalesData, state.data_window_train_start_index, state.data_window_train_end_index, state.data_window_evaluate_start_index, state.data_window_evaluate_end_index]);

  const points = processedSalesData?.monthlySales ?? [];
  const meta = processedSalesData?.meta;

  const validationErrors = useMemo((): ValidationError[] => {
    const errors: ValidationError[] = [];

    if (
      localTrainingRange.startIndex === null ||
      localTrainingRange.endIndex === null ||
      localEvaluateRange.startIndex === null ||
      localEvaluateRange.endIndex === null
    ) {
      return errors;
    }

    if (!isValidRange(localTrainingRange, true)) {
      errors.push({
        type: 'training',
        message: '训练区间的结束月份必须大于开始月份（至少跨越2个月）',
      });
    } else {
      const trainingSize = localTrainingRange.endIndex - localTrainingRange.startIndex + 1;
      if (trainingSize < MIN_TRAINING_POINTS) {
        errors.push({
          type: 'size',
          message: `训练区间至少需要 ${MIN_TRAINING_POINTS} 个数据点（当前只有 ${trainingSize} 个）`,
        });
      }
      const trainingBlankCheck = hasBlankInRange(
        points,
        localTrainingRange.startIndex,
        localTrainingRange.endIndex
      );
      if (trainingBlankCheck.hasBlank) {
        errors.push({
          type: 'blank_data',
          message: `训练区间包含 ${trainingBlankCheck.blankMonths.length} 个空白数据月份：${trainingBlankCheck.blankMonths.join('、')}`,
        });
      }
    }

    if (!isValidRange(localEvaluateRange)) {
      errors.push({
        type: 'evaluation',
        message: '评估区间的结束月份必须晚于或等于开始月份',
      });
    } else {
      const evaluationSize = localEvaluateRange.endIndex - localEvaluateRange.startIndex + 1;
      if (evaluationSize < MIN_EVALUATION_POINTS) {
        errors.push({
          type: 'size',
          message: `评估区间至少需要 ${MIN_EVALUATION_POINTS} 个数据点（当前只有 ${evaluationSize} 个）`,
        });
      }
      const evaluateBlankCheck = hasBlankInRange(
        points,
        localEvaluateRange.startIndex,
        localEvaluateRange.endIndex
      );
      if (evaluateBlankCheck.hasBlank) {
        errors.push({
          type: 'blank_data',
          message: `评估区间包含 ${evaluateBlankCheck.blankMonths.length} 个空白数据月份：${evaluateBlankCheck.blankMonths.join('、')}`,
        });
      }
    }

    if (
      isValidRange(localTrainingRange) &&
      isValidRange(localEvaluateRange) &&
      localTrainingRange.endIndex! >= localEvaluateRange.startIndex!
    ) {
      errors.push({
        type: 'separation',
        message: '评估区间必须在训练区间之后，不能重叠',
      });
    }

    return errors;
  }, [localTrainingRange, localEvaluateRange, points]);

  const canProceed = validationErrors.length === 0 &&
    localTrainingRange.startIndex !== null &&
    localTrainingRange.endIndex !== null &&
    localEvaluateRange.startIndex !== null &&
    localEvaluateRange.endIndex !== null;

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

  const updateRangeField = (
    rangeType: 'training' | 'evaluation',
    bound: 'startIndex' | 'endIndex',
    rawValue: string,
  ) => {
    const value = rawValue === '' ? null : Number(rawValue);
    const setter = rangeType === 'training' ? setLocalTrainingRange : setLocalEvaluateRange;
    setter(prev => ({ ...prev, [bound]: value }));
  };

  const handlePrevious = () => {
    navigate(PATHS.ROLE_INTRO);
  };

  const handleNext = async () => {
    if (!canProceed) return;

    const originalTrainStart = filledToOriginalIndexMap[localTrainingRange.startIndex!];
    const originalTrainEnd = filledToOriginalIndexMap[localTrainingRange.endIndex!];
    const originalEvaluateStart = filledToOriginalIndexMap[localEvaluateRange.startIndex!];
    const originalEvaluateEnd = filledToOriginalIndexMap[localEvaluateRange.endIndex!];

    if (
      originalTrainStart === null || originalTrainStart === undefined ||
      originalTrainEnd === null || originalTrainEnd === undefined ||
      originalEvaluateStart === null || originalEvaluateStart === undefined ||
      originalEvaluateEnd === null || originalEvaluateEnd === undefined
    ) {
      console.error("Cannot proceed: selected range includes invalid (blank) data points.");
      return;
    }

    const hasExistingSelection = state.data_window_train_start_index !== null;
    const hasChanged = state.data_window_train_start_index !== originalTrainStart ||
                       state.data_window_train_end_index !== originalTrainEnd ||
                       state.data_window_evaluate_start_index !== originalEvaluateStart ||
                       state.data_window_evaluate_end_index !== originalEvaluateEnd;

    if (hasExistingSelection && hasChanged) {
        const isConfirmed = await confirm({
            title: '确认更改数据窗口',
            message: '更改数据窗口将重置您所有已训练的模型和相关进度。您确定要继续吗？',
            confirmText: '确认更改',
            cancelText: '取消',
        });
        if (!isConfirmed) {
            return;
        }
    }

    const dataWindowPayload = {
      data_window_train_start_index: originalTrainStart,
      data_window_train_end_index: originalTrainEnd,
      data_window_evaluate_start_index: originalEvaluateStart,
      data_window_evaluate_end_index: originalEvaluateEnd,
    };

    // Only call the global state update if something has actually changed.
    if (hasChanged) {
        await handleDataWindowChange(dataWindowPayload);
    }
    
    navigate(PATHS.MODEL_INTRO);
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
                value={localTrainingRange.startIndex ?? ''}
                onChange={(event) =>
                  updateRangeField('training', 'startIndex', event.target.value)
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
                value={localTrainingRange.endIndex ?? ''}
                onChange={(event) =>
                  updateRangeField('training', 'endIndex', event.target.value)
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
                value={localEvaluateRange.startIndex ?? ''}
                onChange={(event) =>
                  updateRangeField('evaluation', 'startIndex', event.target.value)
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
                value={localEvaluateRange.endIndex ?? ''}
                onChange={(event) =>
                  updateRangeField('evaluation', 'endIndex', event.target.value)
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

      {canProceed && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700 flex items-start space-x-2">
          <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            已选择训练区间{' '}
            {`${trainingOptions[localTrainingRange.startIndex!]?.label} 至 ${trainingOptions[localTrainingRange.endIndex!]?.label}`}
            ，评估区间{' '}
            {`${evaluateOptions[localEvaluateRange.startIndex!]?.label} 至 ${evaluateOptions[localEvaluateRange.endIndex!]?.label}`}。
          </span>
        </div>
      )}

      <footer className="flex justify-between items-center pt-6 border-t border-gray-200">
        <button
          onClick={handlePrevious}
          className="flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium"
          type="button"
        >
          <ChevronLeft className="w-5 h-5" />
          上一步
        </button>

        <div className="text-center">
          {!canProceed && (
            <p className="text-sm text-gray-600">
              请完整选择训练与评估区间，确保无空白数据且符合要求
            </p>
          )}
        </div>

        <button
          onClick={handleNext}
          disabled={!canProceed}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium disabled:bg-gray-300 disabled:cursor-not-allowed disabled:hover:bg-gray-300"
          type="button"
        >
          下一步
          <ChevronRight className="w-5 h-5" />
        </button>
      </footer>
    </div>
  );
};

export default DataWindowSelection;
