/// <reference types="bun-types" />

import { describe, expect, it } from "bun:test";
import { validatePredictions } from "./predictionValidator";
import { calculateSafetyStock } from "./productionCapacityHelper";

const calibration = { calibration_mean_error: 2, calibration_count: 12 } as const;

describe("MPS Calculation Utils", () => {
  describe("validatePredictions", () => {
    it("validates normal predictions", () => {
      const predictions = [
        { prediction: 1000, std_dev: 50, upper_error_p99: 120, uncertainty_source: "empirical", ...calibration },
        { prediction: 1100, std_dev: 55, upper_error_p99: 130, uncertainty_source: "empirical", ...calibration },
      ];
      const result = validatePredictions(predictions);
      expect(result.validatedData).toHaveLength(2);
      expect(result.hasModifications).toBe(false);
    });

    it("fixes negative predictions", () => {
      const predictions = [
        { prediction: -100, std_dev: 50, upper_error_p99: 120, uncertainty_source: "empirical", ...calibration },
        { prediction: 1100, std_dev: 55, upper_error_p99: 130, uncertainty_source: "empirical", ...calibration },
      ];
      const result = validatePredictions(predictions);
      expect(result.validatedData[0]?.prediction).toBe(0);
      expect(result.hasModifications).toBe(true);
    });

    it("rejects invalid predictions instead of replacing them with zero", () => {
      const predictions = [
        { prediction: NaN, std_dev: 50, upper_error_p99: 120, uncertainty_source: "empirical" },
        { prediction: 1100, std_dev: 55, upper_error_p99: 130, uncertainty_source: "empirical" },
      ];
      expect(() => validatePredictions(predictions)).toThrow("prediction 必须是有限数字");
    });

    it("rejects values that only look numeric instead of coercing them", () => {
      expect(() => validatePredictions([
        { prediction: "1000", std_dev: 50, upper_error_p99: 120, uncertainty_source: "empirical" },
      ])).toThrow("prediction 必须是有限数字");
    });

    it("rejects negative or non-finite standard deviations", () => {
      expect(() => validatePredictions([
        { prediction: 1000, std_dev: -1, upper_error_p99: 120, uncertainty_source: "empirical" },
      ])).toThrow("std_dev 必须是非负有限数字");
      expect(() => validatePredictions([
        { prediction: 1000, std_dev: Number.POSITIVE_INFINITY, upper_error_p99: 120, uncertainty_source: "empirical" },
      ])).toThrow("std_dev 必须是非负有限数字");
    });

    it("preserves and warns about fallback uncertainty", () => {
      const result = validatePredictions([{
        prediction: 1000,
        std_dev: 80,
        upper_error_p99: 180,
        uncertainty_source: "fallback",
        uncertainty_reason: "样本不足",
        calibration_mean_error: null,
        calibration_count: null,
      }]);

      expect(result.validatedData[0]).toMatchObject({
        uncertainty_source: "fallback",
        uncertainty_reason: "样本不足",
      });
      expect(result.allWarnings.join(" ")).toContain("安全库存应结合业务经验复核");
    });

    it("rejects missing, partial, or invalid bias diagnostics", () => {
      const base = {
        prediction: 1000,
        std_dev: 50,
        upper_error_p99: 120,
        uncertainty_source: "empirical",
      };
      expect(() => validatePredictions([base])).toThrow("偏差诊断");
      expect(() => validatePredictions([{
        ...base,
        calibration_mean_error: 2,
        calibration_count: null,
      }])).toThrow("偏差诊断");
      expect(() => validatePredictions([{
        ...base,
        calibration_mean_error: Number.NaN,
        calibration_count: 3,
      }])).toThrow("偏差诊断");
    });
  });

  describe("Service Level Calculation", () => {
    it("calculates correct service level with no stockout", () => {
      const demand = 1000;
      const stockout = 0;
      const serviceLevel = Math.max(0, (demand - stockout) / demand);
      expect(serviceLevel).toBe(1);
    });

    it("calculates correct service level with stockout", () => {
      const demand = 1000;
      const stockout = 100;
      const serviceLevel = Math.max(0, (demand - stockout) / demand);
      expect(serviceLevel).toBe(0.9);
    });

    it("handles zero demand", () => {
      const demand = 0;
      const stockout = 0;
      const serviceLevel = demand === 0 ? 1.0 : Math.max(0, (demand - stockout) / demand);
      expect(serviceLevel).toBe(1);
    });
  });

  describe("Safety Stock Calculation", () => {
    it("uses the selected Z value and centered prediction-error standard deviation", () => {
      expect(calculateSafetyStock(50, 1.28)).toBe(64);
      expect(calculateSafetyStock(50, 1.65)).toBe(83);
      expect(calculateSafetyStock(50, 2.33)).toBe(117);
    });

    it("rejects a negative standard deviation", () => {
      expect(() => calculateSafetyStock(-4, 1.65)).toThrow("预测标准差");
    });
  });

  describe("Inventory Balance", () => {
    it("maintains correct inventory balance: ending = beginning + output - demand (when sufficient)", () => {
      const beginningInventory = 100;
      const productionOutput = 500;
      const demand = 400;
      const availableInventory = beginningInventory + productionOutput;
      let endingInventory = availableInventory - demand;
      let stockout = 0;
      
      if (endingInventory < 0) {
        stockout = Math.abs(endingInventory);
        endingInventory = 0;
      }
      
      expect(endingInventory).toBe(200);
      expect(stockout).toBe(0);
    });

    it("maintains correct inventory balance with stockout", () => {
      const beginningInventory = 100;
      const productionOutput = 300;
      const demand = 500;
      const availableInventory = beginningInventory + productionOutput;
      let endingInventory = availableInventory - demand;
      let stockout = 0;
      
      if (endingInventory < 0) {
        stockout = Math.abs(endingInventory);
        endingInventory = 0;
      }
      
      expect(endingInventory).toBe(0);
      expect(stockout).toBe(100);
    });
  });

  describe("Production Capacity Constraint", () => {
    it("output respects capacity limit", () => {
      const previousPlannedProduction = 1000;
      const capacity = 800;
      const productionOutput = Math.min(previousPlannedProduction, capacity);
      expect(productionOutput).toBe(800);
    });

    it("output equals planned production when under capacity", () => {
      const previousPlannedProduction = 600;
      const capacity = 800;
      const productionOutput = Math.min(previousPlannedProduction, capacity);
      expect(productionOutput).toBe(600);
    });
  });

  describe("Planned Production Formula", () => {
    it("calculates correct planned production", () => {
      const forecastQuantity = 1200;
      const previousEndingInventory = 100;
      const previousStockout = 50;
      
      const plannedProduction = Math.max(
        0,
        forecastQuantity - previousEndingInventory + previousStockout
      );
      
      // Expected: 1200 - 100 + 50 = 1150
      expect(plannedProduction).toBe(1150);
    });

    it("ensures non-negative planned production", () => {
      const forecastQuantity = 100;
      const previousEndingInventory = 200;
      const previousStockout = 0;
      
      const plannedProduction = Math.max(
        0,
        forecastQuantity - previousEndingInventory + previousStockout
      );
      
      // Expected: max(0, 100 - 200 + 0) = 0
      expect(plannedProduction).toBe(0);
    });
  });
});
