/// <reference types="bun-types" />

import { describe, expect, it, mock } from "bun:test";
import { buildInitialState } from "./initialState";
import { buildInitialUiState } from "./storeHelpers";
import { createProductResourceController } from "./productResourceController";
import type { ProductSalesData } from "./types";

type TestSlice = {
  state: ReturnType<typeof buildInitialState>;
  ui: ReturnType<typeof buildInitialUiState>;
  productSalesData: ProductSalesData | null;
  productFieldOptions: string[] | null;
};

const createHarness = () => {
  let slice: TestSlice = {
    state: {
      ...buildInitialState(),
      selected_industry: "electronics",
      selected_company: "acme",
      selected_product: "widget",
    },
    ui: buildInitialUiState(),
    productSalesData: null,
    productFieldOptions: null,
  };

  return {
    getSlice: () => slice,
    get: () => slice,
    set: (updater: (current: TestSlice) => Partial<TestSlice>) => {
      slice = {
        ...slice,
        ...updater(slice),
      };
    },
  };
};

describe("productResourceController", () => {
  it("resets cached product resources and loading state", () => {
    const harness = createHarness();
    harness.set(() => ({
      productSalesData: {
        meta: {
          industry: "electronics",
          company: "acme",
          product: "widget",
          name: "Widget",
          description: "desc",
          unit: "件",
        },
        monthlySales: [],
      },
      productFieldOptions: ["sales"],
      ui: {
        ...buildInitialUiState(),
        isLoadingSales: true,
        isLoadingFields: true,
        salesDataError: "x",
        productFieldsError: "y",
      },
    }));

    const controller = createProductResourceController({
      set: harness.set,
      get: harness.get,
    });

    controller.invalidateAndResetProductDependentResources();

    expect(harness.getSlice().productSalesData).toBeNull();
    expect(harness.getSlice().productFieldOptions).toBeNull();
    expect(harness.getSlice().ui.isLoadingSales).toBeFalse();
    expect(harness.getSlice().ui.isLoadingFields).toBeFalse();
    expect(harness.getSlice().ui.salesDataError).toBeNull();
    expect(harness.getSlice().ui.productFieldsError).toBeNull();
  });

  it("stores loaded product sales data for the current selection", async () => {
    const harness = createHarness();
    const getProductSalesData = mock(async (): Promise<ProductSalesData> => ({
      meta: {
        industry: "electronics",
        company: "acme",
        product: "widget",
        name: "Widget",
        description: "desc",
        unit: "件",
      },
      monthlySales: [{ month: "2024-01", sales: 10 }],
    }));

    const controller = createProductResourceController({
      set: harness.set,
      get: harness.get,
      dependencies: {
        getProductSalesData,
        getProductFieldOptions: mock(async () => []),
      },
    });

    const result = await controller.loadProductSalesData("electronics", "acme", "widget");

    expect(result).toBe("success");
    expect(getProductSalesData).toHaveBeenCalledTimes(1);
    expect(harness.getSlice().productSalesData?.monthlySales).toEqual([
      { month: "2024-01", sales: 10 },
    ]);
    expect(harness.getSlice().ui.isLoadingSales).toBeFalse();
    expect(harness.getSlice().ui.salesDataError).toBeNull();
  });

  it("ignores stale sales responses after product selection changes", async () => {
    const harness = createHarness();
    let resolveSales!: (value: ProductSalesData) => void;
    const getProductSalesData = mock(
      () =>
        new Promise<ProductSalesData>((resolve) => {
          resolveSales = resolve;
        }),
    );

    const controller = createProductResourceController({
      set: harness.set,
      get: harness.get,
      dependencies: {
        getProductSalesData,
        getProductFieldOptions: mock(async () => []),
      },
    });

    const pendingLoad = controller.loadProductSalesData("electronics", "acme", "widget");
    harness.set((current) => ({
      state: {
        ...current.state,
        selected_product: "other-widget",
      },
    }));
    controller.invalidateAndResetProductDependentResources();
    resolveSales({
      meta: {
        industry: "electronics",
        company: "acme",
        product: "widget",
        name: "Widget",
        description: "desc",
        unit: "件",
      },
      monthlySales: [{ month: "2024-01", sales: 10 }],
    });

    await expect(pendingLoad).resolves.toBe("ignored");
    expect(harness.getSlice().productSalesData).toBeNull();
    expect(harness.getSlice().ui.isLoadingSales).toBeFalse();
  });

  it("stores field loading errors for the active product selection", async () => {
    const harness = createHarness();
    const getProductFieldOptions = mock(async () => {
      throw new Error("fields unavailable");
    });

    const controller = createProductResourceController({
      set: harness.set,
      get: harness.get,
      dependencies: {
        getProductSalesData: mock(async () => ({
          meta: {
            industry: "electronics",
            company: "acme",
            product: "widget",
            name: "Widget",
            description: "desc",
            unit: "件",
          },
          monthlySales: [],
        })),
        getProductFieldOptions,
      },
    });

    await expect(
      controller.loadProductFieldOptions("electronics", "acme", "widget"),
    ).resolves.toBe("failed");

    expect(getProductFieldOptions).toHaveBeenCalledTimes(1);
    expect(harness.getSlice().productFieldOptions).toBeNull();
    expect(harness.getSlice().ui.productFieldsError).toBe("fields unavailable");
    expect(harness.getSlice().ui.isLoadingFields).toBeFalse();
  });

  it("stores loaded product field options for the current selection", async () => {
    const harness = createHarness();
    const getProductFieldOptions = mock(async () => ["sales", "inventory"]);

    const controller = createProductResourceController({
      set: harness.set,
      get: harness.get,
      dependencies: {
        getProductSalesData: mock(async () => ({
          meta: {
            industry: "electronics",
            company: "acme",
            product: "widget",
            name: "Widget",
            description: "desc",
            unit: "件",
          },
          monthlySales: [],
        })),
        getProductFieldOptions,
      },
    });

    await expect(
      controller.loadProductFieldOptions("electronics", "acme", "widget"),
    ).resolves.toBe("success");

    expect(harness.getSlice().productFieldOptions).toEqual(["sales", "inventory"]);
    expect(harness.getSlice().ui.productFieldsError).toBeNull();
    expect(harness.getSlice().ui.isLoadingFields).toBeFalse();
  });

  it("ignores stale field option responses after selection changes", async () => {
    const harness = createHarness();
    let resolveFields!: (value: string[]) => void;
    const getProductFieldOptions = mock(
      () =>
        new Promise<string[]>((resolve) => {
          resolveFields = resolve;
        }),
    );

    const controller = createProductResourceController({
      set: harness.set,
      get: harness.get,
      dependencies: {
        getProductSalesData: mock(async () => ({
          meta: {
            industry: "electronics",
            company: "acme",
            product: "widget",
            name: "Widget",
            description: "desc",
            unit: "件",
          },
          monthlySales: [],
        })),
        getProductFieldOptions,
      },
    });

    const pendingLoad = controller.loadProductFieldOptions("electronics", "acme", "widget");
    harness.set((current) => ({
      state: {
        ...current.state,
        selected_product: "other-widget",
      },
    }));
    controller.invalidateAndResetProductDependentResources();
    resolveFields(["sales"]);

    await expect(pendingLoad).resolves.toBe("ignored");
    expect(harness.getSlice().productFieldOptions).toBeNull();
    expect(harness.getSlice().ui.isLoadingFields).toBeFalse();
  });
});