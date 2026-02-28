import { useState, useEffect } from 'react';

const AUTO_RETRY_DELAY_MS = 2000;
const MAX_AUTO_RETRIES = 2;

/**
 * Auto-loads data when the guard condition is met, and retries on failure
 * with linear backoff up to MAX_AUTO_RETRIES times.
 *
 * Resets retry count whenever the selection key changes.
 */
export function useAutoRetryLoader({
  shouldLoad,
  data,
  isLoading,
  error,
  selectedIndustry,
  selectedCompany,
  selectedProduct,
  load,
}: {
  shouldLoad: boolean;
  data: unknown | null;
  isLoading: boolean;
  error: string | null;
  selectedIndustry: string | null;
  selectedCompany: string | null;
  selectedProduct: string | null;
  load: (industry: string, company: string, product: string) => Promise<'success' | 'failed' | 'ignored'>;
}) {
  const [retryCount, setRetryCount] = useState(0);

  // Reset retry count when product selection changes
  useEffect(() => {
    setRetryCount(0);
  }, [selectedIndustry, selectedCompany, selectedProduct]);

  // Initial load
  useEffect(() => {
    if (
      !shouldLoad ||
      data ||
      isLoading ||
      error ||
      !selectedIndustry ||
      !selectedCompany ||
      !selectedProduct
    ) {
      return;
    }
    void load(selectedIndustry, selectedCompany, selectedProduct);
  }, [shouldLoad, data, isLoading, error, selectedIndustry, selectedCompany, selectedProduct, load]);

  // Auto-retry on error
  useEffect(() => {
    if (
      !shouldLoad ||
      !error ||
      isLoading ||
      data ||
      !selectedIndustry ||
      !selectedCompany ||
      !selectedProduct ||
      retryCount >= MAX_AUTO_RETRIES
    ) {
      return;
    }

    const industry = selectedIndustry;
    const company = selectedCompany;
    const product = selectedProduct;

    const timer = window.setTimeout(() => {
      void load(industry, company, product).then((result) => {
        if (result === 'failed') {
          setRetryCount((count) => count + 1);
        }
      });
    }, AUTO_RETRY_DELAY_MS * (retryCount + 1));

    return () => window.clearTimeout(timer);
  }, [shouldLoad, error, isLoading, data, selectedIndustry, selectedCompany, selectedProduct, retryCount, load]);
}
