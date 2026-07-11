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

// Mirrors _CALENDAR_CATEGORICAL_*_HINTS in fzbe/py/src/data_utils.py: the backend
// one-hot encodes integer calendar fields (month/quarter/weekday) during training.
const CALENDAR_CATEGORICAL_NAME_HINTS = [
  '星期',
  '月份',
  '季度',
  '周次',
];

const CALENDAR_CATEGORICAL_TOKEN_HINTS = [
  'dayofweek',
  'dow',
  'month',
  'quarter',
  'weekday',
  'weekofyear',
];

const normalizeFeatureName = (name: string) =>
  Array.from(name.toLowerCase()).filter(ch => /[a-z0-9\u4e00-\u9fff]/u.test(ch)).join('');

const tokenizeFeatureName = (name: string) =>
  name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase()
    .match(/[a-z0-9]+|[\u4e00-\u9fff]+/gu) ?? [];

const hasAny = (value: string, hints: readonly string[]) => hints.some(hint => value.includes(hint));

const hasAnyToken = (tokens: string[], hints: readonly string[]) => hints.some(hint => tokens.includes(hint));

export const isNumericCell = (value: string): boolean => {
  const normalized = value.trim().replace(/,/g, '');
  return normalized.length > 0 && Number.isFinite(Number(normalized));
};

export function analyzeLstmField(field: string, values: string[]): LstmFieldProfile {
  const trimmedValues = values.map(value => String(value ?? '').trim()).filter(value => value.length > 0);
  const uniqueCount = new Set(trimmedValues).size;
  const numericCount = trimmedValues.filter(isNumericCell).length;
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
  const looksNumericByName = hasAny(normalizedName, NUMERIC_NAME_HINTS) || hasAnyToken(nameTokens, NUMERIC_TOKEN_HINTS);
  const looksCategoricalByName = hasAny(normalizedName, CATEGORICAL_NAME_HINTS) || hasAnyToken(nameTokens, CATEGORICAL_TOKEN_HINTS);
  const looksCalendarByName = hasAny(normalizedName, CALENDAR_CATEGORICAL_NAME_HINTS) || hasAnyToken(nameTokens, CALENDAR_CATEGORICAL_TOKEN_HINTS);
  const numericRatio = numericCount / nonEmptyCount;

  let kind: LstmFieldKind;
  if (numericCount === nonEmptyCount) {
    // Mirror _infer_single_feature_type in fzbe/py/src/data_utils.py (same rule
    // order) so the badge matches how the backend actually encodes the field.
    const integerLike = trimmedValues.every(value => {
      const parsed = Number(value.replace(/,/g, ''));
      return Math.abs(parsed - Math.round(parsed)) <= 1e-9;
    });
    const lowCardinalityThreshold = Math.max(4, Math.min(12, Math.floor(Math.sqrt(nonEmptyCount)) + 1));

    if (looksNumericByName) {
      kind = 'numeric';
    } else if (looksCalendarByName) {
      kind = integerLike && uniqueCount <= 31 ? 'categorical' : 'numeric';
      if (kind === 'categorical') {
        warnings.push('日历型字段（如月份、季度）会按类别进行 One-Hot 编码，而不是当作连续数值。');
      }
    } else if (looksCategoricalByName) {
      kind = 'categorical';
    } else if (integerLike && uniqueCount <= lowCardinalityThreshold && uniqueCount / nonEmptyCount <= 0.3) {
      kind = 'categorical';
      warnings.push(`该字段虽为数字，但只有 ${uniqueCount} 个不同取值，系统会按类别进行 One-Hot 编码。`);
    } else {
      kind = 'numeric';
    }
  } else if (numericCount > 0 && (looksNumericByName || numericRatio >= 0.5)) {
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
