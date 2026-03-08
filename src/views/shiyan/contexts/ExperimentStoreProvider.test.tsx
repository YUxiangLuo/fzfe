/// <reference lib="dom" />
/// <reference types="bun-types" />

import { resolve } from "path";
import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { act, render } from "@testing-library/react";
import type { RenderResult } from "@testing-library/react";

mock.restore();

const r = (p: string) => resolve(import.meta.dir, p);

type ToastListener = (event: { message: string; type: string; duration?: number }) => void;

type StoreShape = {
  initialize: typeof initialize;
  state: {
    selected_industry: string | null;
    selected_company: string | null;
    selected_product: string | null;
    highest_completed_step: number;
  };
  ui: {
    isLoadingSales: boolean;
    salesDataError: string | null;
    isLoadingFields: boolean;
    productFieldsError: string | null;
  };
  loadProductSalesData: typeof loadProductSalesData;
  loadProductFieldOptions: typeof loadProductFieldOptions;
  productSalesData: null;
  productFieldOptions: null;
};

const initialize = mock(() => {});
const loadProductSalesData = mock(async () => "success");
const loadProductFieldOptions = mock(async () => "success");
const addToast = mock(() => {});
const useAutoRetryLoaderMock = mock(() => {});
const toastUnsubscribe = mock(() => {});
let subscribedToastListener: ToastListener | undefined;
const subscribeMock = mock((listener: ToastListener) => {
  subscribedToastListener = listener;
  return toastUnsubscribe;
});

let storeState: StoreShape = {
  initialize,
  state: {
    selected_industry: "electronics",
    selected_company: "acme",
    selected_product: "widget",
    highest_completed_step: 3,
  },
  ui: {
    isLoadingSales: false,
    salesDataError: null,
    isLoadingFields: false,
    productFieldsError: null,
  },
  loadProductSalesData,
  loadProductFieldOptions,
  productSalesData: null,
  productFieldOptions: null,
};

mock.module(
  r("../store/experiment/index.ts"),
  () => ({
    useExperimentStore(selector: (state: StoreShape) => unknown) {
      return selector(storeState);
    },
  }),
);

mock.module(
  r("../shared/contexts/ToastContext.tsx"),
  () => ({
    useToast: () => ({ addToast }),
  }),
);

mock.module(
  r("../utils/toastEventBus.ts"),
  () => ({
    toastEventBus: {
      subscribe: subscribeMock,
    },
  }),
);

mock.module(
  r("../hooks/useAutoRetryLoader.ts"),
  () => ({
    useAutoRetryLoader: useAutoRetryLoaderMock,
  }),
);

describe("ExperimentStoreProvider", () => {
  let view: RenderResult | null = null;

  beforeEach(() => {
    initialize.mockReset();
    loadProductSalesData.mockReset();
    loadProductFieldOptions.mockReset();
    addToast.mockReset();
    useAutoRetryLoaderMock.mockReset();
    subscribeMock.mockReset();
    toastUnsubscribe.mockReset();
    subscribedToastListener = undefined;
    subscribeMock.mockImplementation((listener: ToastListener) => {
      subscribedToastListener = listener;
      return toastUnsubscribe;
    });

    storeState = {
      initialize,
      state: {
        selected_industry: "electronics",
        selected_company: "acme",
        selected_product: "widget",
        highest_completed_step: 3,
      },
      ui: {
        isLoadingSales: false,
        salesDataError: null,
        isLoadingFields: false,
        productFieldsError: null,
      },
      loadProductSalesData,
      loadProductFieldOptions,
      productSalesData: null,
      productFieldOptions: null,
    };
  });

  afterEach(async () => {
    if (view) {
      view.unmount();
      view = null;
    }
    mock.clearAllMocks();
  });

  it("initializes the store, subscribes to toast events, and forwards auto-load parameters", async () => {
    const { ExperimentStoreProvider } = await import("./ExperimentStoreProvider");

    await act(async () => {
      view = render(
        <ExperimentStoreProvider>
          <div>child</div>
        </ExperimentStoreProvider>,
      );
    });

    expect(view!.getByText("child")).toBeDefined();
    expect(initialize).toHaveBeenCalledTimes(1);
    expect(subscribeMock).toHaveBeenCalledTimes(1);
    expect(useAutoRetryLoaderMock).toHaveBeenCalledTimes(2);
    expect(useAutoRetryLoaderMock).toHaveBeenNthCalledWith(1, {
      shouldLoad: true,
      data: null,
      isLoading: false,
      error: null,
      selectedIndustry: "electronics",
      selectedCompany: "acme",
      selectedProduct: "widget",
      load: loadProductSalesData,
    });
    expect(useAutoRetryLoaderMock).toHaveBeenNthCalledWith(2, {
      shouldLoad: true,
      data: null,
      isLoading: false,
      error: null,
      selectedIndustry: "electronics",
      selectedCompany: "acme",
      selectedProduct: "widget",
      load: loadProductFieldOptions,
    });

    subscribedToastListener?.({ message: "保存成功", type: "success", duration: 2000 });
    expect(addToast).toHaveBeenCalledWith("保存成功", "success", 2000);
  });

  it("disables product auto-loading when the product workflow is not ready and unsubscribes on unmount", async () => {
    storeState = {
      ...storeState,
      state: {
        selected_industry: "electronics",
        selected_company: null,
        selected_product: null,
        highest_completed_step: 2,
      },
    };

    const { ExperimentStoreProvider } = await import("./ExperimentStoreProvider");

    await act(async () => {
      view = render(
        <ExperimentStoreProvider>
          <div>child</div>
        </ExperimentStoreProvider>,
      );
    });

    expect(useAutoRetryLoaderMock).toHaveBeenCalledTimes(2);
    expect(useAutoRetryLoaderMock).toHaveBeenNthCalledWith(1, {
      shouldLoad: false,
      data: null,
      isLoading: false,
      error: null,
      selectedIndustry: "electronics",
      selectedCompany: null,
      selectedProduct: null,
      load: loadProductSalesData,
    });
    expect(useAutoRetryLoaderMock).toHaveBeenNthCalledWith(2, {
      shouldLoad: false,
      data: null,
      isLoading: false,
      error: null,
      selectedIndustry: "electronics",
      selectedCompany: null,
      selectedProduct: null,
      load: loadProductFieldOptions,
    });

    await act(async () => {
      view?.unmount();
    });
    view = null;

    expect(toastUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
