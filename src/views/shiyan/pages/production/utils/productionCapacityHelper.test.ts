/// <reference types="bun-types" />

import { describe, expect, it } from "bun:test";
import {
  calculateCapacityByScenario,
  calculateCapacityScenarioOptions,
  calculateForecastLoadPoints,
} from "./productionCapacityHelper";

describe("productionCapacityHelper", () => {
  it("calculates forecast load from demand prediction and safety stock", () => {
    const points = calculateForecastLoadPoints(
      [
        { prediction: 100, std_dev: 10 },
        { prediction: 120, std_dev: 5 },
      ],
      2,
    );

    expect(points).toEqual([
      { period: 1, demand: 100, safetyStock: 20, forecastLoad: 120 },
      { period: 2, demand: 120, safetyStock: 10, forecastLoad: 130 },
    ]);
  });

  it("builds three scenario capacities from average and peak forecast load", () => {
    const options = calculateCapacityScenarioOptions(
      [
        { prediction: 100, std_dev: 10 },
        { prediction: 120, std_dev: 5 },
        { prediction: 80, std_dev: 0 },
      ],
      2,
    );

    const capacities = Object.fromEntries(
      options.map((option) => [option.id, option.capacity]),
    );

    // Forecast loads: 120, 130, 80. Average = 110, peak = 130.
    expect(capacities).toEqual({
      tight: 99,
      normal: 110,
      abundant: 130,
    });
  });

  it("keeps abundant capacity at least ten percent above average load", () => {
    expect(calculateCapacityByScenario("abundant", 100, 105)).toBe(110);
  });
});
