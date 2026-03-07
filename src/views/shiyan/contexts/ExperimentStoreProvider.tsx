import { useEffect, type ReactNode } from "react";
import { useExperimentStore } from "../store/experiment";
import { useToast } from "../shared/contexts/ToastContext";
import { toastEventBus } from "../utils/toastEventBus";
import { STEPS } from "../constants/steps";
import { useAutoRetryLoader } from "../hooks/useAutoRetryLoader";

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
  const ui = useExperimentStore((state) => state.ui);
  const loadProductSalesData = useExperimentStore((state) => state.loadProductSalesData);
  const loadProductFieldOptions = useExperimentStore((state) => state.loadProductFieldOptions);
  const productSalesData = useExperimentStore((state) => state.productSalesData);
  const productFieldOptions = useExperimentStore((state) => state.productFieldOptions);

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

  const shouldLoadProductData = !!(
    state.selected_industry &&
    state.selected_company &&
    state.selected_product &&
    state.highest_completed_step >= STEPS.PRODUCT
  );

  // Auto-load and retry sales data
  useAutoRetryLoader({
    shouldLoad: shouldLoadProductData,
    data: productSalesData,
    isLoading: ui.isLoadingSales,
    error: ui.salesDataError,
    selectedIndustry: state.selected_industry,
    selectedCompany: state.selected_company,
    selectedProduct: state.selected_product,
    load: loadProductSalesData,
  });

  // Auto-load and retry field options
  useAutoRetryLoader({
    shouldLoad: shouldLoadProductData,
    data: productFieldOptions,
    isLoading: ui.isLoadingFields,
    error: ui.productFieldsError,
    selectedIndustry: state.selected_industry,
    selectedCompany: state.selected_company,
    selectedProduct: state.selected_product,
    load: loadProductFieldOptions,
  });

  return <>{children}</>;
};
