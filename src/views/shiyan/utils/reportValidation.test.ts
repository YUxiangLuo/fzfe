/// <reference types="bun-types" />

import { describe, expect, it } from "bun:test";
import {
  calculateRepetitionRate,
  checkMinLength,
  validateAnalyses,
} from "./reportValidation";

describe("reportValidation", () => {
  it("counts mixed Chinese characters and English words toward minimum length", () => {
    expect(checkMinLength("测试 test words", 4)).toBeTrue();
    expect(checkMinLength("测试", 3)).toBeFalse();
  });

  it("returns zero repetition for short or invalid n-gram inputs", () => {
    expect(calculateRepetitionRate("ab", 3)).toBe(0);
    expect(calculateRepetitionRate("abc", 0)).toBe(0);
  });

  it("calculates repetition rate for repeated n-grams", () => {
    const repetitionRate = calculateRepetitionRate("abcabc", 3);

    expect(repetitionRate).toBeGreaterThan(0);
    expect(repetitionRate).toBeLessThanOrEqual(1);
  });

  it("accepts only fully populated string analysis objects", () => {
    expect(validateAnalyses({ a: "hello", b: "world" })).toBeTrue();
    expect(validateAnalyses({ a: "hello", b: "   " })).toBeFalse();
    expect(validateAnalyses({ a: "hello", b: 1 })).toBeFalse();
  });
});