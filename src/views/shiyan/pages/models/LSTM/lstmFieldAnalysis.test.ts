/// <reference types="bun-types" />

import { describe, expect, it } from 'bun:test';
import { analyzeLstmField, analyzeLstmFields } from './lstmFieldAnalysis';

describe('lstmFieldAnalysis', () => {
  it('marks dirty numeric-like fields as suspicious and explains the fallback', () => {
    const profile = analyzeLstmField('促销投入', ['10', '12.5', 'not_a_number', '15']);

    expect(profile.kind).toBe('mixed-numeric');
    expect(profile.typeLabel).toBe('疑似数值');
    expect(profile.warnings.join('\n')).toContain('系统会按类别字段处理');
  });

  it('warns for high-cardinality categorical fields', () => {
    const profile = analyzeLstmField('SKU编码', Array.from({ length: 25 }, (_, index) => `SKU-${index}`));

    expect(profile.kind).toBe('categorical');
    expect(profile.typeLabel).toBe('高基数类别');
    expect(profile.warnings.join('\n')).toContain('类别值较多');
  });

  it('preserves comma-containing headers while indexing csvData values', () => {
    const profiles = analyzeLstmFields([
      ['销售数量', '外部,指标'],
      ['100', '1.25'],
      ['110', '1.35'],
    ]);

    expect(profiles['外部,指标']?.kind).toBe('numeric');
    expect(profiles['外部,指标']?.numericCount).toBe(2);
  });

  // --- Alignment with backend `_infer_single_feature_type` (fzbe/py/src/data_utils.py) ---

  it('treats low-cardinality calendar integers as categorical', () => {
    const profile = analyzeLstmField(
      '月份',
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'],
    );

    expect(profile.kind).toBe('categorical');
  });

  it('keeps high-cardinality calendar integers numeric', () => {
    const profile = analyzeLstmField(
      '周次',
      Array.from({ length: 40 }, (_, index) => String(index + 1)),
    );

    expect(profile.kind).toBe('numeric');
  });

  it('lets a numeric-name hint win over a categorical-name hint', () => {
    // 价格 (numeric) + 类型 (categorical) — backend checks numeric hints first.
    const profile = analyzeLstmField('价格类型', ['1', '2', '3', '2', '1']);

    expect(profile.kind).toBe('numeric');
  });

  it('downgrades low-cardinality integers without hints to categorical', () => {
    const profile = analyzeLstmField(
      '档位',
      Array.from({ length: 20 }, (_, index) => String((index % 3) + 1)),
    );

    expect(profile.kind).toBe('categorical');
  });

  it('keeps low-cardinality integers numeric when unique ratio is high', () => {
    // Only 3 rows: unique ratio 1.0 > 0.3, so the low-cardinality rule must not fire.
    const profile = analyzeLstmField('档位', ['1', '2', '3']);

    expect(profile.kind).toBe('numeric');
  });

  it('classifies comma-formatted numeric columns as categorical like the backend', () => {
    // pd.to_numeric cannot parse "1,000"; both sides fall back to categorical.
    const profile = analyzeLstmField('销售数量', ['1,000', '2,000', '3,000']);

    expect(profile.kind).toBe('categorical');
  });

  it('keeps continuous numeric fields numeric', () => {
    const profile = analyzeLstmField('测量值', ['10.1', '20.2', '30.3', '40.4', '50.5']);

    expect(profile.kind).toBe('numeric');
  });
});
