import { describe, expect, it } from 'bun:test';
import {
  getMovingAverageWindowValidationError,
  isValidMovingAverageWindow,
} from './movingAverageValidation';

describe('movingAverageValidation', () => {
  it('requires an integer window size', () => {
    expect(isValidMovingAverageWindow(2.5, 36)).toBe(false);
    expect(getMovingAverageWindowValidationError(2.5, 36)).toBe('时间窗口大小必须为整数');
  });

  it('accepts integer windows within the training data length', () => {
    expect(isValidMovingAverageWindow(2, 36)).toBe(true);
    expect(isValidMovingAverageWindow(36, 36)).toBe(true);
  });

  it('rejects windows outside the allowed range', () => {
    expect(getMovingAverageWindowValidationError('', 36)).toBe('请输入一个有效的时间窗口大小');
    expect(getMovingAverageWindowValidationError(1, 36)).toBe('时间窗口大小至少为 2');
    expect(getMovingAverageWindowValidationError(37, 36)).toBe('时间窗口大小不能超过训练数据长度（36）');
  });
});
