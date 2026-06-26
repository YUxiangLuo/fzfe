import { MOVING_AVERAGE_CONSTANTS } from '../constants';

export type MovingAverageWindowValue = number | '';

export const getMovingAverageWindowValidationError = (
  windowSize: MovingAverageWindowValue,
  trainDataLength = 0,
): string | null => {
  if (windowSize === '' || !Number.isFinite(windowSize) || windowSize <= 0) {
    return '请输入一个有效的时间窗口大小';
  }

  if (!Number.isInteger(windowSize)) {
    return '时间窗口大小必须为整数';
  }

  if (windowSize < MOVING_AVERAGE_CONSTANTS.MIN_WINDOW_SIZE) {
    return `时间窗口大小至少为 ${MOVING_AVERAGE_CONSTANTS.MIN_WINDOW_SIZE}`;
  }

  if (trainDataLength > 0 && windowSize > trainDataLength) {
    return `时间窗口大小不能超过训练数据长度（${trainDataLength}）`;
  }

  return null;
};

export const isValidMovingAverageWindow = (
  windowSize: MovingAverageWindowValue,
  trainDataLength = 0,
): boolean => getMovingAverageWindowValidationError(windowSize, trainDataLength) === null;
