/// <reference types="bun-types" />

import { describe, expect, it } from 'bun:test';
import { analyzeLstmField, analyzeLstmFields } from './lstmFieldAnalysis';

describe('lstmFieldAnalysis', () => {
  it('marks dirty numeric-like fields as categorical and explains the backend fallback', () => {
    const profile = analyzeLstmField('促销投入', ['10', '12.5', 'not_a_number', '15']);

    expect(profile.kind).toBe('categorical');
    expect(profile.typeLabel).toBe('类别');
    expect(profile.warnings.join('\n')).toContain('系统会按类别字段处理');
  });

  it('does not treat comma-separated numbers as numeric when the backend would reject them', () => {
    const profile = analyzeLstmField('外部指标', ['1,000', '2,000', '3,000']);

    expect(profile.kind).toBe('categorical');
    expect(profile.numericCount).toBe(0);
  });

  it('does not ignore blank cells while inferring a numeric field', () => {
    const profile = analyzeLstmField('促销投入', ['10', '', '12']);

    expect(profile.kind).toBe('categorical');
    expect(profile.warnings.join('\n')).toContain('空白或非数字值');
  });

  it('canonicalizes equivalent numeric spellings before low-cardinality inference', () => {
    const spellings = ['1', '1.0', '1.00', '01', '+1', '1e0'];
    const values = Array.from({ length: 20 }, (_, index) => spellings[index % spellings.length]!);
    const profile = analyzeLstmField('未知打分', values);

    expect(profile.kind).toBe('categorical');
    expect(profile.uniqueCount).toBe(1);
  });

  it('warns for high-cardinality categorical fields', () => {
    const profile = analyzeLstmField('SKU编码', Array.from({ length: 25 }, (_, index) => `SKU-${index}`));

    expect(profile.kind).toBe('categorical');
    expect(profile.typeLabel).toBe('高基数类别');
    expect(profile.warnings.join('\n')).toContain('类别值较多');
  });

  it('marks integer calendar fields as categorical to match backend one-hot encoding', () => {
    const months = Array.from({ length: 24 }, (_, index) => String((index % 12) + 1));
    const profile = analyzeLstmField('月份', months);

    expect(profile.kind).toBe('categorical');
    expect(profile.warnings.join('\n')).toContain('One-Hot 编码');
  });

  it('keeps non-integer calendar-named fields numeric', () => {
    const profile = analyzeLstmField('月份指标', ['1.5', '2.25', '3.75', '4.5']);

    expect(profile.kind).toBe('numeric');
  });

  it('marks low-cardinality integer fields as categorical to match backend inference', () => {
    const values = Array.from({ length: 24 }, (_, index) => String((index % 3) + 1));
    const profile = analyzeLstmField('未知打分', values);

    expect(profile.kind).toBe('categorical');
    expect(profile.warnings.join('\n')).toContain('One-Hot 编码');
  });

  it('keeps numeric-named fields numeric even when values are low-cardinality integers', () => {
    const values = Array.from({ length: 24 }, (_, index) => String((index % 3) + 1));
    const profile = analyzeLstmField('促销强度', values);

    expect(profile.kind).toBe('numeric');
  });

  it('keeps year fields numeric via numeric name hints', () => {
    const profile = analyzeLstmField('年份', ['2021', '2022', '2023', '2024']);

    expect(profile.kind).toBe('numeric');
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
});
