/// <reference lib="dom" />
/// <reference types="bun-types" />

import { afterEach, describe, expect, it } from 'bun:test';
import { cleanup, render } from '@testing-library/react';
import ProductionForecastAssumptionNote from './ProductionForecastAssumptionNote';

describe('ProductionForecastAssumptionNote', () => {
  afterEach(cleanup);

  it('shows no uncertainty alert for model-derived uncertainty', () => {
    const view = render(
      <ProductionForecastAssumptionNote predictions={[{ uncertainty_source: 'model' }]} />,
    );

    expect(view.queryByText(/误差区间与安全库存标准差使用了回退估计/)).toBeNull();
  });

  it('shows fallback count and de-duplicated reasons to the learner', () => {
    const view = render(
      <ProductionForecastAssumptionNote
        predictions={[
          { uncertainty_source: 'fallback', uncertainty_reason: 'first_difference_scale' },
          { uncertainty_source: 'fallback', uncertainty_reason: 'first_difference_scale' },
          { uncertainty_source: 'empirical' },
        ]}
      />,
    );

    expect(view.getByRole('alert').textContent).toContain('2 期误差区间与安全库存标准差使用了回退估计');
    expect(view.getByRole('alert').textContent).toContain('回退原因：可用残差不足，改用训练序列一阶差分尺度');
  });
});
