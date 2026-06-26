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
});
