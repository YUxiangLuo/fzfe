/// <reference types="bun-types" />

import { describe, expect, it } from 'bun:test';
import {
  MIN_EVALUATION_POINTS,
  MIN_TRAINING_POINTS,
} from './DataWindowSelection';

describe('data-window model constraints', () => {
  it('keeps the shared window large enough for all seven model workflows', () => {
    expect(MIN_TRAINING_POINTS).toBe(8);
    expect(MIN_EVALUATION_POINTS).toBe(2);
  });
});
