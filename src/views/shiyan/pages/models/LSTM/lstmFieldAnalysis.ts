export type LstmFieldKind = 'numeric' | 'categorical' | 'mixed-numeric' | 'empty' | 'unknown';

export interface LstmFieldProfile {
  field: string;
  kind: LstmFieldKind;
  typeLabel: string;
  nonEmptyCount: number;
  numericCount: number;
  uniqueCount: number;
  warnings: string[];
}

// The word lists and the decision ladder below intentionally mirror the backend
// heuristic in `fzbe/py/src/data_utils.py` (`_infer_single_feature_type`). The
// backend is authoritative — it re-infers feature types at training time — so this
// preview must reach the same numeric/categorical verdict to avoid showing the
// student a badge that disagrees with how the model actually treats the field.
const NUMERIC_NAME_HINTS = [
  '价格',
  '促销',
  '利用率',
  '搜索',
  '指数',
  '年份',
  '库存',
  '强度',
  '投入',
  '数量',
  '销量',
  '销售',
];

const NUMERIC_TOKEN_HINTS = [
  'year',
  'price',
  'sales',
  'inventory',
  'stock',
  'trend',
  'utilization',
  'value',
  'volume',
  'yearly',
];

const CATEGORICAL_NAME_HINTS = [
  '区域',
  '代码',
  '分类',
  '分组',
  '品类',
  '地区',
  '天气',
  '属性',
  '序号',
  '形态',
  '渠道',
  '类型',
  '编号',
  '编码',
  '类别',
  '等级',
  '组别',
];

const CATEGORICAL_TOKEN_HINTS = [
  'category',
  'class',
  'code',
  'flag',
  'group',
  'id',
  'label',
  'region',
  'segment',
  'channel',
  'type',
  'weather',
];

// Calendar-like integer columns (month/quarter/week/weekday) are treated as
// categorical only when they stay low-cardinality integers, matching the backend.
const CALENDAR_NAME_HINTS = [
  '星期',
  '月份',
  '季度',
  '周次',
];

const CALENDAR_TOKEN_HINTS = [
  'dayofweek',
  'dow',
  'month',
  'quarter',
  'weekday',
  'weekofyear',
];

const CALENDAR_MAX_UNIQUE_FOR_CATEGORICAL = 31;

const normalizeFeatureName = (name: string) =>
  Array.from(name.toLowerCase()).filter(ch => /[a-z0-9\u4e00-\u9fff]/u.test(ch)).join('');

const tokenizeFeatureName = (name: string) =>
  name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .match(/[a-z0-9]+|[\u4e00-\u9fff]+/gu) ?? [];

const hasAny = (value: string, hints: readonly string[]) => hints.some(hint => value.includes(hint));

const hasAnyToken = (tokens: string[], hints: readonly string[]) => hints.some(hint => tokens.includes(hint));
const DECIMAL_NUMBER_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;

/**
 * Parse a single cell using the shared data contract: ASCII commas are
 * presentation-only separators, while currency symbols and non-finite tokens
 * remain invalid. This mirrors the backend's `_coerce_numeric_series` helper.
 */
const parseNumericCell = (value: string): number | null => {
  const trimmed = value.replace(/,/g, '').trim();
  if (trimmed.length === 0) {
    return null;
  }
  if (!DECIMAL_NUMBER_PATTERN.test(trimmed)) {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

export const isNumericCell = (value: string): boolean => parseNumericCell(value) !== null;

// Mirror of numpy's `isclose(values, round(values), atol=1e-9)` (default rtol=1e-5).
const isIntegerLikeNumbers = (numbers: number[]): boolean => {
  if (numbers.length === 0) {
    return false;
  }
  return numbers.every(value => {
    const rounded = Math.round(value);
    return Math.abs(value - rounded) <= 1e-9 + 1e-5 * Math.abs(rounded);
  });
};

interface NameHints {
  looksNumericByName: boolean;
  looksCalendarByName: boolean;
  looksCategoricalByName: boolean;
}

/**
 * Decide numeric vs categorical for an all-numeric column, replicating the
 * backend ladder order exactly: numeric-name hints win first, then calendar
 * columns, then categorical-name hints, then a low-cardinality integer fallback.
 */
const inferNumericColumnKind = (numbers: number[], hints: NameHints): 'numeric' | 'categorical' => {
  if (hints.looksNumericByName) {
    return 'numeric';
  }

  const integerLike = isIntegerLikeNumbers(numbers);
  const uniqueCount = new Set(numbers).size;

  if (hints.looksCalendarByName) {
    return integerLike && uniqueCount <= CALENDAR_MAX_UNIQUE_FOR_CATEGORICAL ? 'categorical' : 'numeric';
  }

  if (hints.looksCategoricalByName) {
    return 'categorical';
  }

  const lowCardinalityThreshold = Math.max(4, Math.min(12, Math.floor(Math.sqrt(numbers.length)) + 1));
  const uniqueRatio = uniqueCount / numbers.length;
  if (integerLike && uniqueCount <= lowCardinalityThreshold && uniqueRatio <= 0.3) {
    return 'categorical';
  }

  return 'numeric';
};

export function analyzeLstmField(field: string, values: string[]): LstmFieldProfile {
  const trimmedValues = values.map(value => String(value ?? '').trim()).filter(value => value.length > 0);
  const uniqueCount = new Set(trimmedValues).size;
  const numericValues = trimmedValues
    .map(parseNumericCell)
    .filter((value): value is number => value !== null);
  const numericCount = numericValues.length;
  const nonEmptyCount = trimmedValues.length;
  const warnings: string[] = [];

  if (nonEmptyCount === 0) {
    return {
      field,
      kind: 'empty',
      typeLabel: '空字段',
      nonEmptyCount,
      numericCount,
      uniqueCount,
      warnings: ['该字段当前没有可用取值，请确认数据是否完整。'],
    };
  }

  const normalizedName = normalizeFeatureName(field);
  const nameTokens = tokenizeFeatureName(field);
  const hints: NameHints = {
    looksNumericByName: hasAny(normalizedName, NUMERIC_NAME_HINTS) || hasAnyToken(nameTokens, NUMERIC_TOKEN_HINTS),
    looksCalendarByName: hasAny(normalizedName, CALENDAR_NAME_HINTS) || hasAnyToken(nameTokens, CALENDAR_TOKEN_HINTS),
    looksCategoricalByName: hasAny(normalizedName, CATEGORICAL_NAME_HINTS) || hasAnyToken(nameTokens, CATEGORICAL_TOKEN_HINTS),
  };
  const numericRatio = numericCount / nonEmptyCount;

  let kind: LstmFieldKind;
  if (numericCount === nonEmptyCount) {
    // Every value is numeric-coercible: apply the backend's name/cardinality ladder.
    kind = inferNumericColumnKind(numericValues, hints);
  } else if (numericCount > 0 && (hints.looksNumericByName || numericRatio >= 0.5)) {
    // The backend treats any non-coercible value as categorical. We keep a
    // friendlier "疑似数值" label but the effective verdict is still categorical.
    kind = 'mixed-numeric';
    warnings.push(`该字段包含 ${nonEmptyCount - numericCount} 个非数字值，系统会按类别字段处理，可能不是预期。`);
  } else {
    kind = 'categorical';
  }

  if (kind !== 'numeric' && uniqueCount >= 20 && uniqueCount / nonEmptyCount >= 0.5) {
    warnings.push(`类别值较多（${uniqueCount} 个不同值），可能增加训练时间并影响泛化。`);
  }

  const typeLabel = (() => {
    if (kind === 'numeric') return '数值';
    if (kind === 'mixed-numeric') return '疑似数值';
    if (warnings.some(warning => warning.includes('类别值较多'))) return '高基数类别';
    return '类别';
  })();

  return {
    field,
    kind,
    typeLabel,
    nonEmptyCount,
    numericCount,
    uniqueCount,
    warnings,
  };
}

export function analyzeLstmFields(csvData?: string[][], fieldOptions: string[] = []): Record<string, LstmFieldProfile> {
  const headers = csvData?.[0]?.length ? csvData[0] : fieldOptions;
  const rows = csvData?.slice(1) ?? [];
  const profiles: Record<string, LstmFieldProfile> = {};

  headers.forEach((rawHeader, columnIndex) => {
    const field = String(rawHeader ?? '').trim();
    if (!field || profiles[field]) return;
    const values = rows.map(row => String(row[columnIndex] ?? ''));
    profiles[field] = rows.length > 0
      ? analyzeLstmField(field, values)
      : {
        field,
        kind: 'unknown',
        typeLabel: '字段',
        nonEmptyCount: 0,
        numericCount: 0,
        uniqueCount: 0,
        warnings: [],
      };
  });

  return profiles;
}
