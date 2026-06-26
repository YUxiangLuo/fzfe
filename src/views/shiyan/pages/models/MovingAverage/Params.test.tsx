/// <reference lib="dom" />
/// <reference types="bun-types" />

import { describe, expect, it, mock } from 'bun:test';
import { render } from '@testing-library/react';
import Params, { parseWindowSizeInput } from './Params';

describe('MovingAverage Params', () => {
  it('keeps decimal input as a decimal so validation can reject it instead of truncating', () => {
    expect(parseWindowSizeInput('2.5')).toBe(2.5);
    expect(parseWindowSizeInput('2.5')).not.toBe(2);
  });

  it('uses a plain text input so decimal text is not silently rounded by the browser', () => {
    const view = render(<Params windowSize="" setWindowSize={mock(() => {})} />);
    const input = view.getByLabelText('请输入时间窗口 n 的取值:') as HTMLInputElement;

    expect(input.type).toBe('text');
    expect(input.inputMode).toBe('numeric');
    expect(input.pattern).toBe('[0-9]*');
    expect(input.placeholder).toBe('请输入大于等于 2 的整数');
  });
});
