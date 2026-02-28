import { useEffect, useState, type ReactNode } from "react";
import { useExperimentStore } from "./ExperimentContext.zustand";
import { useToast } from "../shared/contexts/ToastContext";
import { toastEventBus } from "../utils/toastEventBus";
import { STEPS } from "../constants/steps";

interface ExperimentStoreProviderProps {
  children: ReactNode;
}

const AUTO_RETRY_DELAY_MS = 2000;
const MAX_AUTO_RETRIES = 2;

/**
 * Provider component that initializes the experiment store
 * and auto-loads sales/field data when needed
 */
export const ExperimentStoreProvider = ({ children }: ExperimentStoreProviderProps) => {
  const { addToast } = useToast();
  const initialize = useExperimentStore((state) => state.initialize);
  const state = useExperimentStore((state) => state.state);
  const loadProductSalesData = useExperimentStore((state) => state.loadProductSalesData);
  const loadProductFieldOptions = useExperimentStore((state) => state.loadProductFieldOptions);
  const productSalesData = useExperimentStore((state) => state.productSalesData);
  const isLoadingSales = useExperimentStore((state) => state.isLoadingSales);
  const salesDataError = useExperimentStore((state) => state.salesDataError);
  const productFieldOptions = useExperimentStore((state) => state.productFieldOptions);
  const isLoadingFields = useExperimentStore((state) => state.isLoadingFields);
  const productFieldsError = useExperimentStore((state) => state.productFieldsError);
  const [salesRetryCount, setSalesRetryCount] = useState(0);
  const [fieldRetryCount, setFieldRetryCount] = useState(0);

  // Subscribe to toast events from the store using EventEmitter pattern
  useEffect(() => {
    const unsubscribe = toastEventBus.subscribe((event) => {
      addToast(event.message, event.type, event.duration);
    });
    return unsubscribe;
  }, [addToast]);

  // Initialize store on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Auto-load sales data when product is selected
  const shouldLoadSales =
    state.selected_industry &&
    state.selected_company &&
    state.selected_product &&
    state.highest_completed_step >= STEPS.PRODUCT;

  useEffect(() => {
    setSalesRetryCount(0);
    setFieldRetryCount(0);
  }, [state.selected_industry, state.selected_company, state.selected_product]);

  useEffect(() => {
    if (
      !shouldLoadSales ||
      productSalesData ||
      isLoadingSales ||
      salesDataError ||
      !state.selected_industry ||
      !state.selected_company ||
      !state.selected_product
    ) {
      return;
    }
    void loadProductSalesData(
      state.selected_industry,
      state.selected_company,
      state.selected_product,
    );
  }, [
    shouldLoadSales,
    productSalesData,
    isLoadingSales,
    salesDataError,
    state.selected_industry,
    state.selected_company,
    state.selected_product,
    loadProductSalesData,
  ]);

  useEffect(() => {
    if (
      !shouldLoadSales ||
      !salesDataError ||
      isLoadingSales ||
      productSalesData ||
      !state.selected_industry ||
      !state.selected_company ||
      !state.selected_product ||
      salesRetryCount >= MAX_AUTO_RETRIES
    ) {
      return;
    }

    const selectedIndustry = state.selected_industry;
    const selectedCompany = state.selected_company;
    const selectedProduct = state.selected_product;

    const timer = window.setTimeout(() => {
      void loadProductSalesData(
        selectedIndustry,
        selectedCompany,
        selectedProduct,
      ).then((result) => {
        if (result === "failed") {
          setSalesRetryCount((count) => count + 1);
        }
      });
    }, AUTO_RETRY_DELAY_MS * (salesRetryCount + 1));

    return () => window.clearTimeout(timer);
  }, [
    shouldLoadSales,
    salesDataError,
    isLoadingSales,
    productSalesData,
    state.selected_industry,
    state.selected_company,
    state.selected_product,
    salesRetryCount,
    loadProductSalesData,
  ]);

  // Auto-load field options when product is selected
  useEffect(() => {
    if (
      !shouldLoadSales ||
      productFieldOptions ||
      isLoadingFields ||
      productFieldsError ||
      !state.selected_industry ||
      !state.selected_company ||
      !state.selected_product
    ) {
      return;
    }
    void loadProductFieldOptions(
      state.selected_industry,
      state.selected_company,
      state.selected_product,
    );
  }, [
    shouldLoadSales,
    productFieldOptions,
    isLoadingFields,
    productFieldsError,
    state.selected_industry,
    state.selected_company,
    state.selected_product,
    loadProductFieldOptions,
  ]);

  useEffect(() => {
    if (
      !shouldLoadSales ||
      !productFieldsError ||
      isLoadingFields ||
      productFieldOptions ||
      !state.selected_industry ||
      !state.selected_company ||
      !state.selected_product ||
      fieldRetryCount >= MAX_AUTO_RETRIES
    ) {
      return;
    }

    const selectedIndustry = state.selected_industry;
    const selectedCompany = state.selected_company;
    const selectedProduct = state.selected_product;

    const timer = window.setTimeout(() => {
      void loadProductFieldOptions(
        selectedIndustry,
        selectedCompany,
        selectedProduct,
      ).then((result) => {
        if (result === "failed") {
          setFieldRetryCount((count) => count + 1);
        }
      });
    }, AUTO_RETRY_DELAY_MS * (fieldRetryCount + 1));

    return () => window.clearTimeout(timer);
  }, [
    shouldLoadSales,
    productFieldsError,
    isLoadingFields,
    productFieldOptions,
    state.selected_industry,
    state.selected_company,
    state.selected_product,
    fieldRetryCount,
    loadProductFieldOptions,
  ]);

  return <>{children}</>;
};
