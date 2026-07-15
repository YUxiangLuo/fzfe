/// <reference types="bun-types" />

import { describe, expect, it } from "bun:test";
import {
  calculateCapacityByScenario,
  calculateCapacityScenarioOptions,
  calculateForecastLoadPoints,
  calculateSafetyStock,
} from "./productionCapacityHelper";

describe("productionCapacityHelper", () => {
  it("calculates forecast load from demand prediction and safety stock", () => {
    const points = calculateForecastLoadPoints(
      [
        { prediction: 100, std_dev: 10 },
        { prediction: 120, std_dev: 20 },
      ],
      1.65,
    );

    expect(points).toEqual([
      { period: 1, demand: 100, safetyStock: 0, forecastLoad: 100 },
      { period: 2, demand: 120, safetyStock: 33, forecastLoad: 153 },
    ]);
  });

  it("builds three scenario capacities from average and peak forecast load", () => {
    const options = calculateCapacityScenarioOptions(
      [
        { prediction: 100, std_dev: 10 },
        { prediction: 120, std_dev: 6 },
        { prediction: 80, std_dev: 0 },
      ],
      1.65,
    );

    const capacities = Object.fromEntries(
      options.map((option) => [option.id, option.capacity]),
    );

    // Forecast loads: 100, 130, 80. Rounded average = 103, peak = 130.
    expect(capacities).toEqual({
      tight: 93,
      normal: 103,
      abundant: 130,
    });
  });

  it("keeps abundant capacity at least ten percent above average load", () => {
    expect(calculateCapacityByScenario("abundant", 100, 105)).toBe(110);
  });

  it("uses the three customer-specified Z values in the safety-stock formula", () => {
    expect(calculateSafetyStock(50, 1.28)).toBe(64);
    expect(calculateSafetyStock(50, 1.65)).toBe(83);
    expect(calculateSafetyStock(50, 2.33)).toBe(117);
  });

  it("rejects invalid uncertainty inputs instead of silently falling back", () => {
    expect(() => calculateSafetyStock(-1, 1.65)).toThrow("预测标准差");
    expect(() => calculateSafetyStock(Number.POSITIVE_INFINITY, 1.65)).toThrow("预测标准差");
    expect(() => calculateSafetyStock(10, 0)).toThrow("Z 值");
  });
});
