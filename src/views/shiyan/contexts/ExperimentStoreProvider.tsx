import { useEffect, type ReactNode } from "react";
import { useExperimentStore, setToastFunction } from "./ExperimentContext.zustand";
import { useToast } from "../../../shared/contexts/ToastContext";

interface ExperimentStoreProviderProps {
  children: ReactNode;
}

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

  // Set toast function on mount
  useEffect(() => {
    setToastFunction(addToast);
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
    state.highest_completed_step >= 3;

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

  return <>{children}</>;
};
