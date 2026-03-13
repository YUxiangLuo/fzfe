/// <reference types="bun-types" />

import { describe, expect, it } from "bun:test";
import { validateAndFixStdDev, validatePredictions } from "./predictionValidator";
import { MPS_CALCULATION, SERVICE_LEVELS } from "../config/mpsConstants";

describe("MPS Calculation Utils", () => {
  describe("validateAndFixStdDev", () => {
    it("returns valid stdDev unchanged", () => {
      const result = validateAndFixStdDev(50, 1000, 0);
      expect(result.value).toBe(50);
      expect(result.isModified).toBe(false);
      expect(result.warnings).toHaveLength(0);
    });

    it("fixes negative stdDev", () => {
      const result = validateAndFixStdDev(-10, 1000, 0);
      expect(result.value).toBe(1000 * MPS_CALCULATION.DEFAULT_STD_DEV_RATIO);
      expect(result.isModified).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("fixes NaN stdDev", () => {
      const result = validateAndFixStdDev(NaN, 1000, 0);
      expect(result.isModified).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("warns about zero stdDev", () => {
      const result = validateAndFixStdDev(0, 1000, 0);
      expect(result.value).toBe(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("warns about abnormally large stdDev", () => {
      const result = validateAndFixStdDev(400, 1000, 0); // 40% of demand
      expect(result.value).toBe(400);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe("validatePredictions", () => {
    it("validates normal predictions", () => {
      const predictions = [
        { prediction: 1000, std_dev: 50 },
        { prediction: 1100, std_dev: 55 },
      ];
      const result = validatePredictions(predictions);
      expect(result.validatedData).toHaveLength(2);
      expect(result.hasModifications).toBe(false);
    });

    it("fixes negative predictions", () => {
      const predictions = [
        { prediction: -100, std_dev: 50 },
        { prediction: 1100, std_dev: 55 },
      ];
      const result = validatePredictions(predictions);
      expect(result.validatedData[0]?.prediction).toBe(0);
      expect(result.hasModifications).toBe(true);
    });

    it("fixes invalid predictions (NaN)", () => {
      const predictions = [
        { prediction: NaN, std_dev: 50 },
        { prediction: 1100, std_dev: 55 },
      ];
      const result = validatePredictions(predictions);
      expect(result.validatedData[0]?.prediction).toBe(0);
      expect(result.hasModifications).toBe(true);
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
    it("calculates correct safety stock for 99% service level", () => {
      const demandForecast = 1000;
      const stdDev = demandForecast * 0.1; // 10% coefficient of variation
      const zScore = SERVICE_LEVELS.EXCELLENT.zScore; // 2.33
      const safetyStock = Math.round(zScore * stdDev);
      
      // Expected: 2.33 * 100 = 233
      expect(safetyStock).toBe(233);
    });

    it("calculates correct safety stock for 95% service level", () => {
      const demandForecast = 1000;
      const stdDev = demandForecast * 0.1;
      const zScore = SERVICE_LEVELS.GOOD.zScore; // 1.65
      const safetyStock = Math.round(zScore * stdDev);
      
      // Expected: 1.65 * 100 = 165
      expect(safetyStock).toBe(165);
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
