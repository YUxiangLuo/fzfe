/// <reference lib="dom" />
/// <reference types="bun-types" />

import { describe, expect, it, mock } from 'bun:test';
import { fireEvent, render } from '@testing-library/react';
import Build from './Build';

describe('LSTM Build', () => {
  it('shows custom categorical and identifier-like fields instead of filtering them out', () => {
    const view = render(
      <Build
        features={[]}
        setFeatures={mock(() => {})}
        target="销售数量"
        setTarget={mock(() => {})}
        error={null}
        isLoading={false}
        fieldOptions={['销售数量', 'SKU编码', '渠道类型', 'unused_free_text', '外部,指标']}
        onShowLSTMMethodInfo={mock(() => {})}
      />,
    );

    expect(view.getByLabelText('SKU编码')).toBeTruthy();
    expect(view.getByLabelText('渠道类型')).toBeTruthy();
    expect(view.getByLabelText('unused_free_text')).toBeTruthy();
    expect(view.getByLabelText('外部,指标')).toBeTruthy();
    expect((view.getByLabelText('销售数量(目标字段)') as HTMLInputElement).disabled).toBe(true);
  });

  it('shows field type labels and warnings for dirty numeric-like and high-cardinality fields', () => {
    const highCardinalityRows = Array.from({ length: 25 }, (_, index) => [
      String(100 + index),
      index === 3 ? 'not_a_number' : String(20 + index),
      `SKU-${index}`,
    ]);
    const view = render(
      <Build
        features={[]}
        setFeatures={mock(() => {})}
        target="销售数量"
        setTarget={mock(() => {})}
        error={null}
        isLoading={false}
        fieldOptions={['销售数量', '促销投入', 'SKU编码']}
        csvData={[
          ['销售数量', '促销投入', 'SKU编码'],
          ...highCardinalityRows,
        ]}
        onShowLSTMMethodInfo={mock(() => {})}
      />,
    );

    expect(view.getByText('疑似数值')).toBeTruthy();
    expect(view.getByText('高基数类别')).toBeTruthy();
    expect(view.getByText(/系统会按类别字段处理/)).toBeTruthy();
    expect(view.getAllByText(/类别值较多/).length).toBeGreaterThanOrEqual(1);
  });

  it('preserves comma-containing field names when toggling feature selection', () => {
    const setFeatures = mock(() => {});
    const view = render(
      <Build
        features={[]}
        setFeatures={setFeatures}
        target="销售数量"
        setTarget={mock(() => {})}
        error={null}
        isLoading={false}
        fieldOptions={['销售数量', '外部,指标']}
        onShowLSTMMethodInfo={mock(() => {})}
      />,
    );

    fireEvent.click(view.getByLabelText('外部,指标'));

    expect(setFeatures).toHaveBeenCalledWith(['外部,指标']);
  });
});
