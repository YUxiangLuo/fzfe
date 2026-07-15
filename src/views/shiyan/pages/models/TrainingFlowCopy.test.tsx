/// <reference lib="dom" />
/// <reference types="bun-types" />

import React from 'react';
import { afterEach, describe, expect, it } from 'bun:test';
import { cleanup, render } from '@testing-library/react';
import ExponentialSmoothingValidation from './ExponentialSmoothing/Validation';
import MovingAverageValidation from './MovingAverage/Validation';

describe('model training flow copy', () => {
  afterEach(() => cleanup());

  it('sends valid MA and ES parameters into staged training instead of promising immediate results', () => {
    const ma = render(
      <MovingAverageValidation windowSize={3} isValid trainDataLength={12} />,
    );
    expect(ma.getByText('点击“下一步”进入分阶段训练')).toBeDefined();
    expect(ma.container.textContent).not.toContain('继续查看计算结果');
    ma.unmount();

    const es = render(
      <ExponentialSmoothingValidation alpha={0.3} isValid />,
    );
    expect(es.getByText('点击“下一步”进入分阶段训练')).toBeDefined();
    expect(es.container.textContent).not.toContain('继续查看计算结果');
  });
});
