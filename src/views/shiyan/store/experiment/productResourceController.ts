import {
  getProductFieldOptions,
  getProductSalesData,
} from "../../services/datasets";
import {
  isMatchingProductSelection,
  mergeExperimentUiState,
  type ProductScopedLoadResult,
  type ProductSelectionKey,
} from "./storeHelpers";
import type { ExperimentState, ExperimentUiState, ProductSalesData } from "./types";

type ProductResourceStoreSlice = {
  state: ExperimentState;
  ui: ExperimentUiState;
  productSalesData: ProductSalesData | null;
  productFieldOptions: string[] | null;
};

type ProductResourceSetter = (
  updater: (current: ProductResourceStoreSlice) => Partial<ProductResourceStoreSlice>,
) => void;

type ProductResourceGetter = () => ProductResourceStoreSlice;

type ProductScopedLoadConfig<Payload> = {
  requestVersion: number;
  getLatestRequestVersion: () => number;
  selection: ProductSelectionKey;
  startUi: Partial<ExperimentUiState>;
  stopLoadingUi: Partial<ExperimentUiState>;
  load: () => Promise<Payload>;
  applySuccess: (payload: Payload) => void;
  applyFailure: (errorMessage: string) => void;
};

type ProductResourceDependencies = {
  getProductSalesData: typeof getProductSalesData;
  getProductFieldOptions: typeof getProductFieldOptions;
};

export interface ProductResourceController {
  invalidateAndResetProductDependentResources: () => void;
  loadProductSalesData: (
    industry: string,
    company: string,
    product: string,
  ) => Promise<ProductScopedLoadResult>;
  loadProductFieldOptions: (
    industry: string,
    company: string,
    product: string,
  ) => Promise<ProductScopedLoadResult>;
}

export const createProductResourceController = ({
  set,
  get,
  dependencies = {
    getProductSalesData,
    getProductFieldOptions,
  },
}: {
  set: ProductResourceSetter;
  get: ProductResourceGetter;
  dependencies?: ProductResourceDependencies;
}): ProductResourceController => {
  let salesDataRequestVersion = 0;
  let fieldOptionsRequestVersion = 0;

  const invalidateProductDataRequests = () => {
    salesDataRequestVersion++;
    fieldOptionsRequestVersion++;
  };

  const resetProductDependentResources = () => {
    set((current) => ({
      productSalesData: null,
      productFieldOptions: null,
      ui: mergeExperimentUiState(current.ui, {
        isLoadingSales: false,
        salesDataError: null,
        isLoadingFields: false,
        productFieldsError: null,
      }),
    }));
  };

  const isCurrentProductSelection = (selection: ProductSelectionKey) => {
    return isMatchingProductSelection(
      get().state,
      selection.industry,
      selection.company,
      selection.product,
    );
  };

  const completeIgnoredProductRequest = (
    isLatestRequest: boolean,
    loadingState: Partial<ExperimentUiState>,
  ): ProductScopedLoadResult => {
    if (isLatestRequest) {
      set((current) => ({
        ui: mergeExperimentUiState(current.ui, loadingState),
      }));
    }

    return "ignored";
  };

  const runProductScopedLoad = async <Payload>({
    requestVersion,
    getLatestRequestVersion,
    selection,
    startUi,
    stopLoadingUi,
    load,
    applySuccess,
    applyFailure,
  }: ProductScopedLoadConfig<Payload>): Promise<ProductScopedLoadResult> => {
    set((current) => ({
      ui: mergeExperimentUiState(current.ui, startUi),
    }));

    try {
      const payload = await load();
      const isLatestRequest = requestVersion === getLatestRequestVersion();

      if (!isLatestRequest || !isCurrentProductSelection(selection)) {
        return completeIgnoredProductRequest(isLatestRequest, stopLoadingUi);
      }

      applySuccess(payload);
      return "success";
    } catch (error) {
      const isLatestRequest = requestVersion === getLatestRequestVersion();

      if (!isLatestRequest || !isCurrentProductSelection(selection)) {
        return completeIgnoredProductRequest(isLatestRequest, stopLoadingUi);
      }

      const errorMessage = error instanceof Error ? error.message : String(error);
      applyFailure(errorMessage);
      return "failed";
    }
  };

  return {
    invalidateAndResetProductDependentResources: () => {
      invalidateProductDataRequests();
      resetProductDependentResources();
    },

    loadProductSalesData: async (industry, company, product) => {
      const requestVersion = ++salesDataRequestVersion;

      return await runProductScopedLoad({
        requestVersion,
        getLatestRequestVersion: () => salesDataRequestVersion,
        selection: { industry, company, product },
        startUi: { isLoadingSales: true, salesDataError: null },
        stopLoadingUi: { isLoadingSales: false },
        load: () => dependencies.getProductSalesData(industry, company, product),
        applySuccess: (data) => {
          set((current) => ({
            productSalesData: data,
            ui: mergeExperimentUiState(current.ui, {
              isLoadingSales: false,
              salesDataError: null,
            }),
          }));
        },
        applyFailure: (errorMessage) => {
          set((current) => ({
            productSalesData: null,
            ui: mergeExperimentUiState(current.ui, {
              salesDataError: errorMessage || "获取产品销量数据失败",
              isLoadingSales: false,
            }),
          }));
        },
      });
    },

    loadProductFieldOptions: async (industry, company, product) => {
      const requestVersion = ++fieldOptionsRequestVersion;

      return await runProductScopedLoad({
        requestVersion,
        getLatestRequestVersion: () => fieldOptionsRequestVersion,
        selection: { industry, company, product },
        startUi: { isLoadingFields: true, productFieldsError: null },
        stopLoadingUi: { isLoadingFields: false },
        load: () => dependencies.getProductFieldOptions(industry, company, product),
        applySuccess: (fields) => {
          set((current) => ({
            productFieldOptions: fields,
            ui: mergeExperimentUiState(current.ui, {
              isLoadingFields: false,
              productFieldsError: null,
            }),
          }));
        },
        applyFailure: (errorMessage) => {
          set((current) => ({
            productFieldOptions: null,
            ui: mergeExperimentUiState(current.ui, {
              productFieldsError: errorMessage || "获取产品字段信息失败",
              isLoadingFields: false,
            }),
          }));
        },
      });
    },
  };
};